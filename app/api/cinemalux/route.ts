import { NextRequest, NextResponse } from 'next/server';
import { load } from 'cheerio';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';

interface CinemaluxItem {
  id: string;
  title: string;
  imageUrl: string;
  postUrl: string;
  contentType: 'Movie' | 'TV Show';
  rating?: string;
  year?: string;
  description?: string;
  altText: string;
}

interface CinemaluxResponse {
  success: boolean;
  data?: {
    items: CinemaluxItem[];
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

// Function to generate ID from URL
function generateIdFromUrl(url: string): string {
  try {
    const urlParts = url.split('/');
    const relevantPart = urlParts.find(part => 
      part.length > 5 && !part.includes('cinemalux.store')
    );
    return relevantPart ? relevantPart.replace(/[^a-zA-Z0-9-]/g, '') : '';
  } catch {
    return '';
  }
}

// Function to extract content type from span element
function extractContentType(spanElement: any): 'Movie' | 'TV Show' {
  const spanText = spanElement.text().trim();
  const spanClass = spanElement.attr('class') || '';
  
  if (spanClass.includes('tvshows') || spanText.includes('TV')) {
    return 'TV Show';
  }
  return 'Movie';
}

// Main function to scrape Cinemalux search results
async function scrapeCinemaluxSearch(searchQuery: string): Promise<CinemaluxItem[]> {
  try {
    const searchUrl = `https://cinemalux.store/?s=${encodeURIComponent(searchQuery)}`;
    
    console.log(`Searching Cinemalux with query: ${searchQuery}`);
    console.log(`Search URL: ${searchUrl}`);

    const response = await fetch(searchUrl, {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://cinemalux.store/',
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch search results: ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);
    const items: CinemaluxItem[] = [];

    // Process search results from .result-item elements
    $('.result-item').each((_, element) => {
      const $element = $(element);
      const $article = $element.find('article');
      
      // Extract image from .image .thumbnail img
      let imageUrl = $article.find('.image .thumbnail img').attr('data-src') || 
                     $article.find('.image .thumbnail img').attr('src');
      imageUrl = normalizeImageUrl(imageUrl);
      
      // Extract alt text from img
      const altText = $article.find('.image .thumbnail img').attr('alt') || '';
      
      // Extract title from .details .title a
      const title = $article.find('.details .title a').text().trim();
      
      // Extract post URL from .details .title a or .image .thumbnail a
      const postUrl = $article.find('.details .title a').attr('href') || 
                     $article.find('.image .thumbnail a').attr('href');
      
      // Extract content type from span in thumbnail
      const $contentSpan = $article.find('.image .thumbnail span');
      const contentType = extractContentType($contentSpan);
      
      // Extract rating from .meta .rating
      const ratingElement = $article.find('.details .meta .rating');
      const rating = ratingElement.text().replace('IMDb', '').trim();
      
      // Extract year from .meta .year
      const year = $article.find('.details .meta .year').text().trim();
      
      // Extract description from .contenido p
      const description = $article.find('.details .contenido p').text().trim();
      
      if (title && postUrl && imageUrl) {
        // Generate ID from URL
        const id = generateIdFromUrl(postUrl) || `cinemalux-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        items.push({
          id,
          title,
          imageUrl,
          postUrl,
          contentType,
          rating: rating || undefined,
          year: year || undefined,
          description: description || undefined,
          altText
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
    console.error('Error scraping Cinemalux search results:', error);
    throw error;
  }
}

// Function to scrape latest content from homepage
async function scrapeCinemaluxHomepage(page: number = 1): Promise<CinemaluxItem[]> {
  try {
    const url = page === 1 
      ? 'https://cinemalux.store/' 
      : `https://cinemalux.store/page/${page}/`;
    
    console.log(`Fetching Cinemalux homepage content from: ${url}`);

    const response = await fetch(url, {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://cinemalux.store/',
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch homepage content: ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);
    const items: CinemaluxItem[] = [];

    // Process content from homepage - look for movie/series items
    $('article.item').each((_, element) => {
      const $element = $(element);
      
      // Extract image from .poster img
      let imageUrl = $element.find('.poster img').attr('data-src') || 
                     $element.find('.poster img').attr('src');
      imageUrl = normalizeImageUrl(imageUrl);
      
      // Extract alt text from img
      const altText = $element.find('.poster img').attr('alt') || '';
      
      // Extract title from .data h3 a
      const title = $element.find('.data h3 a').text().trim();
      
      // Extract post URL from .data h3 a or .poster a
      const postUrl = $element.find('.data h3 a').attr('href') || 
                     $element.find('.poster a').attr('href');
      
      // Determine content type from URL or context
      let contentType: 'Movie' | 'TV Show' = 'Movie';
      if (postUrl?.includes('/series/') || title.toLowerCase().includes('season')) {
        contentType = 'TV Show';
      }
      
      // Extract rating if available
      const rating = $element.find('.rating').text().trim();
      
      // Extract year from .data span or other elements
      const year = $element.find('.data span').text().trim();
      
      if (title && postUrl && imageUrl) {
        // Generate ID from URL
        const id = generateIdFromUrl(postUrl) || `cinemalux-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        items.push({
          id,
          title,
          imageUrl,
          postUrl,
          contentType,
          rating: rating || undefined,
          year: year || undefined,
          altText
        });
      }
    });

    console.log(`Successfully parsed ${items.length} homepage items`);
    return items;
  } catch (error) {
    console.error('Error scraping Cinemalux homepage:', error);
    throw error;
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<CinemaluxResponse>> {
  try {
    // Validate API key
    const authResult = await validateApiKey(request);
    if (!authResult.isValid) {
      return createUnauthorizedResponse(authResult.error || 'Invalid API key') as NextResponse<CinemaluxResponse>;
    }

    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('search') || searchParams.get('s');
    const page = parseInt(searchParams.get('page') || '1');

    if (page < 1) {
      return NextResponse.json<CinemaluxResponse>(
        { 
          success: false, 
          error: 'Page number must be 1 or greater' 
        },
        { status: 400 }
      );
    }

    console.log('Processing Cinemalux request:', { searchQuery, page });

    let items: CinemaluxItem[] = [];

    if (searchQuery && searchQuery.trim()) {
      // Perform search
      items = await scrapeCinemaluxSearch(searchQuery.trim());
    } else {
      // Get homepage content
      items = await scrapeCinemaluxHomepage(page);
    }

    if (!items || items.length === 0) {
      return NextResponse.json<CinemaluxResponse>({
        success: false,
        error: 'No content found',
        message: searchQuery 
          ? `No results found for search query: "${searchQuery}"` 
          : `No content found on page ${page}`,
        remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
      });
    }

    return NextResponse.json<CinemaluxResponse>({
      success: true,
      data: {
        items,
        query: searchQuery || undefined,
        totalResults: items.length
      },
      remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
    });

  } catch (error: unknown) {
    console.error('Cinemalux API error:', error);
    
    return NextResponse.json<CinemaluxResponse>(
      { 
        success: false, 
        error: 'Failed to fetch content from Cinemalux',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
