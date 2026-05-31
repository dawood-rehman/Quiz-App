import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { jsonError } from "@/lib/http";

export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt },
    });
  } catch (error) {
    return jsonError(error);
  }
}
