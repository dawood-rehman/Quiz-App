import { cookies } from "next/headers";
import type { Role } from "@prisma/client";
import { ACCESS_COOKIE } from "@/lib/auth/constants";
import { verifyAccessToken } from "@/lib/auth/tokens";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/http";

export async function requireUser(requiredRole?: Role) {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) throw new ApiError(401, "Please sign in to continue.", "UNAUTHENTICATED");

  try {
    const claims = await verifyAccessToken(token);
    const user = await db.user.findUnique({ where: { id: claims.userId } });

    if (!user || user.status !== "ACTIVE") {
      throw new ApiError(401, "Your session is no longer active.", "UNAUTHENTICATED");
    }

    if (requiredRole && user.role !== requiredRole) {
      throw new ApiError(403, "You do not have permission to perform this action.", "FORBIDDEN");
    }

    return user;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(401, "Your session has expired. Please sign in again.", "UNAUTHENTICATED");
  }
}
