#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::net::{Ipv4Addr, TcpStream};
use std::os::windows::process::CommandExt;
use std::process::Stdio;
use std::sync::Mutex;
use std::time::Duration;

use serde_json::Value;
use tauri::{Manager, RunEvent, WebviewUrl, WebviewWindowBuilder};

const CREATE_NO_WINDOW: u32 = 0x0800_0000;

struct ChildState(Mutex<Option<std::process::Child>>);

const APP_ORIGIN: &str = "http://127.0.0.1";

fn port_open(port: u16) -> bool {
    TcpStream::connect((Ipv4Addr::LOCALHOST, port)).is_ok()
}

fn find_free_port() -> u16 {
    std::net::TcpListener::bind((Ipv4Addr::LOCALHOST, 0))
        .map(|listener| listener.local_addr().map(|addr| addr.port()).unwrap_or(3111))
        .unwrap_or(3111)
}

fn load_server_env(resource_dir: &std::path::Path) -> Vec<(String, String)> {
    let env_file = resource_dir.join("server").join("server-env.json");
    let Ok(raw) = std::fs::read_to_string(env_file) else {
        return Vec::new();
    };
    let Ok(map) = serde_json::from_str::<Value>(&raw) else {
        return Vec::new();
    };
    map.as_object()
        .map(|obj| {
            obj.iter()
                .filter_map(|(k, v)| v.as_str().map(|s| (k.clone(), s.to_string())))
                .collect()
        })
        .unwrap_or_default()
}

fn main() {
    tauri::Builder::default()
        .manage(ChildState(Mutex::new(None)))
        .setup(|app| {
            let handle = app.handle().clone();
            let res_dir = handle.path().resource_dir().expect("no resource dir");

            tauri::async_runtime::spawn(async move {
                let port = find_free_port();
                let mut cmd = std::process::Command::new(res_dir.join("node.exe"));
                cmd.current_dir(res_dir.join("server"))
                    .args(["server.js"])
                    .creation_flags(CREATE_NO_WINDOW)
                    .env("PORT", port.to_string())
                    .env("HOSTNAME", "127.0.0.1")
                    .env("NEXT_PUBLIC_SITE_URL", format!("{APP_ORIGIN}:{port}"))
                    .stdin(Stdio::null())
                    .stdout(Stdio::null())
                    .stderr(Stdio::null());
                for (k, v) in load_server_env(&res_dir) {
                    cmd.env(k, v);
                }

                let child = match cmd.spawn() {
                    Ok(c) => c,
                    Err(e) => {
                        eprintln!("failed to spawn node sidecar: {e}");
                        return;
                    }
                };

                *handle.state::<ChildState>().0.lock().unwrap() = Some(child);

                let mut up = false;
                for _ in 0..120 {
                    if port_open(port) {
                        up = true;
                        break;
                    }
                    std::thread::sleep(Duration::from_millis(500));
                }

                let builder = WebviewWindowBuilder::new(
                    &handle,
                    "main",
                    if up {
                        WebviewUrl::External(
                            format!("{APP_ORIGIN}:{port}/")
                                .parse()
                                .expect("bad url"),
                        )
                    } else {
                        WebviewUrl::App("index.html".into())
                    },
                )
                .title("Hana")
                .inner_size(1280.0, 800.0)
                .min_inner_size(800.0, 600.0);

                if let Err(e) = builder.build() {
                    eprintln!("failed to create window: {e}");
                }
            });

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            if let RunEvent::ExitRequested { .. } = event {
                if let Some(mut child) = app.state::<ChildState>().0.lock().unwrap().take() {
                    let _ = child.kill();
                }
            }
        });
}