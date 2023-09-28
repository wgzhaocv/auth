import express from "express";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import { queryUserById, updateUserMFA } from "./db";
import { isTokenValid } from "./utils";
import {
  generateTokenAndRefreshToken,
  verifyTempToken,
  verifyToken,
} from "./jwt";
import { JwtPayload } from "jsonwebtoken";

const router = express.Router();

const generateAuthenticatorSecret = async (userPart: any) => {
  try {
    const user = await queryUserById(userPart.user_id);
    const secret = speakeasy.generateSecret({
      length: 20,
      otpauth_url: true,
      name: `authApp:${user?.email || user?.phonenumber}`,
    });

    const updatedUser = await updateUserMFA(userPart.user_id, secret.base32);

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
    return { secret: secret.base32, qrCodeUrl, updatedUser };
  } catch (error) {
    console.log(error);
    return { secret: "", qrCodeUrl: "" };
  }
};

router.get("/setup", async (req, res) => {
  const { token, redirectTo } = req.query as {
    token: string;
    redirectTo?: string;
  };
  if (typeof token !== "string" || !isTokenValid(token)) {
    return res.redirect("/login");
  }

  try {
    verifyToken(req);
    return res.redirect(redirectTo ?? "/");
  } catch (error) {}

  try {
    const user = verifyTempToken(req);

    if (!user) return res.redirect("/login");

    const { qrCodeUrl, secret, updatedUser } =
      await generateAuthenticatorSecret(user);

    return res.render("mfa/setup", {
      qrCodeUrl,
      secret,
    });
  } catch (error) {
    console.log(error);
    return res.redirect("/login");
  }
});

router.get("/verify", async (req, res) => {
  const { token, redirectTo } = req.query as {
    token: string;
    redirectTo?: string;
  };
  if (typeof token !== "string" || !isTokenValid(token)) {
    return res.redirect("/login");
  }

  try {
    verifyToken(req);
    return res.redirect(redirectTo ?? "/");
  } catch (error) {
    console.log(error);
  }

  try {
    const user = verifyTempToken(req);
    console.log(">>>user", user);
    if (!user) return res.redirect("/login");
    return res.render("mfa/verify");
  } catch (error) {
    console.log(error);
    return res.json({
      error: { message: "error occured while setting up mfa" },
    });
  }
});

router.post("/setup", async (req, res) => {
  const { mfaCode } = req.body;
  const { token, redirectTo: dest } = req.query as {
    token: string;
    redirectTo?: string;
  };
  try {
    if (typeof token !== "string" || !isTokenValid(token)) {
      throw new Error("error occured while setting up mfa");
    }

    const user = verifyTempToken(req) as JwtPayload;

    if (!user) throw new Error("error occured while setting up mfa");
    const allUserInfo = await queryUserById(user.user_id);
    if (allUserInfo) {
      const secret = allUserInfo.google_authenticator_secret!;

      const verified = speakeasy.totp.verify({
        secret,
        encoding: "base32",
        token: mfaCode,
      });

      if (verified) {
        const updatedUser = await updateUserMFA(
          allUserInfo.user_id,
          secret,
          true
        );
        if (updatedUser && updatedUser.is_mfa_enabled) {
          const tokens = generateTokenAndRefreshToken({
            user_id: updatedUser.user_id,
            is_mfa_enabled: updatedUser.is_mfa_enabled,
          });
          let redirectTo = dest || "/";
          return res.json({
            success: {
              message: "mfa setup and verify success",
              redirectTo,
              ...tokens,
              data: {
                user: updatedUser.username,
              },
            },
          });
        }
      }
    }
    throw new Error("error occured while setting up mfa");
  } catch (error) {
    console.log(error);
  }
  return res.json({
    error: {
      message: "error occured while setting up mfa",
    },
  });
});

router.post("/verify", async (req, res) => {
  const { mfaCode } = req.body;

  try {
    const user = verifyTempToken(req) as JwtPayload;

    if (!user) throw new Error("error occured while setting up mfa");
    const allUserInfo = await queryUserById(user.user_id);

    if (allUserInfo) {
      const secret = allUserInfo.google_authenticator_secret!;
      const verified = speakeasy.totp.verify({
        secret,
        encoding: "base32",
        token: mfaCode,
      });

      if (verified) {
        const tokens = generateTokenAndRefreshToken({
          user_id: allUserInfo.user_id,
          is_mfa_enabled: allUserInfo.is_mfa_enabled,
        });
        return res.json({
          success: {
            message: "mfa verify success",
            ...tokens,
            data: {
              user: user.username,
            },
          },
        });
      }
    }
  } catch (error) {
    console.log(error);
  }
  return res.json({
    error: {
      message: "error occured while setting up mfa",
    },
  });
});

export default router;
