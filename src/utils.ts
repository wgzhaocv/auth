import crypto from "crypto";

let tokensDB: Record<string, { userId: number; expiryTime: number }> = {};
export const generateAuthcode = () =>
  Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, "0");

export function identifyString(str: string) {
  const emailPattern = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
  const phonePattern = /^\d+$/;

  return {
    email: emailPattern.test(str),
    phone: phonePattern.test(str),
  };
}

export function generateTokenByUserId(userId: number) {
  const token = crypto.randomBytes(20).toString("hex");
  const expiryTime = Date.now() + 60 * 1000; // 有效期1分钟

  // 3. 将token存储在数据库中，并与用户ID关联
  tokensDB[token] = { userId, expiryTime };
  return token;
}

export function isTokenValid(token: string) {
  const tokenData = tokensDB[token];
  if (tokenData && tokenData.expiryTime > Date.now()) return true;
  return false;
}

export const noAuthPaths = [
  "/login",
  "/signup",
  "/sendauthcode",
  "/verifyauthcode",
  "/mfa/setup",
  "/mfa/verify",
];
