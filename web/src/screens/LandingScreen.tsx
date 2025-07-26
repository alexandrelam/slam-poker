import React, { useState, useEffect } from "react";
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
import { Users, Plus, LogIn, Zap, AlertCircle } from "lucide-react";
import { useApp } from "../context/AppContext";
import { ConnectionStatus } from "../types";

export function LandingScreen() {
  const { state, actions } = useApp();
  const [activeTab, setActiveTab] = useState<"join" | "create">("join");
  const [joinForm, setJoinForm] = useState({ roomCode: "", userName: "" });
  const [createForm, setCreateForm] = useState({ userName: "" });

  // Auto-connect to socket when component mounts
  useEffect(() => {
    if (state.connectionStatus === ConnectionStatus.DISCONNECTED) {
      actions.connectSocket();
    }
  }, [state.connectionStatus, actions]);

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
    actions.joinRoom(joinForm.roomCode.toUpperCase(), joinForm.userName.trim());
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();

    if (!createForm.userName.trim()) {
      actions.setError("Please enter your name");
      return;
    }

    actions.setError(null);
    actions.createRoom(createForm.userName.trim());
  };

  const isConnected = state.connectionStatus === ConnectionStatus.CONNECTED;
  const isConnecting = state.connectionStatus === ConnectionStatus.CONNECTING;
  const hasConnectionError = state.connectionStatus === ConnectionStatus.ERROR;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Zap className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">SLAM Poker</h1>
          </div>
          <p className="text-muted-foreground">
            Simple, fast agile planning for your team
          </p>
          <div className="flex items-center justify-center gap-2">
            <Badge
              variant={
                isConnected
                  ? "default"
                  : hasConnectionError
                    ? "destructive"
                    : "secondary"
              }
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
        <Card>
          <CardHeader>
            <div className="flex space-x-1">
              <Button
                variant={activeTab === "join" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("join")}
                className="flex-1"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Join Room
              </Button>
              <Button
                variant={activeTab === "create" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("create")}
                className="flex-1"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Room
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {activeTab === "join" ? (
              <>
                <CardDescription>
                  Enter the room code shared by your team
                </CardDescription>
                <form onSubmit={handleJoinRoom} className="space-y-4">
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
                      className="font-mono text-center text-lg tracking-widest"
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
                      disabled={!isConnected || state.isLoading}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={!isConnected || state.isLoading}
                  >
                    {state.isLoading ? "Joining..." : "Join Room"}
                  </Button>
                </form>
              </>
            ) : (
              <>
                <CardDescription>
                  Create a new poker planning session
                </CardDescription>
                <form onSubmit={handleCreateRoom} className="space-y-4">
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
                      disabled={!isConnected || state.isLoading}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
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
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Features
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground">
              <div>✨ Real-time collaborative voting</div>
              <div>🎯 Fibonacci sequence estimation</div>
              <div>👥 Up to 10 participants per room</div>
              <div>🚀 No registration required</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
