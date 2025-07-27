import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { LogIn, AlertCircle, ArrowLeft } from "lucide-react";
import { useApp } from "../context/AppContext";
import { ConnectionStatus, AppScreen } from "../types";
import { getStoredUsername, saveUsername } from "../lib/userStorage";
// Room code validation (6 characters, alphanumeric uppercase)
const isValidRoomCode = (code: string): boolean => {
  if (code.length !== 6) return false;
  const CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return code.split("").every((char) => CHARACTERS.includes(char));
};

export function DirectJoinScreen() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { state, actions } = useApp();
  const [userName, setUserName] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [roomCodeError, setRoomCodeError] = useState<string | null>(null);
  const [hasAttemptedAutoJoin, setHasAttemptedAutoJoin] = useState(false);

  // Pre-fill username from localStorage if available
  useEffect(() => {
    const storedUsername = getStoredUsername();
    if (storedUsername && !userName) {
      setUserName(storedUsername);
    }
  }, [userName]);

  // Auto-connect to socket when component mounts
  useEffect(() => {
    if (state.connectionStatus === ConnectionStatus.DISCONNECTED) {
      actions.connectSocket();
    }
  }, [state.connectionStatus, actions]);

  // Handle smooth entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Validate room code on mount
  useEffect(() => {
    if (!roomCode) {
      setRoomCodeError("No room code provided");
      return;
    }

    if (!isValidRoomCode(roomCode.toUpperCase())) {
      setRoomCodeError("Invalid room code format");
      return;
    }

    setRoomCodeError(null);
  }, [roomCode]);

  // Auto-join if stored username exists and no room code errors
  useEffect(() => {
    if (
      !hasAttemptedAutoJoin &&
      !roomCodeError &&
      roomCode &&
      state.connectionStatus === ConnectionStatus.CONNECTED
    ) {
      const storedUsername = getStoredUsername();
      console.log("Auto-join check:", {
        hasAttemptedAutoJoin,
        roomCodeError,
        roomCode,
        connectionStatus: state.connectionStatus,
        storedUsername,
      });

      if (storedUsername) {
        console.log("Auto-joining with stored username:", storedUsername);
        setHasAttemptedAutoJoin(true);
        // Clear any existing errors before attempting to join
        actions.setError(null);
        actions.joinRoom(roomCode.toUpperCase(), storedUsername);
      } else {
        console.log("No stored username found, showing manual join form");
        setHasAttemptedAutoJoin(true);
      }
    }
  }, [
    hasAttemptedAutoJoin,
    roomCodeError,
    roomCode,
    state.connectionStatus,
    actions,
  ]);

  // Navigate to home if room join failed (when app state changes to LANDING)
  useEffect(() => {
    if (state.currentScreen === AppScreen.LANDING && state.error) {
      // Room join failed, redirect to home with error
      navigate("/?error=" + encodeURIComponent(state.error));
    }
  }, [state.currentScreen, state.error, navigate]);

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();

    if (!userName.trim()) {
      actions.setError("Please enter your name");
      return;
    }

    if (!roomCode) {
      actions.setError("No room code provided");
      return;
    }

    if (roomCodeError) {
      actions.setError(roomCodeError);
      return;
    }

    actions.setError(null);
    saveUsername(userName.trim());
    actions.joinRoom(roomCode.toUpperCase(), userName.trim());
  };

  const handleGoBack = () => {
    navigate("/");
  };

  const isConnected = state.connectionStatus === ConnectionStatus.CONNECTED;
  const isConnecting = state.connectionStatus === ConnectionStatus.CONNECTING;
  const hasConnectionError = state.connectionStatus === ConnectionStatus.ERROR;

  // Show loading until auto-join attempt completes (either success or failure)
  const storedUsername = getStoredUsername();
  const shouldShowAutoJoinLoading =
    (!hasAttemptedAutoJoin || (state.isLoading && hasAttemptedAutoJoin)) &&
    !roomCodeError &&
    roomCode &&
    isConnected &&
    storedUsername;

  console.log("Loading decision:", {
    hasAttemptedAutoJoin,
    isLoading: state.isLoading,
    roomCodeError,
    roomCode,
    isConnected,
    storedUsername,
    shouldShowAutoJoinLoading,
    currentScreen: state.currentScreen,
  });

  if (shouldShowAutoJoinLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center mb-6">
              <img src="/logo.png" alt="SLAM Poker" className="h-44 w-auto" />
            </div>
            <p className="text-lg text-muted-foreground">
              Joining room{" "}
              <span className="font-mono font-bold text-primary">
                {roomCode}
              </span>
              ...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If there's a room code error, show it prominently
  if (roomCodeError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <Card className="border-2 border-destructive/50 shadow-lg">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="p-3 rounded-full bg-destructive/10">
                  <AlertCircle className="w-10 h-10 text-destructive" />
                </div>
              </div>
              <CardTitle className="text-destructive">
                Invalid Room Code
              </CardTitle>
              <CardDescription>
                The room code "{roomCode}" is not valid or does not exist.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleGoBack}
                className="w-full"
                variant="outline"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go to Home Page
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-8">
        {/* Header */}
        <div
          className={`text-center space-y-4 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        >
          <div
            className={`flex items-center justify-center mb-6 transition-all duration-500 delay-200 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
          >
            <img src="/logo.png" alt="SLAM Poker" className="h-44 w-auto" />
          </div>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Join room{" "}
            <span className="font-mono font-bold text-primary">{roomCode}</span>
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Badge
              variant={
                isConnected
                  ? "default"
                  : hasConnectionError
                    ? "destructive"
                    : "secondary"
              }
              className={`px-3 py-1 text-sm transition-all duration-300 ${
                isConnecting ? "animate-pulse" : ""
              }`}
            >
              {isConnecting && "Connecting..."}
              {isConnected && "Connected"}
              {hasConnectionError && "Connection Error"}
              {state.connectionStatus === ConnectionStatus.DISCONNECTED &&
                "Disconnected"}
            </Badge>
          </div>
        </div>

        {/* Connection Error Alert */}
        {hasConnectionError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Unable to connect to server. Please check your connection and try
              again.
              <Button
                variant="outline"
                size="sm"
                className="ml-2"
                onClick={actions.connectSocket}
                disabled={isConnecting}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Error Alert */}
        {state.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        {/* Main Card */}
        <Card
          className={`border-2 border-border/50 shadow-lg backdrop-blur-sm transition-all duration-500 delay-500 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          <CardHeader className="pb-6 text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <LogIn className="w-5 h-5" />
              Join Room
            </CardTitle>
            <CardDescription>
              Enter your name to join room{" "}
              <span className="font-mono font-bold">{roomCode}</span>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 pt-0">
            <form onSubmit={handleJoinRoom} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="userName" className="text-sm font-medium">
                  Your Name
                </label>
                <Input
                  id="userName"
                  placeholder="Enter your name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="h-11 bg-muted/50 border-2 focus:border-primary transition-colors"
                  disabled={!isConnected || state.isLoading}
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleGoBack}
                  disabled={state.isLoading}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button
                  type="submit"
                  className={`flex-1 text-base font-semibold shadow-md hover:shadow-lg transition-all duration-200 ${
                    state.isLoading ? "animate-pulse" : ""
                  }`}
                  disabled={!isConnected || state.isLoading}
                >
                  {state.isLoading ? "Joining..." : "Join Room"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
