import { expect, test } from '@playwright/test';

/**
 * Two paths: the transition primary path, and the create/edit/delete round trip.
 *
 * Both run against the same in-memory store, so both lean on the reset fixture
 * below rather than on each other's leftovers.
 */
test.beforeEach(async ({ page }) => {
  // Reading is public: the list renders for a signed-out visitor, and it offers
  // no way to change anything.
  await page.goto('/');
  await expect(page.getByTestId('po-row-PO-2026-0948')).toBeVisible();
  await expect(page.getByTestId('new-po')).toHaveCount(0);
  await expect(page.getByTestId('transition-receive')).toHaveCount(0);

  // Middleware no longer covers the JSON export, so the handler's own session
  // check is the only thing in front of it. Asserted here because nothing else
  // in the run would notice if it stopped holding.
  const anonymous = await page.request.get('/api/purchase-orders', { maxRedirects: 0 });
  expect(anonymous.status()).toBe(401);

  // The rest of the run needs an account.
  await page.getByTestId('sign-in-link').click();
  await page.getByLabel('Email').fill('ops@savannah.example');
  await page.getByLabel('Password').fill('inbound');
  await page.getByTestId('sign-in').click();

  await page.getByRole('button', { name: 'Reset demo data' }).click();
  await expect(page.getByTestId('po-row-PO-2026-0948')).toBeVisible();
});

test('an in-transit PO can be received from its detail page', async ({ page }) => {
  // PO-2026-0948 sailed and is 16 days past its ETA: in transit and overdue.
  const row = page.getByTestId('po-row-PO-2026-0948');
  await expect(row.getByTestId('status')).toHaveText('In transit');
  await expect(row.getByTestId('attention')).toHaveText('Overdue 16d');

  await row.getByRole('link', { name: 'PO-2026-0948' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'PO-2026-0948' })).toBeVisible();
  await expect(page.getByTestId('status').first()).toHaveText('In transit');

  await page.getByTestId('transition-receive').click();

  await expect(page.getByTestId('status').first()).toHaveText('Received');
  await expect(page.getByTestId('attention-banner')).toHaveCount(0);
  await expect(page.getByText('This PO is closed and has no transitions left.')).toBeVisible();

  // And the list agrees, because the action revalidated it.
  await page.getByRole('link', { name: 'All purchase orders' }).click();
  await expect(
    page.getByTestId('po-row-PO-2026-0948').getByTestId('status'),
  ).toHaveText('Received');

  // The JSON export reports live store state, not the committed seed, which has
  // this PO as `in_transit`.
  const exported = await page.evaluate(async () => {
    const response = await fetch('/api/purchase-orders');
    return { status: response.status, body: await response.json() };
  });
  expect(exported.status).toBe(200);
  expect(
    exported.body.purchaseOrders.find(
      (po: { poNumber: string }) => po.poNumber === 'PO-2026-0948',
    ).status,
  ).toBe('received');
});

test('a PO can be raised, edited and deleted', async ({ page }) => {
  await page.getByTestId('new-po').click();

  await page.getByLabel('PO number').fill('PO-2026-1099');
  await page.getByLabel('Order date').fill('2026-08-24');
  await page.getByLabel('Vendor', { exact: true }).fill('Panipat Home Mills');
  await page.getByLabel('Brand', { exact: true }).fill('Hearth & Loom');
  await page.getByLabel('Load port').fill('Mundra, India');
  await page.getByLabel('Discharge port').fill('Savannah, GA');
  await page.getByLabel('SKU 1').fill('HL-BLK-320');
  await page.getByLabel('Description', { exact: true }).fill('320gsm cotton blanket, oat');
  await page.getByLabel('Quantity', { exact: true }).fill('1800');
  await page.getByLabel('Unit cost', { exact: true }).fill('11.40');
  await page.getByTestId('create-submit').click();

  // Create lands on the new PO, and it is a draft.
  await expect(page.getByRole('heading', { level: 1, name: 'PO-2026-1099' })).toBeVisible();
  await expect(page.getByTestId('status').first()).toHaveText('Draft');
  await expect(page.getByText('320gsm cotton blanket, oat')).toBeVisible();

  await page.getByTestId('edit-po').click();
  await expect(page.getByRole('heading', { level: 1, name: 'Edit PO-2026-1099' })).toBeVisible();

  // A commercial field, a line quantity and a logistics field in one save.
  await page.getByLabel('Vendor', { exact: true }).fill('Panipat Home Mills Unit 2');
  await page.getByLabel('Quantity', { exact: true }).fill('2100');
  await page.getByLabel(/Booked ETA/).fill('2026-10-05');
  await page.getByTestId('edit-submit').click();

  await expect(page.getByRole('heading', { level: 1, name: 'PO-2026-1099' })).toBeVisible();
  await expect(page.getByText('Panipat Home Mills Unit 2')).toBeVisible();
  await expect(page.getByText('2,100', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Oct 5, 2026')).toBeVisible();
  // The edit wrote an ETA and nothing else. The PO is still a draft.
  await expect(page.getByTestId('status').first()).toHaveText('Draft');

  // A confirmed PO has a commitment behind it, so it offers no delete.
  await page.goto('/purchase-orders/PO-2026-1018/edit');
  await expect(page.getByTestId('delete-submit')).toHaveCount(0);

  await page.goto('/purchase-orders/PO-2026-1099/edit');
  await page.getByTestId('delete-submit').click();

  await expect(page.getByRole('heading', { level: 1, name: 'All POs' })).toBeVisible();
  await expect(page.getByTestId('po-row-PO-2026-1099')).toHaveCount(0);
});
