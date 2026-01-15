import { NextRequest, NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/baseurl";
import * as cheerio from "cheerio";

interface Content {
  id: string;
  title: string;
  url: string;
  imageUrl: string;
  description: string;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get("page") || "1";

    const baseUrl = await getBaseUrl("DesiReMovies");

    const fetchUrl = page !== "1" 
      ? `${baseUrl}/page/${page}/` 
      : baseUrl;

    const response = await fetch(fetchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch data from DesireMovies" },
        { status: response.status }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const movies: Content[] = [];

    $('article.mh-loop-item').each((_, element) => {
      const $article = $(element);
      
      const classes = $article.attr('class') || '';
      const postIdMatch = classes.match(/post-(\d+)/);
      const id = postIdMatch ? postIdMatch[1] : '';
      
      const $link = $article.find('h3.entry-title a');
      const url = $link.attr('href') || '';
      const title = $link.text().trim();
      
      const $img = $article.find('figure img');
      const imageUrl = $img.attr('src') || '';
      
      const description = $article.find('.mh-excerpt p').text().trim();

      if (title && url) {
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
      success: true,
      data: {
        movies,
        page: parseInt(page),
        totalItems: movies.length,
      },
    });

  } catch (error) {
    console.error("Error in DesireMovies API:", error);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}
