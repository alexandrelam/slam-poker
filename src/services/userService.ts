import { User } from "@/types/room.types";
import { randomUUID } from "crypto";
import logger from "@/utils/logger";

class UserService {
  createUser(name: string): User {
    const user: User = {
      id: randomUUID(),
      name: name.trim(),
      isOnline: true,
      currentVote: undefined,
    };

    logger.info("User created", { userId: user.id, userName: user.name });
    return user;
  }

  isValidUserName(name: string): boolean {
    const trimmedName = name?.trim();
    return !!(
      trimmedName &&
      trimmedName.length >= 1 &&
      trimmedName.length <= 50
    );
  }

  sanitizeUserName(name: string): string {
    return name.trim().slice(0, 50);
  }

  updateUserOnlineStatus(user: User, isOnline: boolean): User {
    const updatedUser = { ...user, isOnline };

    if (!isOnline) {
      updatedUser.currentVote = undefined;
    }

    logger.info("User online status updated", {
      userId: user.id,
      userName: user.name,
      isOnline,
    });

    return updatedUser;
  }
}

export default new UserService();
