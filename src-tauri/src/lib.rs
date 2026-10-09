pub mod muse_notify;
mod pty;
mod settings;
pub mod updater;
mod workspaces;
mod wsl;

use pty::PtyState;
use settings::SettingsStore;
use workspaces::WorkspaceStore;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(WorkspaceStore::default())
        .manage(PtyState::default())
        .manage(SettingsStore::default())
        .setup(|app| {
            workspaces::load_from_disk(app);
            settings::load_from_disk(app);
            muse_notify::start_listener(app.handle());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            workspaces::list_workspaces,
            workspaces::add_workspace,
            workspaces::rename_workspace,
            workspaces::remove_workspace,
            wsl::list_wsl_distros,
            wsl::check_wsl_path,
            settings::get_settings,
            settings::set_default_command,
            pty::pty_spawn,
            pty::pty_write,
            pty::pty_resize,
            pty::pty_close,
            updater::get_update_config,
            updater::check_update,
            updater::download_update,
            updater::install_update,
            muse_notify::muse_env_status,
            muse_notify::install_muse_plugin,
            muse_notify::remove_muse_plugin,
            muse_notify::test_muse_notify,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
