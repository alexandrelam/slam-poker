import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import type {
  AppState,
  User,
  Room,
  FibonacciCard,
  UIRoom,
  UIUser,
  RevealPermission,
  KickPermission,
} from "../types";
import { AppScreen, ConnectionStatus } from "../types";
import { socketService } from "../services/socketService";
import { getOrCreateUserId } from "../lib/userStorage";

// Initial state
const initialState: AppState = {
  currentScreen: AppScreen.LANDING,
  currentUser: null,
  currentRoom: null,
  connectionStatus: ConnectionStatus.DISCONNECTED,
  error: null,
  isLoading: false,
  isChangingName: false,
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
  | { type: "ROUND_RESET"; payload: { room: Room } }
  | { type: "ROOM_SETTINGS_UPDATED"; payload: { room: Room } }
  | {
      type: "NAME_CHANGED";
      payload: { userId: string; newName: string; room: Room };
    }
  | {
      type: "USER_KICKED";
      payload: { userId: string; userName: string; room: Room };
    }
  | { type: "SET_NAME_CHANGING"; payload: boolean }
  | { type: "ROOM_JOIN_FAILED"; payload: string }
  | { type: "RESET_TO_LANDING" };

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload, isLoading: false };

    case "SET_NAME_CHANGING":
      return { ...state, isChangingName: action.payload };

    case "SET_CONNECTION_STATUS":
      return { ...state, connectionStatus: action.payload };

    case "SET_SCREEN":
      return { ...state, currentScreen: action.payload };

    case "SET_USER":
      return { ...state, currentUser: action.payload };

    case "SET_ROOM":
      return { ...state, currentRoom: action.payload };

    case "UPDATE_ROOM":
      return { ...state, currentRoom: action.payload };

    case "USER_JOINED":
    case "USER_LEFT":
    case "USER_KICKED":
    case "VOTE_CAST":
    case "VOTES_REVEALED":
    case "ROUND_RESET":
    case "ROOM_SETTINGS_UPDATED":
    case "NAME_CHANGED":
      // Update current user if they changed their own name
      const nameChangedState = {
        ...state,
        currentRoom: action.payload.room,
        isChangingName: false, // Clear loading state
      };
      if (
        action.type === "NAME_CHANGED" &&
        state.currentUser &&
        action.payload.userId === state.currentUser.id
      ) {
        nameChangedState.currentUser = {
          ...state.currentUser,
          name: action.payload.newName,
        };
      }
      return nameChangedState;

    case "ROOM_JOIN_FAILED":
      return {
        ...state,
        error: action.payload,
        isLoading: false,
        currentScreen: AppScreen.LANDING,
      };

    case "RESET_TO_LANDING":
      return {
        ...initialState,
        connectionStatus: state.connectionStatus, // Keep connection status
      };

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
    startTimer: (duration?: number) => void;
    resetTimer: () => void;
    updateRoomSettings: (settings: {
      revealPermission?: RevealPermission;
      kickPermission?: KickPermission;
    }) => void;
    kickUser: (userIdToKick: string) => void;
    changeName: (newName: string) => void;
    getCurrentRoom: () => UIRoom | null;
    isUserFacilitator: () => boolean;
    hasUserVoted: () => boolean;
    canRevealVotes: () => boolean;
    canStartNextRound: () => boolean;
    canKickDisconnectedUsers: () => boolean;
    isNameChanging: () => boolean;
    leaveRoom: () => void;
    leaveRoomAndNavigateHome: () => void;
  };
}

// Create context
const AppContext = createContext<AppContextType | undefined>(undefined);

// Context provider
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const navigate = useNavigate();

  // Store timeout reference to prevent memory leaks
  const joinTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper functions
  const convertToUIRoom = (room: Room): UIRoom => {
    const uiUsers: UIUser[] = room.users.map((user) => ({
      ...user,
      hasVoted: !!user.currentVote,
    }));

    const onlineUsers = uiUsers.filter((user) => user.isOnline);
    const allUsersVoted = uiUsers.every((user) => user.hasVoted);
    const allOnlineUsersVoted =
      onlineUsers.length > 0 && onlineUsers.every((user) => user.hasVoted);

    return {
      ...room,
      users: uiUsers,
      allVoted: allUsersVoted,
      allOnlineVoted: allOnlineUsersVoted,
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

      socketService.on("user-kicked", (data) => {
        dispatch({ type: "USER_KICKED", payload: data });
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

      socketService.on("timer-started", (data) => {
        dispatch({ type: "UPDATE_ROOM", payload: data.room });
      });

      socketService.on("timer-stopped", (data) => {
        dispatch({ type: "UPDATE_ROOM", payload: data.room });
      });

      socketService.on("timer-reset", (data) => {
        dispatch({ type: "UPDATE_ROOM", payload: data.room });
      });

      socketService.on("room-settings-updated", (data) => {
        dispatch({ type: "ROOM_SETTINGS_UPDATED", payload: data });
      });

      socketService.on("name-changed", (data) => {
        dispatch({ type: "NAME_CHANGED", payload: data });
      });

      socketService.on("room-state", (data) => {
        const { room, reason } = data;

        // Handle initial room join/creation and reconnections
        if (reason === "initial-join" || reason === "reconnection-sync") {
          // Find current user in the room based on persistent userId
          const currentUserId = getOrCreateUserId();
          const currentUser = room.users.find(
            (u: any) => u.id === currentUserId,
          );

          if (currentUser) {
            // Clear any pending join timeout
            if (joinTimeoutRef.current) {
              clearTimeout(joinTimeoutRef.current);
              joinTimeoutRef.current = null;
            }

            dispatch({ type: "SET_USER", payload: currentUser });
            dispatch({ type: "SET_ROOM", payload: room });
            dispatch({ type: "SET_SCREEN", payload: AppScreen.ROOM });
            dispatch({ type: "SET_LOADING", payload: false });
            // Navigate to the room URL
            navigate(`/${room.code}`);
          } else {
            // Clear timeout on error
            if (joinTimeoutRef.current) {
              clearTimeout(joinTimeoutRef.current);
              joinTimeoutRef.current = null;
            }

            // User not found in room - this shouldn't happen but handle gracefully
            console.error("Room join failed: Current user not found in room", {
              reason,
              currentUserId,
              roomCode: room.code,
              roomUsers: room.users.map((u: any) => ({
                id: u.id,
                name: u.name,
              })),
            });
            dispatch({
              type: "SET_ERROR",
              payload: "Failed to join room - user not found",
            });
            dispatch({ type: "SET_LOADING", payload: false });
          }
        } else {
          // Handle state updates for existing room
          dispatch({ type: "UPDATE_ROOM", payload: room });
        }
      });

      socketService.on("error", (data) => {
        // Clear join timeout on any error
        if (joinTimeoutRef.current) {
          clearTimeout(joinTimeoutRef.current);
          joinTimeoutRef.current = null;
        }

        dispatch({ type: "SET_ERROR", payload: data.message });
        // Clear any pending loading states on error
        dispatch({ type: "SET_NAME_CHANGING", payload: false });
        dispatch({ type: "SET_LOADING", payload: false });
      });

      socketService.on("room-not-found", () => {
        dispatch({ type: "ROOM_JOIN_FAILED", payload: "Room not found" });
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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (joinTimeoutRef.current) {
        clearTimeout(joinTimeoutRef.current);
        joinTimeoutRef.current = null;
      }
    };
  }, []);

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
        // Clear any existing timeout
        if (joinTimeoutRef.current) {
          clearTimeout(joinTimeoutRef.current);
          joinTimeoutRef.current = null;
        }

        dispatch({ type: "SET_LOADING", payload: true });
        socketService.joinRoom(roomCode, userName);

        // Set a timeout to prevent being stuck on loading indefinitely
        joinTimeoutRef.current = setTimeout(() => {
          if (state.isLoading && state.currentScreen !== AppScreen.ROOM) {
            console.error("Join room timeout - no response from server");
            dispatch({
              type: "SET_ERROR",
              payload: "Join room timeout - please try again",
            });
            dispatch({ type: "SET_LOADING", payload: false });
            joinTimeoutRef.current = null;
          }
        }, 10000); // 10 second timeout

        // Note: Room joining is now handled by the global room-state event handler
      } catch (error) {
        // Clear timeout on immediate error
        if (joinTimeoutRef.current) {
          clearTimeout(joinTimeoutRef.current);
          joinTimeoutRef.current = null;
        }

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

    startTimer: (duration?: number) => {
      try {
        socketService.startTimer(duration);
      } catch (error) {
        dispatch({ type: "SET_ERROR", payload: "Failed to start timer" });
      }
    },

    resetTimer: () => {
      try {
        socketService.resetTimer();
      } catch (error) {
        dispatch({ type: "SET_ERROR", payload: "Failed to reset timer" });
      }
    },

    updateRoomSettings: (settings: {
      revealPermission?: RevealPermission;
      kickPermission?: KickPermission;
    }) => {
      try {
        socketService.updateRoomSettings(settings);
      } catch (error) {
        dispatch({
          type: "SET_ERROR",
          payload: "Failed to update room settings",
        });
      }
    },

    kickUser: (userIdToKick: string) => {
      try {
        socketService.kickUser(userIdToKick);
      } catch (error) {
        dispatch({ type: "SET_ERROR", payload: "Failed to kick user" });
      }
    },

    changeName: (newName: string) => {
      try {
        dispatch({ type: "SET_NAME_CHANGING", payload: true });
        socketService.changeName(newName);
      } catch (error) {
        dispatch({ type: "SET_NAME_CHANGING", payload: false });
        dispatch({ type: "SET_ERROR", payload: "Failed to change name" });
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
      if (!room || !state.currentUser) return false;

      // Check permission based on room settings
      if (room.revealPermission === "host-only") {
        // Must be facilitator to reveal votes
        if (!actions.isUserFacilitator()) return false;
      } else if (room.revealPermission === "everyone") {
        // Any online user can reveal votes - just need to be in the room
        const currentUser = room.users.find(
          (u) => u.id === state.currentUser?.id,
        );
        if (!currentUser?.isOnline) return false;
      }

      // Always allow if votes are already revealed
      if (room.votesRevealed) return true;

      // Allow if all online users have voted (handles disconnections gracefully)
      if (room.allOnlineVoted) return true;

      // Allow if all users (including offline) have voted
      if (room.allVoted) return true;

      // Allow if at least one person has voted (emergency case for stuck sessions)
      const votedUsers = room.users.filter((user) => user.hasVoted);
      return votedUsers.length > 0;
    },

    canStartNextRound: (): boolean => {
      const room = actions.getCurrentRoom();
      if (!room || !state.currentUser) return false;

      // Must have votes revealed first
      if (!room.votesRevealed) return false;

      // Check permission based on room settings (same logic as reveal votes)
      if (room.revealPermission === "host-only") {
        // Must be facilitator to start next round
        return actions.isUserFacilitator();
      } else if (room.revealPermission === "everyone") {
        // Any online user can start next round
        const currentUser = room.users.find(
          (u) => u.id === state.currentUser?.id,
        );
        return currentUser?.isOnline ?? false;
      }

      return false;
    },

    canKickDisconnectedUsers: (): boolean => {
      const room = actions.getCurrentRoom();
      if (!room || !state.currentUser) return false;

      // Check permission based on room settings
      if (room.kickPermission === "host-only") {
        // Must be facilitator to kick users
        return actions.isUserFacilitator();
      } else if (room.kickPermission === "everyone") {
        // Any online user can kick disconnected users
        const currentUser = room.users.find(
          (u) => u.id === state.currentUser?.id,
        );
        return currentUser?.isOnline ?? false;
      }

      return false;
    },

    isNameChanging: (): boolean => {
      return state.isChangingName;
    },

    leaveRoom: () => {
      try {
        // Disconnect from socket (this automatically removes user from room on server)
        socketService.disconnect();

        // Reset app state to return to landing screen
        dispatch({ type: "SET_SCREEN", payload: AppScreen.LANDING });
        dispatch({ type: "SET_USER", payload: null });
        dispatch({ type: "SET_ROOM", payload: null });
        dispatch({ type: "SET_ERROR", payload: null });
        dispatch({
          type: "SET_CONNECTION_STATUS",
          payload: ConnectionStatus.DISCONNECTED,
        });
        dispatch({ type: "SET_LOADING", payload: false });
      } catch (error) {
        console.error("Error leaving room:", error);
        dispatch({ type: "SET_ERROR", payload: "Failed to leave room" });
      }
    },

    leaveRoomAndNavigateHome: () => {
      try {
        // Remove socket listeners BEFORE disconnecting to prevent race conditions
        socketService.removeAllListeners();

        // Disconnect from socket (this automatically removes user from room on server)
        socketService.disconnect();

        // Update React state to reflect disconnection
        dispatch({
          type: "SET_CONNECTION_STATUS",
          payload: ConnectionStatus.DISCONNECTED,
        });

        // Reset to landing page
        dispatch({ type: "RESET_TO_LANDING" });

        // Navigate back to home page
        navigate("/");
      } catch (error) {
        console.error("Error leaving room:", error);
        dispatch({ type: "SET_ERROR", payload: "Failed to leave room" });
      }
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
