import { NextResponse } from 'next/server';
import { load } from 'cheerio';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';

// Function to normalize image URLs - handling protocol-relative URLs
function normalizeImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('//')) return 'https:' + url;
  return url;
}

// Main function to fetch and parse HTML content from KMmovies
async function scrapeKMmoviesData(page: number = 1) {
  try {
    const url = page === 1 
      ? 'https://kmmovies.art/' 
      : `https://kmmovies.art/page/${page}/`;
    
    console.log(`Fetching KMmovies content from: ${url}`);

    // Fetch the page content
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
      throw new Error(`Failed to fetch content: ${response.status}`);
    }

    const html = await response.text();
    
    // Debug: Check if we're getting HTML content
    console.log(`Received HTML content (first 500 chars): ${html.substring(0, 500)}`);
    
    const $ = load(html);
    const posts = [];

    // Updated selector to match the KMmovies structure
    const movieItems = $('article.post');
    console.log(`Found ${movieItems.length} movie/series items`);
    
    if (movieItems.length === 0) {
      // If no specific items found, log the page structure for debugging
      console.log('No movie items found with article.post selector. Page structure:', {
        bodyContent: $('body').text().substring(0, 200),
        hasArticleElements: $('article').length > 0,
        classesOnArticle: $('article').first().attr('class'),
        mainContentArea: $('#content, .content, #main, .main').length > 0
      });
    }

    // Process each movie/series item
    movieItems.each((_, element) => {
      const $element = $(element);
      
      // Extract image from figure > a > img
      let imageUrl = $element.find('figure img').attr('src');
      imageUrl = normalizeImageUrl(imageUrl);
      
      // Extract title from h3.entry-title > a
      const title = $element.find('h3.entry-title a').text().trim();
      
      // Extract post URL from figure > a or h3 > a
      const postUrl = $element.find('figure a').attr('href') || 
                     $element.find('h3.entry-title a').attr('href');
      
      // Extract post ID from the article element
      const postId = $element.attr('id');
      
      // Check if this is a series (contains season info) or movie
      const isSeriesPattern = /S\d+/i.test(title) || /Season/i.test(title);
      
      // Add to posts array if we have at least title and URL
      if (title && postUrl) {
        posts.push({
          id: postId || '',
          imageUrl,
          title,
          postUrl,
          isSeries: isSeriesPattern,
          type: isSeriesPattern ? 'series' : 'movie'
        });
      } else {
        console.log('Skipping incomplete movie item:', { 
          hasImage: !!imageUrl,
          title: title || '(missing)', 
          hasUrl: !!postUrl,
          elementHTML: $element.html()?.substring(0, 100) + '...'
        });
      }
    });

    console.log(`Successfully parsed ${posts.length} movie/series items`);
    return posts;
  } catch (error) {
    console.error('Error scraping KMmovies data:', error);
    throw error;
  }
}

// Function to search content on KMmovies
async function searchKMmoviesData(searchQuery: string) {
  try {
    const searchUrl = `https://kmmovies.art/?s=${encodeURIComponent(searchQuery)}`;
    
    console.log(`Searching KMmovies with query: ${searchQuery}`);
    
    const response = await fetch(searchUrl, {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch search results: ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);
    const posts = [];

    // Use the same selector for search results
    $('article.post').each((_, element) => {
      const $element = $(element);
      
      // Extract image
      let imageUrl = $element.find('figure img').attr('src');
      imageUrl = normalizeImageUrl(imageUrl);
      
      // Extract title
      const title = $element.find('h3.entry-title a').text().trim();
      
      // Extract post URL
      const postUrl = $element.find('figure a').attr('href') || 
                     $element.find('h3.entry-title a').attr('href');
      
      // Extract post ID
      const postId = $element.attr('id');
      
      // Check if this is a series or movie
      const isSeriesPattern = /S\d+/i.test(title) || /Season/i.test(title);
      
      if (title && postUrl) {
        posts.push({
          id: postId || '',
          imageUrl,
          title,
          postUrl,
          isSeries: isSeriesPattern,
          type: isSeriesPattern ? 'series' : 'movie'
        });
      }
    });

    return posts;
  } catch (error) {
    console.error('Error searching KMmovies data:', error);
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

    console.log('API key validated successfully for KMmovies request');

    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('search');
    const pageParam = searchParams.get('page');
    const page = pageParam ? parseInt(pageParam, 10) : 1;

    let posts = [];

    try {
      if (searchQuery) {
        // Use search functionality if a search query is provided
        posts = await searchKMmoviesData(searchQuery);
      } else {
        // Otherwise get regular page content
        posts = await scrapeKMmoviesData(page);
      }

      return NextResponse.json({
        success: true,
        count: posts.length,
        posts,
        searchQuery: searchQuery || null,
        page,
        source: searchQuery ? 'search' : 'page',
        website: 'KMmovies',
        remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed - 1) : 0
      });
    } catch (scrapeError) {
      console.error('KMmovies scraping error:', scrapeError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch movie data from KMmovies',
        details: scrapeError instanceof Error ? scrapeError.message : 'Unknown scraping error'
      }, {
        status: 500
      });
    }
  } catch (error) {
    console.error('KMmovies API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, {
      status: 500
    });
  }
}
