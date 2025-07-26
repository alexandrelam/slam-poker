const USERNAME_KEY = "slam-poker-username";
const USER_ID_KEY = "slam-poker-user-id";

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

// Clear all user data
export function clearAllUserData(): void {
  removeStoredUsername();
  removeStoredUserId();
}
