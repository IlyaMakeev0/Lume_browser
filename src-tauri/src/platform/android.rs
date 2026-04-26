use super::PlatformProfile;

pub fn profile() -> PlatformProfile {
    PlatformProfile {
        id: "android",
        name: "Android",
        family: "mobile",
        shell: "Tauri mobile shell generated under src-tauri/gen/android when initialized.",
        engine_strategy: "Share lume_engine through Rust mobile bindings and keep mobile UI touch-first.",
    }
}
