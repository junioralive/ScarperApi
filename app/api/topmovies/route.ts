import { NextRequest, NextResponse } from 'next/server';
import { load } from 'cheerio';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';

interface TopMoviesItem {
  id: string;
  title: string;
  url: string;
  image: string;
  year: string | null;
  language: string[];
  qualities: string[];
  sizes: string[];
  format: string;
  type: 'movie' | 'series';
  season?: string;
  episode?: string;
}

interface TopMoviesResponse {
  success: boolean;
  data?: {
    items: TopMoviesItem[];
    searchQuery?: string;
    totalResults: number;
  };
  error?: string;
  message?: string;
  remainingRequests?: number;
}

// Function to normalize image URLs
function normalizeImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('//')) return 'https:' + url;
  if (url.startsWith('/')) return 'https://topmovies.tube/' + url;
  return url;
}

// Function to extract year from title
function extractYear(title: string): string | null {
  const yearMatch = title.match(/\((\d{4})\)/);
  return yearMatch ? yearMatch[1] : null;
}

// Function to extract languages from title
function extractLanguages(title: string): string[] {
  const languages: string[] = [];
  
  if (title.includes('Hindi')) languages.push('Hindi');
  if (title.includes('English')) languages.push('English');
  if (title.includes('Tamil')) languages.push('Tamil');
  if (title.includes('Telugu')) languages.push('Telugu');
  if (title.includes('Malayalam')) languages.push('Malayalam');
  if (title.includes('Kannada')) languages.push('Kannada');
  if (title.includes('Punjabi')) languages.push('Punjabi');
  if (title.includes('Bengali')) languages.push('Bengali');
  if (title.includes('Multi Audio')) languages.push('Multi Audio');
  if (title.includes('Dual Audio')) languages.push('Dual Audio');
  
  return languages;
}

// Function to extract qualities and sizes from title
function extractQualitiesAndSizes(title: string): { qualities: string[]; sizes: string[] } {
  const qualities: string[] = [];
  const sizes: string[] = [];
  
  // Extract qualities
  if (title.includes('480p')) qualities.push('480p');
  if (title.includes('720p')) qualities.push('720p');
  if (title.includes('1080p')) qualities.push('1080p');
  if (title.includes('2160p') || title.includes('4K')) qualities.push('4K');
  
  // Extract sizes using regex
  const sizeMatches = title.match(/\[([^\]]+(?:MB|GB)[^\]]*)\]/g);
  if (sizeMatches) {
    sizeMatches.forEach(match => {
      const size = match.replace(/[\[\]]/g, '');
      sizes.push(size);
    });
  }
  
  return { qualities, sizes };
}

// Function to extract format from title
function extractFormat(title: string): string {
  if (title.includes('WEB-DL')) return 'WEB-DL';
  if (title.includes('WEBRiP')) return 'WEBRip';
  if (title.includes('BluRay')) return 'BluRay';
  if (title.includes('HDRip')) return 'HDRip';
  if (title.includes('CAMRiP')) return 'CAM';
  if (title.includes('HDTC')) return 'HDTC';
  if (title.includes('DVDRip')) return 'DVDRip';
  
  return 'Unknown';
}

// Function to determine content type and extract season/episode info
function extractContentInfo(title: string): { type: 'movie' | 'series'; season?: string; episode?: string } {
  const seasonMatch = title.match(/Season\s*(\d+)/i);
  const episodeMatch = title.match(/Episode\s*(\d+)/i);
  
  if (seasonMatch || title.includes('Series') || title.includes('Season')) {
    return {
      type: 'series',
      season: seasonMatch ? seasonMatch[1] : undefined,
      episode: episodeMatch ? episodeMatch[1] : undefined
    };
  }
  
  return { type: 'movie' };
}

// Function to scrape TopMovies search results
async function scrapeTopMoviesSearch(searchQuery: string): Promise<TopMoviesItem[]> {
  try {
    const searchUrl = `https://topmovies.tube//search/${encodeURIComponent(searchQuery)}`;
    
    console.log(`Fetching TopMovies search results from: ${searchUrl}`);

    const response = await fetch(searchUrl, {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://topmovies.tube//',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch search results: ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);
    const items: TopMoviesItem[] = [];

    // Parse search results from .post-cards article elements
    $('.post-cards article.latestPost').each((_, element) => {
      const $element = $(element);
      
      // Extract post ID
      const postId = $element.attr('id')?.replace('post-', '') || '';
      
      // Extract image URL
      let imageUrl = $element.find('.featured-thumbnail img').attr('src');
      imageUrl = normalizeImageUrl(imageUrl);
      
      // Extract title and URL
      const titleElement = $element.find('h2.title a');
      const title = titleElement.text().trim();
      const url = titleElement.attr('href');
      
      if (title && url && imageUrl) {
        const year = extractYear(title);
        const languages = extractLanguages(title);
        const { qualities, sizes } = extractQualitiesAndSizes(title);
        const format = extractFormat(title);
        const contentInfo = extractContentInfo(title);
        
        items.push({
          id: postId,
          title,
          url,
          image: imageUrl,
          year,
          language: languages,
          qualities,
          sizes,
          format,
          type: contentInfo.type,
          season: contentInfo.season,
          episode: contentInfo.episode
        });
      }
    });

    console.log(`Successfully extracted ${items.length} items from TopMovies search`);
    return items;

  } catch (error) {
    console.error('Error scraping TopMovies search:', error);
    throw error;
  }
}

// Function to scrape TopMovies homepage/listing
async function scrapeTopMoviesListing(page: number = 1): Promise<TopMoviesItem[]> {
  try {
    const url = page === 1 
      ? 'https://topmovies.tube//' 
      : `https://topmovies.tube//page/${page}/`;
    
    console.log(`Fetching TopMovies listing from: ${url}`);

    const response = await fetch(url, {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://topmovies.tube//',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch listing: ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);
    const items: TopMoviesItem[] = [];

    // Parse listing items - try multiple selectors
    $('article.latestPost, .post-cards article, article').each((_, element) => {
      const $element = $(element);
      
      // Skip if this doesn't look like a movie post
      if (!$element.find('img').length || !$element.find('a').length) return;
      
      // Extract post ID
      const postId = $element.attr('id')?.replace('post-', '') || 
                    $element.find('a').attr('href')?.split('/').slice(-2, -1)[0] || 
                    Math.random().toString(36).substr(2, 9);
      
      // Extract image URL
      let imageUrl = $element.find('img').first().attr('src');
      imageUrl = normalizeImageUrl(imageUrl);
      
      // Extract title and URL
      const titleElement = $element.find('h2 a, h3 a, .title a').first();
      const title = titleElement.text().trim() || 
                   titleElement.attr('title') || 
                   $element.find('a').first().attr('title');
      const url = titleElement.attr('href') || $element.find('a').first().attr('href');
      
      if (title && url && imageUrl) {
        const year = extractYear(title);
        const languages = extractLanguages(title);
        const { qualities, sizes } = extractQualitiesAndSizes(title);
        const format = extractFormat(title);
        const contentInfo = extractContentInfo(title);
        
        items.push({
          id: postId,
          title,
          url,
          image: imageUrl,
          year,
          language: languages,
          qualities,
          sizes,
          format,
          type: contentInfo.type,
          season: contentInfo.season,
          episode: contentInfo.episode
        });
      }
    });

    console.log(`Successfully extracted ${items.length} items from TopMovies listing`);
    return items;

  } catch (error) {
    console.error('Error scraping TopMovies listing:', error);
    throw error;
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<TopMoviesResponse>> {
  try {
    // Validate API key
    const authResult = await validateApiKey(request);
    if (!authResult.isValid) {
      return createUnauthorizedResponse(authResult.error || 'Invalid API key') as NextResponse<TopMoviesResponse>;
    }

    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');

    if (page < 1) {
      return NextResponse.json<TopMoviesResponse>(
        { 
          success: false, 
          error: 'Page number must be 1 or greater' 
        },
        { status: 400 }
      );
    }

    console.log('Processing TopMovies request:', { searchQuery, page });

    let items: TopMoviesItem[] = [];

    if (searchQuery) {
      // Search functionality
      items = await scrapeTopMoviesSearch(searchQuery);
    } else {
      // Listing functionality
      items = await scrapeTopMoviesListing(page);
    }

    if (!items || items.length === 0) {
      return NextResponse.json<TopMoviesResponse>({
        success: false,
        error: 'No items found',
        message: searchQuery 
          ? `No items found for search query: "${searchQuery}"` 
          : `No items found on page ${page}`,
        remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
      });
    }

    return NextResponse.json<TopMoviesResponse>({
      success: true,
      data: {
        items,
        searchQuery: searchQuery || undefined,
        totalResults: items.length
      },
      remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
    });

  } catch (error: unknown) {
    console.error('TopMovies API error:', error);
    
    return NextResponse.json<TopMoviesResponse>(
      { 
        success: false, 
        error: 'Failed to fetch content from TopMovies',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
