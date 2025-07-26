import { createContext, useContext, useReducer, useEffect } from "react";
import type { ReactNode } from "react";
import type {
  AppState,
  User,
  Room,
  FibonacciCard,
  UIRoom,
  UIUser,
} from "../types";
import { AppScreen, ConnectionStatus } from "../types";
import { socketService } from "../services/socketService";

// Initial state
const initialState: AppState = {
  currentScreen: AppScreen.LANDING,
  currentUser: null,
  currentRoom: null,
  connectionStatus: ConnectionStatus.DISCONNECTED,
  error: null,
  isLoading: false,
};

// Action types
type AppAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_CONNECTION_STATUS"; payload: ConnectionStatus }
  | { type: "SET_SCREEN"; payload: AppScreen }
  | { type: "SET_USER"; payload: User | null }
  | { type: "SET_ROOM"; payload: Room | null }
  | { type: "UPDATE_ROOM"; payload: Room }
  | { type: "USER_JOINED"; payload: { user: User; room: Room } }
  | { type: "USER_LEFT"; payload: { userId: string; room: Room } }
  | {
      type: "VOTE_CAST";
      payload: { userId: string; hasVoted: boolean; room: Room };
    }
  | { type: "VOTES_REVEALED"; payload: { room: Room } }
  | { type: "ROUND_RESET"; payload: { room: Room } };

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload, isLoading: false };

    case "SET_CONNECTION_STATUS":
      return { ...state, connectionStatus: action.payload };

    case "SET_SCREEN":
      return { ...state, currentScreen: action.payload };

    case "SET_USER":
      return { ...state, currentUser: action.payload };

    case "SET_ROOM":
      return { ...state, currentRoom: action.payload };

    case "UPDATE_ROOM":
    case "USER_JOINED":
    case "USER_LEFT":
    case "VOTE_CAST":
    case "VOTES_REVEALED":
    case "ROUND_RESET":
      return { ...state, currentRoom: action.payload.room || action.payload };

    default:
      return state;
  }
}

// Context type
interface AppContextType {
  state: AppState;
  actions: {
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    connectSocket: () => Promise<void>;
    joinRoom: (roomCode: string, userName: string) => void;
    createRoom: (userName: string) => void;
    vote: (vote: FibonacciCard) => void;
    revealVotes: () => void;
    nextRound: () => void;
    getCurrentRoom: () => UIRoom | null;
    isUserFacilitator: () => boolean;
    hasUserVoted: () => boolean;
    canRevealVotes: () => boolean;
  };
}

// Create context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Context provider
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Helper functions
  const convertToUIRoom = (room: Room): UIRoom => {
    const uiUsers: UIUser[] = room.users.map((user) => ({
      ...user,
      hasVoted: !!user.currentVote,
    }));

    return {
      ...room,
      users: uiUsers,
      allVoted: uiUsers.every((user) => user.hasVoted),
      facilitatorId: uiUsers[0]?.id, // First user is facilitator
    };
  };

  // Socket event handlers
  useEffect(() => {
    const setupSocketListeners = () => {
      socketService.on("user-joined", (data) => {
        dispatch({ type: "USER_JOINED", payload: data });
      });

      socketService.on("user-left", (data) => {
        dispatch({ type: "USER_LEFT", payload: data });
      });

      socketService.on("vote-cast", (data) => {
        dispatch({ type: "VOTE_CAST", payload: data });
      });

      socketService.on("votes-revealed", (data) => {
        dispatch({ type: "VOTES_REVEALED", payload: data });
      });

      socketService.on("round-reset", (data) => {
        dispatch({ type: "ROUND_RESET", payload: data });
      });

      socketService.on("error", (data) => {
        dispatch({ type: "SET_ERROR", payload: data.message });
      });

      socketService.on("room-not-found", () => {
        dispatch({ type: "SET_ERROR", payload: "Room not found" });
      });

      socketService.on("invalid-vote", () => {
        dispatch({ type: "SET_ERROR", payload: "Invalid vote" });
      });
    };

    if (socketService.isConnected()) {
      setupSocketListeners();
    }

    return () => {
      socketService.removeAllListeners();
    };
  }, [state.connectionStatus]);

  // Actions
  const actions: AppContextType["actions"] = {
    setLoading: (loading: boolean) => {
      dispatch({ type: "SET_LOADING", payload: loading });
    },

    setError: (error: string | null) => {
      dispatch({ type: "SET_ERROR", payload: error });
    },

    connectSocket: async () => {
      try {
        dispatch({ type: "SET_LOADING", payload: true });
        dispatch({
          type: "SET_CONNECTION_STATUS",
          payload: ConnectionStatus.CONNECTING,
        });

        await socketService.connect();

        dispatch({
          type: "SET_CONNECTION_STATUS",
          payload: ConnectionStatus.CONNECTED,
        });
        dispatch({ type: "SET_ERROR", payload: null });
      } catch (error) {
        dispatch({
          type: "SET_CONNECTION_STATUS",
          payload: ConnectionStatus.ERROR,
        });
        dispatch({ type: "SET_ERROR", payload: "Failed to connect to server" });
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },

    joinRoom: (roomCode: string, userName: string) => {
      try {
        dispatch({ type: "SET_LOADING", payload: true });
        socketService.joinRoom(roomCode, userName);

        // Listen for successful join
        socketService.on("user-joined", (data) => {
          if (data.user.name === userName) {
            dispatch({ type: "SET_USER", payload: data.user });
            dispatch({ type: "SET_ROOM", payload: data.room });
            dispatch({ type: "SET_SCREEN", payload: AppScreen.ROOM });
            dispatch({ type: "SET_LOADING", payload: false });
          }
        });
      } catch (error) {
        dispatch({ type: "SET_ERROR", payload: "Failed to join room" });
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },

    createRoom: (userName: string) => {
      // For create room, we'll generate a random room code and join it
      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      actions.joinRoom(roomCode, userName);
    },

    vote: (vote: FibonacciCard) => {
      try {
        socketService.vote(vote);
      } catch (error) {
        dispatch({ type: "SET_ERROR", payload: "Failed to cast vote" });
      }
    },

    revealVotes: () => {
      try {
        socketService.revealVotes();
      } catch (error) {
        dispatch({ type: "SET_ERROR", payload: "Failed to reveal votes" });
      }
    },

    nextRound: () => {
      try {
        socketService.nextRound();
      } catch (error) {
        dispatch({ type: "SET_ERROR", payload: "Failed to start next round" });
      }
    },

    getCurrentRoom: (): UIRoom | null => {
      return state.currentRoom ? convertToUIRoom(state.currentRoom) : null;
    },

    isUserFacilitator: (): boolean => {
      const room = actions.getCurrentRoom();
      return room?.facilitatorId === state.currentUser?.id;
    },

    hasUserVoted: (): boolean => {
      return !!state.currentUser?.currentVote;
    },

    canRevealVotes: (): boolean => {
      const room = actions.getCurrentRoom();
      if (!room) return false;

      return (
        actions.isUserFacilitator() && (room.allVoted || room.votesRevealed)
      );
    },
  };

  return (
    <AppContext.Provider value={{ state, actions }}>
      {children}
    </AppContext.Provider>
  );
}

// Custom hook to use the context
export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
