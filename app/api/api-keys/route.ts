import { NextResponse } from 'next/server';
import { ApiKeyService } from '@/lib/services/api-key-service';
import { UserService } from '@/lib/services/user-service';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { apiKeysTable } from '@/lib/db/schema';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get API keys and user data
    const [apiKeys, userData] = await Promise.all([
      ApiKeyService.getUserApiKeys(userId),
      UserService.getUserByUid(userId),
    ]);

    return NextResponse.json({
      success: true,
      apiKeys,
      userRequestsUsed: userData?.requestsUsed || 0,
      userRequestsLimit: userData?.requestsLimit || 1000,
      user: userData,
    });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch API keys' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId, keyName } = await request.json();

    if (!userId || !keyName) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate a unique ID for the API key
    const keyId = nanoid();
    
    // Generate the API key value
    const keyValue = `ak_${nanoid(48)}`;

    try {
      const [newApiKey] = await db
        .insert(apiKeysTable)
        .values({
          id: keyId, // Provide the generated ID
          userId,
          keyName,
          keyValue,
          isActive: true,
          requestsUsed: 0,
          requestsLimit: 1000,
        })
        .returning();

      return NextResponse.json({
        success: true,
        apiKey: newApiKey,
      });
    } catch (dbError) {
      console.error('Database error creating API key:', dbError);
      return NextResponse.json(
        { success: false, error: 'Failed to create API key in database' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error creating API key:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const keyId = searchParams.get('keyId');

    if (!userId || !keyId) {
      return NextResponse.json(
        { success: false, error: 'User ID and key ID are required' },
        { status: 400 }
      );
    }

    await ApiKeyService.deleteApiKey(userId, keyId);

    return NextResponse.json({
      success: true,
      message: 'API key deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting API key:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete API key' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { userId, keyId, isActive } = await request.json();

    if (!userId || !keyId || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'User ID, key ID, and status are required' },
        { status: 400 }
      );
    }

    const updatedApiKey = await ApiKeyService.toggleApiKeyStatus(userId, keyId, isActive);

    return NextResponse.json({
      success: true,
      apiKey: updatedApiKey,
    });
  } catch (error) {
    console.error('Error updating API key status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update API key status' },
      { status: 500 }
    );
  }
}
