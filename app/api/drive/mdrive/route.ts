import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import axios from "axios";

interface Episode {
  episode: string;
  size: string;
  hubCloudUrl: string;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { success: false, error: "URL parameter is required" },
        { status: 400 }
      );
    }

    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const title = $(".entry-title").text().trim();
    const episodes: Episode[] = [];

    $(".entry-content h5").each((index, element) => {
      const $el = $(element);
      const text = $el.text();

      if (text.match(/Ep\d+.*\d+.*MB/)) {
        const epMatch = text.match(/Ep(\d+)/);
        const sizeMatch = text.match(/\[([\d.]+\s*MB)\]/);
        
        const episode = epMatch ? `Ep${epMatch[1]}` : "";
        const size = sizeMatch ? sizeMatch[1] : "";

        const $nextH5 = $el.next("h5");
        const hubCloudLink = $nextH5.find("a[href*='hubcloud']").attr("href");

        if (episode && hubCloudLink) {
          episodes.push({
            episode,
            size,
            hubCloudUrl: hubCloudLink,
          });
        }
      }
    });

    if (episodes.length === 0) {
      $(".entry-content a[href*='hubcloud']").each((_, element) => {
        const href = $(element).attr("href");
        const $container = $(element).closest("h4, h5, p");
        const containerText = $container.text();
        const sizeMatch = containerText.match(/\[([\d.]+\s*[GM]B)\]/i);
        
        if (href) {
          episodes.push({
            episode: "Full Movie",
            size: sizeMatch ? sizeMatch[1] : "",
            hubCloudUrl: href,
          });
        }
      });
    }

    return NextResponse.json({
      success: true,
      url,
      title,
      totalEpisodes: episodes.length,
      episodes,
    });
  } catch (error) {
    console.error("Error fetching HubCloud links:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch links",
      },
      { status: 500 }
    );
  }
}
