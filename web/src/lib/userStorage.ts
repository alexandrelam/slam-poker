const USERNAME_KEY = "slam-poker-username";
const USER_ID_KEY = "slam-poker-user-id";
const EMOJI_ENABLED_KEY = "slam-poker-emoji-enabled";

// Username functions
export function saveUsername(username: string): void {
  try {
    localStorage.setItem(USERNAME_KEY, username.trim());
  } catch (error) {
    console.warn("Failed to save username to localStorage:", error);
  }
}

export function getStoredUsername(): string | null {
  try {
    const username = localStorage.getItem(USERNAME_KEY);
    return username?.trim() || null;
  } catch (error) {
    console.warn("Failed to retrieve username from localStorage:", error);
    return null;
  }
}

export function removeStoredUsername(): void {
  try {
    localStorage.removeItem(USERNAME_KEY);
  } catch (error) {
    console.warn("Failed to remove username from localStorage:", error);
  }
}

// User ID functions
function generateUserId(): string {
  // Generate a random UUID-like string
  return (
    "user_" +
    Math.random().toString(36).substr(2, 9) +
    "_" +
    Date.now().toString(36)
  );
}

export function getOrCreateUserId(): string {
  try {
    let userId = localStorage.getItem(USER_ID_KEY);

    if (!userId) {
      userId = generateUserId();
      localStorage.setItem(USER_ID_KEY, userId);
      console.log("Generated new user ID:", userId);
    } else {
      console.log("Using existing user ID:", userId);
    }

    return userId;
  } catch (error) {
    console.warn("Failed to get/create user ID from localStorage:", error);
    // Fallback to session-only ID if localStorage fails
    return generateUserId();
  }
}

export function getStoredUserId(): string | null {
  try {
    return localStorage.getItem(USER_ID_KEY);
  } catch (error) {
    console.warn("Failed to retrieve user ID from localStorage:", error);
    return null;
  }
}

export function removeStoredUserId(): void {
  try {
    localStorage.removeItem(USER_ID_KEY);
  } catch (error) {
    console.warn("Failed to remove user ID from localStorage:", error);
  }
}

// Emoji preference functions
export function saveEmojiEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(EMOJI_ENABLED_KEY, enabled.toString());
  } catch (error) {
    console.warn("Failed to save emoji preference to localStorage:", error);
  }
}

export function getEmojiEnabled(): boolean {
  try {
    const stored = localStorage.getItem(EMOJI_ENABLED_KEY);
    // Default to true (enabled) if no preference is stored
    return stored === null ? true : stored === "true";
  } catch (error) {
    console.warn(
      "Failed to retrieve emoji preference from localStorage:",
      error,
    );
    return true; // Default to enabled
  }
}

export function removeEmojiEnabled(): void {
  try {
    localStorage.removeItem(EMOJI_ENABLED_KEY);
  } catch (error) {
    console.warn("Failed to remove emoji preference from localStorage:", error);
  }
}

// Clear all user data
export function clearAllUserData(): void {
  removeStoredUsername();
  removeStoredUserId();
  removeEmojiEnabled();
}
