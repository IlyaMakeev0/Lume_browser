export async function invokeCommand<T>(
  command: string,
  args?: Record<string, unknown>
): Promise<T | null> {
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return await invoke<T>(command, args);
  } catch (error) {
    console.debug(`Tauri command "${command}" is unavailable.`, error);
    return null;
  }
}
