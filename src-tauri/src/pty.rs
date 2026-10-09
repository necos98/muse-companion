use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};
use serde::Serialize;
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State};

use crate::workspaces::WorkspaceStore;

const MAX_SESSIONS: usize = 32;

#[derive(Debug, Clone, Serialize)]
struct PtyOutput {
    session_id: u32,
    data: String,
}

#[derive(Debug, Clone, Serialize)]
struct PtyExit {
    session_id: u32,
}

struct PtySession {
    master: Box<dyn MasterPty + Send>,
    writer: Mutex<Box<dyn Write + Send>>,
    child: Mutex<Box<dyn Child + Send + Sync>>,
}

pub struct PtyState {
    sessions: Arc<Mutex<HashMap<u32, PtySession>>>,
    next_id: AtomicU32,
}

impl Default for PtyState {
    fn default() -> Self {
        Self {
            sessions: Arc::new(Mutex::new(HashMap::new())),
            next_id: AtomicU32::new(1),
        }
    }
}

fn pty_size(cols: u16, rows: u16) -> PtySize {
    PtySize {
        rows: rows.clamp(2, 300),
        cols: cols.clamp(2, 500),
        pixel_width: 0,
        pixel_height: 0,
    }
}

/// Decodifica UTF-8 incrementale: i chunk del pty possono spezzare un carattere
/// multibyte (accenti nei path, box drawing). I byte incompleti restano in coda.
fn decode_incremental(pending: &mut Vec<u8>) -> String {
    let mut out = String::new();
    loop {
        if pending.is_empty() {
            break;
        }
        match std::str::from_utf8(pending) {
            Ok(valid) => {
                out.push_str(valid);
                pending.clear();
                break;
            }
            Err(e) => {
                let up_to = e.valid_up_to();
                if up_to > 0 {
                    out.push_str(&String::from_utf8_lossy(&pending[..up_to]));
                    pending.drain(..up_to);
                } else if e.error_len().is_none() {
                    break; // sequenza incompleta: aspetto altri byte
                } else {
                    out.push('\u{FFFD}');
                    pending.drain(..1);
                }
            }
        }
    }
    out
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn decode_ascii_passthrough() {
    let mut pending = b"ciao".to_vec();
    assert_eq!(decode_incremental(&mut pending), "ciao");
    assert!(pending.is_empty());
  }

  #[test]
  fn decode_split_multibyte_waits_for_rest() {
    // "à" = C3 A0 spezzata tra due chunk: il primo non emette nulla.
    let mut pending = vec![0xC3];
    assert_eq!(decode_incremental(&mut pending), "");
    assert_eq!(pending, vec![0xC3]);
    pending.push(0xA0);
    assert_eq!(decode_incremental(&mut pending), "à");
    assert!(pending.is_empty());
  }

  #[test]
  fn decode_invalid_byte_emits_replacement() {
    let mut pending = vec![0xFF];
    assert_eq!(decode_incremental(&mut pending), "�");
    assert!(pending.is_empty());
  }

  #[test]
  fn size_is_clamped() {
    let s = pty_size(0, 1000);
    assert_eq!((s.cols, s.rows), (2, 300));
    let s = pty_size(80, 24);
    assert_eq!((s.cols, s.rows), (80, 24));
  }
}

fn is_powershell(shell: &str) -> bool {
    matches!(
        shell.to_lowercase().as_str(),
        "powershell" | "powershell.exe" | "pwsh" | "pwsh.exe"
    )
}

#[tauri::command]
pub fn pty_spawn(
    app: AppHandle,
    pty: State<PtyState>,
    store: State<WorkspaceStore>,
    workspace_id: String,
    cols: u16,
    rows: u16,
) -> Result<u32, String> {
    let ws = store
        .find(&workspace_id)
        .ok_or_else(|| "workspace non trovato".to_string())?;

    {
        let sessions = pty.sessions.lock().unwrap();
        if sessions.len() >= MAX_SESSIONS {
            return Err("troppe sessioni aperte".to_string());
        }
    }

    let cmd = if ws.kind == "wsl" {
        let distro = ws.distro.clone().unwrap_or_default();
        if distro.is_empty() {
            return Err("distro mancante nel workspace".to_string());
        }
        if !crate::wsl::wsl_dir_exists(&distro, &ws.path) {
            return Err(format!("cartella non trovata in {distro}: {}", ws.path));
        }
        let mut c = CommandBuilder::new("wsl.exe");
        c.arg("-d");
        c.arg(&distro);
        c.arg("--cd");
        c.arg(&ws.path);
        if let Some(shell) = ws.shell.clone().filter(|s| !s.is_empty()) {
            c.arg("-e");
            c.arg(&shell);
        }
        c.env("TERM", "xterm-256color");
        c
    } else {
        let meta =
            std::fs::metadata(&ws.path).map_err(|_| format!("cartella non trovata: {}", ws.path))?;
        if !meta.is_dir() {
            return Err(format!("non è una cartella: {}", ws.path));
        }
        let shell = ws
            .shell
            .clone()
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| "powershell.exe".to_string());
        let mut c = CommandBuilder::new(&shell);
        if is_powershell(&shell) {
            c.arg("-NoLogo");
        }
        c.cwd(&ws.path);
        c
    };

    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(pty_size(cols, rows))
        .map_err(|e| format!("pty: {e}"))?;
    let child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("spawn: {e}"))?;
    drop(pair.slave);
    let reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("pty reader: {e}"))?;
    let writer = pair
        .master
        .take_writer()
        .map_err(|e| format!("pty writer: {e}"))?;

    let session_id = pty.next_id.fetch_add(1, Ordering::SeqCst);
    pty.sessions.lock().unwrap().insert(
        session_id,
        PtySession {
            master: pair.master,
            writer: Mutex::new(writer),
            child: Mutex::new(child),
        },
    );

    // Thread di lettura: inoltra l'output al frontend via eventi.
    let sessions = pty.sessions.clone();
    let app_out = app.clone();
    std::thread::spawn(move || {
        let mut reader = reader;
        let mut buf = [0u8; 8192];
        let mut pending: Vec<u8> = Vec::new();
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    pending.extend_from_slice(&buf[..n]);
                    let text = decode_incremental(&mut pending);
                    if !text.is_empty() {
                        let _ = app_out.emit(
                            "pty-output",
                            PtyOutput {
                                session_id,
                                data: text,
                            },
                        );
                    }
                }
                Err(_) => break,
            }
        }
        if !pending.is_empty() {
            let text = String::from_utf8_lossy(&pending).into_owned();
            let _ = app_out.emit(
                "pty-output",
                PtyOutput {
                    session_id,
                    data: text,
                },
            );
        }
        let session = sessions.lock().unwrap().remove(&session_id);
        if let Some(sess) = session {
            let mut child = sess.child.lock().unwrap();
            let _ = child.wait();
        }
        let _ = app_out.emit("pty-exit", PtyExit { session_id });
    });

    Ok(session_id)
}

#[tauri::command]
pub fn pty_write(pty: State<PtyState>, session_id: u32, data: String) -> Result<(), String> {
    let sessions = pty.sessions.lock().unwrap();
    let sess = sessions
        .get(&session_id)
        .ok_or_else(|| "sessione non trovata".to_string())?;
    let mut writer = sess.writer.lock().unwrap();
    writer.write_all(data.as_bytes()).map_err(|e| e.to_string())?;
    writer.flush().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn pty_resize(
    pty: State<PtyState>,
    session_id: u32,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let sessions = pty.sessions.lock().unwrap();
    let sess = sessions
        .get(&session_id)
        .ok_or_else(|| "sessione non trovata".to_string())?;
    sess.master
        .resize(pty_size(cols, rows))
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn pty_close(pty: State<PtyState>, session_id: u32) -> Result<(), String> {
    let session = pty.sessions.lock().unwrap().remove(&session_id);
    if let Some(sess) = session {
        let mut child = sess.child.lock().unwrap();
        let _ = child.kill();
    }
    Ok(())
}
