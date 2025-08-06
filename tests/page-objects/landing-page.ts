import { Page, Locator, expect } from "@playwright/test";

export class LandingPage {
  readonly page: Page;

  // Element locators
  private readonly connectedStatus: Locator;
  private readonly createRoomButton: Locator;
  private readonly joinRoomButtons: Locator;
  private readonly githubLink: Locator;
  private readonly instructionsText: Locator;
  private readonly roomCodeInput: Locator;
  private readonly nameInput: Locator;
  private readonly formCreateRoomButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.connectedStatus = page.getByText("Connected");
    this.createRoomButton = page.getByRole("button", { name: "Create Room" });
    this.joinRoomButtons = page.getByRole("button", { name: "Join Room" });
    this.githubLink = page.getByRole("link", { name: "Open source on GitHub" });
    this.instructionsText = page.getByText("Enter the room code shared by");
    this.roomCodeInput = page.getByRole("textbox", { name: "Room Code" });
    this.nameInput = page.getByRole("textbox", { name: "Your Name" });
    this.formCreateRoomButton = page
      .locator("form")
      .getByRole("button", { name: "Create Room" });
  }

  async goto(): Promise<void> {
    await this.page.goto("/");
  }

  async verifyPageElements(): Promise<void> {
    await expect(this.connectedStatus).toBeVisible();
    await expect(this.createRoomButton).toBeVisible();
    await expect(this.joinRoomButtons).toHaveCount(2);
    await expect(this.githubLink).toBeVisible();
    await expect(this.instructionsText).toBeVisible();
    await expect(this.roomCodeInput).toBeVisible();
    await expect(this.nameInput).toBeVisible();
  }

  async clickCreateRoom(): Promise<void> {
    await this.createRoomButton.click();
  }

  async fillName(name: string): Promise<void> {
    await this.nameInput.click();
    await this.nameInput.fill(name);
  }

  async submitCreateRoom(): Promise<void> {
    await this.formCreateRoomButton.click();
  }

  async createRoomWithName(name: string): Promise<void> {
    await this.clickCreateRoom();
    await this.fillName(name);
    await this.submitCreateRoom();
  }

  async verifyRedirectToGameRoom(): Promise<void> {
    await expect(this.page.getByText("Choose Your Estimate")).toBeVisible();
  }
}
