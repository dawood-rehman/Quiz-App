import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import { getEnv } from "@/lib/config/env";
import { ApiError } from "@/lib/http";

type Email = {
  to: string;
  subject: string;
  text: string;
};

type EmailDelivery = "development" | "provider";

function isPlaceholderSender(value: string) {
  return /@example\.com>?$/i.test(value.trim());
}

function isSmtpConfigured(env: ReturnType<typeof getEnv>) {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

function logDevelopmentEmail(message: Email, reason?: string) {
  if (reason) console.warn(`[development email fallback] ${reason}`);
  console.info(`[development email] ${message.subject} to ${message.to}\n${message.text}`);
}

function assertProductionEmailConfigured(env: ReturnType<typeof getEnv>) {
  if (env.NODE_ENV !== "production") return;

  if (!isSmtpConfigured(env)) {
    throw new ApiError(
      503,
      "Email delivery is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, and EMAIL_FROM.",
      "EMAIL_NOT_CONFIGURED",
    );
  }

  if (isPlaceholderSender(env.EMAIL_FROM)) {
    throw new ApiError(
      503,
      "EMAIL_FROM must use a real sender address in production.",
      "EMAIL_NOT_CONFIGURED",
    );
  }
}

let cachedTransporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | undefined;

function getTransporter(env: ReturnType<typeof getEnv>) {
  if (!isSmtpConfigured(env)) return undefined;

  if (!cachedTransporter) {
    const secure = env.SMTP_SECURE ?? env.SMTP_PORT === 465;
    cachedTransporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  }

  return cachedTransporter;
}

export async function sendEmail(message: Email): Promise<EmailDelivery> {
  const env = getEnv();
  assertProductionEmailConfigured(env);

  const transporter = getTransporter(env);
  if (!transporter) {
    logDevelopmentEmail(message);
    return "development";
  }

  if (isPlaceholderSender(env.EMAIL_FROM)) {
    console.warn("EMAIL_FROM uses a placeholder domain; delivery may fail.");
  }

  try {
    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
    return "provider";
  } catch (error) {
    if (env.NODE_ENV === "production") {
      console.error("SMTP email delivery failed", error);
      throw new ApiError(
        503,
        "We could not send email right now. Check SMTP settings and try again.",
        "EMAIL_DELIVERY_FAILED",
      );
    }

    logDevelopmentEmail(message, error instanceof Error ? error.message : "SMTP request failed.");
    return "development";
  }
}
