/**
 * The in-memory replacement for a datastore.
 *
 */

import { purchaseOrders, type PurchaseOrder } from '@/data/purchase-orders';

const globalForStore = globalThis as unknown as { purchaseOrderStore?: PurchaseOrder[] };

function store(): PurchaseOrder[] {
  globalForStore.purchaseOrderStore ??= structuredClone(purchaseOrders);
  return globalForStore.purchaseOrderStore;
}

export function listPurchaseOrders(): PurchaseOrder[] {
  return store();
}

export function getPurchaseOrder(poNumber: string): PurchaseOrder | undefined {
  return store().find((po) => po.poNumber === poNumber);
}

export function savePurchaseOrder(updated: PurchaseOrder): void {
  const orders = store();
  const index = orders.findIndex((po) => po.poNumber === updated.poNumber);
  if (index === -1) return;
  orders[index] = updated;
}

/** Drops every mutation and returns to the committed seed. */
export function resetPurchaseOrders(): void {
  globalForStore.purchaseOrderStore = structuredClone(purchaseOrders);
}
