import { AppProvider, useApp } from "./context/AppContext";
import { ThemeProvider } from "./context/ThemeContext";
import { LandingScreen } from "./screens/LandingScreen";
import { GameRoomScreen } from "./screens/GameRoomScreen";
import { Separator } from "./components/ui/separator";
import { Github, Heart } from "lucide-react";
import { AppScreen } from "./types";

function AppContent() {
  const { state } = useApp();

  return (
    <>
      {state.currentScreen === AppScreen.LANDING && <LandingScreen />}
      {state.currentScreen === AppScreen.ROOM && <GameRoomScreen />}
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <div className="min-h-screen flex flex-col">
          <div className="flex-1">
            <AppContent />
          </div>
          <footer className="py-4 text-center text-sm text-muted-foreground">
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
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
