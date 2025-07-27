import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Timer as TimerIcon, Play, RotateCcw } from "lucide-react";
import { useApp } from "../context/AppContext";

interface TimerProps {
  className?: string;
}

export function Timer({ className }: TimerProps) {
  const { state, actions } = useApp();
  const room = actions.getCurrentRoom();
  const currentUser = state.currentUser;
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [displayTime, setDisplayTime] = useState("00:00");

  // Calculate time left based on server time
  useEffect(() => {
    if (!room || !room.timerRunning || !room.timerStartedAt) {
      setTimeLeft(0);
      setDisplayTime("00:00");
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const startTime = new Date(room.timerStartedAt!).getTime();
      const elapsed = Math.floor((now - startTime) / 1000);
      const remaining = Math.max(0, room.timerDuration - elapsed);

      setTimeLeft(remaining);

      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      setDisplayTime(
        `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [room?.timerRunning, room?.timerStartedAt, room?.timerDuration]);

  if (!room || !currentUser) {
    return null;
  }

  const canControlTimer = actions.canRevealVotes(); // Same permission as reveal votes
  const isTimerRunning = room.timerRunning;
  const hasTimer = room.timerStartedAt !== null;

  const handleStartTimer = () => {
    if (canControlTimer) {
      actions.startTimer();
    }
  };

  const handleResetTimer = () => {
    if (canControlTimer) {
      actions.resetTimer();
    }
  };

  const getTimerStatus = () => {
    if (!hasTimer) return "Not started";
    if (isTimerRunning && timeLeft > 0) return "Running";
    if (isTimerRunning && timeLeft === 0) return "Time's up!";
    return "Stopped";
  };

  const getStatusColor = () => {
    const status = getTimerStatus();
    if (status === "Time's up!") return "destructive";
    if (status === "Running") return "default";
    if (status === "Stopped") return "secondary";
    return "outline";
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <TimerIcon className="w-4 h-4" />
            Round Timer
          </div>
          <Badge variant={getStatusColor()} className="text-xs">
            {getTimerStatus()}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Timer Display */}
        <div className="text-center">
          <div className="text-3xl font-mono font-bold tabular-nums">
            {hasTimer ? displayTime : "--:--"}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {room.timerDuration
              ? `${Math.floor(room.timerDuration / 60)}:00 minutes`
              : "5:00 minutes"}
          </div>
        </div>

        {/* Control Buttons */}
        {canControlTimer && (
          <div className="flex gap-2">
            <Button
              onClick={handleStartTimer}
              disabled={state.isLoading}
              size="sm"
              variant={isTimerRunning ? "secondary" : "default"}
              className="flex-1"
            >
              <Play className="w-3 h-3 mr-1" />
              {isTimerRunning ? "Restart" : "Start"}
            </Button>

            <Button
              onClick={handleResetTimer}
              disabled={state.isLoading || !hasTimer}
              size="sm"
              variant="outline"
              className="flex-1"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset
            </Button>
          </div>
        )}

        {/* Help text */}
        <div className="text-xs text-muted-foreground">
          {!canControlTimer
            ? room.revealPermission === "host-only"
              ? "Only the host can control the timer"
              : "Waiting for someone to start the timer"
            : "Timer stops when votes are revealed and restarts on next round"}
        </div>
      </CardContent>
    </Card>
  );
}
