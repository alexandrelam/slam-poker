import { Page, Locator, expect } from '@playwright/test';

export interface FeaturesContent {
  realtime: string | null;
  fibonacci: string | null;
  participants: string | null;
  noRegistration: string | null;
}

export interface FormData {
  roomCode: string;
  playerName: string;
}

export class LandingPage {
  readonly page: Page;

  // Header elements
  readonly logo: Locator;
  readonly connectionStatus: Locator;

  // Main action buttons
  readonly joinRoomButton: Locator;
  readonly createRoomButton: Locator;

  // Form elements
  readonly roomCodeInput: Locator;
  readonly playerNameInput: Locator;
  readonly joinButton: Locator;

  // Form labels and descriptions
  readonly roomCodeLabel: Locator;
  readonly playerNameLabel: Locator;
  readonly formDescription: Locator;

  // Features section
  readonly featuresSection: Locator;
  readonly featuresTitle: Locator;
  readonly realtimeFeature: Locator;
  readonly fibonacciFeature: Locator;
  readonly participantsFeature: Locator;
  readonly noRegistrationFeature: Locator;

  // Footer elements
  readonly footer: Locator;
  readonly githubLink: Locator;
  readonly authorLink: Locator;
  readonly madeWithLoveText: Locator;

  constructor(page: Page) {
    this.page = page;

    // Header elements
    this.logo = page.locator('img[alt="SLAM Poker"]');
    this.connectionStatus = page.getByText('Connecting...');

    // Main action buttons
    this.joinRoomButton = page.getByRole('button', { name: 'Join Room' });
    this.createRoomButton = page.getByRole('button', { name: 'Create Room' });

    // Form elements
    this.roomCodeInput = page.getByRole('textbox', { name: /room code/i });
    this.playerNameInput = page.getByRole('textbox', { name: /your name|name/i });
    this.joinButton = page.getByRole('button', { name: /joining/i });

    // Form labels and descriptions
    this.roomCodeLabel = page.getByText('Room Code');
    this.playerNameLabel = page.getByText('Your Name');
    this.formDescription = page.getByText('Enter the room code shared by your team');

    // Features section
    this.featuresSection = page.locator('[data-testid="features"]').or(
      page.locator('.features')
    ).or(
      page.locator('section').filter({ hasText: 'Features' })
    );
    this.featuresTitle = page.getByText('Features');
    this.realtimeFeature = page.getByText('Real-time collaborative voting');
    this.fibonacciFeature = page.getByText('Fibonacci sequence estimation');
    this.participantsFeature = page.getByText('Up to 10 participants per room');
    this.noRegistrationFeature = page.getByText('No registration required');

    // Footer elements
    this.footer = page.locator('contentinfo, footer');
    this.githubLink = page.getByRole('link', { name: 'Open source on GitHub' });
    this.authorLink = page.getByRole('link', { name: 'Alexandre Lam' });
    this.madeWithLoveText = page.getByText('Made with love by');
  }

  // Navigation methods
  async navigateTo(): Promise<void> {
    await this.page.goto('/');
    await this.waitForPageLoad();
  }

  // Action methods
  async clickJoinRoom(): Promise<void> {
    await this.joinRoomButton.click();
  }

  async clickCreateRoom(): Promise<void> {
    await this.createRoomButton.click();
  }

  async enterRoomCode(code: string): Promise<void> {
    await this.roomCodeInput.fill(code);
  }

  async enterPlayerName(name: string): Promise<void> {
    await this.playerNameInput.fill(name);
  }

  async submitJoinForm(): Promise<void> {
    await this.joinButton.click();
  }

  async joinRoomWithDetails(formData: FormData): Promise<void> {
    await this.enterRoomCode(formData.roomCode);
    await this.enterPlayerName(formData.playerName);
    await this.submitJoinForm();
  }

  // Verification methods
  async isLogoVisible(): Promise<boolean> {
    return await this.logo.isVisible();
  }

  async getConnectionStatus(): Promise<string | null> {
    return await this.connectionStatus.textContent();
  }

  async isJoinRoomButtonEnabled(): Promise<boolean> {
    return await this.joinRoomButton.isEnabled();
  }

  async isCreateRoomButtonEnabled(): Promise<boolean> {
    return await this.createRoomButton.isEnabled();
  }

  async isRoomCodeInputEnabled(): Promise<boolean> {
    return await this.roomCodeInput.isEnabled();
  }

  async isPlayerNameInputEnabled(): Promise<boolean> {
    return await this.playerNameInput.isEnabled();
  }

  async isJoinButtonEnabled(): Promise<boolean> {
    return await this.joinButton.isEnabled();
  }

  async areFormInputsDisabled(): Promise<boolean> {
    const [roomCodeDisabled, playerNameDisabled, joinButtonDisabled] = await Promise.all([
      this.roomCodeInput.isDisabled(),
      this.playerNameInput.isDisabled(),
      this.joinButton.isDisabled()
    ]);

    return roomCodeDisabled && playerNameDisabled && joinButtonDisabled;
  }

  // Content verification methods
  async getFeaturesContent(): Promise<FeaturesContent> {
    const [realtime, fibonacci, participants, noRegistration] = await Promise.all([
      this.realtimeFeature.textContent(),
      this.fibonacciFeature.textContent(),
      this.participantsFeature.textContent(),
      this.noRegistrationFeature.textContent()
    ]);

    return {
      realtime,
      fibonacci,
      participants,
      noRegistration
    };
  }

  async isFeaturesSectionVisible(): Promise<boolean> {
    return await this.featuresSection.isVisible();
  }

  async isFooterVisible(): Promise<boolean> {
    return await this.footer.isVisible();
  }

  async getGithubLinkUrl(): Promise<string | null> {
    return await this.githubLink.getAttribute('href');
  }

  async getAuthorLinkUrl(): Promise<string | null> {
    return await this.authorLink.getAttribute('href');
  }

  // Wait methods
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await this.logo.waitFor({ state: 'visible' });
  }

  async waitForConnectionStatus(expectedStatus: string = 'Connected', timeout: number = 10000): Promise<void> {
    await this.page.waitForFunction(
      (status) => document.body.textContent?.includes(status) ?? false,
      expectedStatus,
      { timeout }
    );
  }

  async waitForFormToBeEnabled(): Promise<void> {
    await Promise.all([
      this.roomCodeInput.waitFor({ state: 'visible' }),
      this.playerNameInput.waitFor({ state: 'visible' }),
      this.joinButton.waitFor({ state: 'visible' })
    ]);

    await expect(this.roomCodeInput).toBeEnabled();
    await expect(this.playerNameInput).toBeEnabled();
    await expect(this.joinButton).toBeEnabled();
  }

  // Page state methods
  async getPageTitle(): Promise<string> {
    return await this.page.title();
  }

  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  async takeScreenshot(name: string = 'landing-page'): Promise<Buffer> {
    return await this.page.screenshot({
      path: `screenshots/${name}.png`,
      fullPage: true
    });
  }

  // Assertion helpers for better test readability
  async expectPageToBeLoaded(): Promise<void> {
    await expect(this.logo).toBeVisible();
    await expect(this.joinRoomButton).toBeVisible();
    await expect(this.createRoomButton).toBeVisible();
  }

  async expectFormToBeDisabled(): Promise<void> {
    await expect(this.roomCodeInput).toBeDisabled();
    await expect(this.playerNameInput).toBeDisabled();
    await expect(this.joinButton).toBeDisabled();
  }

  async expectFormToBeEnabled(): Promise<void> {
    await expect(this.roomCodeInput).toBeEnabled();
    await expect(this.playerNameInput).toBeEnabled();
    await expect(this.joinButton).toBeEnabled();
  }

  async expectFeaturesToBeVisible(): Promise<void> {
    await expect(this.featuresSection).toBeVisible();
    await expect(this.realtimeFeature).toBeVisible();
    await expect(this.fibonacciFeature).toBeVisible();
    await expect(this.participantsFeature).toBeVisible();
    await expect(this.noRegistrationFeature).toBeVisible();
  }

  async expectFooterLinksToBeValid(): Promise<void> {
    await expect(this.githubLink).toHaveAttribute('href', /github\.com/);
    await expect(this.authorLink).toHaveAttribute('href', /github\.com/);
  }
}
