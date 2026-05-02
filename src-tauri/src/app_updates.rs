use std::{
    fs,
    path::PathBuf,
    process::Command,
    time::{SystemTime, UNIX_EPOCH},
};

use reqwest::Client;
use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_updater::UpdaterExt;

const GITHUB_LATEST_RELEASE_API: &str =
    "https://api.github.com/repos/IlyaMakeev0/Lume_browser/releases/latest";

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCheckResult {
    pub available: bool,
    pub current_version: String,
    pub version: Option<String>,
    pub source: Option<String>,
    pub download_url: Option<String>,
    pub asset_name: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInstallResult {
    pub installed: bool,
    pub current_version: String,
    pub version: Option<String>,
    pub source: Option<String>,
    pub download_url: Option<String>,
    pub asset_name: Option<String>,
    pub launched_installer: bool,
    pub error: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GithubRelease {
    tag_name: String,
    assets: Vec<GithubAsset>,
}

#[derive(Debug, Clone, Deserialize)]
struct GithubAsset {
    name: String,
    browser_download_url: String,
    size: u64,
}

#[derive(Debug, Clone)]
struct GithubUpdate {
    version: String,
    asset: GithubAsset,
    newer_than_current: bool,
}

#[tauri::command]
pub async fn check_app_update(app: AppHandle) -> Result<UpdateCheckResult, String> {
    let current_version = app.package_info().version.to_string();
    let plugin_result = app
        .updater()
        .map_err(|error| error.to_string())?
        .check()
        .await;

    match plugin_result {
        Ok(Some(update)) => Ok(UpdateCheckResult {
            available: true,
            current_version,
            version: Some(update.version),
            source: Some("tauri".to_string()),
            download_url: None,
            asset_name: None,
            error: None,
        }),
        Ok(None) => match github_latest_update(&current_version).await {
            Ok(Some(update)) => Ok(UpdateCheckResult {
                available: update.newer_than_current,
                current_version,
                version: Some(update.version),
                source: Some("github".to_string()),
                download_url: Some(update.asset.browser_download_url),
                asset_name: Some(update.asset.name),
                error: None,
            }),
            Ok(None) => Ok(UpdateCheckResult {
                available: false,
                current_version,
                version: None,
                source: Some("github".to_string()),
                download_url: None,
                asset_name: None,
                error: None,
            }),
            Err(error) => Ok(UpdateCheckResult {
                available: false,
                current_version,
                version: None,
                source: Some("github".to_string()),
                download_url: None,
                asset_name: None,
                error: Some(error),
            }),
        },
        Err(plugin_error) => match github_latest_update(&current_version).await {
            Ok(Some(update)) => Ok(UpdateCheckResult {
                available: update.newer_than_current,
                current_version,
                version: Some(update.version),
                source: Some("github".to_string()),
                download_url: Some(update.asset.browser_download_url),
                asset_name: Some(update.asset.name),
                error: Some(plugin_error.to_string()),
            }),
            Ok(None) => Ok(UpdateCheckResult {
                available: false,
                current_version,
                version: None,
                source: Some("github".to_string()),
                download_url: None,
                asset_name: None,
                error: Some(plugin_error.to_string()),
            }),
            Err(github_error) => Err(format!("{plugin_error}; GitHub fallback failed: {github_error}")),
        },
    }
}

#[tauri::command]
pub async fn install_app_update(app: AppHandle) -> Result<UpdateInstallResult, String> {
    let current_version = app.package_info().version.to_string();
    let plugin_result = app
        .updater()
        .map_err(|error| error.to_string())?
        .check()
        .await;

    match plugin_result {
        Ok(Some(update)) => {
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
                source: Some("tauri".to_string()),
                download_url: None,
                asset_name: None,
                launched_installer: false,
                error: None,
            })
        }
        Ok(None) => install_github_update(current_version, None).await,
        Err(plugin_error) => install_github_update(current_version, Some(plugin_error.to_string())).await,
    }
}

async fn install_github_update(
    current_version: String,
    previous_error: Option<String>,
) -> Result<UpdateInstallResult, String> {
    let update = github_latest_update(&current_version)
        .await?
        .ok_or_else(|| "No GitHub release installer asset was found.".to_string())?;

    if !update.newer_than_current {
        return Ok(UpdateInstallResult {
            installed: false,
            current_version,
            version: Some(update.version),
            source: Some("github".to_string()),
            download_url: Some(update.asset.browser_download_url),
            asset_name: Some(update.asset.name),
            launched_installer: false,
            error: previous_error,
        });
    }

    let installer_path = download_asset_to_temp(&update.asset).await?;
    Command::new(&installer_path)
        .spawn()
        .map_err(|error| format!("Downloaded update but could not launch installer: {error}"))?;

    Ok(UpdateInstallResult {
        installed: true,
        current_version,
        version: Some(update.version),
        source: Some("github".to_string()),
        download_url: Some(update.asset.browser_download_url),
        asset_name: Some(update.asset.name),
        launched_installer: true,
        error: previous_error,
    })
}

async fn github_latest_update(current_version: &str) -> Result<Option<GithubUpdate>, String> {
    let client = Client::builder()
        .user_agent("Lume-Updater")
        .build()
        .map_err(|error| error.to_string())?;

    let release = client
        .get(GITHUB_LATEST_RELEASE_API)
        .header("Accept", "application/vnd.github+json")
        .send()
        .await
        .map_err(|error| error.to_string())?
        .error_for_status()
        .map_err(|error| error.to_string())?
        .json::<GithubRelease>()
        .await
        .map_err(|error| error.to_string())?;

    let Some(asset) = preferred_update_asset(&release.assets) else {
        return Ok(None);
    };

    let version = asset_version(&asset).unwrap_or_else(|| release_version(&release));
    Ok(Some(GithubUpdate {
        newer_than_current: is_remote_version_newer(&version, current_version),
        version,
        asset,
    }))
}

async fn download_asset_to_temp(asset: &GithubAsset) -> Result<PathBuf, String> {
    let client = Client::builder()
        .user_agent("Lume-Updater")
        .build()
        .map_err(|error| error.to_string())?;

    let bytes = client
        .get(&asset.browser_download_url)
        .send()
        .await
        .map_err(|error| error.to_string())?
        .error_for_status()
        .map_err(|error| error.to_string())?
        .bytes()
        .await
        .map_err(|error| error.to_string())?;

    if asset.size > 0 && bytes.len() as u64 != asset.size {
        return Err(format!(
            "Downloaded update size mismatch: expected {} bytes, got {} bytes.",
            asset.size,
            bytes.len()
        ));
    }

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_secs();
    let safe_name = asset
        .name
        .chars()
        .map(|ch| if ch.is_ascii_alphanumeric() || ".-_".contains(ch) { ch } else { '_' })
        .collect::<String>();
    let path = std::env::temp_dir().join(format!("lume-update-{timestamp}-{safe_name}"));

    fs::write(&path, bytes).map_err(|error| error.to_string())?;
    Ok(path)
}

fn preferred_update_asset(assets: &[GithubAsset]) -> Option<GithubAsset> {
    assets
        .iter()
        .find(|asset| asset.name.ends_with("_x64-setup.exe"))
        .or_else(|| assets.iter().find(|asset| asset.name.ends_with("setup.exe")))
        .or_else(|| assets.iter().find(|asset| asset.name.ends_with(".msi")))
        .or_else(|| assets.iter().find(|asset| asset.name.eq_ignore_ascii_case("lume.exe")))
        .cloned()
}

fn release_version(release: &GithubRelease) -> String {
    release
        .tag_name
        .trim_start_matches(|ch| ch == 'v' || ch == 'V')
        .trim()
        .to_string()
}

fn asset_version(asset: &GithubAsset) -> Option<String> {
    version_from_asset_name(&asset.name)
}

fn version_from_asset_name(name: &str) -> Option<String> {
    let chars = name.chars().collect::<Vec<_>>();

    for start in 0..chars.len() {
        if !chars[start].is_ascii_digit() {
            continue;
        }

        let mut end = start;
        let mut dots = 0;

        while end < chars.len() && (chars[end].is_ascii_digit() || chars[end] == '.') {
            if chars[end] == '.' {
                dots += 1;
            }

            end += 1;
        }

        if dots >= 2 {
            let candidate = chars[start..end].iter().collect::<String>();
            let normalized = candidate.trim_end_matches('.').to_string();

            if version_parts(&normalized).len() >= 3 {
                return Some(normalized);
            }
        }
    }

    None
}

fn is_remote_version_newer(remote: &str, current: &str) -> bool {
    let remote_parts = version_parts(remote);
    let current_parts = version_parts(current);

    for index in 0..remote_parts.len().max(current_parts.len()) {
        let left = *remote_parts.get(index).unwrap_or(&0);
        let right = *current_parts.get(index).unwrap_or(&0);

        if left != right {
            return left > right;
        }
    }

    false
}

fn version_parts(value: &str) -> Vec<u64> {
    value
        .trim_start_matches(|ch| ch == 'v' || ch == 'V')
        .split(|ch: char| !ch.is_ascii_digit())
        .filter(|part| !part.is_empty())
        .filter_map(|part| part.parse::<u64>().ok())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::{is_remote_version_newer, version_from_asset_name};

    #[test]
    fn extracts_semver_from_windows_installer_name() {
        assert_eq!(
            version_from_asset_name("Lume_0.1.0_x64-setup.exe"),
            Some("0.1.0".to_string())
        );
    }

    #[test]
    fn does_not_treat_same_asset_version_as_update() {
        assert!(!is_remote_version_newer("0.1.0", "0.1.0"));
    }

    #[test]
    fn treats_larger_asset_version_as_update() {
        assert!(is_remote_version_newer("0.2.0", "0.1.0"));
    }
}
