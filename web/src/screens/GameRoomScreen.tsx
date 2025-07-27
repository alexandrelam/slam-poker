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
import { OtherVotingCard } from "../components/OtherVotingCard";
import { Eye, RotateCcw, AlertCircle, Vote } from "lucide-react";
import { useApp } from "../context/AppContext";
import { EmojiPhysicsCanvas } from "../components/EmojiPhysicsCanvas";
import type { FibonacciCard } from "../types";

// Primary cards that will be displayed as large cards
const PRIMARY_CARDS: FibonacciCard[] = ["1", "2", "3", "5"];

// Cards that will be grouped in the "Other" popup
const OTHER_CARDS: FibonacciCard[] = ["8", "13", "21", "34", "55", "89"];

// Special cards that remain separate
const SPECIAL_CARDS: FibonacciCard[] = ["?"];

export function GameRoomScreen() {
  const { state, actions } = useApp();

  const room = actions.getCurrentRoom();
  const currentUser = state.currentUser;
  const hasUserVoted = actions.hasUserVoted();
  const canRevealVotes = actions.canRevealVotes();
  const canStartNextRound = actions.canStartNextRound();

  if (!room || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
    <div className="min-h-screen p-4 relative">
      {/* Emoji Physics Canvas Background - Fixed to viewport */}
      <EmojiPhysicsCanvas />

      <div className="max-w-6xl mx-auto space-y-6 relative z-10">
        {/* Header */}
        <RoomHeader
          roomCode={room.code}
          connectionStatus={state.connectionStatus}
          onLeaveRoom={actions.leaveRoomAndNavigateHome}
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
                {(() => {
                  // Get the current user's latest vote from the room state
                  const currentUserInRoom = room.users.find(
                    (u) => u.id === currentUser.id,
                  );

                  return (
                    <div className="flex flex-wrap items-center justify-center gap-4">
                      {/* Primary Cards */}
                      {PRIMARY_CARDS.map((card) => (
                        <VotingCard
                          key={card}
                          value={card}
                          isSelected={currentUserInRoom?.currentVote === card}
                          isDisabled={room.votesRevealed || state.isLoading}
                          isRevealed={room.votesRevealed}
                          onClick={handleVote}
                        />
                      ))}

                      {/* Other Card - Popup */}
                      <OtherVotingCard
                        isSelected={
                          currentUserInRoom?.currentVote !== undefined &&
                          OTHER_CARDS.includes(
                            currentUserInRoom.currentVote as FibonacciCard,
                          )
                        }
                        selectedValue={
                          currentUserInRoom?.currentVote &&
                          OTHER_CARDS.includes(
                            currentUserInRoom.currentVote as FibonacciCard,
                          )
                            ? (currentUserInRoom.currentVote as FibonacciCard)
                            : undefined
                        }
                        isDisabled={room.votesRevealed || state.isLoading}
                        isRevealed={room.votesRevealed}
                        onClick={handleVote}
                      />

                      {/* Special Cards */}
                      {SPECIAL_CARDS.map((card) => (
                        <VotingCard
                          key={card}
                          value={card}
                          isSelected={currentUserInRoom?.currentVote === card}
                          isDisabled={room.votesRevealed || state.isLoading}
                          isRevealed={room.votesRevealed}
                          onClick={handleVote}
                        />
                      ))}
                    </div>
                  );
                })()}
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
            {room.votesRevealed && room.voteStatistics && (
              <Card>
                <CardHeader>
                  <CardTitle>Voting Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Statistics Summary */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {room.voteStatistics.totalVotes}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Total Votes
                      </div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {room.voteStatistics.average !== null
                          ? room.voteStatistics.average.toFixed(1)
                          : "N/A"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Average
                      </div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {room.voteStatistics.median !== null
                          ? room.voteStatistics.median
                          : "N/A"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Median
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Vote Distribution */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      Vote Distribution
                    </h4>
                    <div className="space-y-3">
                      {room.voteStatistics.distribution.map((dist) => (
                        <div
                          key={dist.value}
                          className="space-y-2 p-3 bg-muted rounded-lg"
                        >
                          {/* Vote value and count header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xl font-bold text-primary">
                                {dist.value}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                ({dist.count} vote{dist.count !== 1 ? "s" : ""})
                              </span>
                            </div>
                            <span className="text-sm font-medium">
                              {dist.percentage.toFixed(1)}%
                            </span>
                          </div>

                          {/* Mini bar chart */}
                          <div className="w-full bg-background rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-300 ease-out"
                              style={{ width: `${dist.percentage}%` }}
                            />
                          </div>

                          {/* Users who voted for this value */}
                          <div className="flex flex-wrap gap-1">
                            {dist.users.map((userName) => (
                              <span
                                key={userName}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
                              >
                                {userName}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Non-voting users section */}
                  {(room.users.some((u) => !u.currentVote && u.isOnline) ||
                    room.users.some((u) => !u.isOnline)) && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        {room.users.some(
                          (u) => !u.currentVote && u.isOnline,
                        ) && (
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">
                              Online users who didn't vote:
                            </span>{" "}
                            {room.users
                              .filter((u) => !u.currentVote && u.isOnline)
                              .map((u) => u.name)
                              .join(", ")}
                          </p>
                        )}
                        {room.users.some((u) => !u.isOnline) && (
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium">
                              Disconnected users:
                            </span>{" "}
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
                    </>
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
