import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiKey } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { nanoid } from "nanoid";
import { eq, and } from "drizzle-orm";

// Generate API key
function generateApiKey(): string {
  return `sk_${nanoid(32)}`;
}

// GET - List all API keys for the user
export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const keys = await db
      .select()
      .from(apiKey)
      .where(eq(apiKey.userId, session.user.id));

    // Mask the keys for security
    const maskedKeys = keys.map((key) => ({
      ...key,
      key: `${key.key.substring(0, 12)}${"*".repeat(20)}`,
    }));

    return NextResponse.json(maskedKeys);
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return NextResponse.json(
      { error: "Failed to fetch API keys" },
      { status: 500 }
    );
  }
}

// POST - Create a new API key
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Check if user already has an API key
    const existingKeys = await db
      .select()
      .from(apiKey)
      .where(eq(apiKey.userId, session.user.id));

    if (existingKeys.length > 0) {
      return NextResponse.json(
        { error: "You can only create one API key. Delete your existing key to create a new one." },
        { status: 400 }
      );
    }

    const key = generateApiKey();
    const id = nanoid();

    const newKey = await db
      .insert(apiKey)
      .values({
        id,
        key,
        name,
        userId: session.user.id,
        requestQuota: 500,
        requestCount: 0,
        isActive: true,
      })
      .returning();

    return NextResponse.json(newKey[0]);
  } catch (error) {
    console.error("Error creating API key:", error);
    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 500 }
    );
  }
}

// DELETE - Delete an API key
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const keyId = searchParams.get("id");

    if (!keyId) {
      return NextResponse.json(
        { error: "API key ID is required" },
        { status: 400 }
      );
    }

    // Verify the key belongs to the user before deleting
    await db
      .delete(apiKey)
      .where(and(eq(apiKey.id, keyId), eq(apiKey.userId, session.user.id)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting API key:", error);
    return NextResponse.json(
      { error: "Failed to delete API key" },
      { status: 500 }
    );
  }
}
