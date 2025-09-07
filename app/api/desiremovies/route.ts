import { NextResponse } from 'next/server';
import { load } from 'cheerio';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';

// Function to normalize image URLs - handling protocol-relative URLs
function normalizeImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('//')) return 'https:' + url;
  return url;
}

// Function to extract quality information from title
function extractQualityInfo(title: string) {
  const qualities = [];
  if (title.includes('4K')) qualities.push('4K');
  if (title.includes('1080p')) qualities.push('1080p');
  if (title.includes('720p')) qualities.push('720p');
  if (title.includes('480p')) qualities.push('480p');
  if (title.includes('HEVC')) qualities.push('HEVC');
  if (title.includes('10Bit') || title.includes('10-Bit')) qualities.push('10-Bit');
  if (title.includes('x264')) qualities.push('x264');
  if (title.includes('x265')) qualities.push('x265');
  
  return qualities;
}

// Function to extract audio/language information from title
function extractAudioInfo(title: string) {
  const audioInfo = {
    languages: [] as string[],
    audioFormat: '' as string,
    isDualAudio: false
  };
  
  if (title.includes('Dual Audio')) audioInfo.isDualAudio = true;
  if (title.includes('Hindi')) audioInfo.languages.push('Hindi');
  if (title.includes('English')) audioInfo.languages.push('English');
  if (title.includes('Telugu')) audioInfo.languages.push('Telugu');
  if (title.includes('Tamil')) audioInfo.languages.push('Tamil');
  if (title.includes('Malayalam')) audioInfo.languages.push('Malayalam');
  if (title.includes('Kannada')) audioInfo.languages.push('Kannada');
  
  const ddMatch = title.match(/DD\s*(\d+\.?\d*)/i);
  if (ddMatch) {
    audioInfo.audioFormat = `DD ${ddMatch[1]}`;
  }
  
  return audioInfo;
}

// Function to extract year from title
function extractYear(title: string): string {
  const yearMatch = title.match(/\((\d{4})\)/);
  return yearMatch ? yearMatch[1] : 'Unknown';
}

// Main function to fetch and parse HTML content from DesireMovies
async function scrapeDesireMoviesData(page: number = 1) {
  try {
    const url = page === 1 
      ? 'https://desiremovies.nagoya//' 
      : `https://desiremovies.nagoya//page/${page}/`;
    
    console.log(`Fetching DesireMovies content from: ${url}`);

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
    const $ = load(html);
    // Interfaces
    interface QualityInfo {
        qualities: string[];
    }

    interface AudioInfo {
        languages: string[];
        audioFormat: string;
        isDualAudio: boolean;
    }

    interface MoviePost {
        id: string;
        title: string;
        imageUrl: string;
        postUrl: string;
        description: string;
        releaseYear: string;
        movieType: string;
        categories: string[];
        qualities: string[];
        languages: string[];
        isDualAudio: boolean;
        audioFormat: string;
        hasSubtitles: boolean;
        website: string;
    }

            const posts: MoviePost[] = [];

    // Parse movie items based on the provided HTML structure
    const movieItems = $('article.mh-loop-item');
    console.log(`Found ${movieItems.length} movie items`);
    
    if (movieItems.length === 0) {
      console.log('No movie items found with article.mh-loop-item selector');
    }

    movieItems.each((_, element) => {
      const $element = $(element);
      
      // Extract image from figure > a > img
      let imageUrl = $element.find('figure.mh-loop-thumb img').attr('src');
      imageUrl = normalizeImageUrl(imageUrl);
      
      // Extract title from h3.entry-title > a
      const title = $element.find('h3.entry-title a').text().trim();
      
      // Extract post URL from h3 > a
      const postUrl = $element.find('h3.entry-title a').attr('href');
      
      // Extract post ID from article class or data attribute
      const postId = $element.attr('class')?.match(/post-(\d+)/)?.[1] || '';
      
      // Extract excerpt/description
      const description = $element.find('.mh-excerpt p').text().trim();
      
      // Extract categories from article class
      const categories = [];
      const classNames = $element.attr('class') || '';
      if (classNames.includes('hollywood-movies')) categories.push('Hollywood');
      if (classNames.includes('south-movies')) categories.push('South Indian');
      if (classNames.includes('720p-hevc')) categories.push('720p HEVC');
      if (classNames.includes('4k-movies')) categories.push('4K Movies');
      
      // Parse quality and audio information from title
      const qualityInfo = extractQualityInfo(title);
      const audioInfo = extractAudioInfo(title);
      const releaseYear = extractYear(title);
      
      // Determine movie type based on title patterns
      let movieType = 'Movie';
      if (title.includes('WEB-HDRip')) movieType = 'WEB-HDRip';
      else if (title.includes('BluRay')) movieType = 'BluRay';
      else if (title.includes('CAM')) movieType = 'CAM';
      else if (title.includes('HDRip')) movieType = 'HDRip';
      
      if (title && postUrl && imageUrl) {
        posts.push({
          id: postId,
          title,
          imageUrl,
          postUrl,
          description: description.replace(/Download\s+/, '').replace(/\s*\[…\.\.]\s*$/, ''),
          releaseYear,
          movieType,
          categories,
          qualities: qualityInfo,
          languages: audioInfo.languages,
          isDualAudio: audioInfo.isDualAudio,
          audioFormat: audioInfo.audioFormat,
          hasSubtitles: title.includes('Esubs') || title.includes('Subs'),
          website: 'DesireMovies'
        });
      }
    });

    console.log(`Successfully parsed ${posts.length} movie items`);
    return posts;
  } catch (error) {
    console.error('Error scraping DesireMovies data:', error);
    throw error;
  }
}

// Function to search content on DesireMovies
async function searchDesireMoviesData(searchQuery: string) {
  try {
    const searchUrl = `https://desiremovies.nagoya//?s=${encodeURIComponent(searchQuery)}`;
    
    console.log(`Searching DesireMovies with query: ${searchQuery}`);
    
    const response = await fetch(searchUrl, {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'max-age=0',
        'Cookie': 'xla=s4t; _ga=GA1.1.1080600201.1749632377; _ga_JY310N86S8=GS2.1.1749635924.2.1.1749635925.59.0.0',
        'Priority': 'u=0, i',
        'Referer': 'https://desiremovies.nagoya//',
        'Origin': 'https://desiremovies.nagoya/',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch search results: ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);
    interface QualityInfo {
        qualities: string[];
    }

    interface AudioInfo {
        languages: string[];
        audioFormat: string;
        isDualAudio: boolean;
    }

    interface MoviePost {
        id: string;
        title: string;
        imageUrl: string;
        postUrl: string;
        description: string;
        releaseYear: string;
        movieType: string;
        categories: string[];
        qualities: string[];
        languages: string[];
        isDualAudio: boolean;
        audioFormat: string;
        hasSubtitles: boolean;
        website: string;
    }

    const posts: MoviePost[] = [];

    // Use the same parsing logic for search results
    $('article.mh-loop-item').each((_, element) => {
      const $element = $(element);
      
      let imageUrl = $element.find('figure.mh-loop-thumb img').attr('src');
      imageUrl = normalizeImageUrl(imageUrl);
      
      const title = $element.find('h3.entry-title a').text().trim();
      const postUrl = $element.find('h3.entry-title a').attr('href');
      const postId = $element.attr('class')?.match(/post-(\d+)/)?.[1] || '';
      const description = $element.find('.mh-excerpt p').text().trim();
      
      const categories = [];
      const classNames = $element.attr('class') || '';
      if (classNames.includes('hollywood-movies')) categories.push('Hollywood');
      if (classNames.includes('south-movies')) categories.push('South Indian');
      if (classNames.includes('720p-hevc')) categories.push('720p HEVC');
      if (classNames.includes('4k-movies')) categories.push('4K Movies');
      
      const qualityInfo = extractQualityInfo(title);
      const audioInfo = extractAudioInfo(title);
      const releaseYear = extractYear(title);
      
      let movieType = 'Movie';
      if (title.includes('WEB-HDRip')) movieType = 'WEB-HDRip';
      else if (title.includes('BluRay')) movieType = 'BluRay';
      else if (title.includes('CAM')) movieType = 'CAM';
      else if (title.includes('HDRip')) movieType = 'HDRip';
      
      if (title && postUrl && imageUrl) {
        posts.push({
          id: postId,
          title,
          imageUrl,
          postUrl,
          description: description.replace(/Download\s+/, '').replace(/\s*\[…\.\.]\s*$/, ''),
          releaseYear,
          movieType,
          categories,
          qualities: qualityInfo,
          languages: audioInfo.languages,
          isDualAudio: audioInfo.isDualAudio,
          audioFormat: audioInfo.audioFormat,
          hasSubtitles: title.includes('Esubs') || title.includes('Subs'),
          website: 'DesireMovies'
        });
      }
    });

    return posts;
  } catch (error) {
    console.error('Error searching DesireMovies data:', error);
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

    console.log('API key validated successfully for DesireMovies request');

    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('search');
    const pageParam = searchParams.get('page');
    const page = pageParam ? parseInt(pageParam, 10) : 1;

    let posts = [];

    try {
      if (searchQuery) {
        posts = await searchDesireMoviesData(searchQuery);
      } else {
        posts = await scrapeDesireMoviesData(page);
      }

      return NextResponse.json({
        success: true,
        count: posts.length,
        posts,
        searchQuery: searchQuery || null,
        page,
        source: searchQuery ? 'search' : 'page',
        website: 'DesireMovies',
        remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed - 1) : 0
      });
    } catch (scrapeError) {
      console.error('DesireMovies scraping error:', scrapeError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch movie data from DesireMovies',
        details: scrapeError instanceof Error ? scrapeError.message : 'Unknown scraping error'
      }, {
        status: 500
      });
    }
  } catch (error) {
    console.error('DesireMovies API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, {
      status: 500
    });
  }
}
