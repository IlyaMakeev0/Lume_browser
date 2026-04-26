use super::PlatformProfile;

pub fn profile() -> PlatformProfile {
    PlatformProfile {
        id: "windows",
        name: "Windows",
        family: "desktop",
        shell: "Tauri desktop shell with frameless WebView2 window and custom titlebar.",
        engine_strategy: "Use the shared Rust engine for tab state, navigation resolution, and network fetch preview.",
    }
}
