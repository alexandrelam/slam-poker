import { Room, User } from "@/types/room.types";
import roomService from "@/services/roomService";
import logger from "@/utils/logger";

class PermissionService {
  // Helper method to get room and validate it exists
  private getRoomSafely(roomCode: string): Room | null {
    return roomService.findRoom(roomCode);
  }

  // Helper method to find user in room
  private findUserInRoom(room: Room, userId: string): User | null {
    return room.users.find((u) => u.id === userId) || null;
  }

  // Helper method to get host user (first user in room)
  private getHostUser(room: Room): User | null {
    return room.users[0] || null;
  }

  // Check if user is the host of the room
  isHost(roomCode: string, userId: string): boolean {
    const room = this.getRoomSafely(roomCode);
    if (!room) return false;

    const hostUser = this.getHostUser(room);
    return hostUser?.id === userId && hostUser?.isOnline;
  }

  // Check if user is online in the room
  isUserOnline(roomCode: string, userId: string): boolean {
    const room = this.getRoomSafely(roomCode);
    if (!room) return false;

    const user = this.findUserInRoom(room, userId);
    return user?.isOnline ?? false;
  }

  // Check if user can perform an action based on room permission settings
  private canUserPerformAction(
    roomCode: string,
    userId: string,
    permissionType: "revealPermission" | "kickPermission",
  ): boolean {
    const room = this.getRoomSafely(roomCode);
    if (!room) return false;

    // User must be online to perform actions
    if (!this.isUserOnline(roomCode, userId)) return false;

    const permission = room[permissionType];

    // If permission is set to everyone, any online user can perform the action
    if (permission === "everyone") {
      return true;
    }

    // If permission is host-only, only the host can perform the action
    if (permission === "host-only") {
      return this.isHost(roomCode, userId);
    }

    return false;
  }

  // Check if user can reveal votes
  canRevealVotes(roomCode: string, userId: string): boolean {
    return this.canUserPerformAction(roomCode, userId, "revealPermission");
  }

  // Check if user can start next round
  canStartNextRound(roomCode: string, userId: string): boolean {
    // Same logic as reveal votes for now
    return this.canRevealVotes(roomCode, userId);
  }

  // Check if user can kick disconnected users
  canKickDisconnectedUsers(roomCode: string, userId: string): boolean {
    return this.canUserPerformAction(roomCode, userId, "kickPermission");
  }

  // Check if user can update room settings (host only)
  canUpdateRoomSettings(roomCode: string, userId: string): boolean {
    return this.isHost(roomCode, userId);
  }

  // Check if a specific user can be kicked
  canKickUser(
    roomCode: string,
    kickerId: string,
    userIdToKick: string,
  ): boolean {
    const room = this.getRoomSafely(roomCode);
    if (!room) return false;

    // Must have permission to kick users
    if (!this.canKickDisconnectedUsers(roomCode, kickerId)) return false;

    // Find the user to kick
    const userToKick = this.findUserInRoom(room, userIdToKick);
    if (!userToKick) return false;

    // Can only kick disconnected users
    if (userToKick.isOnline) {
      logger.warn("Attempted to kick online user", { roomCode, userIdToKick });
      return false;
    }

    // Cannot kick the host (first user)
    const hostUser = this.getHostUser(room);
    if (hostUser && hostUser.id === userIdToKick) {
      logger.warn("Attempted to kick host user", { roomCode, userIdToKick });
      return false;
    }

    return true;
  }

  // Get permission summary for a user in a room
  getUserPermissions(
    roomCode: string,
    userId: string,
  ): {
    canRevealVotes: boolean;
    canStartNextRound: boolean;
    canKickUsers: boolean;
    canUpdateSettings: boolean;
    isHost: boolean;
    isOnline: boolean;
  } {
    return {
      canRevealVotes: this.canRevealVotes(roomCode, userId),
      canStartNextRound: this.canStartNextRound(roomCode, userId),
      canKickUsers: this.canKickDisconnectedUsers(roomCode, userId),
      canUpdateSettings: this.canUpdateRoomSettings(roomCode, userId),
      isHost: this.isHost(roomCode, userId),
      isOnline: this.isUserOnline(roomCode, userId),
    };
  }

  // Check if user can change their own name
  canChangeOwnName(roomCode: string, userId: string): boolean {
    // Any online user can change their own name
    return this.isUserOnline(roomCode, userId);
  }
}

export default new PermissionService();
