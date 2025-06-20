import { NextRequest, NextResponse } from 'next/server';
import { load } from 'cheerio';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';

interface ExtractedLink {
  text: string;
  url: string;
  size?: string;
  type: 'download' | 'other';
}

interface FilmyFlyExtractResponse {
  success: boolean;
  data?: {
    originalUrl: string;
    links: ExtractedLink[];
    totalLinks: number;
  };
  error?: string;
  message?: string;
  remainingRequests?: number;
}

function extractSizeFromText(text: string): string | undefined {
  // Extract size like "606.37 MB", "1.2 GB", etc.
  const sizeMatch = text.match(/(\d+(?:\.\d+)?\s*(?:MB|GB|KB|TB))/i);
  return sizeMatch ? sizeMatch[1] : undefined;
}

function detectLinkType(text: string, url: string): 'download' | 'other' {
  const downloadKeywords = ['download', 'direct download', 'get file', 'download file'];
  const textLower = text.toLowerCase();
  
  if (downloadKeywords.some(keyword => textLower.includes(keyword))) {
    return 'download';
  }
  
  if (url.includes('fdownload.php') || url.includes('download') || url.includes('file')) {
    return 'download';
  }
  
  return 'other';
}

async function extractLinksFromFileDL(url: string): Promise<{ links: ExtractedLink[] } | null> {
  try {
    console.log(`Fetching FileDL page from: ${url}`);

    const response = await fetch(url, {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://filmyfly.men/',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);
    const links: ExtractedLink[] = [];

    // Extract all <a> tag links from the page
    $('a[href]').each((_, element) => {
      const $link = $(element);
      const href = $link.attr('href');
      const text = $link.text().trim();
      
      if (href && text && href.startsWith('http')) {
        // Skip common navigation/footer links
        if (text.toLowerCase().includes('home') || 
            text.toLowerCase().includes('about') || 
            text.toLowerCase().includes('contact') ||
            text.toLowerCase().includes('privacy') ||
            text.toLowerCase().includes('terms') ||
            href.includes('facebook.com') ||
            href.includes('twitter.com') ||
            href.includes('instagram.com')) {
          return;
        }
        
        const size = extractSizeFromText(text);
        const type = detectLinkType(text, href);
        
        // Avoid duplicate links
        if (!links.some(link => link.url === href)) {
          links.push({
            text,
            url: href,
            size,
            type
          });
        }
      }
    });

    // Prioritize download links
    links.sort((a, b) => {
      if (a.type === 'download' && b.type !== 'download') return -1;
      if (b.type === 'download' && a.type !== 'download') return 1;
      return 0;
    });

    console.log(`Extracted ${links.length} links from FileDL page`);
    
    return { links };

  } catch (error) {
    console.error('Error extracting links from FileDL:', error);
    throw error;
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<FilmyFlyExtractResponse>> {
  try {
    // Validate API key
    const authResult = await validateApiKey(request);
    if (!authResult.isValid) {
      return createUnauthorizedResponse(authResult.error || 'Invalid API key') as NextResponse<FilmyFlyExtractResponse>;
    }

    const { searchParams } = new URL(request.url);
    const extractUrl = searchParams.get('url');

    if (!extractUrl) {
      return NextResponse.json<FilmyFlyExtractResponse>(
        { 
          success: false, 
          error: 'URL is required',
          message: 'Please provide a FileDL page URL parameter'
        },
        { status: 400 }
      );
    }

    // Validate that it's a FileDL URL
    if (!extractUrl.includes('filesdl.') && !extractUrl.includes('new2.filesdl.')) {
      return NextResponse.json<FilmyFlyExtractResponse>(
        { 
          success: false, 
          error: 'Invalid URL',
          message: 'URL must be from filesdl.site or related FileDL domains'
        },
        { status: 400 }
      );
    }

    console.log('Processing FileDL extract request for URL:', extractUrl);

    const extractedData = await extractLinksFromFileDL(extractUrl);

    if (!extractedData || extractedData.links.length === 0) {
      return NextResponse.json<FilmyFlyExtractResponse>({
        success: false,
        error: 'No links found',
        message: 'No download links could be extracted from the provided URL',
        remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
      });
    }

    return NextResponse.json<FilmyFlyExtractResponse>({
      success: true,
      data: {
        originalUrl: extractUrl,
        links: extractedData.links,
        totalLinks: extractedData.links.length
      },
      remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
    });

  } catch (error: unknown) {
    console.error('FileDL extract API error:', error);
    
    return NextResponse.json<FilmyFlyExtractResponse>(
      { 
        success: false, 
        error: 'Failed to extract links',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
