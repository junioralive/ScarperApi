import { NextResponse } from 'next/server';
import { load } from 'cheerio';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';

// Function to normalize URLs
function normalizeUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('//')) return 'https:' + url;
  return url;
}

async function getEpisodeDetails(url: string) {
  try {
    console.log(`Fetching episode details from: ${url}`);

    const response = await fetch(url, {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch episode details: ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);
    
    // Extract main image
    const mainImage = $('img[fetchpriority="high"], .entry-content img').first().attr('src');
    
    // Extract IMDb rating
    const imdbElement = $('a[href*="imdb.com"]');
    const imdbRating = {
      url: imdbElement.attr('href'),
      text: imdbElement.text().trim()
    };
    
    // Extract storyline from h5 or other elements
    const storyline = $('h5[style*="text-align: center"]').text().trim() || 
                      $('.entry-content p').first().text().trim();
    
    // Extract episode links with season detection
    const episodes = [];
    let currentSeason = 1; // Default season
    
    // Process all h5 elements in order to maintain season context
    $('h5[style*="text-align: center"]').each((_, element) => {
      const $h5 = $(element);
      const h5Text = $h5.text().trim();
      
      // Check if this h5 contains season information
      const seasonMatch = h5Text.match(/Season\s*(\d+)/i);
      if (seasonMatch) {
        currentSeason = parseInt(seasonMatch[1]);
        console.log(`Found season indicator: ${currentSeason} in text: "${h5Text}"`);
      }
      
      // Check for links in this h5 element
      $h5.find('a').each((_, linkElement) => {
        const $link = $(linkElement);
        const href = $link.attr('href');
        const text = $link.text().trim();
        
        if (href && text && href.includes('mdrive.today') && !text.includes('Zip')) {
          // Extract quality from the link text or parent h5 text
          let quality = text;
          
          // If link text doesn't contain quality info, get it from the h5 text
          if (!text.match(/\d+p/)) {
            const qualityMatch = h5Text.match(/(\d+p[^}]*)/);
            if (qualityMatch) {
              quality = qualityMatch[1];
            }
          }
          
          episodes.push({
            url: href,
            quality: quality,
            season: currentSeason,
            context: h5Text // For debugging
          });
          
          console.log(`Added episode: Season ${currentSeason}, Quality: ${quality}, URL: ${href}`);
        }
      });
      
      // Also check for links immediately after this h5 (next siblings)
      let nextElement = $h5.next();
      while (nextElement.length && nextElement.is('h5')) {
        const nextText = nextElement.text().trim();
        
        // If next h5 has season info, break to let it be processed in main loop
        if (nextText.match(/Season\s*(\d+)/i)) {
          break;
        }
        
        // Check for links in the next h5
        nextElement.find('a').each((_, linkElement) => {
          const $link = $(linkElement);
          const href = $link.attr('href');
          const text = $link.text().trim();
          
          if (href && text && href.includes('mdrive.today') && !text.includes('Zip')) {
            let quality = text;
            
            // If link text doesn't contain quality info, try to extract from context
            if (!text.match(/\d+p/)) {
              const qualityMatch = nextText.match(/(\d+p[^}]*)/);
              if (qualityMatch) {
                quality = qualityMatch[1];
              }
            }
            
            episodes.push({
              url: href,
              quality: quality,
              season: currentSeason,
              context: nextText
            });
            
            console.log(`Added episode from next h5: Season ${currentSeason}, Quality: ${quality}, URL: ${href}`);
          }
        });
        
        nextElement = nextElement.next();
      }
    });

    // Also process standalone links that might not be in h5 tags
    $('a[href*="mdrive.today"], a[href*="archives"]').each((_, element) => {
      const $el = $(element);
      const href = $el.attr('href');
      const text = $el.text().trim();
      
      // Skip if already processed
      if (episodes.some(ep => ep.url === href)) {
        return;
      }
      
      // Only include if it looks like a download link and isn't a Zip file
      if (href && 
          text && 
          (text.includes('p') || text.includes('MB') || text.includes('GB')) &&
          !text.includes('Zip')) {
        
        // Try to determine season from surrounding context
        let linkSeason = 1;
        
        // Look at parent elements for season information
        const parents = $el.parents().slice(0, 3); // Check up to 3 parent levels
        parents.each((_, parent) => {
          const parentText = $(parent).text();
          const seasonMatch = parentText.match(/Season\s*(\d+)/i);
          if (seasonMatch) {
            linkSeason = parseInt(seasonMatch[1]);
            return false; // Break out of each loop
          }
        });
        
        // Look at preceding siblings for season context
        let prevElement = $el.parent().prev();
        let searchDepth = 0;
        while (prevElement.length && searchDepth < 5) {
          const prevText = prevElement.text();
          const seasonMatch = prevText.match(/Season\s*(\d+)/i);
          if (seasonMatch) {
            linkSeason = parseInt(seasonMatch[1]);
            break;
          }
          prevElement = prevElement.prev();
          searchDepth++;
        }
        
        episodes.push({
          url: href,
          quality: text,
          season: linkSeason,
          context: $el.parent().text().trim()
        });
        
        console.log(`Added standalone episode: Season ${linkSeason}, Quality: ${text}, URL: ${href}`);
      }
    });

    // Remove duplicates and sort by season and quality
    const uniqueEpisodes = episodes.filter((episode, index, self) => 
      index === self.findIndex(e => e.url === episode.url)
    ).sort((a, b) => {
      if (a.season !== b.season) return a.season - b.season;
      
      // Sort by quality (480p, 720p, 1080p, 2160p)
      const getQualityOrder = (quality) => {
        if (quality.includes('480p')) return 1;
        if (quality.includes('720p')) return 2;
        if (quality.includes('1080p')) return 3;
        if (quality.includes('2160p') || quality.includes('4K')) return 4;
        return 5;
      };
      
      return getQualityOrder(a.quality) - getQualityOrder(b.quality);
    });

    console.log(`Total episodes found: ${uniqueEpisodes.length}`);
    console.log('Episodes by season:', uniqueEpisodes.reduce((acc, ep) => {
      acc[ep.season] = (acc[ep.season] || 0) + 1;
      return acc;
    }, {}));

    return {
      mainImage: normalizeUrl(mainImage),
      imdbRating,
      storyline,
      episodes: uniqueEpisodes.map(ep => ({
        url: ep.url,
        quality: ep.quality,
        season: ep.season
      }))
    };
  } catch (error) {
    console.error('Error fetching episode details:', error);
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

    console.log('API key validated successfully for episode request');

    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({
        success: false,
        error: 'URL parameter is required'
      }, { status: 400 });
    }

    // Make sure the URL is from moviesdrive.design
    if (!url.includes('moviesdrive.design')) {
      return NextResponse.json({
        success: false,
        error: 'Only MoviesDrive URLs are supported'
      }, { status: 400 });
    }

    try {
      const episodeDetails = await getEpisodeDetails(url);

      return NextResponse.json({
        success: true,
        data: episodeDetails,
        remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed - 1) : 0
      });
    } catch (scrapeError) {
      console.error('Episode scraping error:', scrapeError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch episode details',
        details: scrapeError instanceof Error ? scrapeError.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Episode API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}
