#[cfg(desktop)]
mod app_updates;
mod network_fetcher;
mod platform;
mod tabs_manager;

use std::sync::Mutex;

use lume_engine::{FetchPreview, HistoryEntry, NavigationTarget, NetworkProbe};
use network_fetcher::NetworkFetcher;
use platform::PlatformProfile;
use tabs_manager::{BrowserTab, NewTabRequest, TabsManager};
use tauri::{Manager, State};

#[tauri::command]
fn list_tabs(state: State<'_, Mutex<TabsManager>>) -> Result<Vec<BrowserTab>, String> {
    let manager = state.lock().map_err(|error| error.to_string())?;
    Ok(manager.list())
}

#[tauri::command]
fn create_tab(
    state: State<'_, Mutex<TabsManager>>,
    request: Option<NewTabRequest>,
) -> Result<BrowserTab, String> {
    let mut manager = state.lock().map_err(|error| error.to_string())?;
    Ok(manager.create_tab(request.unwrap_or_default()))
}

#[tauri::command]
fn activate_tab(
    state: State<'_, Mutex<TabsManager>>,
    id: String,
) -> Result<BrowserTab, String> {
    let mut manager = state.lock().map_err(|error| error.to_string())?;
    manager
        .activate_tab(&id)
        .ok_or_else(|| format!("Tab '{id}' was not found."))
}

#[tauri::command]
fn close_tab(state: State<'_, Mutex<TabsManager>>, id: String) -> Result<Vec<BrowserTab>, String> {
    let mut manager = state.lock().map_err(|error| error.to_string())?;
    manager.close_tab(&id)?;
    Ok(manager.list())
}

#[tauri::command]
fn resolve_navigation(
    fetcher: State<'_, NetworkFetcher>,
    input: String,
) -> Result<NavigationTarget, String> {
    fetcher.resolve_navigation(&input)
}

#[tauri::command]
fn navigate_active_tab(
    state: State<'_, Mutex<TabsManager>>,
    fetcher: State<'_, NetworkFetcher>,
    input: String,
) -> Result<BrowserTab, String> {
    let target = fetcher.resolve_navigation(&input)?;
    let mut manager = state.lock().map_err(|error| error.to_string())?;
    let tab = manager.navigate_active_tab(target.display_title.clone(), target.resolved_url.clone());

    fetcher.record_navigation(&target);

    Ok(tab)
}

#[tauri::command]
async fn fetch_preview(
    fetcher: State<'_, NetworkFetcher>,
    url: String,
) -> Result<FetchPreview, String> {
    fetcher.fetch_text_preview(&url).await
}

#[tauri::command]
async fn probe_url(
    fetcher: State<'_, NetworkFetcher>,
    url: String,
) -> Result<NetworkProbe, String> {
    fetcher.probe(&url).await
}

#[tauri::command]
fn list_history(fetcher: State<'_, NetworkFetcher>) -> Result<Vec<HistoryEntry>, String> {
    fetcher.history()
}

#[tauri::command]
fn clear_browser_data(fetcher: State<'_, NetworkFetcher>) -> Result<(), String> {
    fetcher.clear_history()?;
    fetcher.clear_cache()
}

#[tauri::command]
fn platform_profile() -> PlatformProfile {
    platform::current()
}

#[tauri::command]
fn eval_in_webview(
    app: tauri::AppHandle,
    label: String,
    script: String,
) -> Result<(), String> {
    app.get_webview(&label)
        .ok_or_else(|| format!("Webview '{label}' not found"))?
        .eval(&script)
        .map_err(|e| e.to_string())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            #[cfg(desktop)]
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())?;

            Ok(())
        })
        .manage(Mutex::new(TabsManager::with_home_tab()))
        .manage(NetworkFetcher::default())
        .invoke_handler(tauri::generate_handler![
            #[cfg(desktop)]
            app_updates::check_app_update,
            #[cfg(desktop)]
            app_updates::install_app_update,
            list_tabs,
            create_tab,
            activate_tab,
            close_tab,
            resolve_navigation,
            navigate_active_tab,
            platform_profile,
            fetch_preview,
            probe_url,
            list_history,
            clear_browser_data,
            eval_in_webview
        ])
        .run(tauri::generate_context!())
        .expect("error while running Lume");
}
