import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiKey } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function validateApiKey(
  request: NextRequest
): Promise<{ valid: boolean; error?: string; keyData?: any }> {
  // Try to get API key from different sources
  let key: string | null = null;

  // 1. Check Authorization header
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    key = authHeader.substring(7);
  }

  // 2. Check x-api-key header
  if (!key) {
    key = request.headers.get("x-api-key");
  }

  // 3. Check query parameter
  if (!key) {
    const { searchParams } = new URL(request.url);
    key = searchParams.get("api_key") || searchParams.get("apiKey");
  }

  // 4. Check cookie
  if (!key) {
    key = request.cookies.get("api_key")?.value || null;
  }

  // 5. If no API key provided, try session-based authentication
  if (!key) {
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (session?.user) {
        // Get the user's API key from the database
        const [userKey] = await db
          .select()
          .from(apiKey)
          .where(eq(apiKey.userId, session.user.id))
          .limit(1);

        if (userKey) {
          key = userKey.key;
        }
      }
    } catch (error) {
      // Session check failed, continue without key
    }
  }

  if (!key) {
    return {
      valid: false,
      error: "API key is required. Provide it via Authorization header, x-api-key header, api_key query parameter, api_key cookie, or login to use your account key.",
    };
  }

  try {
    // Validate the API key in database
    const [keyRecord] = await db
      .select()
      .from(apiKey)
      .where(eq(apiKey.key, key))
      .limit(1);

    if (!keyRecord) {
      return {
        valid: false,
        error: "Invalid API key",
      };
    }

    if (!keyRecord.isActive) {
      return {
        valid: false,
        error: "API key is inactive",
      };
    }

    // Check quota
    if (keyRecord.requestCount >= keyRecord.requestQuota) {
      return {
        valid: false,
        error: "API key quota exceeded",
      };
    }

    // Increment request count and update last used
    await db
      .update(apiKey)
      .set({
        requestCount: keyRecord.requestCount + 1,
        lastUsedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(apiKey.id, keyRecord.id));

    return {
      valid: true,
      keyData: keyRecord,
    };
  } catch (error) {
    console.error("Error validating API key:", error);
    return {
      valid: false,
      error: "Failed to validate API key",
    };
  }
}

export function createUnauthorizedResponse(error: string) {
  return NextResponse.json(
    {
      success: false,
      error,
      message: "API key authentication failed",
    },
    { status: 401 }
  );
}
