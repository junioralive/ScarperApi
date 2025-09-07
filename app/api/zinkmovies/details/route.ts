import { NextRequest, NextResponse } from 'next/server';
import { load } from 'cheerio';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';

interface DownloadLink {
  quality: string;
  language: string;
  size: string;
  url: string;
  format?: string;
  server?: string;
}

interface ZinkMoviesDetailsResponse {
  success: boolean;
  data?: {
    title?: string;
    description?: string;
    audio?: string;
    downloadLinks?: DownloadLink[];
    jioStarLinks?: DownloadLink[];
    telegramUrl?: string;
    playerUrl?: string;
    litespeedSrc?: string;
  };
  error?: string;
  message?: string;
  remainingRequests?: number;
}

// Helper function to extract quality, language and size from download link text
function extractDownloadInfo(text: string): { quality: string; language: string; size: string; format?: string } {
  // Extract quality (480P, 720P, 1080P)
  let quality = 'Unknown';
  if (text.includes('480P')) quality = '480P';
  if (text.includes('720P')) quality = '720P';
  if (text.includes('1080P')) quality = '1080P';
  if (text.includes('2160P') || text.includes('4K')) quality = '4K';
  
  // Extract language
  let language = 'Unknown';
  if (text.includes('Hindi-Malayalam')) language = 'Hindi-Malayalam';
  else if (text.includes('Hindi-English')) language = 'Hindi-English';
  else if (text.includes('Hindi')) language = 'Hindi';
  else if (text.includes('English')) language = 'English';
  else if (text.includes('Malayalam')) language = 'Malayalam';
  else if (text.includes('Tamil')) language = 'Tamil';
  else if (text.includes('Telugu')) language = 'Telugu';
  
  // Extract size
  let size = 'Unknown';
  const sizeRegex = /(\d+(?:\.\d+)?\s*(?:MB|GB))/i;
  const sizeMatch = text.match(sizeRegex);
  if (sizeMatch) size = sizeMatch[1];
  
  // Extract format
  let format: string | undefined;
  if (text.includes('WEB-DL')) format = 'WEB-DL';
  if (text.includes('H.265') || text.includes('HEVC')) format = text.includes('WEB-DL') ? 'WEB-DL H.265' : 'H.265';
  if (text.includes('ESUB')) format = format ? `${format} ESUB` : 'ESUB';
  
  return { quality, language, size, format };
}

export async function GET(request: NextRequest): Promise<NextResponse<ZinkMoviesDetailsResponse>> {
  try {
    // Validate API key
    const authResult = await validateApiKey(request);
    if (!authResult.isValid) {
      return createUnauthorizedResponse(authResult.error || 'Invalid API key') as NextResponse<ZinkMoviesDetailsResponse>;
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json<ZinkMoviesDetailsResponse>(
        { 
          success: false, 
          error: 'URL is required',
          message: 'Please provide a ZinkMovies detail page URL'
        },
        { status: 400 }
      );
    }

    // Validate that it's a ZinkMovies URL
    if (!url.includes('zinkmovies')) {
      return NextResponse.json<ZinkMoviesDetailsResponse>(
        { 
          success: false, 
          error: 'Invalid URL',
          message: 'URL must be from zinkmovies.autos'
        },
        { status: 400 }
      );
    }

    console.log('Processing ZinkMovies details request for URL:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': 'https://zinkmovies.hair/',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);

    // Extract the title
    const title = $('h1.entry-title').text().trim();
    
    // Extract the description - the plain text part before any spans or divs
    const $description = $('div[itemprop="description"].wp-content');
    const description = $description.contents()
      .filter((_, el) => el.type === 'text')
      .first()
      .text()
      .trim();
    
    // Extract audio info from the maxbutton
    const audio = $description.find('.maxbutton-1 .mb-text').text().trim();
    
    // Extract direct download links
    const downloadLinks: DownloadLink[] = [];
    
    // Method 1: Extract from movie-button-container (existing method)
    $description.find('.movie-button-container a').each((_, element) => {
      const $link = $(element);
      const url = $link.attr('href');
      const text = $link.find('span').text().trim();
      
      if (url && text) {
        const { quality, language, size, format } = extractDownloadInfo(text);
        downloadLinks.push({
          quality,
          language,
          size,
          url,
          format,
          server: 'Direct'
        });
      }
    });

    // Method 2: Extract from download table structure
    $('#download .links_table table tbody tr').each((_, element) => {
      const $row = $(element);
      
      // Extract download URL from the first td's anchor tag
      const downloadUrl = $row.find('td:first-child a').attr('href');
      
      // Extract quality from the second td
      const quality = $row.find('td:nth-child(2) .quality').text().trim() || 
                     $row.find('td:nth-child(2)').text().trim();
      
      // Extract language from the third td
      const language = $row.find('td:nth-child(3)').text().trim();
      
      // Extract size from the fourth td
      const size = $row.find('td:nth-child(4)').text().trim();
      
      if (downloadUrl && quality) {
        // Determine format from quality text
        let format: string | undefined;
        if (quality.includes('HEVC') || quality.includes('H.265')) {
          format = quality.includes('10bit') ? '10bit HEVC' : 'HEVC';
        }
        if (quality.includes('4K') || quality.includes('2160p')) {
          format = format ? `4K ${format}` : '4K';
        }
        
        // Extract just the resolution from quality
        let cleanQuality = 'Unknown';
        if (quality.includes('2160p') || quality.includes('4K')) cleanQuality = '4K';
        else if (quality.includes('1080p')) cleanQuality = '1080p';
        else if (quality.includes('720p')) cleanQuality = '720p';
        else if (quality.includes('480p')) cleanQuality = '480p';
        
        downloadLinks.push({
          quality: cleanQuality,
          language: language || 'Unknown',
          size: size || 'Unknown',
          url: downloadUrl,
          format,
          server: 'Table Download'
        });
      }
    });

    // Extract JioStar links from seriecontainer sections
    const jioStarLinks: DownloadLink[] = [];
    $('.seriecontainer .movie-button-container a').each((_, element) => {
      const $link = $(element);
      const url = $link.attr('href');
      const text = $link.find('span').text().trim();
      
      if (url && text && url.includes('jiostar.work')) {
        const { quality, language, size, format } = extractDownloadInfo(text);
        jioStarLinks.push({
          quality,
          language,
          size,
          url,
          format,
          server: 'JioStar'
        });
      }
    });

    // Also check for JioStar links in the main description area
    $description.find('a[href*="jiostar.work"]').each((_, element) => {
      const $link = $(element);
      const url = $link.attr('href');
      const text = $link.text().trim() || $link.find('span').text().trim();
      
      if (url && text) {
        const { quality, language, size, format } = extractDownloadInfo(text);
        // Check if this URL already exists
        const exists = jioStarLinks.some(link => link.url === url);
        if (!exists) {
          jioStarLinks.push({
            quality,
            language,
            size,
            url,
            format,
            server: 'JioStar'
          });
        }
      }
    });
    
    // Extract Telegram URL if available
    const telegramUrl = $description.find('.custom-telegram-button a').attr('href');
    
    // Extract player URL from iframe
    const playerUrl = $('.video-player-wrapper iframe').attr('src');
    const litespeedSrc = $('.video-player-wrapper iframe').attr('data-litespeed-src');

    if (!description && !downloadLinks.length && !jioStarLinks.length && !playerUrl && !litespeedSrc) {
      return NextResponse.json<ZinkMoviesDetailsResponse>({
        success: false,
        error: 'No content found',
        message: 'Could not extract content from the provided page',
        remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
      });
    }

    return NextResponse.json<ZinkMoviesDetailsResponse>({
      success: true,
      data: {
        title: title || undefined,
        description: description || undefined,
        audio: audio || undefined,
        downloadLinks: downloadLinks.length > 0 ? downloadLinks : undefined,
        jioStarLinks: jioStarLinks.length > 0 ? jioStarLinks : undefined,
        telegramUrl: telegramUrl || undefined,
        playerUrl: playerUrl || undefined,
        litespeedSrc: litespeedSrc || undefined
      },
      remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
    });

  } catch (error: unknown) {
    console.error('ZinkMovies details API error:', error);
    
    return NextResponse.json<ZinkMoviesDetailsResponse>(
      { 
        success: false, 
        error: 'Failed to extract details',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
