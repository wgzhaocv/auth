import { expressjwt } from "express-jwt";
import jwt from "jsonwebtoken";
import { noAuthPaths } from "./utils";
import express from "express";

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const JWT_TEMP_SECRET = process.env.JWT_TEMP_SECRET!;

export type UserPart = {
  user_id: number;
  is_mfa_enabled?: boolean;
};

export const getToken = (req: express.Request) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) throw new Error("No token");
  return token;
};

export const generateTokenAndRefreshToken = (user: UserPart) => {
  const token = jwt.sign(user, JWT_SECRET, {
    expiresIn: "1h",
  });
  const refreshToken = jwt.sign(user, JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
  return { token, refreshToken };
};

export const refreshToken = (refreshToken: string) => {
  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const token = jwt.sign(decoded, JWT_SECRET, {
      expiresIn: "1h",
    });
    return token;
  } catch (error) {
    console.error(error);
    throw error;
  }
};
export const generateTempToken = (user: UserPart) => {
  const token = jwt.sign(user, JWT_TEMP_SECRET, {
    expiresIn: "5m",
  });
  return token;
};

export const verifyToken = (req: express.Request) => {
  try {
    const token = getToken(req);
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const verifyTempToken = (req: express.Request) => {
  try {
    const token = getToken(req);
    const decoded = jwt.verify(token, JWT_TEMP_SECRET);
    return decoded;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const middlewareJwt = expressjwt({
  secret: JWT_SECRET,
  algorithms: ["HS256"],
}).unless({
  path: noAuthPaths,
});
