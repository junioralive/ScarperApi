import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { getBaseUrl } from "@/lib/baseurl";
import { validateApiKey, createUnauthorizedResponse } from "@/lib/api-auth";

interface Movie {
  id: string;
  title: string;
  url: string;
  imageUrl: string;
  description: string;
}

interface SearchResponse {
  query: string;
  results: Movie[];
}

export async function GET(req: NextRequest) {
  const validation = await validateApiKey(req);
  if (!validation.valid) {
    return createUnauthorizedResponse(validation.error || "Unauthorized");
  }

  try {
    const searchParams = req.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      );
    }

    const baseUrl = await getBaseUrl("DesiReMovies");
    const url = `${baseUrl}/?s=${encodeURIComponent(query)}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "cookie": "xla=s4t",
        "priority": "u=0, i",
        "referer": "https://desiremovies.gripe/kalamkaval-2025-web-hdrip/",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch: ${response.statusText}` },
        { status: response.status }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const movies: Movie[] = [];

    $("#main-content article.mh-loop-item").each((_, element) => {
      const $article = $(element);
      
      const classes = $article.attr("class") || "";
      const postIdMatch = classes.match(/post-(\d+)/);
      const id = postIdMatch ? postIdMatch[1] : "";

      const $link = $article.find("h3.entry-title.mh-loop-title a");
      const title = $link.text().trim();
      const url = $link.attr("href") || "";

      const $img = $article.find("figure.mh-loop-thumb img");
      const imageUrl = $img.attr("src") || "";

      const $excerpt = $article.find(".mh-loop-excerpt .mh-excerpt p");
      const description = $excerpt
        .clone()
        .children()
        .remove()
        .end()
        .text()
        .trim();

      if (id && title && url) {
        movies.push({
          id,
          title,
          url,
          imageUrl,
          description,
        });
      }
    });

    return NextResponse.json({
      query,
      results: movies,
    } as SearchResponse);
  } catch (error) {
    console.error("Error in desiremovies search:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
