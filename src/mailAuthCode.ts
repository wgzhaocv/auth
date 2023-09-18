import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.NODEMAILER_USER,
    pass: process.env.NODEMAILER_PASS,
  },
});

export const sendAuthCodeMail = async (to: string, code: string) => {
  const mailOptions = {
    from: process.env.NODEMAILER_USER,
    to,
    subject: "[Auth Code] This is your auth code]",
    text: `Your verification code is: ${code}, it will expire in 5 minutes.`,
  };

  await transporter.sendMail(mailOptions);
};
