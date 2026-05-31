import { createHash } from "node:crypto";
import { getEnv } from "@/lib/config/env";

type Email = {
  to: string;
  subject: string;
  text: string;
};

type EmailDelivery = "development" | "provider";

const EMAIL_TIMEOUT_MS = 10_000;

function isPlaceholderSender(value: string) {
  return /@(example\.com|resend\.dev)>?$/i.test(value.trim());
}

function logDevelopmentEmail(message: Email, reason?: string) {
  if (reason) console.warn(`[development email fallback] ${reason}`);
  console.info(`[development email] ${message.subject} to ${message.to}\n${message.text}`);
}

async function getProviderError(response: Response) {
  try {
    const body = (await response.json()) as { message?: unknown; name?: unknown };
    const message = typeof body.message === "string" ? body.message : undefined;
    const name = typeof body.name === "string" ? body.name : undefined;
    return [name, message].filter(Boolean).join(": ").slice(0, 500) || "No provider details were returned.";
  } catch {
    return "The provider returned a non-JSON error response.";
  }
}

function getIdempotencyKey(message: Email) {
  const digest = createHash("sha256").update(`${message.to}:${message.subject}:${message.text}`).digest("hex");
  return `quizforge-${digest}`;
}

export async function sendEmail(message: Email): Promise<EmailDelivery> {
  const env = getEnv();

  if (!env.RESEND_API_KEY) {
    if (env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY and EMAIL_FROM with a verified sender domain are required to send email.");
    }
    logDevelopmentEmail(message);
    return "development";
  }

  if (isPlaceholderSender(env.EMAIL_FROM)) {
    // If a provider key exists, attempt delivery even with a placeholder
    // sender but warn the developer. In production `getEnv` enforces a verified
    // sender, so this is primarily a development-time safety net.
    console.warn("EMAIL_FROM appears to be a placeholder or testing domain; delivery may fail if the sender is not verified.");
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": getIdempotencyKey(message),
        "User-Agent": "quizforge/1.0",
      },
      body: JSON.stringify({ from: env.EMAIL_FROM, ...message }),
      signal: AbortSignal.timeout(EMAIL_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`Email provider returned ${response.status}: ${await getProviderError(response)}`);
    }
    return "provider";
  } catch (error) {
    if (env.NODE_ENV === "production") throw error;
    logDevelopmentEmail(
      message,
      error instanceof Error ? error.message : "The email provider request failed.",
    );
    return "development";
  }
}
