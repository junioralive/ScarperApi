import { NextRequest, NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/baseurl";
import * as cheerio from "cheerio";

interface Movie {
  title: string;
  url: string;
  imageUrl: string;
  year: string;
  season?: string;
  formats: string[];
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get("page") || "1";

    const baseUrl = await getBaseUrl("4kHDHub");
    const fetchUrl = page === "1" ? baseUrl : `${baseUrl}/page/${page}/`;

    const response = await fetch(fetchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch data from 4kHDHub" },
        { status: response.status }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const movies: Movie[] = [];

    $('.movie-card').each((_, element) => {
      const $card = $(element);
      const url = $card.attr('href') || '';
      const title = $card.find('.movie-card-title').text().trim();
      const imageUrl = $card.find('.movie-card-image img').attr('src') || '';
      const meta = $card.find('.movie-card-meta').text().trim();
      
      // Parse year and season info from meta
      const metaParts = meta.split('•').map(s => s.trim());
      const year = metaParts[0] || '';
      const season = metaParts[1] || undefined;

      // Get all formats
      const formats: string[] = [];
      $card.find('.movie-card-format').each((_, formatEl) => {
        const format = $(formatEl).text().trim();
        if (format) {
          formats.push(format);
        }
      });

      if (title && url) {
        movies.push({
          title,
          url: url.startsWith('http') ? url : `${baseUrl}${url}`,
          imageUrl,
          year,
          season,
          formats,
        });
      }
    });

    return NextResponse.json({
      success: true,
      data: movies,
      pagination: {
        currentPage: page,
      },
      baseUrl,
    });

  } catch (error) {
    console.error("Error in 4kHDHub API:", error);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}
