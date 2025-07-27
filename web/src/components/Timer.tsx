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
  const [, setElapsedTime] = useState<number>(0);
  const [displayTime, setDisplayTime] = useState("00:00");

  // Calculate elapsed time based on server time
  useEffect(() => {
    if (!room || !room.timerStartedAt) {
      setElapsedTime(0);
      setDisplayTime("00:00");
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const startTime = new Date(room.timerStartedAt!).getTime();
      const elapsed = Math.floor((now - startTime) / 1000);

      setElapsedTime(elapsed);

      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      setDisplayTime(
        `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
      );
    };

    updateTimer();

    // Only update in real-time if timer is running
    let interval: NodeJS.Timeout | null = null;
    if (room.timerRunning) {
      interval = setInterval(updateTimer, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [room?.timerRunning, room?.timerStartedAt]);

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
    if (isTimerRunning) return "Running";
    return "Stopped";
  };

  const getStatusColor = () => {
    const status = getTimerStatus();
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
            {hasTimer && !isTimerRunning
              ? `Round took ${displayTime}`
              : "Elapsed time"}
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
            : "Timer tracks round duration and stops when votes are revealed"}
        </div>
      </CardContent>
    </Card>
  );
}
