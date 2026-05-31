import { getEnv } from "@/lib/config/env";
import { ApiError } from "@/lib/http";

export function assertTrustedOrigin(request: Request) {
  const origin = request.headers.get("origin");

  if (!origin && getEnv().NODE_ENV !== "production") return;
  if (!origin) throw new ApiError(403, "Request origin could not be verified.", "INVALID_ORIGIN");

  const allowedOrigins = new Set([new URL(getEnv().APP_URL).origin, new URL(request.url).origin]);
  if (!allowedOrigins.has(origin)) {
    throw new ApiError(403, "Request origin is not allowed.", "INVALID_ORIGIN");
  }
}
