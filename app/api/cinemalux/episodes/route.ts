import { NextRequest, NextResponse } from 'next/server';
import { load } from 'cheerio';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';

interface EpisodeLink {
  title: string;
  link: string;
  episodeNumber?: number;
}

interface CinemaluxEpisodesResponse {
  success: boolean;
  data?: {
    url: string;
    isSeries: boolean;
    episodes: EpisodeLink[];
    totalEpisodes: number;
  };
  error?: string;
  message?: string;
  remainingRequests?: number;
}

async function extractEpisodeLinks(url: string): Promise<{ isSeries: boolean; episodes: EpisodeLink[] }> {
  try {
    console.log('Extracting episode links from:', url);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = load(html);
    const episodes: EpisodeLink[] = [];

    // Extract audio information
    const audioInfo = $('.secontainer p').first().text().trim();
    console.log('Audio info:', audioInfo);

    // Check if we're dealing with a TV series
    const isSeries = url.includes('series') || 
                    url.includes('season') ||
                    $('.secontainer').length > 0;

    // Extract episode/download links from .secontainer
    $('.secontainer .ep-button-container').each((i, element) => {
      const $element = $(element);
      const $link = $element.find('a.ep-simple-button');
      const href = $link.attr('href');
      const spanText = $link.find('span').text().trim();
      
      if (href && spanText) {
        // Extract episode/season information from span text
        let episodeNumber = 0;
        let title = spanText;
        
        // Try to extract episode number from text
        const seasonMatch = spanText.match(/Season\s*(\d+)/i);
        const episodeMatch = spanText.match(/Episode\s*(\d+)/i);
        
        if (episodeMatch) {
          episodeNumber = parseInt(episodeMatch[1]);
          title = `Episode ${episodeNumber}`;
        } else if (seasonMatch) {
          episodeNumber = parseInt(seasonMatch[1]);
          title = `${spanText}`;
        } else {
          episodeNumber = i + 1;
          title = spanText;
        }
        
        episodes.push({
          title,
          link: href,
          episodeNumber,
        });
      }
    });

    // If no episodes found in .secontainer, try alternative selectors
    if (episodes.length === 0) {
      console.log('No episodes found in .secontainer, trying alternative selectors...');
      
      $('a.ep-simple-button, a.maxbutton, .download-btn').each((i, element) => {
        const $element = $(element);
        const href = $element.attr('href');
        const text = $element.text().trim() || $element.find('span').text().trim();
        
        if (href && text && !text.includes("Click Here To Visit")) {
          episodes.push({
            title: text || `Episode ${i + 1}`,
            link: href,
            episodeNumber: i + 1,
          });
        }
      });
    }

    console.log(`Extracted ${episodes.length} episodes`);
    return { isSeries, episodes };

  } catch (error) {
    console.error('Error extracting episode links:', error);
    throw error;
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<CinemaluxEpisodesResponse>> {
  try {
    // Validate API key
    const authResult = await validateApiKey(request);
    if (!authResult.isValid) {
      return createUnauthorizedResponse(authResult.error || 'Invalid API key') as NextResponse<CinemaluxEpisodesResponse>;
    }

    const { searchParams } = new URL(request.url);
    const pageUrl = searchParams.get('url');

    if (!pageUrl) {
      return NextResponse.json<CinemaluxEpisodesResponse>(
        { 
          success: false, 
          error: 'URL is required',
          message: 'Please provide a Cinemalux page URL parameter'
        },
        { status: 400 }
      );
    }

    // Validate that it's a Cinemalux URL
    if (!pageUrl.includes('cinemalux.store')) {
      return NextResponse.json<CinemaluxEpisodesResponse>(
        { 
          success: false, 
          error: 'Invalid URL',
          message: 'URL must be from cinemalux.store'
        },
        { status: 400 }
      );
    }

    console.log('Processing Cinemalux episodes request for URL:', pageUrl);

    const { isSeries, episodes } = await extractEpisodeLinks(pageUrl);

    if (!episodes || episodes.length === 0) {
      return NextResponse.json<CinemaluxEpisodesResponse>({
        success: false,
        error: 'No episodes found',
        message: 'No episode links could be extracted from the provided URL',
        remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
      });
    }

    return NextResponse.json<CinemaluxEpisodesResponse>({
      success: true,
      data: {
        url: pageUrl,
        isSeries,
        episodes,
        totalEpisodes: episodes.length
      },
      remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
    });

  } catch (error: unknown) {
    console.error('Cinemalux episodes API error:', error);
    
    return NextResponse.json<CinemaluxEpisodesResponse>(
      { 
        success: false, 
        error: 'Failed to extract episode links',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
        