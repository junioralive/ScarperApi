import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

interface DownloadLink {
  url: string;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { error: "URL parameter is required" },
        { status: 400 }
      );
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Referer": "https://desiremovies.gripe/",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch download links" },
        { status: response.status }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const downloadLinks: DownloadLink[] = [];

    $('#content_for_display a.link').each((_, element) => {
      const linkUrl = $(element).attr('href') || '';
      
      if (linkUrl && linkUrl.startsWith('http')) {
        downloadLinks.push({
          url: linkUrl,
        });
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        links: downloadLinks,
        totalLinks: downloadLinks.length,
      },
    });

  } catch (error) {
    console.error("Error in Gyaniguru extractor API:", error);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}
