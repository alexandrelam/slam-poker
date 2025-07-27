import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { getEmojiEnabled, saveEmojiEnabled } from "../lib/userStorage";

interface UserPreferencesContextType {
  emojiEnabled: boolean;
  toggleEmoji: () => void;
}

const UserPreferencesContext = createContext<
  UserPreferencesContextType | undefined
>(undefined);

export function UserPreferencesProvider({ children }: { children: ReactNode }) {
  const [emojiEnabled, setEmojiEnabled] = useState<boolean>(() => {
    // Initialize from localStorage
    return getEmojiEnabled();
  });

  useEffect(() => {
    // Save to localStorage whenever the preference changes
    saveEmojiEnabled(emojiEnabled);
  }, [emojiEnabled]);

  const toggleEmoji = () => {
    setEmojiEnabled((prev) => !prev);
  };

  return (
    <UserPreferencesContext.Provider value={{ emojiEnabled, toggleEmoji }}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  const context = useContext(UserPreferencesContext);
  if (context === undefined) {
    throw new Error(
      "useUserPreferences must be used within a UserPreferencesProvider",
    );
  }
  return context;
}
