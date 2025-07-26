import {
  Room,
  User,
  FibonacciCard,
  FIBONACCI_CARDS,
  RevealPermission,
  KickPermission,
  VoteStatistics,
  VoteDistribution,
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
      kickPermission: "host-only",
    };

    this.rooms.set(roomCode, room);
    logger.forceInfo("Room created with generated code", { roomCode });
    return room;
  }

  createRoomWithCode(requestedCode: string): Room | null {
    const roomCode = requestedCode.toUpperCase();

    // Check if room already exists
    if (this.rooms.has(roomCode)) {
      logger.forceWarn("Cannot create room - code already exists", {
        roomCode,
      });
      return null;
    }

    // Validate room code format (basic validation)
    if (!roomCode || roomCode.length < 3 || roomCode.length > 10) {
      logger.forceWarn("Cannot create room - invalid code format", {
        roomCode,
        length: roomCode.length,
      });
      return null;
    }

    const room: Room = {
      code: roomCode,
      users: [],
      votingInProgress: false,
      votesRevealed: false,
      createdAt: new Date(),
      revealPermission: "host-only",
      kickPermission: "host-only",
    };

    this.rooms.set(roomCode, room);
    logger.forceInfo("Room created with user-specified code", {
      roomCode,
      requestedCode,
    });
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
    logger.forceInfo("=== ROOM SERVICE castVote START ===", {
      roomCode,
      userId,
      vote,
    });

    const room = this.rooms.get(roomCode);
    if (!room) {
      logger.forceWarn("castVote FAILED: room not found", {
        roomCode,
        userId,
        availableRooms: Array.from(this.rooms.keys()),
      });
      return null;
    }

    logger.forceInfo("castVote: room found", {
      roomCode,
      userId,
      roomUserCount: room.users.length,
      roomUsers: room.users.map((u) => ({
        id: u.id,
        name: u.name,
        isOnline: u.isOnline,
      })),
    });

    if (!FIBONACCI_CARDS.includes(vote)) {
      logger.forceWarn("castVote FAILED: invalid vote", {
        roomCode,
        userId,
        vote,
        validCards: FIBONACCI_CARDS,
      });
      return null;
    }

    const user = room.users.find((u) => u.id === userId);
    if (!user) {
      logger.forceWarn("castVote FAILED: user not found in room", {
        roomCode,
        userId,
        roomUsers: room.users.map((u) => ({
          id: u.id,
          name: u.name,
          isOnline: u.isOnline,
        })),
      });
      return null;
    }

    if (!user.isOnline) {
      logger.forceWarn("castVote FAILED: user is offline", {
        roomCode,
        userId,
        userName: user.name,
        userIsOnline: user.isOnline,
      });
      return null;
    }

    user.currentVote = vote;
    logger.forceInfo("=== ROOM SERVICE castVote SUCCESS ===", {
      roomCode,
      userId,
      userName: user.name,
      hasVoted: true,
    });
    return room;
  }

  revealVotes(roomCode: string): Room | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    room.votesRevealed = true;
    room.votingInProgress = false;

    // Compute vote statistics when revealing votes
    room.voteStatistics = this.computeVoteStatistics(room);

    logger.info("Votes revealed with statistics", {
      roomCode,
      totalVotes: room.voteStatistics.totalVotes,
      average: room.voteStatistics.average,
      median: room.voteStatistics.median,
    });
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
    room.voteStatistics = undefined; // Clear previous statistics

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
    settings: {
      revealPermission?: RevealPermission;
      kickPermission?: KickPermission;
    },
  ): Room | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    if (settings.revealPermission) {
      room.revealPermission = settings.revealPermission;
    }

    if (settings.kickPermission) {
      room.kickPermission = settings.kickPermission;
    }

    logger.info("Room settings updated", { roomCode, settings });
    return room;
  }

  kickUser(roomCode: string, userIdToKick: string): Room | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const userIndex = room.users.findIndex((u) => u.id === userIdToKick);
    if (userIndex < 0) return null;

    const userToKick = room.users[userIndex];

    // Can only kick disconnected users
    if (userToKick.isOnline) {
      logger.warn("Attempted to kick online user", { roomCode, userIdToKick });
      return null;
    }

    // Cannot kick the host (first user)
    if (userIndex === 0) {
      logger.warn("Attempted to kick host user", { roomCode, userIdToKick });
      return null;
    }

    // Remove the user from the room completely
    room.users.splice(userIndex, 1);

    logger.info("User kicked from room", {
      roomCode,
      userIdToKick,
      userName: userToKick.name,
    });
    return room;
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

  computeVoteStatistics(room: Room): VoteStatistics {
    const usersWithVotes = room.users.filter(
      (u) => u.currentVote !== undefined,
    );
    const votes = usersWithVotes.map((u) => u.currentVote!);

    // Create distribution map
    const distributionMap = new Map<
      FibonacciCard,
      { count: number; users: string[] }
    >();

    usersWithVotes.forEach((user) => {
      const vote = user.currentVote!;
      if (!distributionMap.has(vote)) {
        distributionMap.set(vote, { count: 0, users: [] });
      }
      const entry = distributionMap.get(vote)!;
      entry.count++;
      entry.users.push(user.name);
    });

    // Convert to VoteDistribution array
    const distribution: VoteDistribution[] = Array.from(
      distributionMap.entries(),
    )
      .map(([value, data]) => ({
        value,
        count: data.count,
        users: data.users,
        percentage: (data.count / usersWithVotes.length) * 100,
      }))
      .sort((a, b) => {
        // Sort by vote value, with '?' at the end
        const aValue = a.value as string;
        const bValue = b.value as string;
        if (aValue === "?") return 1;
        if (bValue === "?") return -1;
        return parseInt(aValue) - parseInt(bValue);
      });

    // Calculate average and median (only for numeric votes)
    const numericVotes = votes
      .filter((vote) => vote !== "?")
      .map((vote) => parseInt(vote))
      .sort((a, b) => a - b);

    let average: number | null = null;
    let median: number | null = null;

    if (numericVotes.length > 0) {
      // Calculate average
      average =
        numericVotes.reduce((sum, vote) => sum + vote, 0) / numericVotes.length;

      // Calculate median
      const mid = Math.floor(numericVotes.length / 2);
      median =
        numericVotes.length % 2 === 0
          ? (numericVotes[mid - 1] + numericVotes[mid]) / 2
          : numericVotes[mid];
    }

    return {
      average,
      median,
      distribution,
      totalVotes: usersWithVotes.length,
    };
  }

  getRoomCount(): number {
    return this.rooms.size;
  }
}

export default new RoomService();
