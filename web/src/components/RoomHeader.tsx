import { useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Copy, Check, Wifi, WifiOff, AlertCircle, LogOut } from "lucide-react";
import { ConnectionStatus } from "../types";
import { ThemeToggle } from "./ThemeToggle";

interface RoomHeaderProps {
  roomCode: string;
  connectionStatus: ConnectionStatus;
  className?: string;
  onLeaveRoom: () => void;
}

export function RoomHeader({
  roomCode,
  connectionStatus,
  className,
  onLeaveRoom,
}: RoomHeaderProps) {
  const [copied, setCopied] = useState(false);

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      console.error("Failed to copy room code:", error);
    }
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case ConnectionStatus.CONNECTED:
        return <Wifi className="w-4 h-4 text-green-500" />;
      case ConnectionStatus.CONNECTING:
        return <Wifi className="w-4 h-4 text-yellow-500 animate-pulse" />;
      case ConnectionStatus.ERROR:
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case ConnectionStatus.DISCONNECTED:
      default:
        return <WifiOff className="w-4 h-4 text-gray-500" />;
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case ConnectionStatus.CONNECTED:
        return "Connected";
      case ConnectionStatus.CONNECTING:
        return "Connecting...";
      case ConnectionStatus.ERROR:
        return "Connection Error";
      case ConnectionStatus.DISCONNECTED:
      default:
        return "Disconnected";
    }
  };

  const getConnectionStatusVariant = ():
    | "default"
    | "secondary"
    | "destructive"
    | "outline" => {
    switch (connectionStatus) {
      case ConnectionStatus.CONNECTED:
        return "default";
      case ConnectionStatus.CONNECTING:
        return "secondary";
      case ConnectionStatus.ERROR:
        return "destructive";
      case ConnectionStatus.DISCONNECTED:
      default:
        return "outline";
    }
  };

  return (
    <Card className={className}>
      <CardContent className="p-3 sm:py-4 sm:px-6">
        {/* Mobile layout: compact 2-row design */}
        <div className="flex flex-col gap-2 sm:hidden">
          {/* Row 1: Logo and Leave Room button */}
          <div className="flex items-center justify-between">
            <img src="/logo.png" alt="SLAM Poker" className="h-10 w-auto" />
            <Button
              variant="outline"
              size="sm"
              onClick={onLeaveRoom}
              className="h-8 px-2 text-xs"
            >
              <LogOut className="w-3 h-3 mr-1" />
              Leave Room
            </Button>
          </div>

          {/* Row 2: Room code section with controls */}
          <div className="flex items-center justify-between gap-3">
            {/* Room code group */}
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-1">Room Code</p>
              <div className="flex items-center gap-2">
                <span className="text-base font-mono font-bold tracking-wider bg-muted px-3 py-1.5 rounded">
                  {roomCode}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyRoomCode}
                  className="h-8 w-8 p-0 flex-shrink-0"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </Button>
              </div>
            </div>

            {/* Status and controls group */}
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex items-center gap-1.5">
                <ThemeToggle />
                <Badge
                  variant={getConnectionStatusVariant()}
                  className="flex items-center gap-1 px-2 py-0.5"
                >
                  {getConnectionStatusIcon()}
                  <span className="text-xs">{getConnectionStatusText()}</span>
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop layout: horizontal */}
        <div className="hidden sm:flex items-center justify-between">
          {/* Left side - App title and room code */}
          <div className="flex items-center gap-4">
            <img
              src="/logo.png"
              alt="SLAM Poker"
              className="h-16 lg:h-20 mx-2 my-1 w-auto"
            />

            <div className="flex items-center gap-2">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Room Code</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-mono font-bold tracking-widest bg-muted px-3 py-1 rounded">
                    {roomCode}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyRoomCode}
                    className="h-8 w-8 p-0"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Theme toggle, Connection status and Leave button */}
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Badge
                variant={getConnectionStatusVariant()}
                className="flex items-center gap-1"
              >
                {getConnectionStatusIcon()}
                <span className="text-xs">{getConnectionStatusText()}</span>
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onLeaveRoom}
              className="h-7 px-2 text-xs"
            >
              <LogOut className="w-3 h-3 mr-1" />
              Leave Room
            </Button>
          </div>
        </div>

        {/* Instructions - only show on mobile and center on desktop */}
        <div className="mt-3 pt-3 border-t border-border sm:mt-4 sm:pt-4">
          <p className="text-xs text-muted-foreground text-center">
            Share the room code with your team to get started
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
