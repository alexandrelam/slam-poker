import {
  Room,
  User,
  FibonacciCard,
  FIBONACCI_CARDS,
  RevealPermission,
} from "@/types/room.types";
import { generateRoomCode } from "@/utils/roomCodeGenerator";
import userService from "@/services/userService";
import logger from "@/utils/logger";

class RoomService {
  private rooms: Map<string, Room> = new Map();

  createRoom(): Room {
    let roomCode: string;

    do {
      roomCode = generateRoomCode();
    } while (this.rooms.has(roomCode));

    const room: Room = {
      code: roomCode,
      users: [],
      votingInProgress: false,
      votesRevealed: false,
      createdAt: new Date(),
      revealPermission: "host-only",
    };

    this.rooms.set(roomCode, room);
    logger.info("Room created", { roomCode });
    return room;
  }

  findRoom(code: string): Room | null {
    return this.rooms.get(code) || null;
  }

  addUserToRoom(roomCode: string, user: User): Room | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const existingUserIndex = room.users.findIndex((u) => u.id === user.id);
    if (existingUserIndex >= 0) {
      room.users[existingUserIndex] = { ...user, isOnline: true };
    } else {
      room.users.push(user);
    }

    logger.info("User added to room", {
      roomCode,
      userId: user.id,
      userName: user.name,
    });
    return room;
  }

  removeUserFromRoom(roomCode: string, userId: string): Room | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const userIndex = room.users.findIndex((u) => u.id === userId);
    if (userIndex >= 0) {
      // Mark user as offline but preserve their vote if they had one
      room.users[userIndex].isOnline = false;
      // Note: We no longer clear currentVote to allow vote revelation even after disconnect
    }

    if (room.users.every((u) => !u.isOnline)) {
      this.rooms.delete(roomCode);
      logger.info("Room deleted - no online users", { roomCode });
      return null;
    }

    logger.info("User removed from room", { roomCode, userId });
    return room;
  }

  castVote(roomCode: string, userId: string, vote: FibonacciCard): Room | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    if (!FIBONACCI_CARDS.includes(vote)) {
      logger.warn("Invalid vote attempt", { roomCode, userId, vote });
      return null;
    }

    const user = room.users.find((u) => u.id === userId);
    if (!user || !user.isOnline) return null;

    user.currentVote = vote;
    logger.info("Vote cast", { roomCode, userId, hasVoted: true });
    return room;
  }

  revealVotes(roomCode: string): Room | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    room.votesRevealed = true;
    room.votingInProgress = false;
    logger.info("Votes revealed", { roomCode });
    return room;
  }

  startNextRound(roomCode: string): Room | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    room.users.forEach((user) => {
      user.currentVote = undefined;
    });
    room.votingInProgress = true;
    room.votesRevealed = false;

    logger.info("Next round started", { roomCode });
    return room;
  }

  hasAllUsersVoted(room: Room): boolean {
    const onlineUsers = room.users.filter((u) => u.isOnline);
    const allUsers = room.users;

    // No online users means no active voting session
    if (onlineUsers.length === 0) return false;

    // If all online users have voted, we can reveal
    const allOnlineUsersVoted = onlineUsers.every(
      (u) => u.currentVote !== undefined,
    );

    // Or if all users (including offline ones) who ever joined have voted
    const allUsersVoted = allUsers.every((u) => u.currentVote !== undefined);

    return allOnlineUsersVoted || allUsersVoted;
  }

  canForceRevealVotes(room: Room): boolean {
    const onlineUsers = room.users.filter((u) => u.isOnline);
    const allUsers = room.users;
    const votedUsers = allUsers.filter((u) => u.currentVote !== undefined);

    // No users means no voting
    if (allUsers.length === 0) return false;

    // Always allow if votes are already revealed
    if (room.votesRevealed) return true;

    // Allow if at least one user has voted (emergency case)
    if (votedUsers.length > 0) return true;

    // Allow if we have reasonable participation (at least 50% of total users voted)
    const participationRate = votedUsers.length / allUsers.length;
    return participationRate >= 0.5;
  }

  getVotingProgress(room: Room): { totalUsers: number; votedUsers: number } {
    const onlineUsers = room.users.filter((u) => u.isOnline);
    const votedUsers = onlineUsers.filter((u) => u.currentVote !== undefined);

    return {
      totalUsers: onlineUsers.length,
      votedUsers: votedUsers.length,
    };
  }

  cleanupInactiveRooms(): void {
    const now = new Date();
    const maxInactiveHours = 24;

    for (const [code, room] of this.rooms.entries()) {
      const inactiveHours =
        (now.getTime() - room.createdAt.getTime()) / (1000 * 60 * 60);
      const hasOnlineUsers = room.users.some((u) => u.isOnline);

      if (inactiveHours > maxInactiveHours || !hasOnlineUsers) {
        this.rooms.delete(code);
        logger.info("Cleaned up inactive room", { roomCode: code });
      }
    }
  }

  updateRoomSettings(
    roomCode: string,
    settings: { revealPermission?: RevealPermission },
  ): Room | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    if (settings.revealPermission) {
      room.revealPermission = settings.revealPermission;
    }

    logger.info("Room settings updated", { roomCode, settings });
    return room;
  }

  canUserRevealVotes(roomCode: string, userId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room) return false;

    // If permission is set to everyone, any online user can reveal
    if (room.revealPermission === "everyone") {
      const user = room.users.find((u) => u.id === userId);
      return user?.isOnline ?? false;
    }

    // If permission is host-only, only the first user (host) can reveal
    const hostUser = room.users[0];
    return hostUser?.id === userId && hostUser?.isOnline;
  }

  canUserStartNextRound(roomCode: string, userId: string): boolean {
    // Same logic as reveal votes for now
    return this.canUserRevealVotes(roomCode, userId);
  }

  changeUserName(
    roomCode: string,
    userId: string,
    newName: string,
  ): Room | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const userIndex = room.users.findIndex((u) => u.id === userId);
    if (userIndex < 0) return null;

    const currentUser = room.users[userIndex];
    if (!currentUser.isOnline) return null;

    try {
      const updatedUser = userService.changeUserName(currentUser, newName);
      room.users[userIndex] = updatedUser;

      logger.info("User name changed in room", {
        roomCode,
        userId,
        oldName: currentUser.name,
        newName: updatedUser.name,
      });

      return room;
    } catch (error) {
      logger.warn("Failed to change user name in room", {
        roomCode,
        userId,
        error: (error as Error).message,
      });
      return null;
    }
  }

  getRoomCount(): number {
    return this.rooms.size;
  }
}

export default new RoomService();
