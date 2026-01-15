import { NextRequest, NextResponse } from "next/server";
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
    const query = searchParams.get("q") || searchParams.get("s");
    const page = searchParams.get("page") || "1";

    if (!query) {
      return NextResponse.json(
        { error: "Search query parameter (q or s) is required" },
        { status: 400 }
      );
    }

    // Format query: replace spaces with +
    const formattedQuery = query.replace(/\s+/g, '+');
    const searchUrl = `https://search.pingora.fyi/collections/post/documents/search?q=${formattedQuery}&query_by=post_title&page=${page}`;

    const response = await fetch(searchUrl, {
      headers: {
        "Origin": "https://new2.hdhub4u.fo",
        "Referer": "https://new2.hdhub4u.fo/",
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Priority": "u=1, i",
        "Sec-CH-UA": '"Brave";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
        "Sec-CH-UA-Mobile": "?0",
        "Sec-CH-UA-Platform": '"Linux"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "cross-site",
        "Sec-GPC": "1",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to search on HDHub4u" },
        { status: response.status }
      );
    }

    const data = await response.json();

    const searchResults: SearchResult[] = [];

    // Parse JSON response
    if (data.hits && Array.isArray(data.hits)) {
      data.hits.forEach((hit: unknown) => {
        const document = (hit as { document?: Record<string, unknown> }).document || {};
        const id = String(document.id || '');
        const title = String(document.post_title || '');
        const url = String(document.permalink || '');
        const imageUrl = String(document.post_thumbnail || '');

        if (title && url) {
          searchResults.push({
            id,
            title,
            url,
            imageUrl,
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
        results: searchResults,
        totalResults: searchResults.length,
        found: typeof data.found === 'number' ? data.found : 0,
      },
    });

  } catch (error) {
    console.error("Error in HDHub4u Search API:", error);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}
