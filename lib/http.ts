import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import type { ZodError, ZodType } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "REQUEST_FAILED",
  ) {
    super(message);
  }
}

export function getClientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export function mapKnownError(error: unknown): ApiError | undefined {
  if (error instanceof ApiError) return error;

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    ["P1000", "P1001", "P1002", "P1017"].includes(error.code)
  ) {
    return new ApiError(503, "The database is unavailable right now. Please try again shortly.", "DATABASE_UNAVAILABLE");
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
    return new ApiError(
      503,
      "The application database is not fully initialized. Run migrations and try again.",
      "DATABASE_SCHEMA_MISSING",
    );
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return new ApiError(503, "The database is unavailable right now. Please try again shortly.", "DATABASE_UNAVAILABLE");
  }

  if (error instanceof Error) {
    const message = error.message;
    if (message.includes("DATABASE_URL is required")) {
      return new ApiError(503, "Server configuration is incomplete (database).", "CONFIG_ERROR");
    }
    if (message.includes("JWT_SECRET is required") || message.includes("JWT_SECRET must contain")) {
      return new ApiError(503, "Server configuration is incomplete (authentication).", "CONFIG_ERROR");
    }
    if (message.includes("Invalid environment configuration")) {
      return new ApiError(503, "Server configuration is invalid.", "CONFIG_ERROR");
    }
    if (
      message.includes("SMTP_") ||
      message.includes("EMAIL_FROM") ||
      message.includes("SMTP") ||
      message.includes("verification email")
    ) {
      return new ApiError(
        503,
        "We could not send email right now. Check your email settings or try again later.",
        "EMAIL_DELIVERY_FAILED",
      );
    }
  }

  return undefined;
}

export function jsonError(error: unknown) {
  const mapped = mapKnownError(error);
  if (mapped) {
    return NextResponse.json(
      { error: { code: mapped.code, message: mapped.message } },
      { status: mapped.status },
    );
  }

  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }

  console.error("Unhandled API error", error);
  const message =
    process.env.NODE_ENV !== "production" && error instanceof Error
      ? error.message
      : "Something went wrong. Please try again.";

  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message } },
    { status: 500 },
  );
}

export function validationError(error: ZodError) {
  return NextResponse.json(
    {
      error: {
        code: "VALIDATION_ERROR",
        message: "Please review the highlighted fields.",
        fields: error.flatten().fieldErrors,
      },
    },
    { status: 422 },
  );
}

export async function parseJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, "A valid JSON request body is required.", "INVALID_JSON");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(422, parsed.error.issues[0]?.message ?? "Request validation failed.", "VALIDATION_ERROR");
  }

  return parsed.data;
}
