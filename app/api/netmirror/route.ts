import { NextRequest, NextResponse } from 'next/server';
import { load } from 'cheerio';
import { getNetMirrorUrl, fetchNetMirrorCookies } from '@/lib/utils/providers';

interface NetMirrorItem {
  id: string;
  title: string;
  imageUrl: string;
  postUrl: string;
  category: string;
}

interface NetMirrorResponse {
  success: boolean;
  data?: {
    items: NetMirrorItem[];
    totalResults: number;
  };
  error?: string;
  message?: string;
}

/**
 * Function to generate ID from data-post attribute
 */
function generateIdFromDataPost(dataPost: string): string {
  return dataPost || '';
}

/**
 * Function to normalize image URLs
 */
function normalizeImageUrl(url: string | undefined): string {
  if (!url) return '';
  if (url.startsWith('//')) return 'https:' + url;
  if (url.startsWith('/')) {
    // For relative URLs, we'll need to construct the full URL
    return url;
  }
  return url;
}

/**
 * Main function to scrape NetMirror data
 */
async function scrapeNetMirrorData(): Promise<NetMirrorItem[]> {
  try {
    const baseUrl = await getNetMirrorUrl();
    const cookies = await fetchNetMirrorCookies();
    
    console.log(`Fetching NetMirror content from: ${baseUrl}`);

    const response = await fetch(baseUrl, {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cookie': cookies,
        'Referer': baseUrl,
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch NetMirror content: ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);

    const items: NetMirrorItem[] = [];

    // Extract items from each row
    $('.lolomoRow').each((_, rowElement) => {
      const $row = $(rowElement);
      const categoryTitle = $row.find('.row-header-title').text().trim();
      
      // Extract items from this row
      $row.find('.slider-item').each((_, itemElement) => {
        const $item = $(itemElement);
        const dataPost = $item.attr('data-post');
        const $link = $item.find('a.slider-refocus');
        const title = $link.attr('aria-label') || '';
        const $img = $item.find('.boxart-image');
        const imageUrl = normalizeImageUrl($img.attr('data-src') || $img.attr('src'));

        if (dataPost && title && imageUrl) {
          items.push({
            id: generateIdFromDataPost(dataPost),
            title: title,
            imageUrl: imageUrl,
            postUrl: `${baseUrl}watch/${dataPost}`, // Construct watch URL
            category: categoryTitle || 'Unknown'
          });
        }
      });
    });

    console.log(`Successfully scraped ${items.length} items from NetMirror`);
    return items;

  } catch (error) {
    console.error('Error scraping NetMirror data:', error);
    throw error;
  }
}

/**
 * Function to fetch post details from NetMirror post.php endpoint
 */
async function fetchNetMirrorPost(id: string, timestamp?: string): Promise<any> {
  try {
    const baseUrl = await getNetMirrorUrl();
    const cookies = await fetchNetMirrorCookies();
    const currentTime = timestamp || Date.now().toString();
    
    const postUrl = `${baseUrl}post.php?id=${id}&t=${currentTime}`;
    
    console.log(`Fetching NetMirror post from: ${postUrl}`);

    const response = await fetch(postUrl, {
      method: 'GET',
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cookie': cookies,
        'Referer': baseUrl,
        'X-Requested-With': 'XMLHttpRequest',
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch post details: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    
    // Try to parse as JSON first
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      // If not JSON, return as text
      const text = await response.text();
      try {
        // Try to parse text as JSON in case content-type is wrong
        return JSON.parse(text);
      } catch {
        // If parsing fails, return as plain text
        return { rawResponse: text };
      }
    }

  } catch (error) {
    console.error('Error fetching NetMirror post:', error);
    throw error;
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<NetMirrorResponse>> {
  try {
    const items = await scrapeNetMirrorData();

    return NextResponse.json({
      success: true,
      data: {
        items: items,
        totalResults: items.length
      }
    });

  } catch (error) {
    console.error('NetMirror API Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch NetMirror content',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { id, t } = body;

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameter: id',
        message: 'Please provide an id parameter in the request body'
      }, { status: 400 });
    }

    const postData = await fetchNetMirrorPost(id, t);

    return NextResponse.json({
      success: true,
      data: postData,
      requestParams: {
        id: id,
        timestamp: t || Date.now().toString()
      }
    });

  } catch (error) {
    console.error('NetMirror POST API Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch post details',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}