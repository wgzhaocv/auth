import express from "express";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import { updateUserMFA } from "./db";
import { isTokenValid } from "./utils";

const router = express.Router();

const generateAuthenticatorSecret = async (user: any) => {
  const secret = speakeasy.generateSecret({
    length: 20,
    otpauth_url: true,
    name: `authApp:${user.email || user.phonenumber}`,
  });

  try {
    // console.log(">>>>>secret", secret.base32);
    const updatedUser = await updateUserMFA(user.user_id, secret.base32);
    // console.log("<<<<<secret", updatedUser.google_authenticator_secret);

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
    return { secret: secret.base32, qrCodeUrl, updatedUser };
  } catch (error) {
    console.log(error);
    return { secret: "", qrCodeUrl: "" };
  }
};

router.get("/setup", async (req, res) => {
  const { user } = req.session;
  const { token } = req.query;

  if (typeof token !== "string" || !isTokenValid(token)) {
    return res.redirect("/login");
  }
  if (!user) return res.redirect("/login");

  try {
    const { qrCodeUrl, secret, updatedUser } =
      await generateAuthenticatorSecret(user);
    if (updatedUser) {
      req.session.user = updatedUser;
    } else {
      return res.redirect("/login");
    }

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
  const { user } = req.session;

  if (!user) return res.redirect("/login");

  try {
    return res.render("mfa/verify");
  } catch (error) {
    console.log(error);
  }
});
const test = (secret: string) => {
  const token = speakeasy.totp({
    secret: secret,
    encoding: "base32",
  });

  console.log("Generated Token:", token);

  const verified = speakeasy.totp.verify({
    secret: secret,
    encoding: "base32",
    token: token,
  });

  console.log("test Verification result:", verified);
};
router.post("/setup", async (req, res) => {
  const { mfaCode, time } = req.body;
  const { user } = req.session;
  const { token } = req.query;
  if (typeof token !== "string" || !isTokenValid(token)) {
    return res.redirect("/login");
  }

  console.log("user", user);
  console.log("query", req.query);

  try {
    if (user) {
      const secret = user.google_authenticator_secret;

      const verified = speakeasy.totp.verify({
        secret,
        encoding: "base32",
        token: mfaCode,
      });

      if (verified) {
        const updatedUser = await updateUserMFA(user.user_id, secret, true);
        if (updatedUser && updatedUser.is_mfa_enabled) {
          req.session.user = updatedUser;
          req.session.mfaVerified = true;
          let redirectTo = req.session.redirectTo || "/";
          return res.json({
            success: {
              message: "mfa setup and verify success",
              redirectTo,
              data: {
                user: updatedUser.username,
              },
            },
          });
        }
      } else {
        return res.json({
          error: {
            message: "error occured while setting up mfa",
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

router.post("/verify", async (req, res) => {
  const { mfaCode } = req.body;
  const { user } = req.session;

  try {
    if (user) {
      const secret = user.google_authenticator_secret;
      const verified = speakeasy.totp.verify({
        secret,
        encoding: "base32",
        token: mfaCode,
      });

      if (verified) {
        req.session.mfaVerified = true;
        let redirectTo = req.session.redirectTo || "/";
        return res.json({
          success: {
            message: "mfa verify success",
            redirectTo,
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
