import { NextRequest, NextResponse } from 'next/server';
import { load } from 'cheerio';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';

interface DownloadLink {
  title: string;
  url: string;
  qualities: string[];
  quality?: string;
  size?: string;
}

interface FilmyFlyDetailsResponse {
  success: boolean;
  data?: {
    title: string;
    downloadLinks: DownloadLink[];
    totalLinks: number;
  };
  error?: string;
  message?: string;
  remainingRequests?: number;
}

function extractQualitiesFromText(text: string): string[] {
  const qualities: string[] = [];
  
  if (text.includes('480p')) qualities.push('480p');
  if (text.includes('720p')) qualities.push('720p');
  if (text.includes('1080p')) qualities.push('1080p');
  if (text.includes('2160p') || text.includes('4k') || text.includes('4K')) qualities.push('4K');
  if (text.includes('HD')) qualities.push('HD');
  if (text.includes('FHD')) qualities.push('FHD');
  
  return qualities;
}

function extractQualityAndSizeFromText(text: string): { quality: string; size: string } {
  // Extract size (610mb, 1Gb, 1.5Gb, etc.)
  const sizeMatch = text.match(/(\d+(?:\.\d+)?(?:mb|gb|Gb|MB|GB))/i);
  const size = sizeMatch ? sizeMatch[1] : 'Unknown';
  
  // Extract quality from braces {480p-HEVC}, {720p-HD}, etc.
  const qualityMatch = text.match(/\{([^}]+)\}/);
  const quality = qualityMatch ? qualityMatch[1] : 'Unknown';
  
  return { quality, size };
}

async function scrapeFilmyFlyDetails(url: string): Promise<{ title: string; downloadLinks: DownloadLink[] } | null> {
  try {
    console.log(`Fetching FilmyFly details from: ${url}`);

    const response = await fetch(url, {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://filmyfly.dog//',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch details: ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);

    // Extract title from the page
    const title = $('h1, .entry-title, .post-title, title').first().text().trim() || 'Unknown Title';
    
    const downloadLinks: DownloadLink[] = [];

    // Extract download links from .dlbtn div elements
    $('.dlbtn').each((_, element) => {
      const $element = $(element);
      const $link = $element.find('a.dl');
      
      const linkText = $link.text().trim();
      const linkUrl = $link.attr('href');
      
      if (linkText && linkUrl) {
        downloadLinks.push({
          title: linkText,
          url: linkUrl,
          qualities: extractQualitiesFromText(linkText)
        });
      }
    });

    // If we found linkmake.in links, fetch the actual download links from each page
    if (downloadLinks.length > 0) {
      console.log(`Found ${downloadLinks.length} linkmake links, fetching actual download links...`);
      const actualDownloadLinks: DownloadLink[] = [];
      
      for (const linkMakeLink of downloadLinks) {
        try {
          const linkMakeResponse = await fetch(linkMakeLink.url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Referer': 'https://filmyfly.dog//',
            },
            signal: AbortSignal.timeout(15000)
          });
          
          if (linkMakeResponse.ok) {
            const linkMakeHtml = await linkMakeResponse.text();
            const $lm = load(linkMakeHtml);
            
            // Extract download links from .dlink.dl containers
            $lm('.dlink.dl').each((_, dlElement) => {
              const $dlElement = $lm(dlElement);
              const $dlLink = $dlElement.find('a');
              const dlHref = $dlLink.attr('href');
              const dlText = $dlElement.find('.dll').text().trim();
              
              if (dlHref && dlText) {
                const { quality, size } = extractQualityAndSizeFromText(dlText);
                const qualities = extractQualitiesFromText(dlText);
                
                actualDownloadLinks.push({
                  title: dlText,
                  url: dlHref,
                  qualities,
                  quality,
                  size,
                });
              }
            });
          }
        } catch (error) {
          console.error(`Failed to fetch linkmake page ${linkMakeLink.url}:`, error);
          // Add the original link as fallback
          actualDownloadLinks.push(linkMakeLink);
        }
      }
      
      console.log(`Extracted ${actualDownloadLinks.length} total download links from linkmake pages`);
      return { title, downloadLinks: actualDownloadLinks };
    }

    console.log(`Extracted ${downloadLinks.length} download links from FilmyFly details`);
    
    return {
      title,
      downloadLinks
    };

  } catch (error) {
    console.error('Error scraping FilmyFly details:', error);
    throw error;
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<FilmyFlyDetailsResponse>> {
  try {
    // Validate API key
    const authResult = await validateApiKey(request);
    if (!authResult.isValid) {
      return createUnauthorizedResponse(authResult.error || 'Invalid API key') as NextResponse<FilmyFlyDetailsResponse>;
    }

    const { searchParams } = new URL(request.url);
    const detailUrl = searchParams.get('url');

    if (!detailUrl) {
      return NextResponse.json<FilmyFlyDetailsResponse>(
        { 
          success: false, 
          error: 'URL is required',
          message: 'Please provide a FilmyFly detail page URL parameter'
        },
        { status: 400 }
      );
    }

    // Validate that it's a FilmyFly URL
    if (!detailUrl.includes('filmyfly.men')) {
      return NextResponse.json<FilmyFlyDetailsResponse>(
        { 
          success: false, 
          error: 'Invalid URL',
          message: 'URL must be from filmyfly.men'
        },
        { status: 400 }
      );
    }

    console.log('Processing FilmyFly details request for URL:', detailUrl);

    const details = await scrapeFilmyFlyDetails(detailUrl);

    if (!details || details.downloadLinks.length === 0) {
      return NextResponse.json<FilmyFlyDetailsResponse>({
        success: false,
        error: 'No download links found',
        message: 'No download links could be extracted from the provided URL',
        remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
      });
    }

    return NextResponse.json<FilmyFlyDetailsResponse>({
      success: true,
      data: {
        title: details.title,
        downloadLinks: details.downloadLinks,
        totalLinks: details.downloadLinks.length
      },
      remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
    });

  } catch (error: unknown) {
    console.error('FilmyFly details API error:', error);
    
    return NextResponse.json<FilmyFlyDetailsResponse>(
      { 
        success: false, 
        error: 'Failed to extract download links',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
