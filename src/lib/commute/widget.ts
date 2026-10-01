interface CommuteWidgetPlugin {
  refresh(): Promise<void>;
}

let plugin: CommuteWidgetPlugin | null = null;

/** Asks the Android home-screen widget to redraw. A no-op in a desktop browser. */
export async function refreshWidget(): Promise<void> {
  try {
    const { Capacitor, registerPlugin } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;
    plugin ??= registerPlugin<CommuteWidgetPlugin>('CommuteWidget');
    await plugin.refresh();
  } catch {
    // The widget is a nice-to-have; never let it break the app.
  }
}

/** What a commutetracker:// link from the widget asks for. */
export function widgetAction(url: string): 'start' | 'stop' | 'open' | null {
  const match = /^commutetracker:\/\/(start|stop|open)\b/.exec(url);
  return match ? (match[1] as 'start' | 'stop' | 'open') : null;
}
