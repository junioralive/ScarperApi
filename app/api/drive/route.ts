import { NextRequest, NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/baseurl";
import * as cheerio from "cheerio";
import axios from "axios";

interface MovieCard {
  title: string;
  url: string;
  imageUrl: string;
  quality: string;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const searchQuery = searchParams.get("s");

    const baseUrl = await getBaseUrl("drive");

    let url: string;
    if (searchQuery) {
      const encodedQuery = searchQuery.replace(/\s+/g, "+");
      url = `${baseUrl}search.html?q=${encodedQuery}`;
    } else {
      url = page === 1 ? baseUrl : `${baseUrl}page/${page}/`;
    }

    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        ...(searchQuery && {
          Cookie: "_gid=GA1.2.1940160670.1768385387; _ga=GA1.1.968681502.1767881093; _ga_YLNESKK47K=GS2.1.s1768385387$o3$g1$t1768388135$j56$l0$h0"
        }),
      },
    });

    const html = response.data;

    const $ = cheerio.load(html);

    const movies: MovieCard[] = [];

    const selector = searchQuery ? "#results-grid .poster-card" : "#moviesGridMain .poster-card";

    $(selector).each((_, element) => {
      const $card = $(element);
      const $link = $card.parent("a");
      const $img = $card.find(".poster-image img");
      const $title = $card.find(".poster-title");
      const $quality = $card.find(".poster-quality");

      const movie: MovieCard = {
        title: $title.text().trim(),
        url: $link.attr("href") || "",
        imageUrl: $img.attr("src") || "",
        quality: $quality.text().trim(),
      };

      if (movie.url && movie.title) {
        movies.push(movie);
      }
    });

    return NextResponse.json({
      success: true,
      baseUrl,
      page,
      url,
      totalMovies: movies.length,
      movies,
    });
  } catch (error) {
    console.error("Error fetching movies from drive:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch movies",
      },
      { status: 500 }
    );
  }
}
