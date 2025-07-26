const CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CODE_LENGTH = 6;

export const generateRoomCode = (): string => {
  let result = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    result += CHARACTERS.charAt(Math.floor(Math.random() * CHARACTERS.length));
  }
  return result;
};

export const isValidRoomCode = (code: string): boolean => {
  if (code.length !== CODE_LENGTH) return false;

  return code.split("").every((char) => CHARACTERS.includes(char));
};
