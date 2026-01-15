import { NextRequest, NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/baseurl";
import * as cheerio from "cheerio";
import { validateApiKey, createUnauthorizedResponse } from "@/lib/api-auth";

interface SearchResult {
  id: string;
  title: string;
  url: string;
  imageUrl: string;
  rating: string;
  year: string;
  type: string;
  description: string;
}

export async function GET(request: NextRequest) {
  const validation = await validateApiKey(request);
  if (!validation.valid) {
    return createUnauthorizedResponse(validation.error || "Unauthorized");
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      );
    }

    const baseUrl = await getBaseUrl("zinkmovies");
    const searchUrl = `${baseUrl}/?s=${encodeURIComponent(query)}`;

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch search results from ZinkMovies" },
        { status: response.status }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const searchResults: SearchResult[] = [];

    $('.search-page .result-item article').each((_, element) => {
      const $article = $(element);
      const $link = $article.find('.image .thumbnail a').first();
      const url = $link.attr('href') || '';
      const imageUrl = $article.find('.image .thumbnail img').attr('src') || 
                       $article.find('.image .thumbnail img').attr('data-lazy-src') || '';
      const title = $article.find('.details .title a').text().trim();
      const rating = $article.find('.meta .rating').text().trim();
      const year = $article.find('.meta .year').text().trim();
      const typeSpan = $article.find('.image .thumbnail span.movies').text().toLowerCase();
      const description = $article.find('.details .contenido p').text().trim();

      const id = url.split('/').filter(Boolean).pop() || '';

      if (title && url) {
        searchResults.push({
          id,
          title,
          url,
          imageUrl,
          rating,
          year,
          type: typeSpan === 'movie' ? 'movie' : 'tvshow',
          description,
        });
      }
    });

    return NextResponse.json({
      success: true,
      data: searchResults,
      query,
      count: searchResults.length,
    });

  } catch (error) {
    console.error("Error in ZinkMovies Search API:", error);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}
