import { NextRequest, NextResponse } from 'next/server';
import { load } from 'cheerio';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';

interface DownloadProvider {
  name: string;
  url: string;
  type: string; // e.g., "Hub-Cloud", "GDFlix", "G-Drive"
}

interface EpisodeDownload {
  episodeNumber: number;
  hubCloudUrl: string;
}

interface QualityDownloads {
  quality: string;
  size: string;
  providers: DownloadProvider[];
  episodes?: EpisodeDownload[]; // Add episodes array for series
}

interface LinkzResponse {
  success: boolean;
  data?: {
    title?: string;
    url: string;
    downloads: QualityDownloads[];
    isEpisodic?: boolean; // Indicate if content has episodes
  };
  error?: string;
  message?: string;
  remainingRequests?: number;
}

// Function to extract provider type from link text and styling
function extractProviderInfo(linkElement: any, $: any): { name: string; type: string; url: string } | null {
  const linkText = $(linkElement).text().trim();
  const linkUrl = $(linkElement).attr('href') || '';
  
  // Process Hub-Cloud links
  if (linkText.includes('Hub-Cloud') || 
      linkUrl.includes('hubcloud.one') || 
      linkUrl.includes('dgdrive.xyz') || 
      linkUrl.includes('dgdrive.pro') || 
      linkUrl.includes('dropgalaxy.vip')) {
    return { name: 'Hub-Cloud [DD]', type: 'Hub-Cloud', url: linkUrl };
  }
  
  // Process VCloud links
  if (linkText.includes('GDFlix') || linkUrl.includes('vcloud.lol')) {
    return { name: 'VCloud', type: 'VCloud', url: linkUrl };
  }
  
  // Return null for other links to filter them out
  return null;
}

// Function to scrape download links from linkz.mom
async function scrapeLinkzDownloads(url: string): Promise<{ title?: string; downloads: QualityDownloads[]; isEpisodic: boolean }> {
  try {
    console.log(`Fetching linkz downloads from: ${url}`);

    const response = await fetch(url, {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://linkz.mom/',
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch linkz page: ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);
    const downloads: QualityDownloads[] = [];
    let isEpisodic = false;

    // Extract page title
    const title = $('h1').first().text().trim() || $('title').text().trim() || undefined;

    // Find the download-links-div container
    const $downloadDiv = $('.download-links-div');
    
    if ($downloadDiv.length === 0) {
      console.log('No download-links-div found, checking page structure...');
      console.log('Available classes:', $('div[class]').map((_, el) => $(el).attr('class')).get().slice(0, 10));
    }

    // Check if content has episodes by looking for h5 elements with episode patterns
    const episodeHeaders = $downloadDiv.find('h5').filter((_, el) => {
      const text = $(el).text();
      return text.includes('Episodes:') || text.includes('Episode:');
    });

    if (episodeHeaders.length > 0) {
      // Handle episodic content
      isEpisodic = true;
      console.log(`Found episodic content with ${episodeHeaders.length} episodes`);
      
      const episodes: EpisodeDownload[] = [];
      
      episodeHeaders.each((_, headerElement) => {
        const $h5 = $(headerElement);
        const headerText = $h5.text().trim();
        
        console.log('Processing episode header:', headerText);
        
        // Extract episode number
        const episodeMatch = headerText.match(/Episodes?:\s*(\d+)/i);
        const episodeNumber = episodeMatch ? parseInt(episodeMatch[1]) : 0;
        
        // Find the next downloads-btns-div after this h5
        const $nextBtnsDiv = $h5.next('.downloads-btns-div');
        
        if ($nextBtnsDiv.length > 0) {
          // Extract only Hub-Cloud download links for this episode
          $nextBtnsDiv.find('a.btn').each((_, linkElement) => {
            const $link = $(linkElement);
            const providerInfo = extractProviderInfo(linkElement, $);
            
            // Only add if it's a Hub-Cloud link
            if (providerInfo && episodeNumber > 0) {
              episodes.push({
                episodeNumber,
                hubCloudUrl: providerInfo.url
              });
              
              console.log(`  - Found Episode ${episodeNumber} Hub-Cloud link: ${providerInfo.url}`);
            }
          });
        }
      });
      
      // Add episodes as a single quality option
      if (episodes.length > 0) {
        downloads.push({
          quality: 'Episodes',
          size: 'Various',
          providers: [],
          episodes: episodes.sort((a, b) => a.episodeNumber - b.episodeNumber)
        });
      }
      
    } else {
      // Handle movie/quality-based content (existing logic)
      $downloadDiv.find('h4').each((_, headerElement) => {
        const $h4 = $(headerElement);
        const headerText = $h4.text().trim();
        
        console.log('Processing quality header:', headerText);
        
        // Extract quality and size information
        const qualityMatch = headerText.match(/(\d+p(?:\s+HQ)?)/i);
        const sizeMatch = headerText.match(/\[([^\]]+)\]/);
        
        const quality = qualityMatch ? qualityMatch[1] : 'Unknown Quality';
        const size = sizeMatch ? sizeMatch[1] : 'Unknown Size';
        
        // Find the next downloads-btns-div after this h4
        const $nextBtnsDiv = $h4.next('.downloads-btns-div');
        const providers: DownloadProvider[] = [];
        
        if ($nextBtnsDiv.length > 0) {
          // Extract only Hub-Cloud download links for this quality
          $nextBtnsDiv.find('a.btn').each((_, linkElement) => {
            const $link = $(linkElement);
            const providerInfo = extractProviderInfo(linkElement, $);
            
            // Only add if it's a Hub-Cloud link
            if (providerInfo) {
              providers.push({
                name: providerInfo.name,
                url: providerInfo.url,
                type: providerInfo.type
              });
              
              console.log(`  - Found ${providerInfo.type} link: ${providerInfo.url}`);
            }
          });
        }
        
        // Add this quality option only if we found Hub-Cloud providers
        if (providers.length > 0) {
          downloads.push({
            quality,
            size,
            providers
          });
        }
      });
    }

    console.log(`Successfully extracted ${downloads.length} download options (isEpisodic: ${isEpisodic})`);
    return { title, downloads, isEpisodic };

  } catch (error) {
    console.error('Error scraping linkz downloads:', error);
    throw error;
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<LinkzResponse>> {
  try {
    // Validate API key
    const authResult = await validateApiKey(request);
    if (!authResult.isValid) {
      return createUnauthorizedResponse(authResult.error || 'Invalid API key') as NextResponse<LinkzResponse>;
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json<LinkzResponse>(
        { 
          success: false, 
          error: 'URL parameter is required',
          message: 'Please provide a linkz.mom URL using the ?url= parameter'
        },
        { status: 400 }
      );
    }

    // Validate that it's a linkz.mom URL
    if (!url.includes('linkz.mom')) {
      return NextResponse.json<LinkzResponse>(
        { 
          success: false, 
          error: 'Invalid URL',
          message: 'Only linkz.mom URLs are supported'
        },
        { status: 400 }
      );
    }

    console.log('Processing linkz request:', { url });

    const { title, downloads, isEpisodic } = await scrapeLinkzDownloads(url);

    if (!downloads || downloads.length === 0) {
      return NextResponse.json<LinkzResponse>({
        success: false,
        error: 'No download links found',
        message: `No download links found for URL: ${url}`,
        remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
      });
    }

    return NextResponse.json<LinkzResponse>({
      success: true,
      data: {
        title,
        url,
        downloads,
        isEpisodic
      },
      remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
    });

  } catch (error: unknown) {
    console.error('Linkz API error:', error);
    
    return NextResponse.json<LinkzResponse>(
      { 
        success: false, 
        error: 'Failed to fetch download links from linkz.mom',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
