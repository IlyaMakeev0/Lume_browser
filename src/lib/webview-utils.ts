export function webviewLabel(tabId: string): string {
  return `lume-tab-${tabId.replace(/[^a-zA-Z0-9-_]/g, "_")}`;
}

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function getTabWebview(tabId: string) {
  if (!isTauriRuntime()) return null;
  try {
    const { Webview } = await import("@tauri-apps/api/webview");
    return Webview.getByLabel(webviewLabel(tabId));
  } catch {
    return null;
  }
}

/** Execute JavaScript inside a child webview via the Rust bridge. */
export async function evalInWebview(tabId: string, script: string): Promise<void> {
  if (!isTauriRuntime()) return;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("eval_in_webview", { label: webviewLabel(tabId), script });
  } catch (e) {
    console.debug("evalInWebview failed:", e);
  }
}
