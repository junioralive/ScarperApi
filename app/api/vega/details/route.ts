import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";

interface DownloadLink {
  season: string;
  episodeInfo: string;
  language: string;
  quality: string;
  url: string;
}

interface MovieDetails {
  title: string;
  imdbRating: string;
  season: string;
  episode: string;
  language: string;
  subtitle: string;
  releasedYear: string;
  episodeSize: string;
  quality: string;
  format: string;
  synopsis: string;
  screenshots: string[];
  downloadLinks: DownloadLink[];
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
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
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    const $ = cheerio.load(response.data);

    const title = $("h1.entry-title").text().trim();

    const seriesInfoText = $(".entry-content").text();

    const imdbRating =
      $('a[href*="imdb.com"]').text().replace("👉 IMDb Rating:-", "").trim() ||
      "N/A";

    const extractInfo = (label: string): string => {
      const regex = new RegExp(`${label}:\\s*([^\\n]+)`, "i");
      const match = seriesInfoText.match(regex);
      return match ? match[1].trim() : "N/A";
    };

    const season = extractInfo("Season");
    const episode = extractInfo("Episode");
    const language = extractInfo("Language");
    const subtitle = extractInfo("Subtitle");
    const releasedYear = extractInfo("Released Year");
    const episodeSize = extractInfo("Episode Size");
    const quality = extractInfo("Quality");
    const format = extractInfo("Format");

    const synopsisMatch = seriesInfoText.match(
      /Series-SYNOPSIS\/PLOT:([\s\S]*?)Screenshots:/i
    );
    const synopsis = synopsisMatch
      ? synopsisMatch[1].trim().replace(/\s+/g, " ")
      : "N/A";

    const screenshots: string[] = [];
    $(".entry-content img").each((_, element) => {
      const src = $(element).attr("src");
      if (src && src.includes("imgbb")) {
        screenshots.push(src);
      }
    });

    const downloadLinks: DownloadLink[] = [];
    
    $(".entry-content h3").each((_, element) => {
      const heading = $(element).text();
      
      const seasonMatch = heading.match(/Season\s+(\d+)/i);
      const episodeMatch = heading.match(/\[(S\d+E\d+[^\]]+)\]/i);
      const languageMatch = heading.match(/\{([^}]+)\}/);
      const qualityMatch = heading.match(/(\d+p[^⚡]+?)(?=⚡|$)/);
      
      if (qualityMatch) {
        const link = $(element).next("p").find("a").attr("href");
        if (link) {
          downloadLinks.push({
            season: seasonMatch ? `Season ${seasonMatch[1]}` : "N/A",
            episodeInfo: episodeMatch ? episodeMatch[1] : "N/A",
            language: languageMatch ? languageMatch[1] : "N/A",
            quality: qualityMatch[1].trim(),
            url: link,
          });
        }
      }
    });

    $(".entry-content h5").each((_, element) => {
      const heading = $(element).text();
      
      const languageMatch = heading.match(/\{([^}]+)\}/);
      const qualityMatch = heading.match(/(\d+p[^\[]+\[[^\]]+\])/);
      
      if (qualityMatch) {
        const link = $(element).next("p").find("a").attr("href");
        if (link) {
          downloadLinks.push({
            season: "N/A",
            episodeInfo: "Full Movie",
            language: languageMatch ? languageMatch[1] : "N/A",
            quality: qualityMatch[1].trim(),
            url: link,
          });
        }
      }
    });

    const details: MovieDetails = {
      title,
      imdbRating,
      season,
      episode,
      language,
      subtitle,
      releasedYear,
      episodeSize,
      quality,
      format,
      synopsis,
      screenshots,
      downloadLinks,
    };

    return NextResponse.json({
      success: true,
      data: details,
    });
  } catch (error) {
    console.error("Error fetching vega details:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch data",
      },
      { status: 500 }
    );
  }
}
