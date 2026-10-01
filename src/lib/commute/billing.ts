/** What Google Play says this Google account owns. */
export interface ProStatus {
  owned: boolean;
  /** Bought, but the payment hasn't cleared yet (e.g. some UPI or cash payments). */
  pending: boolean;
  /** Google Play's localised price, e.g. "₹49.00". Missing until the product exists in Play Console. */
  price?: string;
}

export type PurchaseOutcome = 'purchased' | 'pending' | 'cancelled';

/** Google Play Billing for the one-time Pro unlock (`ProBillingPlugin`). Ownership is checked on the phone. */
export interface ProBilling {
  status(): Promise<ProStatus>;
  purchase(): Promise<PurchaseOutcome>;
  /** Called when a pending payment completes while the app is open. */
  onUpdated(callback: () => void): void;
}

interface ProBillingPlugin {
  getStatus(): Promise<ProStatus>;
  purchase(): Promise<{ status: PurchaseOutcome }>;
  addListener(event: 'updated', cb: () => void): Promise<unknown>;
}

// Wrapped: a Capacitor plugin proxy must never be what a promise resolves to (it would be probed for `.then`).
let pluginPromise: Promise<{ native: ProBillingPlugin }> | null = null;

function plugin(): Promise<{ native: ProBillingPlugin }> {
  pluginPromise ??= (async () => {
    const { Capacitor, registerPlugin } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) throw new Error('Purchases only work in the Android app.');
    return { native: registerPlugin<ProBillingPlugin>('ProBilling') };
  })();
  return pluginPromise;
}

export const nativeBilling: ProBilling = {
  status: async () => (await plugin()).native.getStatus(),
  purchase: async () => (await (await plugin()).native.purchase()).status,
  onUpdated(callback) {
    void plugin()
      .then(({ native }) => native.addListener('updated', callback))
      .catch(() => undefined);
  },
};
