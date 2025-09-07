import { NextRequest, NextResponse } from 'next/server';
import { load } from 'cheerio';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';

interface UHDMovie {
  id: string;
  title: string;
  url: string;
  image: string;
  imageAlt: string;
  category: string;
  quality: string[];
  language: string[];
  size: string[];
  format: string;
  year: string;
  isSeries: boolean;
}

interface UHDMoviesResponse {
  success: boolean;
  data?: {
    movies: UHDMovie[];
    pagination?: {
      currentPage: number;
      hasNextPage: boolean;
    };
  };
  error?: string;
  message?: string;
  remainingRequests?: number;
}

// Function to normalize image URLs
function normalizeImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('//')) return 'https:' + url;
  if (url.startsWith('/')) return 'https://uhdmovies.tube' + url;
  return url;
}

// Function to extract ID from URL
function extractIdFromUrl(url: string): string {
  try {
    const pathParts = url.split('/');
    const relevantPart = pathParts.find(part => 
      part.includes('download-') && part.length > 10
    );
    return relevantPart ? relevantPart.replace(/[^a-zA-Z0-9-]/g, '') : '';
  } catch {
    return '';
  }
}

// Function to extract quality information from title
function extractQualityInfo(title: string) {
  const qualities: string[] = [];
  
  if (title.includes('2160p') || title.includes('4K')) qualities.push('2160p 4K');
  if (title.includes('1080p')) qualities.push('1080p');
  if (title.includes('720p')) qualities.push('720p');
  if (title.includes('480p')) qualities.push('480p');
  if (title.includes('HEVC') || title.includes('x265')) qualities.push('HEVC');
  if (title.includes('x264')) qualities.push('x264');
  if (title.includes('10bit') || title.includes('10-bit')) qualities.push('10-Bit');
  
  return [...new Set(qualities)]; // Remove duplicates
}

// Function to extract language information from title
function extractLanguageInfo(title: string) {
  const languages: string[] = [];
  
  if (title.includes('Hindi')) languages.push('Hindi');
  if (title.includes('English')) languages.push('English');
  if (title.includes('Tamil')) languages.push('Tamil');
  if (title.includes('Telugu')) languages.push('Telugu');
  if (title.includes('Malayalam')) languages.push('Malayalam');
  if (title.includes('Kannada')) languages.push('Kannada');
  if (title.includes('Punjabi')) languages.push('Punjabi');
  if (title.includes('Bengali')) languages.push('Bengali');
  if (title.includes('Dual Audio')) languages.push('Dual Audio');
  if (title.includes('Multi Audio')) languages.push('Multi Audio');
  
  return [...new Set(languages)]; // Remove duplicates
}

// Function to extract size information from title
function extractSizeInfo(title: string) {
  const sizes: string[] = [];
  const sizeMatches = title.match(/\[([0-9.]+(?:MB|GB|TB))\]/gi);
  
  if (sizeMatches) {
    sizes.push(...sizeMatches.map(s => s.replace(/[\[\]]/g, '')));
  }
  
  return sizes;
}

// Function to extract format information from title
function extractFormatInfo(title: string): string {
  if (title.includes('BluRay')) return 'BluRay';
  if (title.includes('WEB-DL')) return 'WEB-DL';
  if (title.includes('WEBRip')) return 'WEBRip';
  if (title.includes('HDRip')) return 'HDRip';
  if (title.includes('HDTC')) return 'HDTC';
  if (title.includes('CAM')) return 'CAM';
  if (title.includes('TS')) return 'TS';
  if (title.includes('HDTS')) return 'HDTS';
  
  return 'Unknown';
}

// Function to extract year from title
function extractYear(title: string): string {
  const yearMatch = title.match(/\((\d{4})\)/);
  return yearMatch ? yearMatch[1] : 'Unknown';
}

// Main function to scrape UHDMovies data
async function scrapeUHDMoviesData(page: number = 1, searchQuery?: string): Promise<UHDMovie[]> {
  try {
    let url = 'https://uhdmovies.tube/';
    
    if (searchQuery) {
      url += `search/${encodeURIComponent(searchQuery)}`;
      if (page > 1) {
        url += `/page/${page}`;
      }
    } else if (page > 1) {
      url += `page/${page}/`;
    }

    console.log(`Fetching UHDMovies content from: ${url}`);

    const response = await fetch(url, {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://uhdmovies.tube/',
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch content: ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);
    const movies: UHDMovie[] = [];

    console.log(`Received HTML content (length: ${html.length})`);

    // Extract movie entries
    $('.entry-image').each((_, element) => {
      const $element = $(element);
      
      try {
        // Extract the anchor tag and image
        const $link = $element.find('a');
        const $img = $link.find('img');
        
        // Extract URL and title from anchor
        const url = $link.attr('href') || '';
        const title = $link.attr('title') || $img.attr('alt') || '';
        
        // Extract image information
        let imageUrl = $img.attr('src') || $img.attr('data-src') || '';
        imageUrl = normalizeImageUrl(imageUrl);
        
        // Extract image alt text
        const imageAlt = $img.attr('alt') || '';
        
        // Extract category from entry-category div
        const category = $element.find('.entry-category').text().trim() || 'Movie';
        
        // Generate ID from URL
        const id = extractIdFromUrl(url) || `uhd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Extract information from title
        const qualities = extractQualityInfo(title);
        const languages = extractLanguageInfo(title);
        const sizes = extractSizeInfo(title);
        const format = extractFormatInfo(title);
        const year = extractYear(title);
        
        // Determine if it's a series
        const isSeries = title.toLowerCase().includes('season') || 
                        title.toLowerCase().includes('episode') ||
                        title.match(/S\d+/i) !== null;
        
        // Only add if we have essential information
        if (url && imageUrl && title) {
          movies.push({
            id,
            title,
            url,
            image: imageUrl,
            imageAlt,
            category,
            quality: qualities,
            language: languages,
            size: sizes,
            format,
            year,
            isSeries
          });
        } else {
          console.log(`Skipping incomplete movie entry:`, { 
            hasUrl: !!url, 
            hasImage: !!imageUrl, 
            hasTitle: !!title 
          });
        }
      } catch (itemError) {
        console.error('Error parsing movie item:', itemError);
      }
    });

    // If no results found with .entry-image, try alternative selectors
    if (movies.length === 0) {
      console.log('No movies found with .entry-image selector, trying alternatives...');
      
      $('article, .post-item, .movie-item').each((_, element) => {
        const $element = $(element);
        const $link = $element.find('a').first();
        const $img = $element.find('img').first();
        
        if ($link.length > 0 && $img.length > 0) {
          const url = $link.attr('href') || '';
          const title = $link.attr('title') || $img.attr('alt') || $element.find('h1, h2, h3, h4').first().text().trim();
          let imageUrl = $img.attr('src') || $img.attr('data-src') || '';
          imageUrl = normalizeImageUrl(imageUrl);
          
          if (url && imageUrl && title) {
            const id = extractIdFromUrl(url) || `uhd-alt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const qualities = extractQualityInfo(title);
            const languages = extractLanguageInfo(title);
            const sizes = extractSizeInfo(title);
            const format = extractFormatInfo(title);
            const year = extractYear(title);
            const isSeries = title.toLowerCase().includes('season') || title.match(/S\d+/i) !== null;
            
            movies.push({
              id,
              title,
              url,
              image: imageUrl,
              imageAlt: $img.attr('alt') || '',
              category: 'Movie',
              quality: qualities,
              language: languages,
              size: sizes,
              format,
              year,
              isSeries
            });
          }
        }
      });
    }

    console.log(`Successfully scraped ${movies.length} movies from UHDMovies`);
    return movies;

  } catch (error) {
    console.error('Error scraping UHDMovies data:', error);
    throw error;
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<UHDMoviesResponse>> {
  try {
    // Validate API key
    const authResult = await validateApiKey(request);
    if (!authResult.isValid) {
      return createUnauthorizedResponse(authResult.error || 'Invalid API key') as NextResponse<UHDMoviesResponse>;
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const searchQuery = searchParams.get('search');

    if (page < 1) {
      return NextResponse.json<UHDMoviesResponse>(
        { 
          success: false, 
          error: 'Page number must be 1 or greater' 
        },
        { status: 400 }
      );
    }

    console.log('Processing UHDMovies request:', { page, searchQuery });

    const movies = await scrapeUHDMoviesData(page, searchQuery || undefined);

    if (!movies || movies.length === 0) {
      return NextResponse.json<UHDMoviesResponse>({
        success: false,
        error: 'No movies found',
        message: searchQuery 
          ? `No movies found for search query: "${searchQuery}"` 
          : `No movies found on page ${page}`,
        remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
      });
    }

    return NextResponse.json<UHDMoviesResponse>({
      success: true,
      data: {
        movies,
        pagination: {
          currentPage: page,
          hasNextPage: movies.length >= 12 // Assume there's more if we got a reasonable number of results
        }
      },
      remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
    });

  } catch (error: unknown) {
    console.error('UHDMovies API error:', error);
    
    return NextResponse.json<UHDMoviesResponse>(
      { 
        success: false, 
        error: 'Failed to fetch movies from UHDMovies',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
