import { Room, User, FibonacciCard, FIBONACCI_CARDS } from "@/types/room.types";
import { generateRoomCode } from "@/utils/roomCodeGenerator";
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
      room.users[userIndex].isOnline = false;
      room.users[userIndex].currentVote = undefined;
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
    return (
      onlineUsers.length > 0 &&
      onlineUsers.every((u) => u.currentVote !== undefined)
    );
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

  getRoomCount(): number {
    return this.rooms.size;
  }
}

export default new RoomService();
