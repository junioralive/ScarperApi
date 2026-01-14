import { NextRequest, NextResponse } from 'next/server';
import { getBaseUrl, getCookies } from '@/lib/baseurl';

interface NetMirrorSearchResponse {
  success: boolean;
  data?: {
    searchUrl: string;
    searchResults?: any;
    requestParams: {
      query: string;
      timestamp: string;
    };
  };
  error?: string;
  message?: string;
}

/**
 * Function to search NetMirror content
 */
async function searchNetMirror(query: string, timestamp: string): Promise<any> {
  try {
    const baseUrl = await getBaseUrl('netmirror');
    const cookies = await getCookies();
    
    // Remove trailing slash from baseUrl if it exists, then add search.php
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const searchUrl = `${cleanBaseUrl}/search.php?s=${encodeURIComponent(query)}&t=${timestamp}`;
    
    console.log(`Searching NetMirror with query: ${query}`);
    console.log(`Search URL: ${searchUrl}`);

    const response = await fetch(searchUrl, {
      method: 'GET',
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cookie': cookies,
        'Referer': baseUrl,
        'X-Requested-With': 'XMLHttpRequest',
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      throw new Error(`Failed to search NetMirror: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    
    // Try to parse as JSON first
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      // If not JSON, return as text
      const text = await response.text();
      try {
        // Try to parse text as JSON in case content-type is wrong
        return JSON.parse(text);
      } catch {
        // If parsing fails, return as plain text wrapped in object
        return { 
          rawResponse: text,
          contentType: contentType || 'unknown',
          searchUrl: searchUrl
        };
      }
    }

  } catch (error) {
    console.error('Error searching NetMirror:', error);
    throw error;
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<NetMirrorSearchResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('p');

    if (!query) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameter: p',
        message: 'Please provide a search query parameter (?p=movie_name)'
      }, { status: 400 });
    }

    // Generate current timestamp
    const currentTimestamp = Date.now().toString();

    // Search NetMirror
    const searchResults = await searchNetMirror(query, currentTimestamp);

    // Construct the search URL for reference
    const baseUrl = await getNetMirrorUrl();
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const searchUrl = `${cleanBaseUrl}/search.php?s=${encodeURIComponent(query)}&t=${currentTimestamp}`;

    return NextResponse.json({
      success: true,
      data: {
        searchUrl: searchUrl,
        searchResults: searchResults,
        requestParams: {
          query: query,
          timestamp: currentTimestamp
        }
      }
    });

  } catch (error) {
    console.error('NetMirror Search API Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to search NetMirror',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}