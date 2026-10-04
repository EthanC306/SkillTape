import nodemailer from "nodemailer";

//Connect to a mail server if one is configured
const transport = process.env.SMTP_HOST
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587), //mail server 587
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
: null;

//Decide who the email says it is from
const FROM = process.env.MAIL_FROM || process.env.SMTP_USER;

export async function sendMail({to, subject, text, html}){
    //If there is no mail server, print the email in the terminal instead
    if(!transport) {
        console.log(`[mail] SMTP not configured. Would have sent to ${to}:\n ${subject}\n${text}\n`);
        return;
    }
    //Send the email
    await transport.sendMail({ from: FROM, to, subject, text, html});
}   

//Build the verification link
export function sendVerificationEmail(to, token) {
  const appUrl = (process.env.APP_URL || "http://localhost:5173").replace(/\/+$/, "");
  const link = `${appUrl}/verify-email?token=${token}`;

  return sendMail({
    to,
    subject: "Verify your SkillTape email address",
    text:
      `Welcome to SkillTape!\n\n` +
      `Confirm your email address by opening this link:\n${link}\n\n` +
      `The link expires in 24 hours. If you didn't create an account, you can ignore this email.`,
    html:
      `<p>Welcome to SkillTape!</p>` +
      `<p><a href="${link}">Verify my email address</a></p>` +
      `<p>Or paste this link into your browser:<br>${link}</p>` +
      `<p>The link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>`,
  });
}