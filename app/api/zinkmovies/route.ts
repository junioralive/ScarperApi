import { NextRequest, NextResponse } from 'next/server';
import { load } from 'cheerio';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';

interface ZinkMoviesItem {
  id: string;
  title: string;
  imageUrl: string;
  postUrl: string;
  contentType: 'movie' | 'tv' | 'unknown';
  rating?: string;
  year?: string;
  description?: string;
  qualities: string[];
  languages: string[];
  isDualAudio: boolean;
  sizes: string[];
}

interface ZinkMoviesResponse {
  success: boolean;
  data?: {
    items: ZinkMoviesItem[];
    query?: string;
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
  return url;
}

// Function to extract quality information from title
function extractQualities(title: string): string[] {
  const qualities = [];
  if (title.includes('4K')) qualities.push('4K');
  if (title.includes('2160p')) qualities.push('2160p');
  if (title.includes('1080p')) qualities.push('1080p');
  if (title.includes('720p')) qualities.push('720p');
  if (title.includes('480p')) qualities.push('480p');
  return qualities;
}

// Function to extract sizes from title
function extractSizes(title: string): string[] {
  const sizes = [];
  const sizeRegex = /\[(\d+(?:\.\d+)?(?:\s*[KMG]B))\]/gi;
  let match;

  while ((match = sizeRegex.exec(title)) !== null) {
    sizes.push(match[1]);
  }
  
  return sizes;
}

// Function to extract languages from title
function extractLanguages(title: string): string[] {
  const languages = [];
  if (title.includes('Hindi')) languages.push('Hindi');
  if (title.includes('English')) languages.push('English');
  if (title.includes('Tamil')) languages.push('Tamil');
  if (title.includes('Telugu')) languages.push('Telugu');
  if (title.includes('Malayalam')) languages.push('Malayalam');
  if (title.includes('Kannada')) languages.push('Kannada');
  return languages;
}

// Function to check if content has dual audio
function isDualAudio(title: string): boolean {
  return title.includes('Dual Audio') || 
         (title.includes('Hindi') && title.includes('English')) ||
         title.includes('{Hindi-English}') ||
         title.includes('Hindi & English');
}

// Function to generate ID from URL
function generateIdFromUrl(url: string): string {
  try {
    const urlParts = url.split('/');
    // Find the slug part of the URL
    const relevantPart = urlParts.find(part => 
      part.length > 5 && !part.includes('zinkmovies.autos') && part.includes('-')
    );
    return relevantPart ? relevantPart.replace(/[^a-zA-Z0-9-]/g, '') : '';
  } catch {
    return '';
  }
}

// Main function to scrape ZinkMovies search results
async function scrapeZinkMoviesSearch(searchQuery: string): Promise<ZinkMoviesItem[]> {
  try {
    const searchUrl = `https://zinkmovies.hair/?s=${encodeURIComponent(searchQuery)}`;
    
    console.log(`Searching ZinkMovies with query: ${searchQuery}`);
    console.log(`Search URL: ${searchUrl}`);

    const response = await fetch(searchUrl, {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://zinkmovies.hair/',
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch search results: ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);
    const items: ZinkMoviesItem[] = [];

    // Process search results from article elements
    $('article').each((_, element) => {
      const $element = $(element);
      
      // Extract image from .image .thumbnail img
      let imageUrl = $element.find('.image .thumbnail img').attr('src');
      imageUrl = normalizeImageUrl(imageUrl);
      
      // Extract content type from span in thumbnail
      const contentTypeSpan = $element.find('.image .thumbnail span').text().trim().toLowerCase();
      const contentType = contentTypeSpan === 'movie' ? 'movie' : contentTypeSpan === 'tv' ? 'tv' : 'unknown';
      
      // Extract title from .details .title a
      const title = $element.find('.details .title a').text().trim();
      
      // Extract post URL from .details .title a or .image .thumbnail a
      const postUrl = $element.find('.details .title a').attr('href') || 
                     $element.find('.image .thumbnail a').attr('href');
      
      // Extract rating from .meta .rating
      const rating = $element.find('.details .meta .rating').text().replace('IMDb', '').trim();
      
      // Extract year from .meta .year
      const year = $element.find('.details .meta .year').text().trim();
      
      // Extract description from .contenido p
      const description = $element.find('.details .contenido p').text().trim();
      
      if (title && postUrl && imageUrl) {
        // Extract all the metadata from the title
        const qualities = extractQualities(title);
        const languages = extractLanguages(title);
        const isDualAudioContent = isDualAudio(title);
        const sizes = extractSizes(title);
        
        // Generate ID from URL
        const id = generateIdFromUrl(postUrl) || `zinkmovies-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        items.push({
          id,
          title,
          imageUrl,
          postUrl,
          contentType,
          rating: rating || undefined,
          year: year || undefined,
          description: description || undefined,
          qualities,
          languages,
          isDualAudio: isDualAudioContent,
          sizes
        });
      } else {
        console.log('Skipping incomplete item:', { 
          hasTitle: !!title,
          hasUrl: !!postUrl,
          hasImage: !!imageUrl
        });
      }
    });

    console.log(`Successfully parsed ${items.length} search results for query: ${searchQuery}`);
    return items;
  } catch (error) {
    console.error('Error scraping ZinkMovies search results:', error);
    throw error;
  }
}

// Function to scrape latest content from homepage
async function scrapeZinkMoviesHomepage(page: number = 1): Promise<ZinkMoviesItem[]> {
  try {
    const url = page === 1 
      ? 'https://zinkmovies.hair/' 
      : `https://zinkmovies.hair/page/${page}/`;
    
    console.log(`Fetching ZinkMovies homepage content from: ${url}`);

    const response = await fetch(url, {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://zinkmovies.hair/',
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch homepage content: ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);
    const items: ZinkMoviesItem[] = [];

    // Process content from article elements
    $('article').each((_, element) => {
      const $element = $(element);
      
      // Extract image from .image .thumbnail img
      let imageUrl = $element.find('.image .thumbnail img').attr('src');
      imageUrl = normalizeImageUrl(imageUrl);
      
      // Extract content type from span in thumbnail
      const contentTypeSpan = $element.find('.image .thumbnail span').text().trim().toLowerCase();
      const contentType = contentTypeSpan === 'movie' ? 'movie' : contentTypeSpan === 'tv' ? 'tv' : 'unknown';
      
      // Extract title from .details .title a
      const title = $element.find('.details .title a').text().trim();
      
      // Extract post URL from .details .title a or .image .thumbnail a
      const postUrl = $element.find('.details .title a').attr('href') || 
                     $element.find('.image .thumbnail a').attr('href');
      
      // Extract rating from .meta .rating
      const rating = $element.find('.details .meta .rating').text().replace('IMDb', '').trim();
      
      // Extract year from .meta .year
      const year = $element.find('.details .meta .year').text().trim();
      
      // Extract description from .contenido p
      const description = $element.find('.details .contenido p').text().trim();
      
      if (title && postUrl && imageUrl) {
        // Extract all the metadata from the title
        const qualities = extractQualities(title);
        const languages = extractLanguages(title);
        const isDualAudioContent = isDualAudio(title);
        const sizes = extractSizes(title);
        
        // Generate ID from URL
        const id = generateIdFromUrl(postUrl) || `zinkmovies-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        items.push({
          id,
          title,
          imageUrl,
          postUrl,
          contentType,
          rating: rating || undefined,
          year: year || undefined,
          description: description || undefined,
          qualities,
          languages,
          isDualAudio: isDualAudioContent,
          sizes
        });
      }
    });

    console.log(`Successfully parsed ${items.length} homepage items`);
    return items;
  } catch (error) {
    console.error('Error scraping ZinkMovies homepage:', error);
    throw error;
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<ZinkMoviesResponse>> {
  try {
    // Validate API key
    const authResult = await validateApiKey(request);
    if (!authResult.isValid) {
      return createUnauthorizedResponse(authResult.error || 'Invalid API key') as NextResponse<ZinkMoviesResponse>;
    }

    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('search') || searchParams.get('s');
    const page = parseInt(searchParams.get('page') || '1');

    if (page < 1) {
      return NextResponse.json<ZinkMoviesResponse>(
        { 
          success: false, 
          error: 'Page number must be 1 or greater' 
        },
        { status: 400 }
      );
    }

    console.log('Processing ZinkMovies request:', { searchQuery, page });

    let items: ZinkMoviesItem[] = [];

    if (searchQuery && searchQuery.trim()) {
      // Perform search
      items = await scrapeZinkMoviesSearch(searchQuery.trim());
    } else {
      // Get homepage content
      items = await scrapeZinkMoviesHomepage(page);
    }

    if (!items || items.length === 0) {
      return NextResponse.json<ZinkMoviesResponse>({
        success: false,
        error: 'No content found',
        message: searchQuery 
          ? `No results found for search query: "${searchQuery}"` 
          : `No content found on page ${page}`,
        remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
      });
    }

    return NextResponse.json<ZinkMoviesResponse>({
      success: true,
      data: {
        items,
        query: searchQuery || undefined,
        totalResults: items.length
      },
      remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
    });

  } catch (error: unknown) {
    console.error('ZinkMovies API error:', error);
    
    return NextResponse.json<ZinkMoviesResponse>(
      { 
        success: false, 
        error: 'Failed to fetch content from ZinkMovies',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
