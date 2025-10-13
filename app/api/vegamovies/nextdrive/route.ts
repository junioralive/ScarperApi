import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';
import * as cheerio from 'cheerio';

interface DownloadLink {
  url: string;
  server: string;
  type: string;
  description: string;
  episode?: number; // Add episode number for episode-specific links
}

interface NextDriveResponse {
  success: boolean;
  data?: {
    downloadLinks: DownloadLink[];
    episodeLinks: DownloadLink[]; // Add separate array for episode links
    totalLinks: number;
  };
  error?: string;
  message?: string;
  remainingRequests?: number;
}

function extractDownloadLinks(html: string): { general: DownloadLink[], episodes: DownloadLink[] } {
  const generalLinks: DownloadLink[] = [];
  const episodeLinks: DownloadLink[] = [];
  const $ = cheerio.load(html);
  
  // Extract episode-specific download links (V-Cloud and Zee-Cloud) with stronger detection
  $('h4[style*="text-align: center"]').each((index, element) => {
    const $h4 = $(element);
    const h4Text = $h4.text().trim();
    
    // Check if this is an episode header - handle both "Episodes:" and "Episode:" patterns
    const episodeMatch = h4Text.match(/-:Episodes?:\s*(\d+):-/i);
    
    if (episodeMatch) {
      const episodeNumber = parseInt(episodeMatch[1]);
      
      // Find the next paragraph with download links
      const nextP = $h4.next('p[style*="text-align: center"]');
      
      // Extract V-Cloud links
      nextP.find('a[href*="vcloud.lol"]').each((i, linkElement) => {
        const $link = $(linkElement);
        const href = $link.attr('href');
        const button = $link.find('button');
        const buttonText = button.text().trim();
        
        if (href && buttonText.includes('V-Cloud')) {
          episodeLinks.push({
            url: href,
            server: 'V-Cloud',
            type: buttonText.includes('Resumable') ? 'Resumable' : 'Standard',
            description: `Episode ${episodeNumber} - ${buttonText}`,
            episode: episodeNumber
          });
        }
      });
      
      // Extract Zee-Cloud links
      nextP.find('a[href*="zee-cloud.shop"]').each((i, linkElement) => {
        const $link = $(linkElement);
        const href = $link.attr('href');
        const button = $link.find('button');
        const buttonText = button.text().trim();
        
        if (href && (buttonText.includes('Zee-Cloud') || buttonText.includes('G-Direct'))) {
          const serverType = buttonText.includes('G-Direct') ? 'G-Direct' : 'Zee-Cloud';
          const linkType = buttonText.includes('Resumable') ? 'Resumable' : 
                          buttonText.includes('Instant') ? 'Instant' : 'Standard';
          
          episodeLinks.push({
            url: href,
            server: serverType,
            type: linkType,
            description: `Episode ${episodeNumber} - ${buttonText}`,
            episode: episodeNumber
          });
        }
      });
    }
  });
  
  // Extract general download links (not episode-specific)
  
  // V-Cloud links
  $('a[href*="vcloud.lol"]').each((index, element) => {
    const $link = $(element);
    const href = $link.attr('href');
    const button = $link.find('button');
    const buttonText = button.text().trim();
    
    // Skip if this link is already in episode links
    const isEpisodeLink = episodeLinks.some(ep => ep.url === href);
    
    if (href && buttonText.includes('V-Cloud') && !isEpisodeLink) {
      generalLinks.push({
        url: href,
        server: 'V-Cloud',
        type: buttonText.includes('Resumable') ? 'Resumable' : 'Standard',
        description: buttonText || 'V-Cloud Download'
      });
    }
  });
  
  // Zee-Cloud links
  $('a[href*="zee-cloud.shop"]').each((index, element) => {
    const $link = $(element);
    const href = $link.attr('href');
    const button = $link.find('button');
    const buttonText = button.text().trim();
    
    // Skip if this link is already in episode links
    const isEpisodeLink = episodeLinks.some(ep => ep.url === href);
    
    if (href && (buttonText.includes('Zee-Cloud') || buttonText.includes('G-Direct')) && !isEpisodeLink) {
      const serverType = buttonText.includes('G-Direct') ? 'G-Direct' : 'Zee-Cloud';
      const linkType = buttonText.includes('Resumable') ? 'Resumable' : 
                      buttonText.includes('Instant') ? 'Instant' : 'Standard';
      
      generalLinks.push({
        url: href,
        server: serverType,
        type: linkType,
        description: buttonText || `${serverType} Download`
      });
    }
  });
  
  return { general: generalLinks, episodes: episodeLinks };
}

async function scrapeNextDriveDownloadLinks(url: string): Promise<{ general: DownloadLink[], episodes: DownloadLink[] }> {
  try {
    console.log(`Fetching NextDrive download links from: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://vegamovies.yoga/',
      },
      cache: 'no-cache'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch NextDrive page: ${response.status}`);
    }

    const html = await response.text();
    
    // Extract download links (V-Cloud and Zee-Cloud)
    const { general, episodes } = extractDownloadLinks(html);
    
    console.log(`Successfully extracted ${general.length} general download links and ${episodes.length} episode links`);
    
    return { general, episodes };

  } catch (error) {
    console.error('Error scraping NextDrive download links:', error);
    throw error;
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<NextDriveResponse>> {
  try {
    // Validate API key
    const authResult = await validateApiKey(request);
    if (!authResult.isValid) {
      return createUnauthorizedResponse(authResult.error || 'Invalid API key') as NextResponse<NextDriveResponse>;
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json<NextDriveResponse>(
        { 
          success: false, 
          error: 'URL parameter is required',
          message: 'Please provide a NextDrive URL using ?url=<nextdrive_url>'
        },
        { status: 400 }
      );
    }

    console.log('Processing NextDrive download links extraction request:', { url });

    // If user provided a nexdrive.pro URL, normalize it to nexdrive.lat
    let normalizedUrl = url;
    try {
      const parsed = new URL(url);
      if (parsed.hostname.endsWith('.pro')) {
        parsed.hostname = parsed.hostname.replace(/\.pro$/i, '.lat');
        normalizedUrl = parsed.toString();
        console.log('Normalized NextDrive URL from .pro to .lat:', normalizedUrl);
      }
    } catch (e) {
      // If URL parsing fails, keep original and let fetch handle it (will likely error)
      console.warn('Failed to parse provided URL for normalization, using original:', url);
    }

    const { general, episodes } = await scrapeNextDriveDownloadLinks(normalizedUrl);

    if (general.length === 0 && episodes.length === 0) {
      return NextResponse.json<NextDriveResponse>({
        success: false,
        error: 'No download links found',
        message: 'Could not find any V-Cloud or Zee-Cloud links on the provided NextDrive page',
        remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
      });
    }

    return NextResponse.json<NextDriveResponse>({
      success: true,
      data: {
        downloadLinks: general,
        episodeLinks: episodes,
        totalLinks: general.length + episodes.length
      },
      remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
    });

  } catch (error: unknown) {
    console.error('NextDrive download links extraction API error:', error);
    
    return NextResponse.json<NextDriveResponse>(
      { 
        success: false, 
        error: 'Failed to extract download links from NextDrive',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
