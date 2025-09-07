import { NextRequest, NextResponse } from 'next/server';
import { load } from 'cheerio';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';

interface FilmyFlyItem {
  id: string;
  title: string;
  imageUrl: string;
  postUrl: string;
  qualities: string[];
  languages: string[];
  audioFormats: string[];
  isDualAudio: boolean;
  videoFormats: string[];
  year?: string;
  isBluRay: boolean;
  hasSubtitles: boolean;
}

interface FilmyFlyResponse {
  success: boolean;
  data?: {
    items: FilmyFlyItem[];
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
  if (url.startsWith('/')) return 'https://filmyfly.dog/' + url;
  return url;
}

// Function to extract quality information from title
function extractQualityInfo(title: string): string[] {
  const qualities = [];
  if (title.includes('4K')) qualities.push('4K');
  if (title.includes('2160p')) qualities.push('2160p');
  if (title.includes('1080p')) qualities.push('1080p');
  if (title.includes('720p')) qualities.push('720p');
  if (title.includes('480p')) qualities.push('480p');
  if (title.includes('HD')) qualities.push('HD');
  return qualities;
}

// Function to extract language information from title
function extractLanguageInfo(title: string): string[] {
  const languages = [];
  if (title.includes('Hindi')) languages.push('Hindi');
  if (title.includes('English')) languages.push('English');
  if (title.includes('Tamil')) languages.push('Tamil');
  if (title.includes('Telugu')) languages.push('Telugu');
  if (title.includes('Malayalam')) languages.push('Malayalam');
  if (title.includes('Kannada')) languages.push('Kannada');
  if (title.includes('Punjabi')) languages.push('Punjabi');
  if (title.includes('Bengali')) languages.push('Bengali');
  if (title.includes('Marathi')) languages.push('Marathi');
  return languages;
}

// Function to extract audio format information from title
function extractAudioFormats(title: string): string[] {
  const audioFormats = [];
  if (title.includes('DD5.1') || title.includes('DD 5.1')) audioFormats.push('DD 5.1');
  if (title.includes('DD2.0') || title.includes('DD 2.0')) audioFormats.push('DD 2.0');
  if (title.includes('DTS')) audioFormats.push('DTS');
  if (title.includes('Atmos')) audioFormats.push('Atmos');
  return audioFormats;
}

// Function to extract video format information from title
function extractVideoFormats(title: string): string[] {
  const videoFormats = [];
  if (title.includes('x264')) videoFormats.push('x264');
  if (title.includes('x265')) videoFormats.push('x265');
  if (title.includes('HEVC')) videoFormats.push('HEVC');
  if (title.includes('10Bit') || title.includes('10-Bit')) videoFormats.push('10-Bit');
  if (title.includes('WEB-DL')) videoFormats.push('WEB-DL');
  if (title.includes('WEBRip')) videoFormats.push('WEBRip');
  if (title.includes('BluRay')) videoFormats.push('BluRay');
  if (title.includes('HDRip')) videoFormats.push('HDRip');
  if (title.includes('HDTV')) videoFormats.push('HDTV');
  return videoFormats;
}

// Function to check if content has dual audio
function isDualAudio(title: string): boolean {
  return title.includes('Dual Audio') || 
         (title.includes('Hindi') && title.includes('English')) ||
         title.includes('+');
}

// Function to extract year from title
function extractYear(title: string): string | undefined {
  const yearMatch = title.match(/\((\d{4})\)/);
  return yearMatch ? yearMatch[1] : undefined;
}

// Function to check if content is BluRay
function isBluRay(title: string): boolean {
  return title.includes('BluRay');
}

// Function to check if content has subtitles
function hasSubtitles(title: string): boolean {
  return title.includes('ESub') || title.includes('Subtitle') || title.includes('Sub');
}

// Function to generate ID from URL
function generateIdFromUrl(url: string): string {
  try {
    const urlParts = url.split('/');
    const relevantPart = urlParts.find(part => 
      part.length > 5 && !part.includes('filmyfly.men')
    );
    return relevantPart ? relevantPart.replace(/[^a-zA-Z0-9-]/g, '') : '';
  } catch {
    return '';
  }
}

// Main function to scrape FilmyFly search results
async function scrapeFilmyFlySearch(searchQuery: string): Promise<FilmyFlyItem[]> {
  try {
    const searchUrl = `https://filmyfly.dog//site-1.html?to-search=${encodeURIComponent(searchQuery)}`;
    
    console.log(`Searching FilmyFly with query: ${searchQuery}`);
    console.log(`Search URL: ${searchUrl}`);

    const response = await fetch(searchUrl, {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://filmyfly.dog//',
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch search results: ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);
    const items: FilmyFlyItem[] = [];

    // Process search results from .A2 div elements
    $('.A2').each((_, element) => {
      const $element = $(element);
      
      // Extract image from img inside first a tag
      let imageUrl = $element.find('a:first img').attr('src');
      imageUrl = normalizeImageUrl(imageUrl);
      
      // Extract post URL from first a tag
      const postUrl = $element.find('a:first').attr('href');
      
      // Extract title from second a tag or span/b text
      const title = $element.find('a:nth-child(2) b span').text().trim() || 
                   $element.find('a:nth-child(2) b').text().trim() ||
                   $element.find('a:nth-child(2)').text().trim();
      
      if (title && postUrl && imageUrl) {
        // Make postUrl absolute if it's relative
        const absolutePostUrl = postUrl.startsWith('/') ? `https://filmyfly.dog/${postUrl}` : postUrl;
        
        // Extract all the metadata from the title
        const qualities = extractQualityInfo(title);
        const languages = extractLanguageInfo(title);
        const audioFormats = extractAudioFormats(title);
        const videoFormats = extractVideoFormats(title);
        const isDualAudioContent = isDualAudio(title);
        const year = extractYear(title);
        const isBluRayContent = isBluRay(title);
        const hasSubtitlesContent = hasSubtitles(title);
        
        // Generate ID from URL
        const id = generateIdFromUrl(absolutePostUrl) || `filmyfly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        items.push({
          id,
          title,
          imageUrl,
          postUrl: absolutePostUrl,
          qualities,
          languages,
          audioFormats,
          isDualAudio: isDualAudioContent,
          videoFormats,
          year,
          isBluRay: isBluRayContent,
          hasSubtitles: hasSubtitlesContent
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
    console.error('Error scraping FilmyFly search results:', error);
    throw error;
  }
}

// Function to scrape latest content from homepage
async function scrapeFilmyFlyHomepage(): Promise<FilmyFlyItem[]> {
  try {
    const url = 'https://filmyfly.dog//';
    
    console.log(`Fetching FilmyFly homepage content from: ${url}`);

    const response = await fetch(url, {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://filmyfly.dog//',
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch homepage content: ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);
    const items: FilmyFlyItem[] = [];

    // Process content from .A2 div elements on homepage
    $('.A2').each((_, element) => {
      const $element = $(element);
      
      // Extract image from img inside first a tag
      let imageUrl = $element.find('a:first img').attr('src');
      imageUrl = normalizeImageUrl(imageUrl);
      
      // Extract post URL from first a tag
      const postUrl = $element.find('a:first').attr('href');
      
      // Extract title from second a tag or span/b text
      const title = $element.find('a:nth-child(2) b span').text().trim() || 
                   $element.find('a:nth-child(2) b').text().trim() ||
                   $element.find('a:nth-child(2)').text().trim();
      
      if (title && postUrl && imageUrl) {
        // Make postUrl absolute if it's relative
        const absolutePostUrl = postUrl.startsWith('/') ? `https://filmyfly.dog/${postUrl}` : postUrl;
        
        // Extract all the metadata from the title
        const qualities = extractQualityInfo(title);
        const languages = extractLanguageInfo(title);
        const audioFormats = extractAudioFormats(title);
        const videoFormats = extractVideoFormats(title);
        const isDualAudioContent = isDualAudio(title);
        const year = extractYear(title);
        const isBluRayContent = isBluRay(title);
        const hasSubtitlesContent = hasSubtitles(title);
        
        // Generate ID from URL
        const id = generateIdFromUrl(absolutePostUrl) || `filmyfly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        items.push({
          id,
          title,
          imageUrl,
          postUrl: absolutePostUrl,
          qualities,
          languages,
          audioFormats,
          isDualAudio: isDualAudioContent,
          videoFormats,
          year,
          isBluRay: isBluRayContent,
          hasSubtitles: hasSubtitlesContent
        });
      }
    });

    console.log(`Successfully parsed ${items.length} homepage items`);
    return items;
  } catch (error) {
    console.error('Error scraping FilmyFly homepage:', error);
    throw error;
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<FilmyFlyResponse>> {
  try {
    // Validate API key
    const authResult = await validateApiKey(request);
    if (!authResult.isValid) {
      return createUnauthorizedResponse(authResult.error || 'Invalid API key') as NextResponse<FilmyFlyResponse>;
    }

    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('search') || searchParams.get('s');

    console.log('Processing FilmyFly request:', { searchQuery });

    let items: FilmyFlyItem[] = [];

    if (searchQuery && searchQuery.trim()) {
      // Perform search
      items = await scrapeFilmyFlySearch(searchQuery.trim());
    } else {
      // Get homepage content
      items = await scrapeFilmyFlyHomepage();
    }

    if (!items || items.length === 0) {
      return NextResponse.json<FilmyFlyResponse>({
        success: false,
        error: 'No content found',
        message: searchQuery 
          ? `No results found for search query: "${searchQuery}"` 
          : 'No content found on homepage',
        remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
      });
    }

    return NextResponse.json<FilmyFlyResponse>({
      success: true,
      data: {
        items,
        query: searchQuery || undefined,
        totalResults: items.length
      },
      remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
    });

  } catch (error: unknown) {
    console.error('FilmyFly API error:', error);
    
    return NextResponse.json<FilmyFlyResponse>(
      { 
        success: false, 
        error: 'Failed to fetch content from FilmyFly',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
