import { expect, test } from '@playwright/test';

/**
 * The primary path, once: list -> detail -> transition -> new status renders.
 */
test.beforeEach(async ({ page }) => {
  await page.goto('/');
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
});
