use serde::Serialize;

#[cfg(target_os = "android")]
mod android;
#[cfg(target_os = "ios")]
mod ios;
#[cfg(target_os = "macos")]
mod macos;
#[cfg(target_os = "windows")]
mod windows;

#[derive(Debug, Clone, Serialize)]
pub struct PlatformProfile {
    pub id: &'static str,
    pub name: &'static str,
    pub family: &'static str,
    pub shell: &'static str,
    pub engine_strategy: &'static str,
}

pub fn current() -> PlatformProfile {
    current_impl()
}

#[cfg(target_os = "windows")]
fn current_impl() -> PlatformProfile {
    windows::profile()
}

#[cfg(target_os = "macos")]
fn current_impl() -> PlatformProfile {
    macos::profile()
}

#[cfg(target_os = "android")]
fn current_impl() -> PlatformProfile {
    android::profile()
}

#[cfg(target_os = "ios")]
fn current_impl() -> PlatformProfile {
    ios::profile()
}

#[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "android", target_os = "ios")))]
fn current_impl() -> PlatformProfile {
    PlatformProfile {
        id: "unknown",
        name: "Unknown",
        family: "unsupported",
        shell: "No dedicated shell has been selected for this target.",
        engine_strategy: "Shared lume_engine crate remains target independent.",
    }
}
