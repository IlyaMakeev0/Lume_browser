use super::PlatformProfile;

pub fn profile() -> PlatformProfile {
    PlatformProfile {
        id: "ios",
        name: "iOS",
        family: "mobile",
        shell: "Tauri mobile shell generated under src-tauri/gen/apple when initialized.",
        engine_strategy: "Share lume_engine through Rust mobile bindings with iOS-specific permission and store packaging.",
    }
}
