import { NextRequest, NextResponse } from 'next/server';
import { load } from 'cheerio';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';

interface HDHub4uItem {
  id: string;
  title: string;
  imageUrl: string;
  postUrl: string;
  altText: string;
  qualities: string[];
  languages: string[];
  audioFormats: string[];
  isSeries: boolean;
  isDualAudio: boolean;
  videoFormats: string[];
  year?: string;
  source?: string;
}

interface HDHub4uResponse {
  success: boolean;
  data?: {
    items: HDHub4uItem[];
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
function extractQualityInfo(title: string): string[] {
  const qualities = [];
  if (title.includes('4K')) qualities.push('4K');
  if (title.includes('2160p')) qualities.push('2160p');
  if (title.includes('1080p')) qualities.push('1080p');
  if (title.includes('720p')) qualities.push('720p');
  if (title.includes('480p')) qualities.push('480p');
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

// Function to check if content is a series
function isSeries(title: string): boolean {
  return title.includes('Season') || 
         title.includes('S01') || title.includes('S02') || title.includes('S03') ||
         title.includes('ALL Episodes') ||
         title.includes('Series');
}

// Function to check if content has dual audio
function isDualAudio(title: string): boolean {
  return title.includes('Dual Audio') || 
         (title.includes('Hindi') && title.includes('English')) ||
         title.includes('&');
}

// Function to extract year from title
function extractYear(title: string): string | undefined {
  const yearMatch = title.match(/\((\d{4})\)/);
  return yearMatch ? yearMatch[1] : undefined;
}

// Function to extract source platform from title
function extractSource(title: string): string | undefined {
  if (title.includes('DisneyPlus') || title.includes('Disney+')) return 'Disney+';
  if (title.includes('Netflix')) return 'Netflix';
  if (title.includes('PrimeVideo') || title.includes('Prime Video')) return 'Prime Video';
  if (title.includes('Hotstar')) return 'Hotstar';
  if (title.includes('Zee5')) return 'Zee5';
  if (title.includes('SonyLiv')) return 'SonyLiv';
  if (title.includes('Voot')) return 'Voot';
  if (title.includes('MX Player')) return 'MX Player';
  return undefined;
}

// Function to generate ID from URL
function generateIdFromUrl(url: string): string {
  try {
    const urlParts = url.split('/');
    const relevantPart = urlParts.find(part => 
      part.length > 5 && !part.includes('hdhub4u')
    );
    return relevantPart ? relevantPart.replace(/[^a-zA-Z0-9-]/g, '') : '';
  } catch {
    return '';
  }
}

// Main function to scrape HDHub4u search results
async function scrapeHDHub4uSearch(searchQuery: string): Promise<HDHub4uItem[]> {
  try {
    const searchUrl = `https://hdhub4u.florist/?s=${encodeURIComponent(searchQuery)}`;
    
    console.log(`Searching HDHub4u with query: ${searchQuery}`);
    console.log(`Search URL: ${searchUrl}`);

    const response = await fetch(searchUrl, {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://hdhub4u.florist/',
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch search results: ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);
    const items: HDHub4uItem[] = [];

    // Process search results from .recent-movies ul li.thumb elements
    $('.recent-movies li.thumb').each((_, element) => {
      const $element = $(element);
      
      // Extract image from figure > img
      let imageUrl = $element.find('figure img').attr('src');
      imageUrl = normalizeImageUrl(imageUrl);
      
      // Extract alt text and title from img
      const altText = $element.find('figure img').attr('alt') || '';
      const titleAttr = $element.find('figure img').attr('title') || '';
      
      // Extract title from figcaption > a > p
      const title = $element.find('figcaption a p').text().trim() || titleAttr || altText;
      
      // Extract post URL from figcaption > a or figure > a
      const postUrl = $element.find('figcaption a').attr('href') || 
                     $element.find('figure a').attr('href');
      
      if (title && postUrl && imageUrl) {
        // Extract all the metadata from the title
        const qualities = extractQualityInfo(title);
        const languages = extractLanguageInfo(title);
        const audioFormats = extractAudioFormats(title);
        const videoFormats = extractVideoFormats(title);
        const isSeriesContent = isSeries(title);
        const isDualAudioContent = isDualAudio(title);
        const year = extractYear(title);
        const source = extractSource(title);
        
        // Generate ID from URL
        const id = generateIdFromUrl(postUrl) || `hdhub4u-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        items.push({
          id,
          title,
          imageUrl,
          postUrl,
          altText,
          qualities,
          languages,
          audioFormats,
          isSeries: isSeriesContent,
          isDualAudio: isDualAudioContent,
          videoFormats,
          year,
          source
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
    console.error('Error scraping HDHub4u search results:', error);
    throw error;
  }
}

// Function to scrape latest content from homepage
async function scrapeHDHub4uHomepage(page: number = 1): Promise<HDHub4uItem[]> {
  try {
    const url = page === 1 
      ? 'https://hdhub4u.florist/' 
      : `https://hdhub4u.florist/page/${page}/`;
    
    console.log(`Fetching HDHub4u homepage content from: ${url}`);

    const response = await fetch(url, {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://hdhub4u.florist/',
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch homepage content: ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);
    const items: HDHub4uItem[] = [];

    // Process content from .recent-movies ul li.thumb elements
    $('.recent-movies li.thumb').each((_, element) => {
      const $element = $(element);
      
      // Extract image from figure > img
      let imageUrl = $element.find('figure img').attr('src');
      imageUrl = normalizeImageUrl(imageUrl);
      
      // Extract alt text and title from img
      const altText = $element.find('figure img').attr('alt') || '';
      const titleAttr = $element.find('figure img').attr('title') || '';
      
      // Extract title from figcaption > a > p
      const title = $element.find('figcaption a p').text().trim() || titleAttr || altText;
      
      // Extract post URL from figcaption > a or figure > a
      const postUrl = $element.find('figcaption a').attr('href') || 
                     $element.find('figure a').attr('href');
      
      if (title && postUrl && imageUrl) {
        // Extract all the metadata from the title
        const qualities = extractQualityInfo(title);
        const languages = extractLanguageInfo(title);
        const audioFormats = extractAudioFormats(title);
        const videoFormats = extractVideoFormats(title);
        const isSeriesContent = isSeries(title);
        const isDualAudioContent = isDualAudio(title);
        const year = extractYear(title);
        const source = extractSource(title);
        
        // Generate ID from URL
        const id = generateIdFromUrl(postUrl) || `hdhub4u-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        items.push({
          id,
          title,
          imageUrl,
          postUrl,
          altText,
          qualities,
          languages,
          audioFormats,
          isSeries: isSeriesContent,
          isDualAudio: isDualAudioContent,
          videoFormats,
          year,
          source
        });
      }
    });

    console.log(`Successfully parsed ${items.length} homepage items`);
    return items;
  } catch (error) {
    console.error('Error scraping HDHub4u homepage:', error);
    throw error;
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<HDHub4uResponse>> {
  try {
    // Validate API key
    const authResult = await validateApiKey(request);
    if (!authResult.isValid) {
      return createUnauthorizedResponse(authResult.error || 'Invalid API key') as NextResponse<HDHub4uResponse>;
    }

    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('search') || searchParams.get('s');
    const page = parseInt(searchParams.get('page') || '1');

    if (page < 1) {
      return NextResponse.json<HDHub4uResponse>(
        { 
          success: false, 
          error: 'Page number must be 1 or greater' 
        },
        { status: 400 }
      );
    }

    console.log('Processing HDHub4u request:', { searchQuery, page });

    let items: HDHub4uItem[] = [];

    if (searchQuery && searchQuery.trim()) {
      // Perform search
      items = await scrapeHDHub4uSearch(searchQuery.trim());
    } else {
      // Get homepage content
      items = await scrapeHDHub4uHomepage(page);
    }

    if (!items || items.length === 0) {
      return NextResponse.json<HDHub4uResponse>({
        success: false,
        error: 'No content found',
        message: searchQuery 
          ? `No results found for search query: "${searchQuery}"` 
          : `No content found on page ${page}`,
        remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
      });
    }

    return NextResponse.json<HDHub4uResponse>({
      success: true,
      data: {
        items,
        query: searchQuery || undefined,
        totalResults: items.length
      },
      remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
    });

  } catch (error: unknown) {
    console.error('HDHub4u API error:', error);
    
    return NextResponse.json<HDHub4uResponse>(
      { 
        success: false, 
        error: 'Failed to fetch content from HDHub4u',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
