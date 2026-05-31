import { getEnv } from "@/lib/config/env";
import { ApiError } from "@/lib/http";

function localDevOrigins(request: Request) {
  const requestUrl = new URL(request.url);
  const origins = new Set<string>([requestUrl.origin, new URL(getEnv().APP_URL).origin]);

  for (const hostname of ["localhost", "127.0.0.1"]) {
    origins.add(`${requestUrl.protocol}//${hostname}:${requestUrl.port || (requestUrl.protocol === "https:" ? "443" : "80")}`);
  }

  return origins;
}

export function assertTrustedOrigin(request: Request) {
  const origin = request.headers.get("origin");

  if (!origin && getEnv().NODE_ENV !== "production") return;
  if (!origin) throw new ApiError(403, "Request origin could not be verified.", "INVALID_ORIGIN");

  const allowedOrigins =
    getEnv().NODE_ENV === "production"
      ? new Set([new URL(getEnv().APP_URL).origin, new URL(request.url).origin])
      : localDevOrigins(request);

  if (!allowedOrigins.has(origin)) {
    throw new ApiError(403, "Request origin is not allowed.", "INVALID_ORIGIN");
  }
}
