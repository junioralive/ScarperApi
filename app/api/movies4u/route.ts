import { NextRequest, NextResponse } from 'next/server';
import { load } from 'cheerio';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';

// Interface for actual download link
interface ActualDownloadLink {
  url: string;
  label: string;
}

// Interface for download link structure
interface DownloadLink {
  type: 'episodes' | 'batch';
  url: string;
  label: string;
  batchSize?: string;
  extractedLinks?: ActualDownloadLink[];
}

// Interface for quality options
interface QualityOption {
  quality: string;
  format: string;
  size: string;
  language: string;
  links: DownloadLink[];
}

// Interface for season structure
interface Season {
  name: string;
  qualityOptions: QualityOption[];
}

// Interface for the complete content data
interface ContentData {
  title: string;
  url: string;
  posterUrl?: string;
  seasons: Season[];
}

interface Movies4UItem {
  id: string;
  title: string;
  url: string;
  image: string;
  videoLabel: string;
  hasVideoIcon: boolean;
  altText: string;
}

interface Movies4UResponse {
  success: boolean;
  data?: {
    items: Movies4UItem[];
    pagination?: {
      currentPage: number;
      hasNextPage: boolean;
    };
  };
  error?: string;
  message?: string;
  remainingRequests?: number;
}

interface StreamResponse {
  success: boolean;
  data?: ContentData;
  error?: string;
  message?: string;
  remainingRequests?: number;
  seasonCount?: number;
  qualityOptionCount?: number;
  linkCount?: number;
}

// Function to normalize image URLs
function normalizeImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('//')) return 'https:' + url;
  if (url.startsWith('/')) return 'https://movies4u.mov' + url;
  return url;
}

// Function to extract ID from URL
function extractIdFromUrl(url: string): string {
  try {
    const urlParts = url.split('/');
    const relevantPart = urlParts.find(part => 
      part.includes('-') && 
      (part.includes('season') || part.length > 10)
    );
    return relevantPart ? relevantPart.replace(/[^a-zA-Z0-9-]/g, '') : '';
  } catch {
    return '';
  }
}

// Main function to scrape Movies4U data
async function scrapeMovies4UData(page: number = 1, searchQuery?: string): Promise<Movies4UItem[]> {
  try {
    let url = 'https://movies4u.mov/';
    
    if (searchQuery) {
      url += `?s=${encodeURIComponent(searchQuery)}`;
    } else if (page > 1) {
      url += `page/${page}/`;
    }

    console.log(`Fetching Movies4U content from: ${url}`);

    const response = await fetch(url, {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://movies4u.mov/',
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch content: ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);
    const items: Movies4UItem[] = [];

    console.log(`Received HTML content (length: ${html.length})`);

    // Extract figure elements with post-thumbnail
    $('figure').each((_, element) => {
      const $figure = $(element);
      const $postThumbnail = $figure.find('.post-thumbnail');
      
      if ($postThumbnail.length > 0) {
        try {
          // Extract URL from the anchor tag
          const url = $postThumbnail.attr('href') || '';
          
          // Extract image information
          const $img = $postThumbnail.find('img');
          let imageUrl = $img.attr('src') || $img.attr('data-src') || '';
          imageUrl = normalizeImageUrl(imageUrl);
          
          // Extract alt text (title)
          const altText = $img.attr('alt') || '';
          
          // Extract video label
          const videoLabel = $postThumbnail.find('.video-label').text().trim() || '';
          
          // Check if video icon exists
          const hasVideoIcon = $postThumbnail.find('.video-icon').length > 0;
          
          // Generate ID from URL
          const id = extractIdFromUrl(url) || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          // Only add if we have essential information
          if (url && imageUrl && altText) {
            items.push({
              id,
              title: altText,
              url,
              image: imageUrl,
              videoLabel,
              hasVideoIcon,
              altText
            });
          }
        } catch (itemError) {
          console.error('Error parsing figure item:', itemError);
        }
      }
    });

    // If no items found with figure selector, try alternative selectors
    if (items.length === 0) {
      console.log('No items found with figure selector, trying alternative patterns...');
      
      // Try article or post selectors as fallback
      $('article, .post-item, .item').each((_, element) => {
        const $element = $(element);
        const $link = $element.find('a').first();
        const $img = $element.find('img').first();
        
        if ($link.length > 0 && $img.length > 0) {
          const url = $link.attr('href') || '';
          let imageUrl = $img.attr('src') || $img.attr('data-src') || '';
          imageUrl = normalizeImageUrl(imageUrl);
          const altText = $img.attr('alt') || $link.text().trim() || '';
          
          const videoLabel = $element.find('.video-label, .quality, .format').text().trim() || '';
          const hasVideoIcon = $element.find('.video-icon, .play-icon').length > 0;
          const id = extractIdFromUrl(url) || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          if (url && imageUrl && altText) {
            items.push({
              id,
              title: altText,
              url,
              image: imageUrl,
              videoLabel,
              hasVideoIcon,
              altText
            });
          }
        }
      });
    }

    console.log(`Successfully parsed ${items.length} items from Movies4U`);
    return items;

  } catch (error) {
    console.error('Error scraping Movies4U data:', error);
    throw error;
  }
}

// Function to scrape download links from a specific movie/show page
async function scrapeDownloadLinks(url: string): Promise<ContentData> {
  try {
    console.log(`Fetching download links from: ${url}`);

    const response = await fetch(url, {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://movies4u.mov/',
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);

    // Extract page title
    const pageTitle = $('h1.single-title').text().trim() || 
                      $('h1').first().text().trim() || 
                      $('title').text().trim().replace(' - Movies4u', '');
    
    // Extract poster image
    let posterUrl = '';
    const posterImg = $('.post-thumbnail img, .featured-image img').first();
    if (posterImg.length) {
      posterUrl = posterImg.attr('src') || '';
      console.log(`Found poster image: ${posterUrl}`);
    }
    
    // Extract all seasons and download links
    const seasons: Season[] = [];
    let currentSeason: Season | null = null;
    
    // Find the download links div
    $('.download-links-div').each((_, downloadSection) => {
      // Process each h4 header (represents a quality option for a season)
      $(downloadSection).find('h4').each((_, headerElement) => {
        const headerText = $(headerElement).text().trim();
        
        console.log('Processing header:', headerText);
        
        // Skip horizontal rules
        if (headerText === '<hr>') return;
        
        // Extract season name
        const seasonMatch = headerText.match(/Season\s+(\d+)/i);
        
        if (seasonMatch) {
          const seasonName = `Season ${seasonMatch[1]}`;
          
          // Check if we need to create a new season object
          if (!currentSeason || currentSeason.name !== seasonName) {
            currentSeason = {
              name: seasonName,
              qualityOptions: []
            };
            seasons.push(currentSeason);
            console.log(`Found season: ${seasonName}`);
          }
          
          // Extract language info (text in curly braces)
          const languageMatch = headerText.match(/\{([^{}]+)\}/);
          const language = languageMatch ? languageMatch[0] : '';
          
          // Extract quality
          let quality = '';
          if (headerText.includes('480p')) quality = '480p';
          else if (headerText.includes('720p')) quality = '720p';
          else if (headerText.includes('1080p')) quality = '1080p';
          else if (headerText.includes('2160p') || headerText.includes('4K')) quality = '2160p 4K';
          
          // Extract format and codec
          let format = '';
          if (headerText.includes('WEB-DL')) format = 'WEB-DL';
          else if (headerText.includes('WEBRip')) format = 'WEBRip';
          else if (headerText.includes('BluRay')) format = 'BluRay';
          
          if (headerText.includes('x264')) format += ' x264';
          else if (headerText.includes('HEVC') || headerText.includes('x265')) format += ' HEVC x265';
          if (headerText.includes('10bit')) format += ' 10bit';
          
          // Extract size per episode
          let size = '';
          const sizeMatch = headerText.match(/\[([^[\]]+)(?:\/E)?\]/);
          if (sizeMatch) {
            size = sizeMatch[1];
            if (!size.includes('/E') && !headerText.includes('BATCH')) {
              size += '/E';
            }
          }
          
          // Create a new quality option
          const qualityOption: QualityOption = {
            quality,
            format,
            size,
            language,
            links: []
          };
          
          // Find the download buttons div that follows this header
          const downloadsDiv = $(headerElement).next('.downloads-btns-div');
          if (downloadsDiv.length) {
            // Extract episode links only (no batch links)
            downloadsDiv.find('a.btn:not(.btn-zip)').each((_, link) => {
              const linkUrl = $(link).attr('href') || '';
              const linkText = $(link).text().trim().replace(/\s+/g, ' ');
              
              // Skip if link text contains BATCH or ZIP
              if (linkUrl && !linkText.toLowerCase().includes('batch') && !linkText.toLowerCase().includes('zip')) {
                qualityOption.links.push({
                  type: 'episodes',
                  url: linkUrl,
                  label: linkText || 'Download Links'
                });
                console.log(`  - Found episode link: ${linkUrl}`);
              }
            });
          }
          
          // Add this quality option to the current season
          if (currentSeason) {
            currentSeason.qualityOptions.push(qualityOption);
          }
        } else {
          // Special case for standalone quality options (not tied to a numbered season)
          const specialTitle = headerText.replace(/<[^>]*>/g, '').trim();
          
          if (specialTitle && specialTitle.length > 0) {
            // Create a special "season" for this standalone quality
            const specialSeason: Season = {
              name: "Special",
              qualityOptions: []
            };
            
            // Extract language info (text in curly braces)
            const languageMatch = headerText.match(/\{([^{}]+)\}/);
            const language = languageMatch ? languageMatch[0] : '';
            
            // Extract quality
            let quality = '';
            if (headerText.includes('480p')) quality = '480p';
            else if (headerText.includes('720p')) quality = '720p';
            else if (headerText.includes('1080p')) quality = '1080p';
            else if (headerText.includes('2160p') || headerText.includes('4K')) quality = '2160p 4K';
            
            // Extract format and codec
            let format = '';
            if (headerText.includes('WEB-DL')) format = 'WEB-DL';
            else if (headerText.includes('WEBRip')) format = 'WEBRip';
            else if (headerText.includes('BluRay')) format = 'BluRay';
            
            if (headerText.includes('x264')) format += ' x264';
            else if (headerText.includes('HEVC') || headerText.includes('x265')) format += ' HEVC x265';
            if (headerText.includes('10bit')) format += ' 10bit';
            
            // Extract size
            let size = '';
            const sizeMatch = headerText.match(/\[([^[\]]+)\]/);
            if (sizeMatch) size = sizeMatch[1];
            
            // Create quality option
            const qualityOption: QualityOption = {
              quality,
              format,
              size,
              language,
              links: []
            };
            
            // Find the download buttons div that follows this header
            const downloadsDiv = $(headerElement).next('.downloads-btns-div');
            if (downloadsDiv.length) {
              // Extract download links
              downloadsDiv.find('a.btn').each((_, link) => {
                const linkUrl = $(link).attr('href') || '';
                const linkText = $(link).text().trim().replace(/\s+/g, ' ');
                
                if (linkUrl) {
                  qualityOption.links.push({
                    type: 'episodes',
                    url: linkUrl,
                    label: linkText || 'Download Links'
                  });
                  console.log(`  - Found special link: ${linkUrl}`);
                }
              });
            }
            
            // Add this quality option to the special season
            specialSeason.qualityOptions.push(qualityOption);
            
            // Add the special season to our list
            if (specialSeason.qualityOptions.length > 0 && 
                specialSeason.qualityOptions[0].links.length > 0) {
              seasons.push(specialSeason);
              console.log(`Found special quality option: ${specialTitle}`);
            }
          }
        }
      });
    });
    
    // Create the final content data
    const contentData: ContentData = {
      title: pageTitle,
      url,
      posterUrl: posterUrl || undefined,
      seasons
    };
    
    console.log(`Successfully extracted ${seasons.length} seasons with download links`);
    return contentData;

  } catch (error) {
    console.error('Error scraping download links:', error);
    throw error;
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<Movies4UResponse | StreamResponse>> {
  try {
    // Validate API key
    const authResult = await validateApiKey(request);
    if (!authResult.isValid) {
      return createUnauthorizedResponse(authResult.error || 'Invalid API key') as NextResponse<Movies4UResponse>;
    }

    const { searchParams } = new URL(request.url);
    const streamId = searchParams.get('stream');
    
    // Handle stream request for download links
    if (streamId) {
      try {
        const contentData = await scrapeDownloadLinks(streamId);
        
        if (contentData.seasons.length === 0) {
          return NextResponse.json<StreamResponse>({
            success: false,
            error: 'No download links found',
            message: `No download links found for: ${streamId}`,
            remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
          });
        }

        return NextResponse.json<StreamResponse>({
          success: true,
          data: contentData,
          remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0,
          seasonCount: contentData.seasons.length,
          qualityOptionCount: contentData.seasons.reduce((total, season) => total + season.qualityOptions.length, 0),
          linkCount: contentData.seasons.reduce((total, season) => {
            return total + season.qualityOptions.reduce((subtotal, option) => {
              return subtotal + option.links.length;
            }, 0);
          }, 0)
        });

      } catch (error) {
        console.error('Stream request error:', error);
        return NextResponse.json<StreamResponse>(
          {
            success: false,
            error: 'Failed to fetch download links',
            message: error instanceof Error ? error.message : 'Unknown error occurred'
          },
          { status: 500 }
        );
      }
    }

    // Handle regular listing request
    const page = parseInt(searchParams.get('page') || '1');
    const searchQuery = searchParams.get('search');

    if (page < 1) {
      return NextResponse.json<Movies4UResponse>(
        { 
          success: false, 
          error: 'Page number must be 1 or greater' 
        },
        { status: 400 }
      );
    }

    console.log('Processing Movies4U request:', { page, searchQuery });

    const items = await scrapeMovies4UData(page, searchQuery || undefined);

    if (!items || items.length === 0) {
      return NextResponse.json<Movies4UResponse>({
        success: false,
        error: 'No items found',
        message: searchQuery 
          ? `No items found for search query: "${searchQuery}"` 
          : `No items found on page ${page}`,
        remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
      });
    }

    return NextResponse.json<Movies4UResponse>({
      success: true,
      data: {
        items,
        pagination: {
          currentPage: page,
          hasNextPage: items.length >= 10
        }
      },
      remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
    });

  } catch (error: unknown) {
    console.error('Movies4U API error:', error);
    
    return NextResponse.json<Movies4UResponse>(
      { 
        success: false, 
        error: 'Failed to fetch content from Movies4U',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
