import { NextResponse } from 'next/server';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';

interface VideoResponse {
  success: boolean;
  videoId?: string;
  originalUrl?: string;
  videoData?: {
    hls?: boolean;
    videoImage?: string;
    videoSource?: string;
    securedLink?: string;
    downloadLinks?: any[];
    attachmentLinks?: any[];
    ck?: string;
  };
  source?: string;
  directUrl?: string | null;
  error?: string;
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    // Validate API key
    const authResult = await validateApiKey(request);
    if (!authResult.isValid) {
      return createUnauthorizedResponse(authResult.error || 'Invalid API key');
    }

    // Get the URL parameter
    const { searchParams } = new URL(request.url);
    const episodeUrl = searchParams.get('url');

    if (!episodeUrl) {
      return NextResponse.json(
        { success: false, error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    // Encode the URL for the external API request
    const encodedUrl = encodeURIComponent(episodeUrl);
    const externalApiUrl = `https://scarper-ansh.vercel.app/api/animesalt/video?url=${encodedUrl}`;

    // Make the request to the external API
    const response = await fetch(externalApiUrl, { 
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { 
          success: false, 
          error: `External API returned status: ${response.status}` 
        },
        { status: response.status }
      );
    }

    const data: VideoResponse = await response.json();

    // Check if the external API request was successful
    if (!data.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: data.error || 'Failed to retrieve video data' 
        },
        { status: 404 }
      );
    }
    
    // Check if we have a valid secured link
    if (!data.videoData?.securedLink) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No video link found in the response' 
        },
        { status: 404 }
      );
    }

    // Test if the video URL is accessible
    try {
      const testResponse = await fetch(data.videoData.securedLink, {
        method: 'HEAD',
        cache: 'no-store'
      });
      
      if (!testResponse.ok) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Video source not accessible: ${testResponse.status}` 
          },
          { status: 404 }
        );
      }
    } catch (e) {
      console.warn('Could not verify video link access:', e);
      // Continue anyway as some servers might block HEAD requests
    }

    // Return the secured link in the response
    return NextResponse.json({
      success: true,
      securedLink: data.videoData.securedLink,
      remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
    });
  } catch (error) {
    console.error('Error fetching video link:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch video link' 
      },
      { status: 500 }
    );
  }
}
