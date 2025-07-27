import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
import {
  Users,
  Plus,
  LogIn,
  AlertCircle,
  Vote,
  Target,
  UserCheck,
  Rocket,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { ConnectionStatus } from "../types";
import { getStoredUsername, saveUsername } from "../lib/userStorage";

export function LandingScreen() {
  const { state, actions } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<"join" | "create">("join");
  const [joinForm, setJoinForm] = useState({ roomCode: "", userName: "" });
  const [createForm, setCreateForm] = useState({ userName: "" });
  const [isVisible, setIsVisible] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Auto-connect to socket when component mounts
  useEffect(() => {
    if (state.connectionStatus === ConnectionStatus.DISCONNECTED) {
      actions.connectSocket();
    }
  }, [state.connectionStatus, actions]);

  // Handle URL error parameter
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      setUrlError(decodeURIComponent(errorParam));
      // Clear the error from URL
      setSearchParams({});
    } else {
      setUrlError(null);
    }
  }, [searchParams, setSearchParams]);

  // Handle smooth entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Load stored username on mount
  useEffect(() => {
    const storedUsername = getStoredUsername();
    if (storedUsername) {
      setJoinForm((prev) => ({ ...prev, userName: storedUsername }));
      setCreateForm((prev) => ({ ...prev, userName: storedUsername }));
    }
  }, []);

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();

    if (!joinForm.roomCode.trim() || !joinForm.userName.trim()) {
      actions.setError("Please fill in all fields");
      return;
    }

    if (joinForm.roomCode.length !== 6) {
      actions.setError("Room code must be 6 characters");
      return;
    }

    actions.setError(null);
    saveUsername(joinForm.userName.trim());
    actions.joinRoom(joinForm.roomCode.toUpperCase(), joinForm.userName.trim());
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();

    if (!createForm.userName.trim()) {
      actions.setError("Please enter your name");
      return;
    }

    actions.setError(null);
    saveUsername(createForm.userName.trim());
    actions.createRoom(createForm.userName.trim());
  };

  const isConnected = state.connectionStatus === ConnectionStatus.CONNECTED;
  const isConnecting = state.connectionStatus === ConnectionStatus.CONNECTING;
  const hasConnectionError = state.connectionStatus === ConnectionStatus.ERROR;

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
            Simple, fast agile planning for your team
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
        {(state.error || urlError) && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{state.error || urlError}</AlertDescription>
          </Alert>
        )}

        {/* Main Card */}
        <Card
          className={`border-2 border-border/50 shadow-lg backdrop-blur-sm transition-all duration-500 delay-500 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          <CardHeader className="pb-6">
            <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
              <Button
                variant={activeTab === "join" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("join")}
                className={`transition-all duration-200 ${activeTab === "join" ? "shadow-sm" : "hover:bg-background/50"}`}
              >
                <LogIn className="w-4 h-4 mr-2" />
                Join Room
              </Button>
              <Button
                variant={activeTab === "create" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("create")}
                className={`transition-all duration-200 ${activeTab === "create" ? "shadow-sm" : "hover:bg-background/50"}`}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Room
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-0">
            {activeTab === "join" ? (
              <>
                <CardDescription className="text-center text-base">
                  Enter the room code shared by your team
                </CardDescription>
                <form onSubmit={handleJoinRoom} className="space-y-5">
                  <div className="space-y-2">
                    <label htmlFor="roomCode" className="text-sm font-medium">
                      Room Code
                    </label>
                    <Input
                      id="roomCode"
                      placeholder="ABC123"
                      value={joinForm.roomCode}
                      onChange={(e) =>
                        setJoinForm((prev) => ({
                          ...prev,
                          roomCode: e.target.value.toUpperCase().slice(0, 6),
                        }))
                      }
                      className="font-mono text-center text-xl tracking-[0.25em] h-12 bg-muted/50 border-2 focus:border-primary transition-colors"
                      maxLength={6}
                      disabled={!isConnected || state.isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="joinUserName"
                      className="text-sm font-medium"
                    >
                      Your Name
                    </label>
                    <Input
                      id="joinUserName"
                      placeholder="Enter your name"
                      value={joinForm.userName}
                      onChange={(e) =>
                        setJoinForm((prev) => ({
                          ...prev,
                          userName: e.target.value,
                        }))
                      }
                      className="h-11 bg-muted/50 border-2 focus:border-primary transition-colors"
                      disabled={!isConnected || state.isLoading}
                    />
                  </div>

                  <Button
                    type="submit"
                    className={`w-full h-11 text-base font-semibold shadow-md hover:shadow-lg transition-all duration-200 ${
                      state.isLoading ? "animate-pulse" : ""
                    }`}
                    disabled={!isConnected || state.isLoading}
                  >
                    {state.isLoading ? "Joining..." : "Join Room"}
                  </Button>
                </form>
              </>
            ) : (
              <>
                <CardDescription className="text-center text-base">
                  Create a new poker planning session
                </CardDescription>
                <form onSubmit={handleCreateRoom} className="space-y-5">
                  <div className="space-y-2">
                    <label
                      htmlFor="createUserName"
                      className="text-sm font-medium"
                    >
                      Your Name
                    </label>
                    <Input
                      id="createUserName"
                      placeholder="Enter your name"
                      value={createForm.userName}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          userName: e.target.value,
                        }))
                      }
                      className="h-11 bg-muted/50 border-2 focus:border-primary transition-colors"
                      disabled={!isConnected || state.isLoading}
                    />
                  </div>

                  <Button
                    type="submit"
                    className={`w-full h-11 text-base font-semibold shadow-md hover:shadow-lg transition-all duration-200 ${
                      state.isLoading ? "animate-pulse" : ""
                    }`}
                    disabled={!isConnected || state.isLoading}
                  >
                    {state.isLoading ? "Creating..." : "Create Room"}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>

        {/* Features */}
        <Card
          className={`transition-all duration-500 delay-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Features
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 transition-colors hover:bg-muted/50">
                <div className="p-2 rounded-full bg-primary/10">
                  <Vote className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium">
                  Real-time collaborative voting
                </span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 transition-colors hover:bg-muted/50">
                <div className="p-2 rounded-full bg-primary/10">
                  <Target className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium">
                  Fibonacci sequence estimation
                </span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 transition-colors hover:bg-muted/50">
                <div className="p-2 rounded-full bg-primary/10">
                  <UserCheck className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium">
                  Up to 10 participants per room
                </span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 transition-colors hover:bg-muted/50">
                <div className="p-2 rounded-full bg-primary/10">
                  <Rocket className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium">
                  No registration required
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
