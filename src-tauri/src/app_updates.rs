use serde::Serialize;
use tauri::AppHandle;
use tauri_plugin_updater::UpdaterExt;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCheckResult {
    pub available: bool,
    pub current_version: String,
    pub version: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInstallResult {
    pub installed: bool,
    pub current_version: String,
    pub version: Option<String>,
}

#[tauri::command]
pub async fn check_app_update(app: AppHandle) -> Result<UpdateCheckResult, String> {
    let current_version = app.package_info().version.to_string();
    let update = app
        .updater()
        .map_err(|error| error.to_string())?
        .check()
        .await
        .map_err(|error| error.to_string())?;

    Ok(UpdateCheckResult {
        available: update.is_some(),
        current_version,
        version: update.map(|update| update.version),
    })
}

#[tauri::command]
pub async fn install_app_update(app: AppHandle) -> Result<UpdateInstallResult, String> {
    let current_version = app.package_info().version.to_string();
    let Some(update) = app
        .updater()
        .map_err(|error| error.to_string())?
        .check()
        .await
        .map_err(|error| error.to_string())?
    else {
        return Ok(UpdateInstallResult {
            installed: false,
            current_version,
            version: None,
        });
    };

    let version = update.version.clone();

    update
        .download_and_install(|_chunk_length, _content_length| {}, || {})
        .await
        .map_err(|error| error.to_string())?;

    #[cfg(not(target_os = "windows"))]
    app.restart();

    Ok(UpdateInstallResult {
        installed: true,
        current_version,
        version: Some(version),
    })
}
