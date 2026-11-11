use std::path::Path;
use std::sync::Mutex;
use tauri::{Emitter, Manager};

pub struct LaunchState(pub Mutex<Option<String>>);

fn build_file_payload(file_path: &Path) -> Result<serde_json::Value, String> {
    let name = file_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("document")
        .to_string();

    let path_str = file_path.to_string_lossy().to_string();

    let bytes = std::fs::read(file_path)
        .map_err(|e| format!("Failed to read file '{}': {}", path_str, e))?;

    let size = bytes.len();

    Ok(serde_json::json!({
        "name": name,
        "path": path_str,
        "data": bytes,
        "size": size,
    }))
}

#[tauri::command]
fn get_launch_file(
    state: tauri::State<'_, LaunchState>,
) -> Result<Option<serde_json::Value>, String> {
    let mut guard = state
        .0
        .lock()
        .map_err(|_| "Failed to lock launch state".to_string())?;

    if let Some(path_str) = guard.take() {
        let p = Path::new(&path_str);
        if p.exists() && p.is_file() {
            let payload = build_file_payload(p)?;
            return Ok(Some(payload));
        }
    }

    Ok(None)
}

#[tauri::command]
fn read_file_from_disk(path: String) -> Result<serde_json::Value, String> {
    let p = Path::new(&path);
    if !p.exists() || !p.is_file() {
        return Err(format!("File does not exist: {}", path));
    }
    build_file_payload(p)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }

            // Find first argument after argv[0] that is not a flag and points to a file
            for arg in argv.iter().skip(1) {
                if !arg.starts_with('-') {
                    let p = Path::new(arg);
                    if p.exists() && p.is_file() {
                        if let Ok(payload) = build_file_payload(p) {
                            let _ = app.emit("open-file-payload", payload);
                            break;
                        }
                    }
                }
            }
        }))
        .manage(LaunchState(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![get_launch_file, read_file_from_disk])
        .setup(|app| {
            // Cold start argument check
            for arg in std::env::args().skip(1) {
                if !arg.starts_with('-') {
                    let p = Path::new(&arg);
                    if p.exists() && p.is_file() {
                        let state = app.state::<LaunchState>();
                        if let Ok(mut guard) = state.0.lock() {
                            *guard = Some(arg);
                        }
                        break;
                    }
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running LocalOffice");
}
