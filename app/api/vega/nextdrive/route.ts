import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";

interface DownloadLink {
  label: string;
  url: string;
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

    const title = $("h1.post-title").text().trim();

    const vcloudLinks: DownloadLink[] = [];

    $(".entry a").each((_, element) => {
      const href = $(element).attr("href");
      const buttonText = $(element).find("button").text().trim();

      if (href && href.includes("vcloud")) {
        vcloudLinks.push({
          label: buttonText || "V-Cloud Link",
          url: href,
        });
      }
    });

    return NextResponse.json({
      success: true,
      title,
      vcloudLinks,
    });
  } catch (error) {
    console.error("Error fetching nextdrive links:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch data",
      },
      { status: 500 }
    );
  }
}
