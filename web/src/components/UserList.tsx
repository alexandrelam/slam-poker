import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { CheckCircle, Clock, Crown, User, UserX } from "lucide-react";
import { cn } from "../lib/utils";
import { RoomSettings } from "./RoomSettings";
import { NameEditor } from "./NameEditor";
import { EmojiPickerCard } from "./EmojiPickerCard";
import { useApp } from "../context/AppContext";
import type { UIUser } from "../types";

interface UserListProps {
  users: UIUser[];
  currentUserId?: string;
  facilitatorId?: string;
  votesRevealed?: boolean;
  className?: string;
}

export function UserList({
  users,
  currentUserId,
  facilitatorId,
  votesRevealed = false,
  className,
}: UserListProps) {
  const { actions } = useApp();

  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getVoteStatusIcon = (user: UIUser) => {
    if (votesRevealed && user.currentVote) {
      return (
        <div className="flex items-center gap-1">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span className="text-sm font-medium">{user.currentVote}</span>
        </div>
      );
    }

    if (user.hasVoted) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }

    return <Clock className="w-4 h-4 text-muted-foreground" />;
  };

  const getStatusText = (user: UIUser) => {
    if (votesRevealed && user.currentVote) {
      return `Voted: ${user.currentVote}`;
    }

    if (user.hasVoted) {
      return "Voted";
    }

    return "Waiting...";
  };

  const canKickUser = (user: UIUser, userIndex: number) => {
    // Can't kick yourself
    if (user.id === currentUserId) return false;

    // Can't kick online users
    if (user.isOnline) return false;

    // Can't kick the host (first user)
    if (userIndex === 0) return false;

    // Check if current user has permission to kick
    return actions.canKickDisconnectedUsers();
  };

  if (users.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">No users in room</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Participants Card */}
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Participants ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {users.map((user, index) => (
            <div key={user.id}>
              <div className="flex items-center gap-3 group">
                {/* Avatar */}
                <div className="relative">
                  <Avatar
                    className={cn(
                      "w-10 h-10",
                      user.id === currentUserId &&
                        "ring-2 ring-primary ring-offset-2",
                    )}
                  >
                    <AvatarFallback
                      className={cn(
                        "font-medium",
                        !user.isOnline && "opacity-50",
                      )}
                    >
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Online status indicator */}
                  <div
                    className={cn(
                      "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background",
                      user.isOnline ? "bg-green-500" : "bg-gray-400",
                    )}
                  />
                </div>

                {/* User info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {user.id === currentUserId ? (
                      <NameEditor
                        currentName={user.name}
                        onChangeName={actions.changeName}
                        isLoading={actions.isNameChanging()}
                        className={cn(!user.isOnline && "opacity-50")}
                      />
                    ) : (
                      <p
                        className={cn(
                          "font-medium truncate",
                          !user.isOnline && "opacity-50",
                        )}
                      >
                        {user.name}
                      </p>
                    )}

                    {/* Badges */}
                    <div className="flex items-center gap-1">
                      {user.id === facilitatorId && (
                        <Badge variant="secondary" className="text-xs">
                          <Crown className="w-3 h-3 mr-1" />
                          Host
                        </Badge>
                      )}

                      {user.id === currentUserId && (
                        <Badge variant="outline" className="text-xs">
                          You
                        </Badge>
                      )}
                    </div>
                  </div>

                  <p
                    className={cn(
                      "text-sm text-muted-foreground",
                      !user.isOnline && "opacity-50",
                    )}
                  >
                    {getStatusText(user)}
                  </p>
                </div>

                {/* Vote status and actions */}
                <div className="flex-shrink-0 flex items-center gap-2">
                  {getVoteStatusIcon(user)}

                  {/* Kick button for disconnected users */}
                  {canKickUser(user, index) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => actions.kickUser(user.id)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                      title={`Kick ${user.name}`}
                    >
                      <UserX className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Separator (except for last item) */}
              {index < users.length - 1 && <Separator className="mt-3" />}
            </div>
          ))}

          {/* Summary */}
          <Separator />
          <div className="flex justify-between text-sm text-muted-foreground pt-2">
            <span>
              Online: {users.filter((u) => u.isOnline).length}/{users.length}
            </span>
            <span>
              Voted: {users.filter((u) => u.hasVoted).length}/
              {users.filter((u) => u.isOnline).length}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Emoji Picker */}
      <EmojiPickerCard />

      {/* Room Settings */}
      <RoomSettings />
    </div>
  );
}
