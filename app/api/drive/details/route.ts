import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import axios from "axios";

interface DownloadLink {
  title: string;
  url: string;
}

interface MovieDetails {
  title: string;
  imdbRating: string;
  language: string;
  year: string;
  episodeSize: string;
  completeZip: string;
  quality: string;
  format: string;
  storyline: string;
  screenshots: string[];
  downloadLinks: {
    "480p": DownloadLink[];
    "720p": DownloadLink[];
    "1080p": DownloadLink[];
    "4K": DownloadLink[];
  };
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

    const title = $(".post-title").text().trim();

    const seriesInfo = $(".page-body p").text();
    const imdbRating = seriesInfo.match(/IMDb Rating:-\s*([^\n]+)/)?.[1]?.trim() || "";
    const language = seriesInfo.match(/Language:\s*\[([^\]]+)\]/)?.[1]?.trim() || "";
    const year = seriesInfo.match(/Released Year:\s*(\d{4})/)?.[1]?.trim() || "";
    const episodeSize = seriesInfo.match(/Episode Size:\s*([^\n]+)/)?.[1]?.trim() || "";
    const completeZip = seriesInfo.match(/Complete Zip:\s*([^\n]+)/)?.[1]?.trim() || "";
    const quality = seriesInfo.match(/Quality:\s*([^\n]+)/)?.[1]?.trim() || "";
    const format = seriesInfo.match(/Format:\s*([^\n]+)/)?.[1]?.trim() || "";

    const storylineMatch = $(".page-body h5").filter((_, el) => 
      $(el).text().includes("Storyline")
    ).next();
    const storyline = storylineMatch.text().trim();

    const screenshots: string[] = [];
    $(".page-body img[src*='catimages']").each((_, el) => {
      const src = $(el).attr("src");
      if (src) screenshots.push(src);
    });

    const downloadLinks: MovieDetails["downloadLinks"] = {
      "480p": [],
      "720p": [],
      "1080p": [],
      "4K": []
    };

    $(".page-body h5").each((_, el) => {
      const $el = $(el);
      const text = $el.text();
      const link = $el.find("a").attr("href");

      if (link && text) {
        if (text.includes("480p")) {
          downloadLinks["480p"].push({ title: text.trim(), url: link });
        } else if (text.includes("720p")) {
          downloadLinks["720p"].push({ title: text.trim(), url: link });
        } else if (text.includes("1080p")) {
          downloadLinks["1080p"].push({ title: text.trim(), url: link });
        } else if (text.includes("4K") || text.includes("2160p")) {
          downloadLinks["4K"].push({ title: text.trim(), url: link });
        }
      }
    });

    const details: MovieDetails = {
      title,
      imdbRating,
      language,
      year,
      episodeSize,
      completeZip,
      quality,
      format,
      storyline,
      screenshots,
      downloadLinks,
    };

    return NextResponse.json({
      success: true,
      url,
      data: details,
    });
  } catch (error) {
    console.error("Error fetching movie details:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch details",
      },
      { status: 500 }
    );
  }
}
