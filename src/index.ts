import { Prisma, PrismaClient } from "@prisma/client";
import express from "express";
import path from "path";
import jwt from "jsonwebtoken";
import session from "express-session";
import crypto from "crypto";
const prisma = new PrismaClient();
// import axios from "axios";
import bcrypt from "bcrypt";
const app = express();
import seedingData from "../prisma/seed";

declare module "express-session" {
  export interface SessionData {
    user: { [key: string]: any };
    redirectTo?: string;
  }
}

app.use(express.json());

app.set("view engine", "ejs");

app.use(
  session({
    secret:
      process.env.SESSION_SECRET || crypto.randomBytes(20).toString("hex"),
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 5 * 60 * 1000 }, // 在生产环境中应设置为 true，以确保cookie只通过HTTPS发送
  })
);

const publicPath = path.resolve(".", "./public");
console.log(path.join(publicPath, "login", "index.html"));

app.use(express.static(publicPath));

app.use("/", (req, res, next) => {
  const noAuth = ["/login", "/signup"];
  if (noAuth.includes(req.path)) {
    return next();
  }
  if (!req.session?.user) {
    req.session.redirectTo = req.originalUrl;
    return res.redirect("/login");
  }

  next();
});

app.get("/", (req, res) => {
  res.render("index", { message: "Hello, world!" });
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(publicPath, "signin", "index.html"));
});

app.post("/login", async (req, res) => {
  const { email, phonenumber, password } = req.body;

  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { phonenumber }],
      },
    });
    const result = await bcrypt.compare(password, user?.password || "");
    if (result && user) {
      
      req.session.user = user;
          if (req.session.redirectTo) {
      return res.redirect(req.session.redirectTo);
    } else {
      return res.redirect("/");
    }

    }
  } catch (error) {}



app.get("/signup", (req, res) => {
  res.sendFile(path.join(publicPath, "signup", "register.html"));
});

app.post("/signup", async (req, res) => {
  const { email, phonenumber, password } = req.body;
  console.log(req.body);

  try {
    const user = await prisma.user.create({
      data: {
        username: "user_ichigo",
        password: await bcrypt.hash(password, 10),
        email,
        phonenumber,
      },
    });
    req.session.user = user;
    if (req.session?.user) {
      if (req.session.redirectTo) {
        const dest = req.session.redirectTo;
        delete req.session.redirectTo;
        return res.redirect(dest);
      } else {
        return res.redirect("/");
      }
    }
    return res.redirect("/");
  } catch (error) {
    console.log(error);
  }

  res.json({ body: req.body });
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
