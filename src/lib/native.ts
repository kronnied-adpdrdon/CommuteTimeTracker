/**
 * Lazy access to an Android plugin. Loaded on first use so the static build never touches native code,
 * and wrapped in an object because a Capacitor plugin proxy must never be what a promise resolves to
 * (the promise machinery probes it for `.then`, which the proxy turns into a failing native call).
 */
export function lazyPlugin<T extends object>(name: string): () => Promise<{ native: T }> {
  let cached: Promise<{ native: T }> | null = null;
  return () => {
    cached ??= (async () => {
      const { Capacitor, registerPlugin } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform()) throw new Error('Only available in the Android app.');
      return { native: registerPlugin<T>(name) };
    })();
    return cached;
  };
}

export async function isNativeApp(): Promise<boolean> {
  try {
    const { Capacitor } = await import('@capacitor/core');
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}
