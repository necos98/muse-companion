mod pty;
pub mod updater;
mod workspaces;
mod wsl;

use pty::PtyState;
use workspaces::WorkspaceStore;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(WorkspaceStore::default())
        .manage(PtyState::default())
        .setup(|app| {
            workspaces::load_from_disk(app);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            workspaces::list_workspaces,
            workspaces::add_workspace,
            workspaces::rename_workspace,
            workspaces::remove_workspace,
            wsl::list_wsl_distros,
            wsl::check_wsl_path,
            pty::pty_spawn,
            pty::pty_write,
            pty::pty_resize,
            pty::pty_close,
            updater::get_update_config,
            updater::check_update,
            updater::download_update,
            updater::install_update,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
