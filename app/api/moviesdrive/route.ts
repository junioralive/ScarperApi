import { NextResponse } from 'next/server';
import { load } from 'cheerio';
import { getMoviesDriveUrl } from '@/lib/utils/providers';

// Function to normalize image URLs - handling protocol-relative URLs
function normalizeImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('//')) return 'https:' + url;
  return url;
}

// Main function to fetch and parse HTML content
async function scrapeMoviesDriveData(page: number = 1) {
  try {
    const baseUrl = await getMoviesDriveUrl();
    const url = page === 1 
      ? baseUrl 
      : `${baseUrl}page/${page}/`;
    
    console.log(`Fetching content from: ${url}`);

    // Fetch the page content
    const response = await fetch(url, {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        //'Referer': 'https://www.google.com/'
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch content: ${response.status}`);
    }

    const html = await response.text();
    
    // Debug: Check if we're getting HTML content
    console.log(`Received HTML content (first 500 chars): ${html.substring(0, 500)}`);
    
    const $ = load(html);
    const posts: any[] = [];

    const movieItems = $('.movies-grid > a');
    console.log(`Found ${movieItems.length} movie/series items`);
    
    if (movieItems.length === 0) {
      console.log('No movie items found with .movies-grid > a selector. Page structure:', {
        bodyContent: $('body').text().substring(0, 200),
        hasMoviesGrid: $('.movies-grid').length > 0,
        mainContentArea: $('#content, .content, #main, .main').length > 0
      });
    }

    movieItems.each((_, element) => {
      const $element = $(element);
      
      let imageUrl = $element.find('.poster-image img').attr('src');
      imageUrl = normalizeImageUrl(imageUrl);
      
      const title = $element.find('.poster-title').text().trim();
      
      const postUrl = $element.attr('href');
      
      const quality = $element.find('.poster-quality').text().trim();
      
      if (title && postUrl) {
        posts.push({
          imageUrl,
          title,
          postUrl,
          quality: quality || undefined
        });
      } else {
        console.log('Skipping incomplete movie item:', { 
          hasImage: !!imageUrl,
          title: title || '(missing)', 
          hasUrl: !!postUrl,
          elementHTML: ($element.html() || '').substring(0, 100) + '...'
        });
      }
    });

    console.log(`Successfully parsed ${posts.length} movie/series items`);
    return posts;
  } catch (error) {
    console.error('Error scraping MoviesDrive data:', error);
    throw error;
  }
}

// Function to search content - needs similar updates
async function searchMoviesDriveData(searchQuery: string) {
  try {
    const baseUrl = await getMoviesDriveUrl();
    const searchUrl = `${baseUrl}?s=${encodeURIComponent(searchQuery)}`;
    
    const response = await fetch(searchUrl, {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        // 'Referer': 'https://www.google.com/'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch search results: ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);
    const posts: any[] = [];

    $('.movies-grid > a').each((_, element) => {
      const $element = $(element);
      
      let imageUrl = $element.find('.poster-image img').attr('src');
      imageUrl = normalizeImageUrl(imageUrl);
      
      const title = $element.find('.poster-title').text().trim();
      
      const postUrl = $element.attr('href');
      
      const quality = $element.find('.poster-quality').text().trim();
      
      if (title && postUrl) {
        posts.push({
          imageUrl,
          title,
          postUrl,
          quality: quality || undefined
        });
      }
    });

    return posts;
  } catch (error) {
    console.error('Error searching MoviesDrive data:', error);
    throw error;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('search');
    const pageParam = searchParams.get('page');
    const page = pageParam ? parseInt(pageParam, 10) : 1;

    let posts = [];

    try {
      if (searchQuery) {
        // Use search functionality if a search query is provided
        posts = await searchMoviesDriveData(searchQuery);
      } else {
        // Otherwise get regular page content
        posts = await scrapeMoviesDriveData(page);
      }

      return NextResponse.json({
        success: true,
        count: posts.length,
        posts,
        searchQuery: searchQuery || null,
        page,
        source: searchQuery ? 'search' : 'page',
      });
    } catch (scrapeError) {
      console.error('Scraping error:', scrapeError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch movie data from source',
        details: scrapeError instanceof Error ? scrapeError.message : 'Unknown scraping error'
      }, {
        status: 500
      });
    }
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, {
      status: 500
    });
  }
}
