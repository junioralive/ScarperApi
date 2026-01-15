import { NextRequest, NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/baseurl";
import * as cheerio from "cheerio";
import { validateApiKey, createUnauthorizedResponse } from "@/lib/api-auth";

interface SearchResult {
  id: string;
  title: string;
  url: string;
  imageUrl: string;
  videoLabel: string;
}

export async function GET(request: NextRequest) {
  const validation = await validateApiKey(request);
  if (!validation.valid) {
    return createUnauthorizedResponse(validation.error || "Unauthorized");
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || searchParams.get("s");
    const page = searchParams.get("page") || "1";

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      );
    }

    const baseUrl = await getBaseUrl("movies4u");
    const searchUrl = `${baseUrl}?s=${encodeURIComponent(query)}&paged=${page}`;

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch search results from Movies4u" },
        { status: response.status }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const results: SearchResult[] = [];
    
    $('article.post, article[class*="post-"]').each((_, element) => {
      const $article = $(element);
      
      const id = $article.attr('id')?.replace('post-', '') || '';
      const $link = $article.find('a.entry-image-link, a[rel="bookmark"]').first();
      const url = $link.attr('href') || '';
      const title = $article.find('.entry-title, h2.title').text().trim();
      
      const imageUrl = $article.find('img').attr('src') || 
                       $article.find('img').attr('data-src') || '';
      
      const videoLabel = $article.find('.video-label, .quality').text().trim();

      if (title && url) {
        results.push({
          id,
          title,
          url,
          imageUrl,
          videoLabel,
        });
      }
    });

    return NextResponse.json({
      success: true,
      data: results,
      searchQuery: query,
      pagination: {
        currentPage: page,
      },
    });

  } catch (error) {
    console.error("Error in Movies4u search API:", error);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}
