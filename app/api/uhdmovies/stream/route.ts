import { NextRequest, NextResponse } from 'next/server';
import { load } from 'cheerio';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';

interface Episode {
  episodeNumber: string;
  url: string;
  title: string;
  size: string;
}

interface Season {
  seasonNumber: string;
  episodes: Episode[];
}

interface Quality {
  quality: string;
  seasons: Season[];
  totalSize?: string;
  zipUrl?: string;
}

interface MovieDownload {
  title: string;
  url: string;
  size: string;
  quality: string;
}

interface StreamData {
  title: string;
  plot: string;
  poster: string;
  type: 'movie' | 'series';
  qualities: Quality[];
  movieDownloads?: MovieDownload[];
}

interface StreamResponse {
  success: boolean;
  data?: StreamData;
  error?: string;
  message?: string;
  remainingRequests?: number;
}

function extractEpisodeInfo(buttonText: string, href: string): Episode | null {
  const episodeMatch = buttonText.match(/Episode (\d+)/i);
  if (!episodeMatch) return null;

  return {
    episodeNumber: episodeMatch[1],
    url: href,
    title: buttonText.trim(),
    size: extractSizeFromUrl(href) || 'Unknown'
  };
}

function extractSizeFromUrl(url: string): string | null {
  // Try to extract size from encoded URL parameters
  try {
    const decodedUrl = decodeURIComponent(url);
    const sizeMatch = decodedUrl.match(/(\d+(?:\.\d+)?\s*(?:GB|MB|TB))/i);
    return sizeMatch ? sizeMatch[1] : null;
  } catch {
    return null;
  }
}

function extractSeasonNumber(text: string): string {
  const seasonMatch = text.match(/SEASON\s*(\d+)/i);
  return seasonMatch ? seasonMatch[1] : '1';
}

function extractQualityInfo(text: string): string {
  // Extract quality information from headers
  if (text.includes('4k 2160p SDR')) return '4K 2160p SDR';
  if (text.includes('4k 2160p HDR')) return '4K 2160p HDR';
  if (text.includes('4k 2160p DoVi HDR')) return '4K 2160p DoVi HDR';
  if (text.includes('1080p HDR')) return '1080p HDR';
  if (text.includes('1080p US DSNP x264')) return '1080p US DSNP x264';
  if (text.includes('1080p Hotstar x264')) return '1080p Hotstar x264';
  if (text.includes('1080p 10bit HEVC')) return '1080p 10bit HEVC';
  return 'Unknown Quality';
}

function extractSizeFromHeader(text: string): string | null {
  const sizeMatch = text.match(/\[([^\]]+(?:GB|MB|TB)[^\]]*)\]/i);
  return sizeMatch ? sizeMatch[1] : null;
}

function extractMovieDownload(element: any): MovieDownload | null {
  const $element = element;
  const text = $element.text().trim();
  
  // Extract title and size from the paragraph text
  const titleMatch = text.match(/^([^[]+)/);
  const sizeMatch = text.match(/\[([^\]]*(?:GB|MB|TB)[^\]]*)\]/i);
  
  if (!titleMatch) return null;
  
  const title = titleMatch[1].trim();
  const size = sizeMatch ? sizeMatch[1] : 'Unknown';
  
  // Extract quality from title
  let quality = 'Unknown';
  if (title.includes('2160p')) quality = '2160p';
  else if (title.includes('1080p')) quality = '1080p';
  else if (title.includes('720p')) quality = '720p';
  
  // Find the download link in the next element
  const nextElement = $element.next();
  const downloadLink = nextElement.find('a.maxbutton-download-g-drive').attr('href');
  
  if (!downloadLink) return null;
  
  return {
    title,
    url: downloadLink,
    size,
    quality
  };
}

async function scrapeStreamData(url: string): Promise<StreamData | null> {
  try {
    console.log(`Fetching stream data from: ${url}`);

    const response = await fetch(url, {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': 'https://uhdmovies.tube/',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);

    // Extract basic info from the main content section
    const title = $('h1.entry-title').text().trim() || 'Unknown Title';
    const poster = $('.entry-content img').first().attr('src') || '';
    
    // Extract plot from pre tag
    const plot = $('.entry-content pre').first().text().trim().replace(/Series Plot-\s*/, '') || 'No description available';

    // Determine if it's a movie or series
    const hasEpisodes = $('.entry-content').find('a.maxbutton-gdrive-episode').length > 0;
    const hasMovieDownloads = $('.entry-content').find('a.maxbutton-download-g-drive').length > 0;
    
    const type: 'movie' | 'series' = hasEpisodes ? 'series' : 'movie';
    
    const qualities: Quality[] = [];
    const movieDownloads: MovieDownload[] = [];
    let currentQuality: Quality | null = null;
    let currentSeason: Season | null = null;

    // Process only the entry-content section
    $('.entry-content').find('*').each((_, element) => {
      const $element = $(element);
      const text = $element.text().trim();
      const tagName = element.tagName?.toLowerCase();

      if (type === 'series') {
        // Handle TV series logic (existing code)
        // Check for season headers
        if (text.includes('SEASON') && (tagName === 'pre' || $element.find('strong').length > 0)) {
          const seasonNumber = extractSeasonNumber(text);
          currentSeason = {
            seasonNumber,
            episodes: []
          };
          return;
        }

        // Check for quality headers
        if ((text.includes('2160p') || text.includes('1080p') || text.includes('4k')) && 
            (tagName === 'p' || $element.find('strong').length > 0) &&
            !text.includes('Episode')) {
          
          if (currentQuality) {
            qualities.push(currentQuality);
          }

          const qualityName = extractQualityInfo(text);
          const sizeInfo = extractSizeFromHeader(text);

          currentQuality = {
            quality: qualityName,
            seasons: [],
            totalSize: sizeInfo || undefined
          };

          // Reset current season when new quality starts
          currentSeason = null;
          return;
        }

        // Process episode and zip buttons
        $element.find('a.maxbutton-gdrive-episode, a.maxbutton-gdrive-zip').each((_, link) => {
          const $link = $(link);
          const href = $link.attr('href') || '';
          const buttonText = $link.find('.mb-text').text().trim();

          if (buttonText.includes('Episode')) {
            const episode = extractEpisodeInfo(buttonText, href);
            if (episode && currentQuality) {
              // If no current season, create a default one
              if (!currentSeason) {
                currentSeason = {
                  seasonNumber: '1',
                  episodes: []
                };
                currentQuality.seasons.push(currentSeason);
              }

              currentSeason.episodes.push(episode);
            }
          } else if (buttonText.includes('Zip') || buttonText.includes('Pack')) {
            if (currentQuality) {
              currentQuality.zipUrl = href;
            }
          }
        });

        // Add season to quality if we have episodes
        if (currentSeason && currentSeason.episodes.length > 0 && currentQuality) {
          const existingSeason = currentQuality.seasons.find(s => s.seasonNumber === currentSeason!.seasonNumber);
          if (!existingSeason) {
            currentQuality.seasons.push({ ...currentSeason });
          }
        }
      } else {
        // Handle movie logic
        if (tagName === 'p' && text.includes('GB') && text.includes('[') && text.includes(']')) {
          const movieDownload = extractMovieDownload($element);
          if (movieDownload) {
            movieDownloads.push(movieDownload);
          }
        }
      }
    });

    // Add the last quality for series
    if (type === 'series' && currentQuality) {
      qualities.push(currentQuality);
    }

    console.log(`Extracted ${type === 'series' ? qualities.length + ' qualities' : movieDownloads.length + ' movie downloads'}`);
    
    const result: StreamData = {
      title,
      plot,
      poster,
      type,
      qualities: qualities.filter(q => q.seasons.length > 0 || q.zipUrl)
    };

    if (type === 'movie') {
      result.movieDownloads = movieDownloads;
    }

    return result;

  } catch (error) {
    console.error('Error scraping stream data:', error);
    throw error;
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<StreamResponse>> {
  try {
    // Validate API key
    const authResult = await validateApiKey(request);
    if (!authResult.isValid) {
      return createUnauthorizedResponse(authResult.error || 'Invalid API key') as NextResponse<StreamResponse>;
    }

    const { searchParams } = new URL(request.url);
    const streamUrl = searchParams.get('stream');

    if (!streamUrl) {
      return NextResponse.json<StreamResponse>(
        { 
          success: false, 
          error: 'Stream URL is required',
          message: 'Please provide a stream URL parameter'
        },
        { status: 400 }
      );
    }

    console.log('Processing stream request for URL:', streamUrl);

    const streamData = await scrapeStreamData(streamUrl);

    if (!streamData) {
      return NextResponse.json<StreamResponse>({
        success: false,
        error: 'No stream data found',
        message: 'Failed to extract any data from the provided URL',
        remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
      });
    }

    // Check if we have any content (either episodes or movie downloads)
    const hasContent = streamData.type === 'series' 
      ? streamData.qualities.length > 0 
      : streamData.movieDownloads && streamData.movieDownloads.length > 0;

    if (!hasContent) {
      return NextResponse.json<StreamResponse>({
        success: false,
        error: 'No content found',
        message: `No ${streamData.type === 'series' ? 'episodes or streaming links' : 'movie downloads'} found at the provided URL`,
        remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
      });
    }

    return NextResponse.json<StreamResponse>({
      success: true,
      data: streamData,
      remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
    });

  } catch (error: unknown) {
    console.error('Stream API error:', error);
    
    return NextResponse.json<StreamResponse>(
      { 
        success: false, 
        error: 'Internal server error',
        message: 'An unexpected error occurred while processing the request'
      },
      { status: 500 }
    );
  }
}