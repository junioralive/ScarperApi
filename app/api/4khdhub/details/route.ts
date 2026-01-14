import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

interface DownloadLink {
  server: string;
  url: string;
}

interface DownloadItem {
  title: string;
  fileTitle: string;
  size: string;
  languages: string;
  quality: string;
  badges: string[];
  links: DownloadLink[];
}

interface Metadata {
  director?: string;
  stars?: string;
  release?: string;
  prints?: string;
  audios?: string;
}

interface RelatedMovie {
  title: string;
  url: string;
  imageUrl: string;
  year: string;
  season?: string;
  formats: string[];
}

interface MovieDetails {
  title: string;
  posterUrl: string;
  tagline?: string;
  categories: string[];
  synopsis: string;
  metadata: Metadata;
  trailerUrl?: string;
  downloadLinks: DownloadItem[];
  relatedMovies: RelatedMovie[];
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
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
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

    // Extract basic info
    const title = $('.page-title').text().trim();
    const posterUrl = $('.poster-image img').attr('src') || '';
    const tagline = $('.movie-tagline').text().trim() || undefined;
    const synopsis = $('.content-section p').first().text().trim();

    // Extract categories
    const categories: string[] = [];
    $('.badge-outline a').each((_, el) => {
      const category = $(el).text().trim();
      if (category) categories.push(category);
    });

    // Extract metadata
    const metadata: Metadata = {};
    $('.metadata-item').each((_, el) => {
      const label = $(el).find('.metadata-label').text().trim().replace(':', '').toLowerCase();
      const value = $(el).find('.metadata-value').text().trim();
      
      if (label && value) {
        metadata[label as keyof Metadata] = value;
      }
    });

    // Extract trailer URL
    const trailerUrl = $('#trailer-btn').attr('data-trailer-url') || undefined;

    // Extract download links
    const downloadLinks: DownloadItem[] = [];
    $('.download-item').each((_, el) => {
      const $item = $(el);
      const header = $item.find('.download-header');
      const titleText = header.find('.flex-1').contents().first().text().trim();
      
      // Extract size, languages, quality from badges in header
      const size = header.find('.badge').first().text().trim();
      const languages = header.find('.badge').eq(1).text().trim();
      const quality = header.find('.badge').eq(2).text().trim();

      // Get file title
      const fileTitle = $item.find('.file-title').text().trim();

      // Get badges from content section
      const badges: string[] = [];
      $item.find('.flex.flex-wrap .badge').each((_, badgeEl) => {
        badges.push($(badgeEl).text().trim());
      });

      // Get download links
      const links: DownloadLink[] = [];
      $item.find('.grid.grid-cols-2 a').each((_, linkEl) => {
        const server = $(linkEl).find('span').first().text().trim().replace('Download ', '').replace(/\s+/g, ' ');
        const href = $(linkEl).attr('href') || '';
        
        if (href && server) {
          links.push({
            server,
            url: href,
          });
        }
      });

      if (titleText && links.length > 0) {
        downloadLinks.push({
          title: titleText,
          fileTitle,
          size,
          languages,
          quality,
          badges,
          links,
        });
      }
    });

    // Extract related movies
    const relatedMovies: RelatedMovie[] = [];
    $('.card-grid-small .movie-card').each((_, el) => {
      const $card = $(el);
      const relUrl = $card.attr('href') || '';
      const relTitle = $card.find('.movie-card-title').text().trim();
      const imageUrl = $card.find('.movie-card-image img').attr('src') || '';
      const meta = $card.find('.movie-card-meta').text().trim();
      
      const metaParts = meta.split('•').map(s => s.trim());
      const year = metaParts[0] || '';
      const season = metaParts[1] || undefined;

      const formats: string[] = [];
      $card.find('.movie-card-format').each((_, formatEl) => {
        formats.push($(formatEl).text().trim());
      });

      if (relTitle && relUrl) {
        relatedMovies.push({
          title: relTitle,
          url: relUrl,
          imageUrl,
          year,
          season,
          formats,
        });
      }
    });

    const details: MovieDetails = {
      title,
      posterUrl,
      tagline,
      categories,
      synopsis,
      metadata,
      trailerUrl,
      downloadLinks,
      relatedMovies,
    };

    return NextResponse.json({
      success: true,
      data: details,
    });

  } catch (error) {
    console.error("Error in 4kHDHub details API:", error);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}
