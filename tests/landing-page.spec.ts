import { test } from "@playwright/test";
import { LandingPage } from "./page-objects/landing-page";

test.describe("Landing Page", () => {
  test("Should create a room", async ({ page }) => {
    const landingPage = new LandingPage(page);

    await landingPage.goto();
    await landingPage.verifyPageElements();
    await landingPage.createRoomWithName("Alex");
    await landingPage.verifyRedirectToGameRoom();
  });
});
