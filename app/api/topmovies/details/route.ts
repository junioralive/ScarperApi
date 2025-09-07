import { NextRequest, NextResponse } from 'next/server';
import { load } from 'cheerio';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';

interface DownloadLink {
  title: string;
  quality: string;
  size: string;
  gDriveUrl: string;
  batchUrl?: string;
}

interface TopMoviesDetailsResponse {
  success: boolean;
  data?: {
    title: string;
    downloads: DownloadLink[];
  };
  error?: string;
  message?: string;
  remainingRequests?: number;
}

function extractQualityAndSize(title: string): { quality: string; size: string } {
  // Extract quality (480p, 720p, 1080p, etc.)
  const qualityMatch = title.match(/(\d+p|4K|UHD)/i);
  const quality = qualityMatch ? qualityMatch[1] : 'Unknown';
  
  // Extract size ([100MB], [300MB], [600MB], etc.)
  const sizeMatch = title.match(/\[([^\]]+(?:MB|GB)[^\]]*)\]/i);
  const size = sizeMatch ? sizeMatch[1] : 'Unknown';
  
  return { quality, size };
}

async function scrapeTopMoviesDetails(url: string): Promise<{ title: string; downloads: DownloadLink[] } | null> {
  try {
    console.log(`Fetching TopMovies details from: ${url}`);

    const response = await fetch(url, {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://topmovies.tube//',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch details: ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);

    // Extract title from the page
    const title = $('h1, .entry-title, .post-title').first().text().trim() || 'Unknown Title';
    
    const downloads: DownloadLink[] = [];

    // Find all download sections with h3 headings and following download links
    $('h3').each((_, element) => {
      const $heading = $(element);
      const headingText = $heading.text().trim();
      
      // Check if this heading contains download information
      if (headingText.includes('Download') && (headingText.includes('MB') || headingText.includes('GB'))) {
        const { quality, size } = extractQualityAndSize(headingText);
        
        // Look for G-Drive and Batch links in the next paragraph
        const $nextP = $heading.next('p');
        
        // Extract G-Drive link
        const $gDriveLink = $nextP.find('a.maxbutton-g-drive, a[href*="leechpro.blog"]').first();
        const gDriveUrl = $gDriveLink.attr('href');
        
        // Extract Batch/Zip link (optional)
        const $batchLink = $nextP.find('a.maxbutton-batch-zip, a[href*="leechpro.blog"]').last();
        const batchUrl = $batchLink.attr('href');
        
        if (gDriveUrl) {
          downloads.push({
            title: headingText,
            quality,
            size,
            gDriveUrl,
            batchUrl: batchUrl && batchUrl !== gDriveUrl ? batchUrl : undefined
          });
        }
      }
    });

    console.log(`Extracted ${downloads.length} download links from TopMovies details`);
    
    return {
      title,
      downloads
    };

  } catch (error) {
    console.error('Error scraping TopMovies details:', error);
    throw error;
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<TopMoviesDetailsResponse>> {
  try {
    // Validate API key
    const authResult = await validateApiKey(request);
    if (!authResult.isValid) {
      return createUnauthorizedResponse(authResult.error || 'Invalid API key') as NextResponse<TopMoviesDetailsResponse>;
    }

    const { searchParams } = new URL(request.url);
    const detailUrl = searchParams.get('url');

    if (!detailUrl) {
      return NextResponse.json<TopMoviesDetailsResponse>(
        { 
          success: false, 
          error: 'URL is required',
          message: 'Please provide a TopMovies detail page URL parameter'
        },
        { status: 400 }
      );
    }

    // Validate that it's a TopMovies URL
    if (!detailUrl.includes('topmovies.rodeo')) {
      return NextResponse.json<TopMoviesDetailsResponse>(
        { 
          success: false, 
          error: 'Invalid URL',
          message: 'URL must be from topmovies.rodeo'
        },
        { status: 400 }
      );
    }

    console.log('Processing TopMovies details request for URL:', detailUrl);

    const details = await scrapeTopMoviesDetails(detailUrl);

    if (!details || details.downloads.length === 0) {
      return NextResponse.json<TopMoviesDetailsResponse>({
        success: false,
        error: 'No download links found',
        message: 'No G-Drive download links could be extracted from the provided URL',
        remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
      });
    }

    return NextResponse.json<TopMoviesDetailsResponse>({
      success: true,
      data: details,
      remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
    });

  } catch (error: unknown) {
    console.error('TopMovies details API error:', error);
    
    return NextResponse.json<TopMoviesDetailsResponse>(
      { 
        success: false, 
        error: 'Failed to extract download links',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
