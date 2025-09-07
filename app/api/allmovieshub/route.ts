import { NextResponse } from 'next/server';
import { load } from 'cheerio';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';

// Function to normalize image URLs
function normalizeImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('//')) return 'https:' + url;
  if (url.startsWith('/')) return 'https://allmovieshub.dev/' + url;
  return url;
}

// Function to extract quality information from categories
function extractQualityInfo(categories: string[]) {
  const qualities = [];
  categories.forEach(cat => {
    if (cat.includes('480p')) qualities.push('480p');
    if (cat.includes('720p')) qualities.push('720p');
    if (cat.includes('1080p')) qualities.push('1080p');
    if (cat.includes('4k')) qualities.push('4K');
  });
  return [...new Set(qualities)]; // Remove duplicates
}

// Function to extract language information from categories
function extractLanguageInfo(categories: string[]) {
  const languages = [];
  categories.forEach(cat => {
    if (cat.includes('hindi')) languages.push('Hindi');
    if (cat.includes('english')) languages.push('English');
    if (cat.includes('tamil')) languages.push('Tamil');
    if (cat.includes('telugu')) languages.push('Telugu');
    if (cat.includes('malayalam')) languages.push('Malayalam');
    if (cat.includes('kannada')) languages.push('Kannada');
    if (cat.includes('punjabi')) languages.push('Punjabi');
    if (cat.includes('bengali')) languages.push('Bengali');
  });
  return [...new Set(languages)]; // Remove duplicates
}

// Function to extract movie categories
function extractMovieCategories(categories: string[]) {
  const movieCategories = [];
  categories.forEach(cat => {
    if (cat.includes('bollywood')) movieCategories.push('Bollywood');
    if (cat.includes('hollywood')) movieCategories.push('Hollywood');
    if (cat.includes('south')) movieCategories.push('South Indian');
    if (cat.includes('web-series')) movieCategories.push('Web Series');
    if (cat.includes('tv-show')) movieCategories.push('TV Show');
  });
  return [...new Set(movieCategories)]; // Remove duplicates
}

// Function to extract genres from categories
function extractGenres(categories: string[]) {
  const genres = [];
  const genreMap = {
    'action': 'Action',
    'adventure': 'Adventure',
    'comedy': 'Comedy',
    'crime': 'Crime',
    'drama': 'Drama',
    'fantasy': 'Fantasy',
    'horror': 'Horror',
    'mystery': 'Mystery',
    'romance': 'Romance',
    'sci-fi': 'Sci-Fi',
    'thriller': 'Thriller',
    'animation': 'Animation',
    'documentary': 'Documentary',
    'family': 'Family',
    'musical': 'Musical',
    'war': 'War',
    'western': 'Western'
  };

  categories.forEach(cat => {
    Object.keys(genreMap).forEach(genre => {
      if (cat.includes(genre)) {
        genres.push(genreMap[genre]);
      }
    });
  });
  
  return [...new Set(genres)]; // Remove duplicates
}

// Main function to fetch and parse HTML content
async function scrapeAllMoviesHubData(page: number = 1) {
  try {
    const url = page === 1 
      ? 'https://allmovieshub.dev//' 
      : `https://allmovieshub.dev//page/${page}/`;
    
    console.log(`Fetching AllMoviesHub content from: ${url}`);

    const response = await fetch(url, {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://allmovieshub.dev//'
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch content: ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);
    const posts = [];

    // Parse movie articles
    const movieArticles = $('article.post-item');
    console.log(`Found ${movieArticles.length} movie articles`);
    
    if (movieArticles.length === 0) {
      console.log('No movie articles found with article.post-item selector');
    }

    movieArticles.each((_, element) => {
      const $element = $(element);
      
      // Extract post ID from article id attribute
      const postId = $element.attr('id')?.replace('post-', '') || '';
      
      // Extract image from blog-pic section
      let imageUrl = $element.find('.blog-pic img').attr('src');
      imageUrl = normalizeImageUrl(imageUrl);
      
      // Extract title from entry-title
      const title = $element.find('.entry-title a').text().trim();
      
      // Extract post URL from entry-title link
      const postUrl = $element.find('.entry-title a').attr('href');
      
      // Extract categories from article class attribute
      const articleClasses = $element.attr('class') || '';
      const categories = articleClasses.split(' ').filter(cls => 
        cls.startsWith('category-') || cls.startsWith('tag-')
      ).map(cls => cls.replace(/^(category-|tag-)/, ''));
      
      // Extract quality, language, and genre information
      const qualities = extractQualityInfo(categories);
      const languages = extractLanguageInfo(categories);
      const movieCategories = extractMovieCategories(categories);
      const genres = extractGenres(categories);
      
      // Determine if it's a series or movie
      const isSeries = title.toLowerCase().includes('season') || 
                      title.toLowerCase().includes('episode') ||
                      categories.some(cat => cat.includes('web-series') || cat.includes('tv-show'));
      
      // Extract year from title if available
      const yearMatch = title.match(/(\d{4})/);
      const releaseYear = yearMatch ? yearMatch[1] : null;
      
      // Check for dual audio
      const isDualAudio = title.toLowerCase().includes('dual audio') ||
                         categories.some(cat => cat.includes('dual-audio'));
      
      // Extract format info from title
      let format = 'Unknown';
      if (title.includes('BluRay')) format = 'BluRay';
      else if (title.includes('WEB-DL')) format = 'WEB-DL';
      else if (title.includes('WEBRip')) format = 'WEBRip';
      else if (title.includes('HDRip')) format = 'HDRip';
      else if (title.includes('HDTC')) format = 'HDTC';
      else if (title.includes('CAM')) format = 'CAM';
      
      if (title && postUrl && imageUrl) {
        posts.push({
          id: postId,
          title,
          imageUrl,
          postUrl,
          releaseYear,
          qualities,
          languages,
          categories: movieCategories,
          genres,
          isSeries,
          isDualAudio,
          format,
          isSticky: $element.hasClass('sticky'),
          website: 'AllMoviesHub'
        });
      } else {
        console.log('Skipping incomplete movie item:', { 
          hasImage: !!imageUrl,
          title: title || '(missing)', 
          hasUrl: !!postUrl
        });
      }
    });

    console.log(`Successfully parsed ${posts.length} movie articles`);
    return posts;
  } catch (error) {
    console.error('Error scraping AllMoviesHub data:', error);
    throw error;
  }
}

// Function to search content
async function searchAllMoviesHubData(searchQuery: string) {
  try {
    const searchUrl = `https://allmovieshub.dev//?s=${encodeURIComponent(searchQuery)}`;
    
    console.log(`Searching AllMoviesHub with query: ${searchQuery}`);
    
    const response = await fetch(searchUrl, {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://allmovieshub.dev//'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch search results: ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);
    const posts = [];

    // Use the same parsing logic for search results
    $('article.post-item').each((_, element) => {
      const $element = $(element);
      
      const postId = $element.attr('id')?.replace('post-', '') || '';
      let imageUrl = $element.find('.blog-pic img').attr('src');
      imageUrl = normalizeImageUrl(imageUrl);
      
      const title = $element.find('.entry-title a').text().trim();
      const postUrl = $element.find('.entry-title a').attr('href');
      
      const articleClasses = $element.attr('class') || '';
      const categories = articleClasses.split(' ').filter(cls => 
        cls.startsWith('category-') || cls.startsWith('tag-')
      ).map(cls => cls.replace(/^(category-|tag-)/, ''));
      
      const qualities = extractQualityInfo(categories);
      const languages = extractLanguageInfo(categories);
      const movieCategories = extractMovieCategories(categories);
      const genres = extractGenres(categories);
      
      const isSeries = title.toLowerCase().includes('season') || 
                      title.toLowerCase().includes('episode') ||
                      categories.some(cat => cat.includes('web-series') || cat.includes('tv-show'));
      
      const yearMatch = title.match(/(\d{4})/);
      const releaseYear = yearMatch ? yearMatch[1] : null;
      
      const isDualAudio = title.toLowerCase().includes('dual audio') ||
                         categories.some(cat => cat.includes('dual-audio'));
      
      let format = 'Unknown';
      if (title.includes('BluRay')) format = 'BluRay';
      else if (title.includes('WEB-DL')) format = 'WEB-DL';
      else if (title.includes('WEBRip')) format = 'WEBRip';
      else if (title.includes('HDRip')) format = 'HDRip';
      else if (title.includes('HDTC')) format = 'HDTC';
      else if (title.includes('CAM')) format = 'CAM';
      
      if (title && postUrl && imageUrl) {
        posts.push({
          id: postId,
          title,
          imageUrl,
          postUrl,
          releaseYear,
          qualities,
          languages,
          categories: movieCategories,
          genres,
          isSeries,
          isDualAudio,
          format,
          isSticky: $element.hasClass('sticky'),
          website: 'AllMoviesHub'
        });
      }
    });

    return posts;
  } catch (error) {
    console.error('Error searching AllMoviesHub data:', error);
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

    console.log('API key validated successfully for AllMoviesHub request');

    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('search');
    const pageParam = searchParams.get('page');
    const page = pageParam ? parseInt(pageParam, 10) : 1;

    let posts = [];

    try {
      if (searchQuery) {
        posts = await searchAllMoviesHubData(searchQuery);
      } else {
        posts = await scrapeAllMoviesHubData(page);
      }

      return NextResponse.json({
        success: true,
        count: posts.length,
        posts,
        searchQuery: searchQuery || null,
        page,
        source: searchQuery ? 'search' : 'page',
        website: 'AllMoviesHub',
        remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed - 1) : 0
      });
    } catch (scrapeError) {
      console.error('AllMoviesHub scraping error:', scrapeError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch movie data from AllMoviesHub',
        details: scrapeError instanceof Error ? scrapeError.message : 'Unknown scraping error'
      }, {
        status: 500
      });
    }
  } catch (error) {
    console.error('AllMoviesHub API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, {
      status: 500
    });
  }
}
