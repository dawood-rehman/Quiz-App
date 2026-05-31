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

export function jsonError(error: unknown) {
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
