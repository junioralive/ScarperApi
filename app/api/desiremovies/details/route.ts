import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

interface DownloadLink {
  quality: string;
  size: string;
  url: string;
}

interface MovieDetails {
  title: string;
  imageUrl: string;
  screenshots: string[];
  downloadLinks: DownloadLink[];
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
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch movie details" },
        { status: response.status }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const title = $('h1.entry-title').text().trim() || 
                  $('meta[property="og:title"]').attr('content') || '';
    
    const imageUrl = $('.entry-content img').first().attr('src') || 
                     $('meta[property="og:image"]').attr('content') || '';

    const screenshots: string[] = [];
    $('.entry-content p a img').each((_, element) => {
      const src = $(element).attr('src');
      if (src) {
        screenshots.push(src);
      }
    });



    const downloadLinks: DownloadLink[] = [];
    
    $('.entry-content p').each((_, element) => {
      const $p = $(element);
      const text = $p.text().trim();
      
      const qualityMatch = text.match(/(2160p|1080p|720p|480p|4K)[^[]*\[([^\]]+)\]/i);
      
      if (qualityMatch) {
        const quality = qualityMatch[0].replace(/\[.*?\]/, '').trim();
        const size = qualityMatch[2];
        
        const $nextP = $p.next('p');
        const $link = $nextP.find('a');
        const linkUrl = $link.attr('href');
        
        if (linkUrl && linkUrl.startsWith('http')) {
          downloadLinks.push({
            quality,
            size,
            url: linkUrl,
          });
        }
      }
    });

    const movieDetails: MovieDetails = {
      title,
      imageUrl,
      screenshots,
      downloadLinks,
    };

    return NextResponse.json({
      success: true,
      data: movieDetails,
    });

  } catch (error) {
    console.error("Error in DesireMovies Details API:", error);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}
