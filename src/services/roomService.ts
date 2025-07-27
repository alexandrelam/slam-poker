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
  private roomMetrics: Map<
    string,
    {
      peakUsers: number;
      totalJoins: number;
      totalVotes: number;
      lastActivity: Date;
    }
  > = new Map();

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
      // Timer initialization
      timerStartedAt: null,
      timerDuration: 300, // 5 minutes default
      timerRunning: false,
    };

    this.rooms.set(roomCode, room);

    // Initialize room metrics
    this.roomMetrics.set(roomCode, {
      peakUsers: 0,
      totalJoins: 0,
      totalVotes: 0,
      lastActivity: new Date(),
    });

    // Enhanced room creation logging
    logger.logSystemEvent(
      "Room created with generated code",
      "room_cleanup", // Using room_cleanup as generic room operation
      {
        roomCode,
        creation_method: "generated",
        concurrent_rooms: this.rooms.size,
        total_active_users: this.getTotalActiveUsers(),
      },
    );

    // Log business metric for room creation rate
    logger.logBusinessMetric("Room created", {
      room_count: this.rooms.size,
      creation_method: "generated",
    });

    return room;
  }

  createRoomWithCode(requestedCode: string): Room | null {
    const roomCode = requestedCode.toUpperCase();

    // Check if room already exists
    if (this.rooms.has(roomCode)) {
      logger.logError(
        "Cannot create room - code already exists",
        null,
        "validation_error",
        {
          roomCode,
          requestedCode,
          concurrent_rooms: this.rooms.size,
        },
      );
      return null;
    }

    // Validate room code format (basic validation)
    if (!roomCode || roomCode.length < 3 || roomCode.length > 10) {
      logger.logError(
        "Cannot create room - invalid code format",
        null,
        "validation_error",
        {
          roomCode,
          requestedCode,
          length: roomCode.length,
        },
      );
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
      // Timer initialization
      timerStartedAt: null,
      timerDuration: 300, // 5 minutes default
      timerRunning: false,
    };

    this.rooms.set(roomCode, room);

    // Initialize room metrics
    this.roomMetrics.set(roomCode, {
      peakUsers: 0,
      totalJoins: 0,
      totalVotes: 0,
      lastActivity: new Date(),
    });

    // Enhanced room creation logging
    logger.logSystemEvent(
      "Room created with user-specified code",
      "room_cleanup",
      {
        roomCode,
        requestedCode,
        creation_method: "user_specified",
        concurrent_rooms: this.rooms.size,
        total_active_users: this.getTotalActiveUsers(),
      },
    );

    // Log business metric for room creation
    logger.logBusinessMetric("Room created", {
      room_count: this.rooms.size,
      creation_method: "user_specified",
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
    const isNewUser = existingUserIndex < 0;

    if (existingUserIndex >= 0) {
      room.users[existingUserIndex] = { ...user, isOnline: true };
    } else {
      room.users.push(user);
    }

    // Update room metrics
    const metrics = this.roomMetrics.get(roomCode);
    if (metrics) {
      if (isNewUser) {
        metrics.totalJoins++;
      }
      const currentUserCount = room.users.filter((u) => u.isOnline).length;
      metrics.peakUsers = Math.max(metrics.peakUsers, currentUserCount);
      metrics.lastActivity = new Date();
    }

    // Enhanced user addition logging
    logger.logUserAction("User added to room", "join_room", {
      roomCode,
      userId: user.id,
      userName: user.name,
      isHost: room.users[0]?.id === user.id,
      room_size: room.users.length,
      online_users: room.users.filter((u) => u.isOnline).length,
      is_reconnection: !isNewUser,
      room_age_seconds: Math.floor(
        (Date.now() - room.createdAt.getTime()) / 1000,
      ),
    });

    // Log business metric for user engagement
    logger.logBusinessMetric("User joined room", {
      room_size: room.users.length,
      concurrent_users: room.users.filter((u) => u.isOnline).length,
      is_reconnection: !isNewUser,
      total_rooms: this.rooms.size,
    });

    return room;
  }

  removeUserFromRoom(roomCode: string, userId: string): Room | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    const userIndex = room.users.findIndex((u) => u.id === userId);
    const user = room.users[userIndex];

    if (userIndex >= 0) {
      // Mark user as offline but preserve their vote if they had one
      room.users[userIndex].isOnline = false;
      // Note: We no longer clear currentVote to allow vote revelation even after disconnect
    }

    // Update room metrics
    const metrics = this.roomMetrics.get(roomCode);
    if (metrics) {
      metrics.lastActivity = new Date();
    }

    // Check if room should be deleted
    const onlineUsers = room.users.filter((u) => u.isOnline);
    if (onlineUsers.length === 0) {
      const roomAge = Date.now() - room.createdAt.getTime();

      // Log room deletion with comprehensive metrics
      logger.logSystemEvent("Room deleted - no online users", "room_cleanup", {
        roomCode,
        room_duration_ms: roomAge,
        room_duration_minutes: Math.floor(roomAge / 60000),
        peak_users: metrics?.peakUsers || 0,
        total_joins: metrics?.totalJoins || 0,
        total_votes: metrics?.totalVotes || 0,
        total_users_ever: room.users.length,
        final_user_count: room.users.length,
      });

      // Log business metric for room lifecycle
      logger.logBusinessMetric("Room deleted", {
        room_duration_ms: roomAge,
        peak_users: metrics?.peakUsers || 0,
        total_joins: metrics?.totalJoins || 0,
        total_votes: metrics?.totalVotes || 0,
        remaining_rooms: this.rooms.size - 1,
      });

      this.rooms.delete(roomCode);
      this.roomMetrics.delete(roomCode);
      return null;
    }

    // Log user removal
    logger.logUserAction("User removed from room", "leave_room", {
      roomCode,
      userId,
      userName: user?.name,
      remaining_online_users: onlineUsers.length,
      room_size: room.users.length,
      room_age_seconds: Math.floor(
        (Date.now() - room.createdAt.getTime()) / 1000,
      ),
    });

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

    // Update vote metrics
    const metrics = this.roomMetrics.get(roomCode);
    if (metrics) {
      metrics.totalVotes++;
      metrics.lastActivity = new Date();
    }

    // Calculate voting progress and timing
    const onlineUsers = room.users.filter((u) => u.isOnline);
    const usersWithVotes = room.users.filter(
      (u) => u.currentVote !== undefined,
    );
    const votingProgress =
      onlineUsers.length > 0
        ? (usersWithVotes.length / onlineUsers.length) * 100
        : 0;

    // Log business metrics for vote casting
    logger.logBusinessMetric("Vote cast", {
      room_size: room.users.length,
      online_users: onlineUsers.length,
      votes_cast: usersWithVotes.length,
      voting_progress_percent: Math.round(votingProgress * 100) / 100,
      is_complete: this.hasAllUsersVoted(room),
      room_age_minutes: Math.floor(
        (Date.now() - room.createdAt.getTime()) / 60000,
      ),
      total_room_votes: metrics?.totalVotes || 0,
    });

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

    const onlineUsers = room.users.filter((u) => u.isOnline);
    const usersWithVotes = room.users.filter(
      (u) => u.currentVote !== undefined,
    );
    const votingCompletionRate =
      onlineUsers.length > 0
        ? (usersWithVotes.length / onlineUsers.length) * 100
        : 0;

    // Log business metrics for vote revelation
    logger.logBusinessMetric("Votes revealed", {
      room_size: room.users.length,
      online_users: onlineUsers.length,
      total_votes: room.voteStatistics.totalVotes,
      voting_completion_rate: Math.round(votingCompletionRate * 100) / 100,
      vote_average: room.voteStatistics.average,
      vote_median: room.voteStatistics.median,
      has_consensus: room.voteStatistics.distribution.length === 1,
      vote_spread: room.voteStatistics.distribution.length,
      room_age_minutes: Math.floor(
        (Date.now() - room.createdAt.getTime()) / 60000,
      ),
    });

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

    const previousVoteCount = room.users.filter(
      (u) => u.currentVote !== undefined,
    ).length;

    room.users.forEach((user) => {
      user.currentVote = undefined;
    });
    room.votingInProgress = true;
    room.votesRevealed = false;
    room.voteStatistics = undefined; // Clear previous statistics

    const metrics = this.roomMetrics.get(roomCode);
    if (metrics) {
      metrics.lastActivity = new Date();
    }

    // Log business metrics for round reset
    logger.logBusinessMetric("Next round started", {
      room_size: room.users.length,
      online_users: room.users.filter((u) => u.isOnline).length,
      previous_vote_count: previousVoteCount,
      total_rounds_so_far:
        (metrics?.totalVotes || 0) / Math.max(previousVoteCount, 1),
      room_age_minutes: Math.floor(
        (Date.now() - room.createdAt.getTime()) / 60000,
      ),
    });

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

  // Helper method to get total active users across all rooms
  private getTotalActiveUsers(): number {
    let totalUsers = 0;
    for (const room of this.rooms.values()) {
      totalUsers += room.users.filter((u) => u.isOnline).length;
    }
    return totalUsers;
  }

  // Get comprehensive room statistics for monitoring
  getRoomStatistics(): {
    totalRooms: number;
    totalActiveUsers: number;
    averageRoomSize: number;
    roomsWithVoting: number;
    peakUsersAcrossRooms: number;
  } {
    const stats = {
      totalRooms: this.rooms.size,
      totalActiveUsers: 0,
      averageRoomSize: 0,
      roomsWithVoting: 0,
      peakUsersAcrossRooms: 0,
    };

    for (const [roomCode, room] of this.rooms.entries()) {
      const onlineUsers = room.users.filter((u) => u.isOnline).length;
      stats.totalActiveUsers += onlineUsers;

      if (room.votingInProgress) {
        stats.roomsWithVoting++;
      }

      const metrics = this.roomMetrics.get(roomCode);
      if (metrics) {
        stats.peakUsersAcrossRooms += metrics.peakUsers;
      }
    }

    stats.averageRoomSize =
      stats.totalRooms > 0 ? stats.totalActiveUsers / stats.totalRooms : 0;

    return stats;
  }

  // Periodic logging of room statistics
  logRoomStatistics(): void {
    const stats = this.getRoomStatistics();

    logger.logBusinessMetric("Room statistics snapshot", {
      total_rooms: stats.totalRooms,
      total_active_users: stats.totalActiveUsers,
      average_room_size: Math.round(stats.averageRoomSize * 100) / 100,
      rooms_with_voting: stats.roomsWithVoting,
      peak_users_across_rooms: stats.peakUsersAcrossRooms,
      memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    });
  }

  // Timer management methods
  startTimer(roomCode: string, duration: number = 300): Room | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    room.timerStartedAt = new Date();
    room.timerDuration = duration;
    room.timerRunning = true;

    logger.logUserAction("Timer started", "start_timer", {
      roomCode,
      duration,
      startedAt: room.timerStartedAt,
    });

    return room;
  }

  resetTimer(roomCode: string): Room | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    room.timerStartedAt = null;
    room.timerRunning = false;
    // Keep duration unchanged for next timer start

    logger.logUserAction("Timer reset", "reset_timer", {
      roomCode,
      duration: room.timerDuration,
    });

    return room;
  }

  stopTimer(roomCode: string): Room | null {
    const room = this.rooms.get(roomCode);
    if (!room) return null;

    room.timerRunning = false;
    // Keep startedAt for reference if needed

    logger.logUserAction("Timer stopped", "stop_timer", {
      roomCode,
      duration: room.timerDuration,
    });

    return room;
  }
}

export default new RoomService();
