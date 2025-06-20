import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';

interface NetMirrorItem {
  id: string;
  title: string;
  url: string;
  image: string;
  rating: number;
  year: string;
  category: string;
  featured?: boolean;
}

interface NetMirrorResponse {
  success: boolean;
  data?: {
    items: NetMirrorItem[];
    pagination?: {
      currentPage: number;
      hasNextPage: boolean;
    };
  };
  error?: string;
  message?: string;
  remainingRequests?: number;
}

async function fetchFromWatch20Space(page: number = 1, searchQuery?: string): Promise<NetMirrorItem[]> {
  try {
    const apiEndpoints = [
      'https://api.watch20.space/api/tranding?id=11',
      'https://api.watch20.space/api/tranding?id=12', 
      'https://api.watch20.space/api/tranding?id=15',
      `https://api.watch20.space/api/movies/filter?page=${page - 1}&type=1&dubbing=Hindi`
    ];

    console.log('Fetching from watch20.space APIs...');

    const responses = await Promise.allSettled(
      apiEndpoints.map(url => 
        fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
          },
          cache: 'no-cache'
        })
      )
    );

    const allItems: NetMirrorItem[] = [];

    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      
      if (response.status === 'fulfilled' && response.value.ok) {
        try {
          const data = await response.value.json();
          console.log(`API ${i + 1} response:`, JSON.stringify(data, null, 2));
          
          const items = transformApiResponse(data, apiEndpoints[i]);
          allItems.push(...items);
        } catch (parseError) {
          console.error(`Error parsing response from API ${i + 1}:`, parseError);
        }
      } else {
        console.error(`Failed to fetch from API ${i + 1}:`, response.status === 'fulfilled' ? response.value.status : response.reason);
      }
    }

    // Filter by search query if provided
    if (searchQuery) {
      const filteredItems = allItems.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
      console.log(`Filtered ${allItems.length} items to ${filteredItems.length} based on search: "${searchQuery}"`);
      return filteredItems;
    }

    console.log(`Total items fetched: ${allItems.length}`);
    return allItems;

  } catch (error) {
    console.error('Error fetching from watch20.space:', error);
    throw error;
  }
}

function transformApiResponse(data: any, endpoint: string): NetMirrorItem[] {
  const items: NetMirrorItem[] = [];
  
  try {
    // Handle different response structures
    let content: any[] = [];
    
    if (Array.isArray(data)) {
      content = data;
    } else if (data.data && Array.isArray(data.data)) {
      content = data.data;
    } else if (data.results && Array.isArray(data.results)) {
      content = data.results;
    } else if (data.movies && Array.isArray(data.movies)) {
      content = data.movies;
    }

    console.log(`Processing ${content.length} items from endpoint: ${endpoint}`);

    content.forEach((item: any, index: number) => {
      try {
        const transformedItem: NetMirrorItem = {
          id: item.id?.toString() || item._id?.toString() || `item-${Date.now()}-${index}`,
          title: item.title || item.name || item.movie_name || 'Unknown Title',
          url: item.url || item.link || `https://watch20.space/watch/${item.id || item._id}`,
          image: item.image || item.poster || item.thumbnail || item.poster_url || '',
          rating: parseFloat(item.rating || item.imdb_rating || item.score || '0'),
          year: item.year?.toString() || item.release_date || item.created_at || new Date().getFullYear().toString(),
          category: determineCategory(item, endpoint),
          featured: item.featured || item.trending || false
        };

        items.push(transformedItem);
      } catch (itemError) {
        console.error(`Error transforming item ${index}:`, itemError);
      }
    });

  } catch (error) {
    console.error('Error transforming API response:', error);
  }

  return items;
}

function determineCategory(item: any, endpoint: string): string {
  // Determine category based on endpoint and item properties
  if (endpoint.includes('id=11')) return 'Trending Movies';
  if (endpoint.includes('id=12')) return 'Popular Series';
  if (endpoint.includes('id=15')) return 'Latest Releases';
  if (endpoint.includes('movies/filter')) return 'Hindi Movies';
  
  // Fallback to item properties
  if (item.type === 'series' || item.category === 'series') return 'TV Series';
  if (item.type === 'movie' || item.category === 'movie') return 'Movie';
  if (item.genre && item.genre.toLowerCase().includes('anime')) return 'Anime';
  
  return 'Movie';
}

export async function GET(request: NextRequest): Promise<NextResponse<NetMirrorResponse>> {
  try {
    // Validate API key
    const authResult = await validateApiKey(request);
    if (!authResult.isValid) {
      return createUnauthorizedResponse(authResult.error || 'Invalid API key') as NextResponse<NetMirrorResponse>;
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const searchQuery = searchParams.get('search');

    if (page < 1) {
      return NextResponse.json<NetMirrorResponse>(
        { 
          success: false, 
          error: 'Page number must be 1 or greater' 
        },
        { status: 400 }
      );
    }

    console.log('Processing watch20.space request:', { page, searchQuery });

    const items = await fetchFromWatch20Space(page, searchQuery || undefined);

    if (!items || items.length === 0) {
      return NextResponse.json<NetMirrorResponse>({
        success: false,
        error: 'No items found',
        message: searchQuery 
          ? `No items found for search query: "${searchQuery}"` 
          : `No items found on page ${page}`,
        remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
      });
    }

    return NextResponse.json<NetMirrorResponse>({
      success: true,
      data: {
        items,
        pagination: {
          currentPage: page,
          hasNextPage: items.length >= 10
        }
      },
      remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
    });

  } catch (error: unknown) {
    console.error('Watch20.space API error:', error);
    
    return NextResponse.json<NetMirrorResponse>(
      { 
        success: false, 
        error: 'Failed to fetch content from watch20.space',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
       
