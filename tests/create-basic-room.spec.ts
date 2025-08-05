import { test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("create basic room", async ({ page }) => {
  await page.getByRole("button", { name: "Create Room" }).click();
  await page.getByRole("textbox", { name: "Your Name" }).click();
  await page.getByRole("textbox", { name: "Your Name" }).fill("alex");
  await page
    .locator("form")
    .getByRole("button", { name: "Create Room" })
    .click();
  await page.getByRole("button", { name: "1" }).click();
  await page.getByRole("button", { name: "Start" }).click();
  await page.getByRole("button", { name: "Reveal Votes" }).click();
  await page.getByRole("button", { name: "Next Round" }).click();
});
