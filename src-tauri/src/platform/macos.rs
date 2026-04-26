use super::PlatformProfile;

pub fn profile() -> PlatformProfile {
    PlatformProfile {
        id: "macos",
        name: "macOS",
        family: "desktop",
        shell: "Tauri desktop shell with frameless WKWebView window and custom titlebar.",
        engine_strategy: "Keep platform chrome native-feeling while routing browser logic through lume_engine.",
    }
}
