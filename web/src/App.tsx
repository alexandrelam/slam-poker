import { AppProvider, useApp } from "./context/AppContext";
import { LandingScreen } from "./screens/LandingScreen";
import { GameRoomScreen } from "./screens/GameRoomScreen";
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
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
