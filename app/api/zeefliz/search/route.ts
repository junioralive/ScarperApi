import { NextRequest, NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/baseurl";
import * as cheerio from "cheerio";
import { validateApiKey, createUnauthorizedResponse } from "@/lib/api-auth";

interface SearchResult {
  id: string;
  title: string;
  url: string;
  imageUrl: string;
}

export async function GET(request: NextRequest) {
  const validation = await validateApiKey(request);
  if (!validation.valid) {
    return createUnauthorizedResponse(validation.error || "Unauthorized");
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");
    const page = searchParams.get("page") || "1";

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      );
    }

    const baseUrl = await getBaseUrl("zeefliz");
    const fetchUrl = page === "1" 
      ? `${baseUrl}/?s=${encodeURIComponent(query)}`
      : `${baseUrl}/page/${page}/?s=${encodeURIComponent(query)}`;

    const response = await fetch(fetchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch search results from Zeefliz" },
        { status: response.status }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const searchQuery = $('.section-title span').text().trim() || query;

    const results: SearchResult[] = [];

    $('article.post').each((_, element) => {
      const $article = $(element);
      const id = $article.attr('id')?.replace('post-', '') || '';
      const $link = $article.find('a.post-thumbnail').first();
      const url = $link.attr('href') || '';
      const imageUrl = $article.find('img').attr('src') || 
                       $article.find('img').attr('bv-data-src') || '';
      const title = $article.find('h3.entry-title a').text().trim();

      if (title && url) {
        results.push({
          id,
          title,
          url,
          imageUrl,
        });
      }
    });

    let hasNextPage = false;
    let nextPage = null;
    let hasPrevPage = false;
    let prevPage = null;
    let totalPages = 1;

    const nextLink = $('.navigation.pagination .next.page-numbers').attr('href');
    if (nextLink) {
      hasNextPage = true;
      const pageMatch = nextLink.match(/\/page\/(\d+)\//);
      nextPage = pageMatch ? pageMatch[1] : (parseInt(page) + 1).toString();
    }

    const currentPageNum = parseInt(page);
    if (currentPageNum > 1) {
      hasPrevPage = true;
      prevPage = (currentPageNum - 1).toString();
    }

    const lastPageLink = $('.navigation.pagination a.page-numbers:not(.next):not(.prev)').last();
    const lastPageText = lastPageLink.text().trim();
    if (lastPageText && !isNaN(parseInt(lastPageText))) {
      totalPages = parseInt(lastPageText);
    }

    return NextResponse.json({
      success: true,
      data: results,
      searchQuery,
      pagination: {
        currentPage: page,
        totalPages,
        hasNextPage,
        nextPage,
        hasPrevPage,
        prevPage,
      },
    });

  } catch (error) {
    console.error("Error in Zeefliz search API:", error);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}
