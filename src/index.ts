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

app.use(express.json());

console.log(crypto.randomBytes(20).toString("hex"));

app.use(
  session({
    secret:
      process.env.SESSION_SECRET || crypto.randomBytes(20).toString("hex"),
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // 在生产环境中应设置为 true，以确保cookie只通过HTTPS发送
  })
);

const publicPath = path.resolve(".", "./public");
console.log(path.join(publicPath, "login", "index.html"));

app.use(express.static(publicPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

app.get("/signup", (req, res) => {
  res.sendFile(path.join(publicPath, "signup", "register.html"));
});

app.post("/signup", async (req, res) => {
  const { email, phonenumber, password } = req.body;
  console.log(req.body);

  const user = await prisma.user.create({
    data: {
      username: "user",
      password: await bcrypt.hash(password, 10),
      email,
      phonenumber,
    },
  });
  res.json({ body: req.body });
});

// app.post(`/signup`, async (req, res) => {
//   const { name, email, posts } = req.body;

//   const postData = posts?.map((post: Prisma.PostCreateInput) => {
//     return { title: post?.title, content: post?.content };
//   });

//   const result = await prisma.user.create({
//     data: {
//       name,
//       email,
//       posts: {
//         create: postData,
//       },
//     },
//   });
//   res.json(result);
// });

// app.post(`/post`, async (req, res) => {
//   const { title, content, authorEmail } = req.body;
//   const result = await prisma.post.create({
//     data: {
//       title,
//       content,
//       author: { connect: { email: authorEmail } },
//     },
//   });
//   res.json(result);
// });

// app.put("/post/:id/views", async (req, res) => {
//   const { id } = req.params;

//   try {
//     const post = await prisma.post.update({
//       where: { id: Number(id) },
//       data: {
//         viewCount: {
//           increment: 1,
//         },
//       },
//     });

//     res.json(post);
//   } catch (error) {
//     res.json({ error: `Post with ID ${id} does not exist in the database` });
//   }
// });

// app.put("/publish/:id", async (req, res) => {
//   const { id } = req.params;

//   try {
//     const postData = await prisma.post.findUnique({
//       where: { id: Number(id) },
//       select: {
//         published: true,
//       },
//     });

//     const updatedPost = await prisma.post.update({
//       where: { id: Number(id) || undefined },
//       data: { published: !postData?.published },
//     });
//     res.json(updatedPost);
//   } catch (error) {
//     res.json({ error: `Post with ID ${id} does not exist in the database` });
//   }
// });

// app.delete(`/post/:id`, async (req, res) => {
//   const { id } = req.params;
//   const post = await prisma.post.delete({
//     where: {
//       id: Number(id),
//     },
//   });
//   res.json(post);
// });

// app.get("/users", async (req, res) => {
//   const users = await prisma.user.findMany();
//   res.json(users);
// });

// app.get("/user/:id/drafts", async (req, res) => {
//   const { id } = req.params;

//   const drafts = await prisma.user
//     .findUnique({
//       where: {
//         id: Number(id),
//       },
//     })
//     .posts({
//       where: { published: false },
//     });

//   res.json(drafts);
// });

// app.get(`/post/:id`, async (req, res) => {
//   const { id }: { id?: string } = req.params;

//   const post = await prisma.post.findUnique({
//     where: { id: Number(id) },
//   });
//   res.json(post);
// });

// app.get("/feed", async (req, res) => {
//   const { searchString, skip, take, orderBy } = req.query;

//   const or: Prisma.PostWhereInput = searchString
//     ? {
//         OR: [
//           { title: { contains: searchString as string } },
//           { content: { contains: searchString as string } },
//         ],
//       }
//     : {};

//   const posts = await prisma.post.findMany({
//     where: {
//       published: true,
//       ...or,
//     },
//     include: { author: true },
//     take: Number(take) || undefined,
//     skip: Number(skip) || undefined,
//     orderBy: {
//       updatedAt: orderBy as Prisma.SortOrder,
//     },
//   });

//   res.json(posts);
// });

// const generatetoken = (user: Prisma.User) => {
//   return jwt.sign(user, "your_jwt_secret", { expiresIn: "1h" });
// };

const server = app.listen(3000, () =>
  console.log(`
🚀 Server ready at: http://localhost:3000
⭐️ See sample requests: http://pris.ly/e/ts/rest-express#3-using-the-rest-api`)
);
