import { Prisma, PrismaClient } from "@prisma/client";
import express from "express";
import path from "path";
// import jwt from "jsonwebtoken";
import session from "express-session";
import crypto from "crypto";
import bcrypt from "bcrypt";
const app = express();
// import seedingData from "../prisma/seed";
import {
  queryUserById,
  queryUserOnly,
  createUserWithRole,
  queryUserByEmail,
  saveAuthCode,
  queryUserByPhoneNumber,
  verifyAuthCode,
} from "./db";
import { generateAuthcode, generateTokenByUserId, isTokenValid } from "./utils";
import { sendAuthCodeMail } from "./mailAuthCode";
import Twilio from "twilio";
import MFARouter from "./mfaAuth";

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

app.use(express.json());

app.set("view engine", "ejs");

app.use(
  session({
    secret:
      process.env.SESSION_SECRET || crypto.randomBytes(20).toString("hex"),
    resave: false,
    rolling: true,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 5 * 60 * 1000 }, // 在生产环境中应设置为 true，以确保cookie只通过HTTPS发送
  })
);

const publicPath = path.resolve(".", "./public");

app.use(express.static(publicPath));

app.use((req, res, next) => {
  res.set("Last-Modified", new Date().toUTCString());
  next();
});

app.use("/", (req, res, next) => {
  // console.log("req>>>", req);
  const noAuthPaths = ["/login", "/signup", "/sendauthcode", "/verifyauthcode"];
  if (noAuthPaths.some((path) => new RegExp(`^${path}/?$`).test(req.path))) {
    return next();
  }
  if (!req.session?.user || !req.session?.mfaVerified) {
    req.session.redirectTo = req.originalUrl;
    return res.redirect("/login");
  }

  next();
});

app.use("/mfa", MFARouter);

const toValidateMfa = async (req: express.Request, res: express.Response) => {
  const { user } = req.session;
  if (!user)
    return {
      error: {
        message: "login failed, no user found",
      },
    };
  const token = generateTokenByUserId(user.user_id);
  if (user.is_mfa_enabled) {
    // let dest = "";
    // if (req.session.redirectTo) {
    //   dest = req.session.redirectTo;
    //   delete req.session.redirectTo;
    // }
    return res.json({
      success: {
        message: "user confirmed, goto mfa setting",
        mfaURL: `/mfa/setup?token=${token}`,
      },
    });
  } else {
  }
};

app.get("/", async (req, res) => {
  const user = req.session?.user;

  console.log(user);

  if (user) {
    const allUserInfo = await queryUserById(user.user_id);
    console.log(allUserInfo);
    return res.render("home", {
      user: user.username,
      role: JSON.stringify(allUserInfo?.User_Roles),
      permission: "",
    });
  }

  return res.redirect("/login");
});

app.get("/login", (req, res) => {
  if (req.session?.user) {
    return res.redirect("/");
  }
  res.render("signin/index");
});

app.post("/login", async (req, res) => {
  const { email, phonenumber, password } = req.body;

  try {
    const user = await queryUserOnly({ email, phonenumber });
    const result = await bcrypt.compare(password, user?.password || "");

    // console.log("the user>>>", user);
    if (result && user) {
      if (user.is_mfa_enabled) {
        req.session.user = user;
        let dest = "";
        if (req.session.redirectTo) {
          dest = req.session.redirectTo;
          delete req.session.redirectTo;
        }
        return res.json({
          success: {
            message: "login success",
            redirectTo: dest,
            data: {
              user: user.username,
            },
          },
        });
      } else {
      }
    }
    return res.json({
      error: {
        message: "login failed, no user found",
      },
    });
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
  if (req.session?.user) {
    return res.redirect("/");
  }
  res.render("signup/index");
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

    req.session.user = user;
    if (req.session.redirectTo) {
      const dest = req.session.redirectTo;
      delete req.session.redirectTo;
      return res.json({
        success: {
          message: "signup success",
          redirectTo: dest,
          data: {
            user: user.username,
          },
        },
      });
    } else {
      return res.json({
        success: {
          message: "signup success",
          data: {
            user: user.username,
          },
        },
      });
    }
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
          return res.json({
            success: {
              message: "auth code sent",
            },
          });
        } else {
          return res.json({
            error: {
              message: "some error occured",
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
          return res.json({
            success: {
              message: "auth code sent",
            },
          });
        } else {
          return res.json({
            error: {
              message: "some error occured",
            },
          });
        }
      }
    }
  } catch (error) {
    console.log(error);
    return res.json({
      error: {
        message: "some error occured",
      },
    });
  }

  return res.json({
    error: {
      message: "no email or phonenumber provided",
    },
  });
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
        req.session.user = user;
        let dest = "";
        if (req.session.redirectTo) {
          dest = req.session.redirectTo;
          delete req.session.redirectTo;
        }

        return res.json({
          success: {
            message: "auth code verified",
            redirectTo: dest,
            data: {
              user: user.username,
            },
          },
        });
      } else if (result.error) {
        return res.json({
          error: {
            message: "auth code not verified",
          },
        });
      }
    } else {
      return res.json({
        error: {
          message: "no user found",
        },
      });
    }
  } catch (error) {
    return res.json({
      error: {
        message: "some error occured",
      },
    });
  }
  return res.json({
    error: {
      message: "some error occured",
    },
  });
});

const server = app.listen(3000, async () => {
  try {
    // seedingData();
  } catch (error) {
    console.log(error);
  }
  console.log(`
🚀 Server ready at: http://localhost:3000
⭐️ See sample requests: http://pris.ly/e/ts/rest-express#3-using-the-rest-api`);
});
