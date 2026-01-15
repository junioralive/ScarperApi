import { NextRequest, NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/baseurl";
import * as cheerio from "cheerio";
import { validateApiKey, createUnauthorizedResponse } from "@/lib/api-auth";

interface SearchResult {
  title: string;
  url: string;
  imageUrl: string;
  date: string;
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

    const baseUrl = await getBaseUrl("Vega");
    const encodedQuery = query.replace(/\s+/g, "+");
    const searchUrl = `${baseUrl}/?s=${encodedQuery}`;

    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch search results from Vega" },
        { status: response.status }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const results: SearchResult[] = [];

    $("#archive-container .entry-list-item").each((_, element) => {
      const $item = $(element);
      
      const title = $item.find("h2.entry-title a").text().trim();
      const url = $item.find("h2.entry-title a").attr("href") || "";
      const imageUrl = $item.find("img").attr("src") || 
                       $item.find("img").attr("data-src") || "";
      const date = $item.find("time.entry-date.published").attr("datetime") || "";

      if (title && url) {
        results.push({
          title,
          url,
          imageUrl,
          date,
        });
      }
    });

    return NextResponse.json({
      success: true,
      data: results,
      searchQuery: query,
      resultsCount: results.length,
    });

  } catch (error) {
    console.error("Error in Vega search API:", error);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}
