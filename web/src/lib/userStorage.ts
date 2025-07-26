const USERNAME_KEY = "slam-poker-username";

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
