import { NextResponse } from 'next/server';
import { ApiKeyService } from '@/lib/services/api-key-service';
import { UserService } from '@/lib/services/user-service';

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

    // Get user info for request limits
    const user = await UserService.getUserByUid(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const apiKeys = await ApiKeyService.getUserApiKeys(userId);

    // Add user request info to each API key for display
    const apiKeysWithUserInfo = apiKeys.map(key => ({
      ...key,
      requestsUsed: user.requestsUsed,
      requestsLimit: user.requestsLimit,
    }));

    return NextResponse.json({
      success: true,
      apiKeys: apiKeysWithUserInfo,
      userRequestsUsed: user.requestsUsed,
      userRequestsLimit: user.requestsLimit,
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
        { success: false, error: 'User ID and key name are required' },
        { status: 400 }
      );
    }

    const apiKey = await ApiKeyService.createApiKey(userId, keyName);

    return NextResponse.json({
      success: true,
      apiKey,
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create API key' },
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
