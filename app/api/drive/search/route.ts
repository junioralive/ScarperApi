import { NextRequest, NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/baseurl";
import { validateApiKey, createUnauthorizedResponse } from "@/lib/api-auth";

interface SearchResult {
  id: string;
  title: string;
  url: string;
  imageUrl: string;
  category: string[];
  imdbId: string;
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

    const baseUrl = await getBaseUrl("drive");
    const searchUrl = `${baseUrl}/searchapi.php?q=${encodeURIComponent(query)}&page=${page}`;

    const response = await fetch(searchUrl, {
      headers: {
        "Referer": `${baseUrl}/search.html?q=${encodeURIComponent(query)}`,
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch search results from Drive" },
        { status: response.status }
      );
    }

    const data = await response.json();
    const results: SearchResult[] = [];

    if (data.hits && Array.isArray(data.hits)) {
      data.hits.forEach((hit: unknown) => {
        const document = (hit as { document?: Record<string, unknown> }).document || {};
        const id = String(document.id || '');
        const title = String(document.post_title || '');
        const url = String(document.permalink || '');
        const imageUrl = String(document.post_thumbnail || '');
        const category = Array.isArray(document.category) ? document.category.map(String) : [];
        const imdbId = String(document.imdb_id || '');

        if (title && url) {
          results.push({
            id,
            title,
            url,
            imageUrl,
            category,
            imdbId,
          });
        }
      });
    }

    const pageNumber = parseInt(page) || 1;

    return NextResponse.json({
      success: true,
      data: {
        query,
        page: pageNumber,
        results,
        totalResults: results.length,
        found: typeof data.found === 'number' ? data.found : 0,
      },
    });

  } catch (error) {
    console.error("Error in Drive search API:", error);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}
