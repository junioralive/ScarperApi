import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";
import { getBaseUrl } from "@/lib/baseurl";

interface Movie {
  title: string;
  url: string;
  imageUrl: string;
  date: string;
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const page = searchParams.get("page") || "1";
    const searchQuery = searchParams.get("s");

    const baseUrl = await getBaseUrl("Vega");
    
    let url: string;
    if (searchQuery) {
      const encodedQuery = searchQuery.replace(/\s+/g, "+");
      url = `${baseUrl}/?s=${encodedQuery}`;
    } else {
      url = page === "1" ? baseUrl : `${baseUrl}/page/${page}/`;
    }

    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    const $ = cheerio.load(response.data);
    const movies: Movie[] = [];

    $("#archive-container .entry-list-item").each((_, element) => {
      const title = $(element).find("h2.entry-title a").text().trim();
      const url = $(element).find("h2.entry-title a").attr("href") || "";
      const imageUrl = $(element).find("img").attr("src") || "";
      const date =
        $(element).find("time.entry-date.published").attr("datetime") || "";

      if (title && url) {
        movies.push({
          title,
          url,
          imageUrl,
          date,
        });
      }
    });

    return NextResponse.json({
      success: true,
      page: parseInt(page),
      count: movies.length,
      data: movies,
    });
  } catch (error) {
    console.error("Error fetching vegamovies:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch data",
      },
      { status: 500 }
    );
  }
}
