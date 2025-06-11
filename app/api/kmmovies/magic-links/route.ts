import { NextResponse } from 'next/server';
import { load } from 'cheerio';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';



async function getMagicLinksData(url: string) {
  try {
    console.log(`Fetching magic links from: ${url}`);
    const response = await fetch(url, {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://w1.kmmovies.mobi/'
      },
      next: {
        revalidate: 0
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch magic links: ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);
    const links = [];

    // Extract Watch Online link and extract the actual video URL
    const watchOnlineLink = $('a[href*="zipzap.lol/nf/index.php"]:contains("WATCH ONLINE")').attr('href');
    if (watchOnlineLink) {
      try {
        const url = new URL(watchOnlineLink);
        const videoUrl = url.searchParams.get('videoUrl');
        if (videoUrl) {
          links.push({
            type: 'stream',
            provider: 'Watch Online',
            url: videoUrl,
            quality: 'Stream',
            description: 'Direct video stream URL'
          });
        } else {
          // Fallback to original URL if videoUrl parameter not found
          links.push({
            type: 'stream',
            provider: 'Watch Online',
            url: watchOnlineLink,
            quality: 'Stream',
            description: 'Watch directly in browser'
          });
        }
      } catch (urlError) {
        // If URL parsing fails, use original URL
        links.push({
          type: 'stream',
          provider: 'Watch Online',
          url: watchOnlineLink,
          quality: 'Stream',
          description: 'Watch directly in browser'
        });
      }
    }

    // Extract SkyTech links and clean the URL
    const skytechLink = $('a[href*="skytech.works/nf/index.php"]:contains("WATCH ONLINE")').attr('href');
    if (skytechLink) {
      try {
        const url = new URL(skytechLink);
        const videoUrl = url.searchParams.get('videoUrl');
        if (videoUrl) {
          links.push({
            type: 'stream',
            provider: 'SkyTech',
            url: videoUrl,
            quality: 'Stream',
            description: 'Direct video stream URL from SkyTech'
          });
        } else {
          links.push({
            type: 'stream',
            provider: 'SkyTech',
            url: skytechLink,
            quality: 'Stream',
            description: 'SkyTech stream'
          });
        }
      } catch (urlError) {
        links.push({
          type: 'stream',
          provider: 'SkyTech',
          url: skytechLink,
          quality: 'Stream',
          description: 'SkyTech stream'
        });
      }
    }

    // Extract HubCloud link
    const hubcloudLink = $('a[href*="hubcloud"]:contains("HUBCLOUD")').attr('href');
    if (hubcloudLink) {
      links.push({
        type: 'hubcloud',
        provider: 'HUBCLOUD',
        url: hubcloudLink,
        quality: 'Stream',
        description: 'HubCloud streaming link'
      });
    }

    // Extract GDFLIX link
    const gdflixLink = $('a[href*="gdflix"]:contains("GDFLIX")').attr('href');
    if (gdflixLink) {
      links.push({
        type: 'download',
        provider: 'GDFLIX',
        url: gdflixLink,
        quality: 'Download',
        description: 'Google Drive based download'
      });
    }

    // Extract GDTOT link
    const gdtotLink = $('a[href*="gdtot"]:contains("GDTOT")').attr('href');
    if (gdtotLink) {
      links.push({
        type: 'download',
        provider: 'GDTOT',
        url: gdtotLink,
        quality: 'Download',
        description: 'Google Drive based download'
      });
    }

    // Also look for any other download buttons as fallback
    $('.download-button').each((index, element) => {
      const $link = $(element);
      const href = $link.attr('href');
      const text = $link.text().trim();
      
      if (href && text && !links.some(link => link.url === href)) {
        // Check if it's one of our target providers
        if (text.includes('WATCH ONLINE') || text.includes('GDFLIX') || text.includes('GDTOT') || text.includes('HUBCLOUD')) {
          let provider = 'Unknown';
          let type = 'download';
          let finalUrl = href;
          
          if (text.includes('WATCH ONLINE')) {
            provider = 'Watch Online';
            type = 'stream';
            // Extract video URL from zipzap.lol or skytech parameter if it's a watch online link
            if (href.includes('zipzap.lol/nf/index.php')) {
              try {
                const url = new URL(href);
                const videoUrl = url.searchParams.get('videoUrl');
                if (videoUrl) {
                  finalUrl = videoUrl;
                }
              } catch (urlError) {
                // Keep original URL if parsing fails
              }
            } else if (href.includes('skytech.works/nf/index.php')) {
              try {
                const url = new URL(href);
                const videoUrl = url.searchParams.get('videoUrl');
                if (videoUrl) {
                  finalUrl = videoUrl;
                  provider = 'SkyTech';
                }
              } catch (urlError) {
                // Keep original URL if parsing fails
              }
            }
          } else if (text.includes('GDFLIX')) {
            provider = 'GDFLIX';
          } else if (text.includes('GDTOT')) {
            provider = 'GDTOT';
          } else if (text.includes('HUBCLOUD')) {
            provider = 'HUBCLOUD';
            type = 'hubcloud';
          }
          
          links.push({
            type,
            provider,
            url: finalUrl,
            quality: type === 'stream' ? 'Stream' : 'Download',
            description: text
          });
        }
      }
    });

    console.log(`Found ${links.length} magic links`);
    return {
      links,
      sourceUrl: url,
      totalFound: links.length
    };
  } catch (error) {
    console.error('Error fetching magic links:', error);
    throw error;
  }
}

export async function GET(request: Request) {
  try {
    // Validate API key first
    const authResult = await validateApiKey(request);
    if (!authResult.isValid) {
      console.log('API key validation failed:', authResult.error);
      return createUnauthorizedResponse(authResult.error || 'Invalid API key');
    }

    console.log('API key validated successfully for magic links request');

    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({
        success: false,
        error: 'URL parameter is required'
      }, { status: 400 });
    }

    // Validate that it's a magic links URL
    if (!url.includes('magiclinks.my')) {
      return NextResponse.json({
        success: false,
        error: 'Only magic links URLs are supported'
      }, { status: 400 });
    }

    try {
      const magicLinksData = await getMagicLinksData(url);

      return NextResponse.json({
        success: true,
        data: magicLinksData,
        website: 'Magic Links',
        remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed - 1) : 0
      });
    } catch (scrapeError) {
      console.error('Magic links scraping error:', scrapeError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch magic links',
        details: scrapeError instanceof Error ? scrapeError.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Magic links API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}
