import { NextRequest, NextResponse } from 'next/server';
import { load } from 'cheerio';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';

interface EpisodeLink {
  episode: string;
  episodeNumber: number;
  episodeUrl: string;
}

interface DownloadLink {
  title: string;
  quality: string;
  size: string;
  downloadUrl: string;
}

interface DirectDownloadLink {
  title: string;
  quality: string;
  size: string;
  downloadUrl: string;
  watchUrl?: string;
  playerUrl?: string;
}

interface HDHub4uDetailsResponse {
  success: boolean;
  data?: {
    title: string;
    type: 'series' | 'movie' | 'movie_direct';
    episodes?: EpisodeLink[];
    downloads?: DownloadLink[];
    directDownloads?: DirectDownloadLink[];
  };
  error?: string;
  message?: string;
  remainingRequests?: number;
}

function extractEpisodeNumber(text: string): number {
  const episodeMatch = text.match(/EPISODE\s*(\d+)/i);
  return episodeMatch ? parseInt(episodeMatch[1]) : 0;
}

function extractQualityAndSize(title: string): { quality: string; size: string } {
  // Extract quality (480p, 720p, 1080p, etc.) - enhanced patterns
  const qualityMatch = title.match(/(\d+p|4K|UHD|HQ-Rip|HQ)/i);
  const quality = qualityMatch ? qualityMatch[1] : 'Unknown';
  
  // Extract size - enhanced patterns for different formats
  let sizeMatch = title.match(/\[([^\]]+(?:MB|GB)[^\]]*)\]/i);
  if (!sizeMatch) {
    // Try without brackets: 530MB, 1.3GB, etc.
    sizeMatch = title.match(/(\d+\.?\d*\s*(?:MB|GB))/i);
  }
  if (!sizeMatch) {
    // Try with different bracket styles or spaces
    sizeMatch = title.match(/(\d+\.?\d*\s*(?:MB|GB))/i);
  }
  const size = sizeMatch ? sizeMatch[1] : 'Unknown';
  
  return { quality, size };
}

async function scrapeHDHub4uDetails(url: string): Promise<{ title: string; type: 'series' | 'movie' | 'movie_direct'; episodes?: EpisodeLink[]; downloads?: DownloadLink[]; directDownloads?: DirectDownloadLink[] } | null> {
  try {
    console.log(`Fetching HDHub4u details from: ${url}`);

    const response = await fetch(url, {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://hdhub4u.gratis/',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch details: ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);

    // Extract title from the page
    const title = $('h1, .entry-title, .post-title, title').first().text().trim().replace(' - HDHub4u', '') || 'Unknown Title';
    
    const episodes: EpisodeLink[] = [];
    const downloads: DownloadLink[] = [];
    const directDownloads: DirectDownloadLink[] = [];

    // Enhanced content type detection
    const hasDirectDownloads = $('a[href*="hubdrive.wales"], a[href*="hdstream4u.com"], a[href*="hubstream.art"], a[href*="hubcdn.fans"]').length > 0;
    
    // Enhanced episode detection - look for both EPISODE and EPiSODE patterns
    const hasEpisodeLinks = $('h4').toArray().some(element => {
      const $heading = $(element);
      const headingText = $heading.text().trim();
      return headingText.includes('EPISODE') && $heading.find('a[href*="techyboy4u.com"]').length > 0;
    }) || $('h4 span, h4 strong').toArray().some(element => {
      const $span = $(element);
      const spanText = $span.text().trim();
      return spanText.includes('EPiSODE') && spanText.match(/EPiSODE\s*\d+/i);
    });

    console.log('Content detection:', { hasDirectDownloads, hasEpisodeLinks });

    // Process episodes if they exist
    if (hasEpisodeLinks) {
      console.log('Processing episodes...');
      
      // Method 1: Extract from traditional EPISODE h4 links
      $('h4').each((_, element) => {
        const $heading = $(element);
        const headingText = $heading.text().trim();
        
        if (headingText.includes('EPISODE')) {
          const $links = $heading.find('a');
          let episodeUrl = '';
          let episodeText = '';
          
          $links.each((_, linkElement) => {
            const $link = $(linkElement);
            const linkText = $link.text().trim();
            const linkHref = $link.attr('href');
            
            if (linkText.includes('EPISODE') && linkHref && linkHref.includes('techyboy4u.com')) {
              episodeText = linkText;
              episodeUrl = linkHref;
            }
          });
          
          if (episodeText && episodeUrl) {
            const episodeNumber = extractEpisodeNumber(episodeText);
            
            if (episodeNumber > 0) {
              episodes.push({
                episode: episodeText,
                episodeNumber,
                episodeUrl
              });
            }
          }
        }
      });

      // Method 2: Extract from EPiSODE span patterns with following links
      $('h4 span, h4 strong').each((_, element) => {
        const $span = $(element);
        const spanText = $span.text().trim();
        
        if (spanText.includes('EPiSODE')) {
          const episodeMatch = spanText.match(/EPiSODE\s*(\d+)/i);
          if (episodeMatch) {
            const episodeNumber = parseInt(episodeMatch[1]);
            const episodeText = `Episode ${episodeNumber}`;
            
            // Look for streaming links in the following h4 elements
            let $nextH4 = $span.closest('h4').next('h4');
            let streamUrl = '';
            
            // Check multiple following h4 elements for WATCH links
            for (let i = 0; i < 3 && $nextH4.length; i++) {
              const watchLink = $nextH4.find('a[href*="hdstream4u.com"]').first();
              if (watchLink.length) {
                streamUrl = watchLink.attr('href') || '';
                break;
              }
              $nextH4 = $nextH4.next('h4');
            }
            
            if (streamUrl) {
              episodes.push({
                episode: episodeText,
                episodeNumber,
                episodeUrl: streamUrl
              });
            }
          }
        }
      });

      episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
      console.log(`Extracted ${episodes.length} episodes`);
    }

    // Process direct downloads if they exist
    if (hasDirectDownloads) {
      console.log('Processing direct downloads...');
      
      // Method 1: Extract from h3, h4 elements
      $('h3, h4').each((_, element) => {
        const $heading = $(element);
        const $link = $heading.find('a').first();
        const linkText = $link.text().trim();
        const linkHref = $link.attr('href');
        
        if (linkHref && (linkText.includes('p ') || linkText.includes('MB') || linkText.includes('GB') || linkText.includes('p⚡') || linkText.includes('HQ'))) {
          const { quality, size } = extractQualityAndSize(linkText);
          
          // Check for watch/player links in the same or next element
          let watchUrl = '';
          let playerUrl = '';
          
          // Look for watch/player links in the next h4 or within the same element
          const $nextH4 = $heading.next('h4');
          if ($nextH4.length) {
            $nextH4.find('a').each((_, watchLink) => {
              const $watchLink = $(watchLink);
              const watchText = $watchLink.text().trim();
              const watchHref = $watchLink.attr('href');
              
              if (watchText.includes('WATCH') && watchHref) {
                watchUrl = watchHref;
              } else if (watchText.includes('PLAYER') && watchHref) {
                playerUrl = watchHref;
              }
            });
          }
          
          // Also check for multiple links in the same element (WATCH | PLAYER-2 pattern)
          $heading.find('a').each((_, watchLink) => {
            const $watchLink = $(watchLink);
            const watchText = $watchLink.text().trim();
            const watchHref = $watchLink.attr('href');
            
            if (watchText.includes('WATCH') && watchHref) {
              watchUrl = watchHref;
            } else if (watchText.includes('PLAYER') && watchHref) {
              playerUrl = watchHref;
            }
          });
          
          directDownloads.push({
            title: linkText,
            quality,
            size,
            downloadUrl: linkHref,
            watchUrl: watchUrl || undefined,
            playerUrl: playerUrl || undefined
          });
        }
      });

      // Method 2: Deep extraction from ALL anchor tags regardless of nesting
      $('a').each((_, element) => {
        const $link = $(element);
        const linkText = $link.text().trim();
        const linkHref = $link.attr('href');
        
        // Enhanced pattern matching for various formats
        const hasQualityPattern = linkText.match(/\d+p/) || 
                                 linkText.includes('HQ-Rip') || 
                                 linkText.includes('HQ ') ||
                                 linkText.includes('HEVC') ||
                                 linkText.includes('x264') ||
                                 linkText.includes('x265');
        
        const hasSizePattern = linkText.includes('MB') || 
                              linkText.includes('GB') || 
                              linkText.match(/\[\d+\.?\d*\s*[MG]B\]/);
        
        const hasSpecialPattern = linkText.includes('SAMPLE') || 
                                 linkText.includes('CLiMAX') || 
                                 linkText.includes('CLIMAX');
        
        if (linkHref && linkText && 
            (hasQualityPattern || hasSizePattern || hasSpecialPattern) &&
            (linkHref.includes('hubdrive.wales') || 
             linkHref.includes('hubcdn.fans') || 
             linkHref.includes('techyboy4u.com'))) {
          
          const { quality, size } = extractQualityAndSize(linkText);
          
          // Check if this link already exists
          const exists = directDownloads.some(d => d.downloadUrl === linkHref);
          if (!exists) {
            directDownloads.push({
              title: linkText,
              quality: quality === 'Unknown' && hasSpecialPattern ? 'Special' : quality,
              size,
              downloadUrl: linkHref
            });
          }
        }
      });

      // Method 3: Extract watch/player links and associate them
      const watchPlayerLinks: { [key: string]: { watchUrl?: string; playerUrl?: string } } = {};
      
      $('a').each((_, element) => {
        const $link = $(element);
        const linkText = $link.text().trim();
        const linkHref = $link.attr('href');
        
        if (linkHref && linkText && 
            (linkText.includes('WATCH') || linkText.includes('PLAYER')) &&
            (linkHref.includes('hdstream4u.com') || linkHref.includes('hubstream.art'))) {
          
          // Try to find the closest h4 parent to associate with download links
          const $parentH4 = $link.closest('h4');
          if ($parentH4.length) {
            const parentKey = $parentH4.index();
            if (!watchPlayerLinks[parentKey]) {
              watchPlayerLinks[parentKey] = {};
            }
            
            if (linkText.includes('WATCH')) {
              watchPlayerLinks[parentKey].watchUrl = linkHref;
            } else if (linkText.includes('PLAYER')) {
              watchPlayerLinks[parentKey].playerUrl = linkHref;
            }
          }
        }
      });
      
      // Associate watch/player links with download links
      Object.values(watchPlayerLinks).forEach((links) => {
        if (directDownloads.length > 0) {
          const lastDownload = directDownloads[directDownloads.length - 1];
          if (links.watchUrl && !lastDownload.watchUrl) {
            lastDownload.watchUrl = links.watchUrl;
          }
          if (links.playerUrl && !lastDownload.playerUrl) {
            lastDownload.playerUrl = links.playerUrl;
          }
        }
      });

      // Method 4: Extract from span elements within links (for styled text)
      $('a span, a em').each((_, element) => {
        const $span = $(element);
        const $link = $span.closest('a');
        const linkText = $span.text().trim() || $link.text().trim();
        const linkHref = $link.attr('href');
        
        if (linkHref && linkText && 
            (linkText.match(/\d+p/) || linkText.includes('MB') || linkText.includes('GB') || 
             linkText.includes('SAMPLE') || linkText.includes('CLiMAX') || linkText.includes('CLIMAX')) &&
            (linkHref.includes('hubdrive.wales') || 
             linkHref.includes('hubcdn.fans') || 
             linkHref.includes('techyboy4u.com'))) {
          
          const { quality, size } = extractQualityAndSize(linkText);
          
          const exists = directDownloads.some(d => d.downloadUrl === linkHref);
          if (!exists) {
            directDownloads.push({
              title: linkText,
              quality: quality === 'Unknown' && (linkText.includes('SAMPLE') || linkText.includes('CLiMAX')) ? 'Special' : quality,
              size,
              downloadUrl: linkHref
            });
          }
        }
      });

      console.log(`Extracted ${directDownloads.length} direct download links`);
    }

    // Determine content type and return appropriate structure
    if (episodes.length > 0 && directDownloads.length > 0) {
      // Both episodes and direct downloads - treat as series with downloads
      return {
        title,
        type: 'series',
        episodes,
        directDownloads
      };
    } else if (episodes.length > 0) {
      // Only episodes
      return {
        title,
        type: 'series',
        episodes
      };
    } else if (directDownloads.length > 0) {
      // Only direct downloads
      return {
        title,
        type: 'movie_direct',
        directDownloads
      };
    } else {
      // Extract movie download links (existing logic with enhancements)
      
      // Enhanced extraction for movie downloads
      $('h3, h4, .download-section, .entry-content p').each((_, element) => {
        const $element = $(element);
        const text = $element.text().trim();
        
        if ((text.includes('Download') || text.includes('DOWNLOAD')) && 
            (text.includes('MB') || text.includes('GB') || text.includes('480p') || text.includes('720p') || text.includes('1080p'))) {
          
          const { quality, size } = extractQualityAndSize(text);
          
          const $downloadLink = $element.find('a').first() || $element.next().find('a').first();
          const downloadUrl = $downloadLink.attr('href');
          
          if (downloadUrl) {
            downloads.push({
              title: text,
              quality,
              size,
              downloadUrl
            });
          }
        }
      });

      // Enhanced extraction for any anchor tags with download patterns
      $('a').each((_, element) => {
        const $link = $(element);
        const linkText = $link.text().trim();
        const linkHref = $link.attr('href');
        
        if (linkHref && linkText && 
            (linkText.includes('Download') || linkText.match(/\d+p/) || linkText.includes('MB') || linkText.includes('GB')) &&
            (linkHref.includes('hubdrive.wales') || linkHref.includes('hubcdn.fans') || linkHref.includes('techyboy4u.com'))) {
          
          const { quality, size } = extractQualityAndSize(linkText);
          
          const exists = downloads.some(d => d.downloadUrl === linkHref);
          if (!exists) {
            downloads.push({
              title: linkText,
              quality,
              size,
              downloadUrl: linkHref
            });
          }
        }
      });

      console.log(`Extracted ${downloads.length} download links`);
      
      return {
        title,
        type: 'movie',
        downloads
      };
    }

  } catch (error) {
    console.error('Error scraping HDHub4u details:', error);
    throw error;
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<HDHub4uDetailsResponse>> {
  try {
    // Validate API key
    const authResult = await validateApiKey(request);
    if (!authResult.isValid) {
      return createUnauthorizedResponse(authResult.error || 'Invalid API key') as NextResponse<HDHub4uDetailsResponse>;
    }

    const { searchParams } = new URL(request.url);
    const detailUrl = searchParams.get('url');

    if (!detailUrl) {
      return NextResponse.json<HDHub4uDetailsResponse>(
        { 
          success: false, 
          error: 'URL is required',
          message: 'Please provide a HDHub4u detail page URL parameter'
        },
        { status: 400 }
      );
    }

    // Validate that it's a HDHub4u URL
    if (!detailUrl.includes('hdhub4u')) {
      return NextResponse.json<HDHub4uDetailsResponse>(
        { 
          success: false, 
          error: 'Invalid URL',
          message: 'URL must be from hdhub4u.gratis'
        },
        { status: 400 }
      );
    }

    console.log('Processing HDHub4u details request for URL:', detailUrl);

    const details = await scrapeHDHub4uDetails(detailUrl);

    if (!details) {
      return NextResponse.json<HDHub4uDetailsResponse>({
        success: false,
        error: 'No content found',
        message: 'No content could be extracted from the provided URL',
        remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
      });
    }

    const hasContent = details.type === 'series' 
      ? (details.episodes && details.episodes.length > 0) || (details.directDownloads && details.directDownloads.length > 0)
      : details.type === 'movie_direct'
      ? details.directDownloads && details.directDownloads.length > 0
      : details.downloads && details.downloads.length > 0;

    if (!hasContent) {
      return NextResponse.json<HDHub4uDetailsResponse>({
        success: false,
        error: 'No links found',
        message: 'No download or episode links could be extracted from the provided URL',
        remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
      });
    }

    return NextResponse.json<HDHub4uDetailsResponse>({
      success: true,
      data: details,
      remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
    });

  } catch (error: unknown) {
    console.error('HDHub4u details API error:', error);
    
    return NextResponse.json<HDHub4uDetailsResponse>(
      { 
        success: false, 
        error: 'Failed to extract content',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
