package com.provibsol.myce.billing;

import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Collections;
import java.util.List;

/**
 * Google Play Billing for the one-time "Pro" unlock. Ownership is checked on the phone: Google Play
 * reports what this Google account owns, and the app trusts that (no server). Purchases are acknowledged
 * straight away, because Google refunds one-time purchases left unacknowledged for 3 days.
 */
@CapacitorPlugin(name = "ProBilling")
public class ProBillingPlugin extends Plugin implements PurchasesUpdatedListener {

    /** Must match the one-time product ID created in Play Console. */
    static final String PRODUCT_ID = "pro";

    private BillingClient client;
    private ProductDetails details;
    /** The purchase call waiting for Google Play's result. */
    private PluginCall pendingPurchase;

    @Override
    public void load() {
        client = BillingClient.newBuilder(getContext())
            .setListener(this)
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .enableAutoServiceReconnection()
            .build();
    }

    @Override
    protected void handleOnDestroy() {
        if (client != null) client.endConnection();
    }

    private void whenReady(PluginCall call, Runnable task) {
        if (client.isReady()) {
            task.run();
            return;
        }
        client.startConnection(
            new BillingClientStateListener() {
                @Override
                public void onBillingSetupFinished(BillingResult result) {
                    if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) task.run();
                    else call.reject("Google Play billing is unavailable: " + result.getDebugMessage(), "UNAVAILABLE");
                }

                @Override
                public void onBillingServiceDisconnected() {
                    // enableAutoServiceReconnection reconnects on the next request.
                }
            }
        );
    }

    private void loadDetails(PluginCall call, Runnable then) {
        if (details != null) {
            then.run();
            return;
        }
        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
            .setProductList(
                Collections.singletonList(
                    QueryProductDetailsParams.Product.newBuilder().setProductId(PRODUCT_ID).setProductType(BillingClient.ProductType.INAPP).build()
                )
            )
            .build();
        client.queryProductDetailsAsync(params, (result, query) -> {
            List<ProductDetails> list = query.getProductDetailsList();
            if (result.getResponseCode() == BillingClient.BillingResponseCode.OK && !list.isEmpty()) details = list.get(0);
            then.run();
        });
    }

    /** Whether this Google account owns Pro (or has a payment pending), plus the localised price. */
    @PluginMethod
    public void getStatus(PluginCall call) {
        whenReady(call, () ->
            loadDetails(call, () ->
                client.queryPurchasesAsync(
                    QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build(),
                    (result, purchases) -> {
                        if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                            call.reject("Couldn't check purchases: " + result.getDebugMessage(), "UNAVAILABLE");
                            return;
                        }
                        boolean owned = false;
                        boolean pending = false;
                        for (Purchase p : purchases) {
                            if (!p.getProducts().contains(PRODUCT_ID)) continue;
                            if (p.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                                owned = true;
                                acknowledge(p);
                            } else if (p.getPurchaseState() == Purchase.PurchaseState.PENDING) {
                                pending = true;
                            }
                        }
                        JSObject status = new JSObject();
                        status.put("owned", owned);
                        status.put("pending", pending);
                        if (details != null && details.getOneTimePurchaseOfferDetails() != null) {
                            status.put("price", details.getOneTimePurchaseOfferDetails().getFormattedPrice());
                        }
                        call.resolve(status);
                    }
                )
            )
        );
    }

    /** Opens Google Play's purchase sheet. Resolves with purchased, pending or cancelled. */
    @PluginMethod
    public void purchase(PluginCall call) {
        whenReady(call, () ->
            loadDetails(call, () -> {
                if (details == null) {
                    call.reject("Pro isn't available to buy yet.", "PRODUCT_UNAVAILABLE");
                    return;
                }
                BillingFlowParams.ProductDetailsParams.Builder product = BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(details);
                if (details.getOneTimePurchaseOfferDetails() != null && details.getOneTimePurchaseOfferDetails().getOfferToken() != null) {
                    product.setOfferToken(details.getOneTimePurchaseOfferDetails().getOfferToken());
                }
                BillingFlowParams params = BillingFlowParams.newBuilder().setProductDetailsParamsList(Collections.singletonList(product.build())).build();
                getActivity().runOnUiThread(() -> {
                    BillingResult result = client.launchBillingFlow(getActivity(), params);
                    int code = result.getResponseCode();
                    if (code == BillingClient.BillingResponseCode.OK) {
                        call.setKeepAlive(true);
                        pendingPurchase = call;
                    } else if (code == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) {
                        resolvePurchase(call, "purchased");
                    } else {
                        call.reject("Couldn't open Google Play: " + result.getDebugMessage(), "UNAVAILABLE");
                    }
                });
            })
        );
    }

    @Override
    public void onPurchasesUpdated(BillingResult result, List<Purchase> purchases) {
        PluginCall call = pendingPurchase;
        pendingPurchase = null;
        int code = result.getResponseCode();
        String status;
        if (code == BillingClient.BillingResponseCode.USER_CANCELED) {
            status = "cancelled";
        } else if (code == BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED) {
            status = "purchased";
        } else if (code == BillingClient.BillingResponseCode.OK && purchases != null) {
            status = "cancelled";
            for (Purchase p : purchases) {
                if (!p.getProducts().contains(PRODUCT_ID)) continue;
                if (p.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                    acknowledge(p);
                    status = "purchased";
                } else if (p.getPurchaseState() == Purchase.PurchaseState.PENDING) {
                    status = "pending";
                }
            }
        } else {
            if (call != null) {
                call.setKeepAlive(false);
                call.reject("Purchase failed: " + result.getDebugMessage(), "FAILED");
            }
            return;
        }
        if (call != null) resolvePurchase(call, status);
        else notifyListeners("updated", new JSObject()); // e.g. a pending payment completed later
    }

    private void resolvePurchase(PluginCall call, String status) {
        call.setKeepAlive(false);
        JSObject result = new JSObject();
        result.put("status", status);
        call.resolve(result);
    }

    private void acknowledge(Purchase purchase) {
        if (purchase.isAcknowledged()) return;
        client.acknowledgePurchase(
            AcknowledgePurchaseParams.newBuilder().setPurchaseToken(purchase.getPurchaseToken()).build(),
            ack -> {}
        );
    }
}
