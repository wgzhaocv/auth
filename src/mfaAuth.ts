import express from "express";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import { updateUserMFA } from "./db";

const router = express.Router();

const generateAuthenticatorSecret = async (userId: number) => {
  const secret = speakeasy.generateSecret({
    length: 20,
  });

  try {
    const updatedUser = await updateUserMFA(userId, secret.base32);

    const url = speakeasy.otpauthURL({
      secret: secret.base32,
      label: `YourApp:${updatedUser.email || updatedUser.phonenumber}`,
      algorithm: "sha1",
      digits: 6,
      period: 30,
    });

    const qrCodeUrl = await qrcode.toDataURL(url);
    return { secret: secret.base32, qrCodeUrl };
  } catch (error) {
    console.log(error);
    return { secret: "", qrCodeUrl: "" };
  }
};

router.get("/setup", async (req, res) => {
  const { user } = req.session;

  if (!user) return res.redirect("/login");

  try {
    const { qrCodeUrl } = await generateAuthenticatorSecret(user.user_id);

    return res.render("mfa/setup", {
      qrCodeUrl,
    });
  } catch (error) {
    console.log(error);
  }
});

router.get("/verify", async (req, res) => {});

router.post("/setup", async (req, res) => {});

router.post("/verify", async (req, res) => {});

export default router;
