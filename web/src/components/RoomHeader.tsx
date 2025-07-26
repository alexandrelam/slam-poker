import { useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Copy, Check, Wifi, WifiOff, AlertCircle, LogOut } from "lucide-react";
import { ConnectionStatus } from "../types";

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
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          {/* Left side - App title and room code */}
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">SLAM Poker</h1>
              <p className="text-sm text-muted-foreground">
                Agile Planning Made Simple
              </p>
            </div>

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

          {/* Right side - Connection status and Leave button */}
          <div className="flex flex-col items-end gap-2">
            <Badge
              variant={getConnectionStatusVariant()}
              className="flex items-center gap-1"
            >
              {getConnectionStatusIcon()}
              <span className="text-xs">{getConnectionStatusText()}</span>
            </Badge>
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

        {/* Optional: Show instructions for mobile users */}
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Share the room code with your team to get started
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
