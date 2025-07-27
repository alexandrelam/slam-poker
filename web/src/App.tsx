import { Routes, Route } from "react-router-dom";
import { AppProvider, useApp } from "./context/AppContext";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { LandingScreen } from "./screens/LandingScreen";
import { DirectJoinScreen } from "./screens/DirectJoinScreen";
import { GameRoomScreen } from "./screens/GameRoomScreen";
import { BackgroundCanvas } from "./components/BackgroundCanvas";
import { Separator } from "./components/ui/separator";
import { Github, Heart } from "lucide-react";
import { AppScreen } from "./types";

function AppContent() {
  const { state } = useApp();

  // If we're in a room, show the game room screen regardless of URL
  if (state.currentScreen === AppScreen.ROOM) {
    return <GameRoomScreen />;
  }

  // Otherwise, use URL-based routing
  return (
    <Routes>
      <Route path="/" element={<LandingScreen />} />
      <Route path="/:roomCode" element={<DirectJoinScreen />} />
    </Routes>
  );
}

function AppWrapper() {
  const { theme } = useTheme();

  return (
    <div className="relative min-h-screen flex flex-col">
      <BackgroundCanvas isDark={theme === "dark"} />
      <div className="relative z-10 flex-1">
        <AppContent />
      </div>
      <footer className="relative z-10 py-4 text-center text-sm text-muted-foreground">
        <Separator className="mb-4" />
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2">
            <Github className="w-4 h-4" />
            <a
              href="https://github.com/alexandrelam/slam-poker"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 transition-colors underline underline-offset-4"
            >
              Open source on GitHub
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-red-500" />
            <span>
              Made with love by{" "}
              <a
                href="https://github.com/alexandrelam"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 transition-colors underline underline-offset-4"
              >
                Alexandre Lam
              </a>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <AppWrapper />
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
