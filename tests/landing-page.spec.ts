import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test.describe("Landing Page", () => {
  test("Should create a room", async ({ page }) => {
    await expect(page.getByText('Connected')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Room' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Join Room' })).toHaveCount(2);

    await expect(page.getByRole('link', { name: 'Open source on GitHub' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open source on GitHub' })).toBeVisible();

    await expect(page.getByText('Enter the room code shared by')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Room Code' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Your Name' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Join Room' })).toHaveCount(2);



    await page.getByRole('button', { name: 'Create Room' }).click();
    await page.getByRole('textbox', { name: 'Your Name' }).click();
    await page.getByRole('textbox', { name: 'Your Name' }).fill('Alex');
    await page.locator('form').getByRole('button',
      { name: 'Create Room' }).click();

    await expect(page.getByText('Choose Your Estimate')).toBeVisible();
  });
});
