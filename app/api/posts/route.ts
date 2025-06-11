import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';

// Function to remove duplicate posts based on postUrl
function deduplicatePosts(posts: any[]) {
  const seen = new Set();
  return posts.filter(post => {
    if (seen.has(post.postUrl)) {
      return false;
    }
    seen.add(post.postUrl);
    return true;
  });
}

// Function to build category URL
function buildCategoryUrl(category?: string): string {
  const baseUrl = 'https://animesalt.cc'
  
  if (!category || category === 'all') {
    return `${baseUrl}/category/language/hindi/` // Default to hindi
  }

  // Language categories
  if (['hindi', 'english', 'tamil'].includes(category)) {
    return `${baseUrl}/category/language/${category}/`
  }

  // Network categories
  if (['crunchyroll', 'disney', 'hotstar'].includes(category)) {
    return `${baseUrl}/category/network/${category}/`
  }

  // Fallback to hindi if unknown category
  return `${baseUrl}/category/language/hindi/`
}

// Function to fetch and parse HTML content from category page
async function scrapeAnimeData(category?: string) {
  try {
    const url = buildCategoryUrl(category)
    
    // Make a request to the anime website
    const response = await fetch(url, {
      cache: 'no-cache',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch posts: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const posts = [];

    // Parse each post based on the HTML structure we observed
    $('li[class*="post-"]').each((_, element) => {
      const $element = $(element);

      // Extract the image URL
      let imageUrl = $element.find('img').data('src') || $element.find('img').attr('src');

      // Normalize protocol-relative URLs
      if (imageUrl && imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl;
      }

      // Extract the title
      const title = $element.find('h2.entry-title').text().trim();

      // Extract the post URL
      const postUrl = $element.find('a.lnk-blk').attr('href') || $element.find('a').attr('href');

      // Only add posts with all required fields
      if (imageUrl && title && postUrl) {
        posts.push({
          imageUrl,
          title,
          postUrl,
        });
      }
    });

    return deduplicatePosts(posts);
  } catch (error) {
    console.error('Error scraping anime data:', error);
    throw error;
  }
}

// Function to search anime using the search page with category support
async function searchAnimeData(searchQuery: string, category?: string) {
  try {
    let searchUrl = `https://animesalt.cc/?s=${encodeURIComponent(searchQuery)}`
    
    // Add category filter to search if specified
    if (category && category !== 'all') {
      // For search, we'll still use the general search but filter results
      // The website's search doesn't seem to support category filtering directly
    }
    
    const response = await fetch(searchUrl, {
      cache: 'no-cache',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch search results: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const posts = [];

    // Parse search results - they might have a different structure
    $('li[class*="post-"], .search-result, article').each((_, element) => {
      const $element = $(element);

      // Try multiple selectors for image
      let imageUrl = $element.find('img').data('src') || 
                    $element.find('img').attr('src') ||
                    $element.find('.post-thumbnail img').attr('src') ||
                    $element.find('.entry-image img').attr('src');

      // Normalize protocol-relative URLs
      if (imageUrl && imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl;
      }

      // Try multiple selectors for title
      const title = $element.find('h2.entry-title').text().trim() ||
                   $element.find('h3.entry-title').text().trim() ||
                   $element.find('.entry-title').text().trim() ||
                   $element.find('h2 a').text().trim() ||
                   $element.find('h3 a').text().trim();

      // Try multiple selectors for post URL
      const postUrl = $element.find('a.lnk-blk').attr('href') || 
                     $element.find('a').attr('href') ||
                     $element.find('.entry-title a').attr('href');

      // Only add posts with all required fields
      if (imageUrl && title && postUrl) {
        posts.push({
          imageUrl,
          title,
          postUrl,
        });
      }
    });

    return deduplicatePosts(posts);
  } catch (error) {
    console.error('Error searching anime data:', error);
    throw error;
  }
}

export async function GET(request: Request) {
  try {
    // Validate API key
    const authResult = await validateApiKey(request);
    if (!authResult.isValid) {
      return createUnauthorizedResponse(authResult.error || 'Invalid API key');
    }

    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('search');
    const category = searchParams.get('category');

    let posts = [];

    if (searchQuery) {
      // If there's a search query, first try to get category posts and filter
      const categoryPosts = await scrapeAnimeData(category || undefined);
      
      // Filter posts that match the search query
      const filteredPosts = categoryPosts.filter(post => 
        post.title.toLowerCase().includes(searchQuery.toLowerCase())
      );

      if (filteredPosts.length > 0) {
        // If we found matches in the category data, return them
        posts = filteredPosts;
      } else {
        // If no matches found in category data, use search API
        posts = await searchAnimeData(searchQuery, category || undefined);
      }
    } else {
      // No search query, return posts from category page
      posts = await scrapeAnimeData(category || undefined);
    }

    // Apply final deduplication as an extra safety measure
    posts = deduplicatePosts(posts);

    return NextResponse.json({
      success: true,
      count: posts.length,
      posts,
      searchQuery: searchQuery || null,
      category: category || 'all',
      source: searchQuery && posts.length > 0 ? 'search' : 'category',
      remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch posts',
      },
      { status: 500 }
    );
  }
}
