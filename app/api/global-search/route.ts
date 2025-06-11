import { NextResponse } from 'next/server';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';

export async function GET(request: Request) {
  try {
    // Validate API key first
    const authResult = await validateApiKey(request);
    if (!authResult.isValid) {
      console.log('API key validation failed:', authResult.error);
      return createUnauthorizedResponse(authResult.error || 'Invalid API key');
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        success: false,
        error: 'Query must be at least 2 characters long'
      }, { status: 400 });
    }

    console.log('Global search query:', query);

    // Search all providers in parallel
    const searchPromises = [
      // Search anime
      fetch(`${request.url.split('/api')[0]}/api/posts?search=${encodeURIComponent(query)}`, {
        headers: { 'x-api-key': request.headers.get('x-api-key') || '' }
      }).then(res => res.json()).catch(() => ({ success: false, posts: [] })),
      
      // Search movies
      fetch(`${request.url.split('/api')[0]}/api/moviesdrive?search=${encodeURIComponent(query)}`, {
        headers: { 'x-api-key': request.headers.get('x-api-key') || '' }
      }).then(res => res.json()).catch(() => ({ success: false, posts: [] })),
      
      // Search KM movies
      fetch(`${request.url.split('/api')[0]}/api/kmmovies?search=${encodeURIComponent(query)}`, {
        headers: { 'x-api-key': request.headers.get('x-api-key') || '' }
      }).then(res => res.json()).catch(() => ({ success: false, posts: [] }))
    ];

    const [animeResults, moviesResults, kmMoviesResults] = await Promise.all(searchPromises);

    // Format results for global search
    const formatResults = (results: any, type: string) => {
      if (!results.success || !results.posts) {
        return { success: false, data: [], count: 0 };
      }

      const formattedData = results.posts.map((item: any) => ({
        id: item.id || item.postUrl?.split('/').slice(-2, -1)[0] || '',
        title: item.title || item.animeName || '',
        imageUrl: item.imageUrl || item.image || '',
        postUrl: item.postUrl || item.url || '',
        isSeries: item.isSeries || false,
        type: item.type || type
      }));

      return {
        success: true,
        data: formattedData,
        count: formattedData.length
      };
    };

    const anime = formatResults(animeResults, 'anime');
    const movies = formatResults(moviesResults, 'movie');
    const kmmovies = formatResults(kmMoviesResults, 'kmmovie');

    const totalResults = anime.count + movies.count + kmmovies.count;

    return NextResponse.json({
      success: true,
      query: query.trim(),
      totalResults,
      results: {
        anime,
        movies,
        kmmovies
      },
      remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed - 1) : 0
    });

  } catch (error) {
    console.error('Global search API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}
