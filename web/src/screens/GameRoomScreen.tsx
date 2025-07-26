import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Separator } from "../components/ui/separator";
import { RoomHeader } from "../components/RoomHeader";
import { UserList } from "../components/UserList";
import { VotingCard } from "../components/VotingCard";
import { Eye, RotateCcw, AlertCircle, Vote } from "lucide-react";
import { useApp } from "../context/AppContext";
import type { FibonacciCard } from "../types";

// Import the Fibonacci cards from backend types
const FIBONACCI_CARDS: FibonacciCard[] = [
  "0",
  "1",
  "2",
  "3",
  "5",
  "8",
  "13",
  "21",
  "34",
  "55",
  "89",
  "?",
];

export function GameRoomScreen() {
  const { state, actions } = useApp();

  const room = actions.getCurrentRoom();
  const currentUser = state.currentUser;
  const hasUserVoted = actions.hasUserVoted();
  const canRevealVotes = actions.canRevealVotes();
  const canStartNextRound = actions.canStartNextRound();

  if (!room || !currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Room not found. Please check your connection and try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleVote = (vote: FibonacciCard) => {
    if (!room.votesRevealed) {
      actions.vote(vote);
    }
  };

  const handleRevealVotes = () => {
    if (canRevealVotes) {
      actions.revealVotes();
    }
  };

  const handleNextRound = () => {
    if (canStartNextRound) {
      actions.nextRound();
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <RoomHeader
          roomCode={room.code}
          connectionStatus={state.connectionStatus}
        />

        {/* Error Alert */}
        {state.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {state.error}
              <Button
                variant="outline"
                size="sm"
                className="ml-2"
                onClick={() => actions.setError(null)}
              >
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - User List */}
          <div className="lg:col-span-1">
            <UserList
              users={room.users}
              currentUserId={currentUser.id}
              facilitatorId={room.facilitatorId}
              votesRevealed={room.votesRevealed}
            />
          </div>

          {/* Right Column - Voting Interface */}
          <div className="lg:col-span-2 space-y-6">
            {/* Voting Cards */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Vote className="w-5 h-5" />
                  Choose Your Estimate
                </CardTitle>

                {/* Voting Status */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {room.votesRevealed
                      ? "Votes Revealed - Ready for next round"
                      : hasUserVoted
                        ? "You have voted - waiting for others"
                        : "Select a card to vote"}
                  </span>
                  <div className="text-muted-foreground text-right">
                    <div>
                      {room.users.filter((u) => u.hasVoted).length} /{" "}
                      {room.users.filter((u) => u.isOnline).length} online voted
                    </div>
                    {room.users.some((u) => !u.isOnline && u.hasVoted) && (
                      <div className="text-xs opacity-75">
                        +
                        {
                          room.users.filter((u) => !u.isOnline && u.hasVoted)
                            .length
                        }{" "}
                        offline with votes
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-6 md:grid-cols-12 gap-3">
                  {FIBONACCI_CARDS.map((card) => {
                    // Get the current user's latest vote from the room state
                    const currentUserInRoom = room.users.find(
                      (u) => u.id === currentUser.id,
                    );
                    return (
                      <VotingCard
                        key={card}
                        value={card}
                        isSelected={currentUserInRoom?.currentVote === card}
                        isDisabled={room.votesRevealed || state.isLoading}
                        isRevealed={room.votesRevealed}
                        onClick={handleVote}
                        className="col-span-1"
                      />
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Control Buttons */}
            <Card>
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Reveal Votes Button */}
                  <Button
                    onClick={handleRevealVotes}
                    disabled={!canRevealVotes || state.isLoading}
                    className="flex-1"
                    variant={room.votesRevealed ? "secondary" : "default"}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {room.votesRevealed ? "Votes Revealed" : "Reveal Votes"}
                  </Button>

                  {/* Next Round Button */}
                  <Button
                    onClick={handleNextRound}
                    disabled={!canStartNextRound || state.isLoading}
                    variant="secondary"
                    className="flex-1"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Next Round
                  </Button>
                </div>

                {/* Help Text */}
                <Separator className="my-3" />
                <div className="text-xs text-muted-foreground space-y-1">
                  {!room.votesRevealed && (
                    <p>
                      {canRevealVotes ? (
                        <>
                          {room.revealPermission === "host-only"
                            ? "As the host, you can reveal votes when ready."
                            : "You can reveal votes when ready."}
                          {room.allOnlineVoted
                            ? " All online users have voted!"
                            : room.users.some((u) => !u.isOnline && u.hasVoted)
                              ? " Some users disconnected but their votes are preserved."
                              : ""}
                        </>
                      ) : (
                        <>
                          {room.revealPermission === "host-only"
                            ? "Waiting for host to reveal the votes..."
                            : "Waiting for someone to reveal the votes..."}
                        </>
                      )}
                    </p>
                  )}
                  {room.votesRevealed && (
                    <p>
                      {canStartNextRound
                        ? "Click 'Next Round' to clear all votes and start estimating the next item."
                        : room.revealPermission === "host-only"
                          ? "Waiting for host to start the next round..."
                          : "Waiting for someone to start the next round..."}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Voting Results (when revealed) */}
            {room.votesRevealed && (
              <Card>
                <CardHeader>
                  <CardTitle>Voting Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {room.users
                      .filter((user) => user.currentVote)
                      .sort((a, b) => {
                        // Sort by vote value, with '?' at the end
                        if (a.currentVote === "?") return 1;
                        if (b.currentVote === "?") return -1;
                        return (
                          parseInt(a.currentVote!) - parseInt(b.currentVote!)
                        );
                      })
                      .map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between py-2 px-3 bg-muted rounded"
                        >
                          <span className="font-medium">{user.name}</span>
                          <span className="text-lg font-bold">
                            {user.currentVote}
                          </span>
                        </div>
                      ))}
                  </div>

                  {(room.users.some((u) => !u.currentVote && u.isOnline) ||
                    room.users.some((u) => !u.isOnline)) && (
                    <div className="mt-4 pt-3 border-t border-border space-y-2">
                      {room.users.some((u) => !u.currentVote && u.isOnline) && (
                        <p className="text-sm text-muted-foreground">
                          Online users who didn't vote:{" "}
                          {room.users
                            .filter((u) => !u.currentVote && u.isOnline)
                            .map((u) => u.name)
                            .join(", ")}
                        </p>
                      )}
                      {room.users.some((u) => !u.isOnline) && (
                        <p className="text-sm text-muted-foreground">
                          Disconnected users:{" "}
                          {room.users
                            .filter((u) => !u.isOnline)
                            .map(
                              (u) =>
                                u.name +
                                (u.currentVote ? " (voted)" : " (no vote)"),
                            )
                            .join(", ")}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
