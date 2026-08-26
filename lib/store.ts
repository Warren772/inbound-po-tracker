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

/** Appends a new PO. False when that number is already on the book. */
export function addPurchaseOrder(po: PurchaseOrder): boolean {
  const orders = store();
  if (orders.some((existing) => existing.poNumber === po.poNumber)) return false;
  orders.push(po);
  return true;
}

/** Removes a PO. False when there was nothing there to remove. */
export function deletePurchaseOrder(poNumber: string): boolean {
  const orders = store();
  const index = orders.findIndex((po) => po.poNumber === poNumber);
  if (index === -1) return false;
  orders.splice(index, 1);
  return true;
}

/** Drops every mutation and returns to the committed seed. */
export function resetPurchaseOrders(): void {
  globalForStore.purchaseOrderStore = structuredClone(purchaseOrders);
}
