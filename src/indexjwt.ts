import express from "express";
import path from "path";
import session from "express-session";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { expressjwt } from "express-jwt";

const app = express();
import {
  queryUserById,
  queryUserOnly,
  createUserWithRole,
  queryUserByEmail,
  saveAuthCode,
  queryUserByPhoneNumber,
  verifyAuthCode,
} from "./db";
import { generateAuthcode, generateTokenByUserId, noAuthPaths } from "./utils";
import { sendAuthCodeMail } from "./mailAuthCode";
import Twilio from "twilio";
import MFARouter from "./mfaAuthJwt";
import { generateTempToken, getToken, middlewareJwt, verifyToken } from "./jwt";
import { JwtPayload } from "jsonwebtoken";
import cookieParser from "cookie-parser";

const twilioClient = Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

declare module "express-session" {
  export interface SessionData {
    user: { [key: string]: any };
    redirectTo?: string;
    mfaVerified?: boolean;
  }
}

app.use(cookieParser());
app.use(express.json());
const publicPath = path.resolve("public");
app.use(express.static(publicPath));

app.use(middlewareJwt);

app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (err.name === "UnauthorizedError") {
      // Check if error name is 'UnauthorizedError'
      res.redirect("/login");
    } else {
      next(err);
    }
  }
);

app.set("view engine", "ejs");

app.use((req, res, next) => {
  res.set("Last-Modified", new Date().toUTCString());
  next();
});

app.use("/", async (req, res, next) => {
  if (
    noAuthPaths.some((path) => new RegExp(`^${path}(/.*)?$`).test(req.path))
  ) {
    return next();
  }

  try {
    console.log("check token middleware");
    verifyToken(req);
    console.log(req);
    next();
  } catch (error) {
    console.error(error);
    return res.redirect("/login");
  }
});

const toValidateMfa = (user: any) => {
  console.log("invoke toValidateMfa", user);
  if (!user)
    return {
      error: {
        message: "login failed, no user found",
      },
    };
  const token = generateTokenByUserId(user.user_id);
  const tempToken = generateTempToken({
    user_id: user.user_id,
    is_mfa_enabled: user.is_mfa_enabled,
  });
  if (user.is_mfa_enabled) {
    return {
      success: {
        message: "user confirmed, goto mfa setting",
        mfaURL: `/mfa/verify?token=${token}`,
        tempToken,
      },
    };
  } else {
    return {
      success: {
        message: "user confirmed, goto mfa setting",
        mfaURL: `/mfa/setup?token=${token}`,
        tempToken,
      },
    };
  }
};

app.get("/", async (req, res) => {
  try {
    const user = verifyToken(req) as JwtPayload;
    const allUserInfo = await queryUserById(user.user_id);
    console.log(allUserInfo);
    return res.render("home", {
      user: allUserInfo?.username ?? "",
      role: JSON.stringify(allUserInfo?.User_Roles),
      permission: "",
    });
  } catch (error) {
    console.error(error);
    return res.redirect("/login");
  }
});

app.get("/login", async (req, res) => {
  try {
    verifyToken(req);
    return res.redirect("/");
  } catch (error) {
    console.error(error);
    return res.render("signin/index");
  }
});

app.post("/login", async (req, res, next) => {
  const { email, phonenumber, password } = req.body;

  try {
    const user = await queryUserOnly({ email, phonenumber });
    const result = await bcrypt.compare(password, user?.password || "");

    console.log("the user>>>", user, result);
    if (result && user) {
      const result = toValidateMfa(user);
      res.cookie("tempToken", result.success?.tempToken!, {
        httpOnly: true,
        secure: true,
      });
      return res.json(result);
    } else {
      throw new Error("login failed");
    }
  } catch (error) {
    console.log(error);
    return res.json({
      error: {
        message: "login failed, error occured",
      },
    });
  }
});

app.get("/signup", (req, res) => {
  console.log(req.session?.user);
  try {
    verifyToken(req);
    return res.redirect("/");
  } catch (error) {
    console.error(error);
    return res.render("signup/index");
  }
});

app.post("/signup", async (req, res) => {
  const { email, phonenumber, password } = req.body;

  try {
    const user = await createUserWithRole({
      password,
      role_id: 1,
      email,
      phonenumber,
    });

    return res.json(toValidateMfa(user));
  } catch (error) {
    console.log(error);
    return res.json({ error: "somothing wrong while creating user" });
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log("logout error>>", err);
      return res.json({
        error: {
          message: "some error occured",
        },
      });
    }
    return res.json({
      success: {
        message: "logout success",
      },
    });
  });
});

app.post("/sendauthcode", async (req, res) => {
  const { email, phonenumber } = req.body;
  const authCode = generateAuthcode();

  try {
    if (email) {
      const user = await queryUserByEmail(email);

      const sentInfo = await sendAuthCodeMail(email, authCode);

      if (user) {
        const savedAuthInfo = await saveAuthCode(user.user_id, authCode);
        if (savedAuthInfo.success) {
          const tempToken = generateTempToken({
            user_id: user.user_id,
            is_mfa_enabled: user.is_mfa_enabled,
          });
          return res.json({
            success: {
              message: "auth code sent",
              tempToken,
            },
          });
        }
      }
    } else if (phonenumber) {
      const user = await queryUserByPhoneNumber(phonenumber);

      const sentInfo = await twilioClient.messages.create({
        body: `[zhaowg]Your verification code is: ${authCode}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phonenumber,
      });

      if (user) {
        const savedAuthInfo = await saveAuthCode(user.user_id, authCode);
        if (savedAuthInfo.success) {
          const tempToken = generateTempToken({
            user_id: user.user_id,
            is_mfa_enabled: user.is_mfa_enabled,
          });
          return res.json({
            success: {
              message: "auth code sent",
              tempToken,
            },
          });
        }
      }
    }
    throw new Error("some error occured");
  } catch (error) {
    console.log(error);
    return res.json({
      error: {
        message: "some error occured",
      },
    });
  }
});

app.post("/verifyauthcode", async (req, res) => {
  const { email, phonenumber, code } = req.body;

  try {
    let user;
    if (email) {
      user = await queryUserByEmail(email);
    } else if (phonenumber) {
      user = await queryUserByPhoneNumber(phonenumber);
    }
    if (user) {
      const result = await verifyAuthCode(user.user_id, code);
      if (result.success) {
        return res.json(toValidateMfa(user));
      }
    }
    throw new Error("some error occured");
  } catch (error) {
    return res.json({
      error: {
        message: "some error occured",
      },
    });
  }
});

app.use("/mfa", MFARouter);

const server = app.listen(3000, () => {
  console.log(`
🚀 Server ready at: http://localhost:3000
⭐️ See sample requests: http://pris.ly/e/ts/rest-express#3-using-the-rest-api`);
});
