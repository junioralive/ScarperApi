import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { PROVIDERS } from "@/lib/providers";
import { validateApiKey, createUnauthorizedResponse } from "@/lib/api-auth";

interface SearchResult {
  title: string;
  url: string;
  imageUrl: string;
  provider: string;
  [key: string]: unknown;
}

interface ProviderResults {
  provider: string;
  results: SearchResult[];
  success: boolean;
  error?: string;
}

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

async function searchProvider(
  providerName: string,
  endpoint: string,
  query: string,
  baseUrl: string,
  apiKey?: string
): Promise<ProviderResults> {
  try {
    const searchUrl = `${baseUrl}${endpoint}?q=${encodeURIComponent(query)}`;
    
    const headers: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    };
    
    // Add API key to headers if provided
    if (apiKey) {
      headers["x-api-key"] = apiKey;
    }
    
    const response = await fetch(searchUrl, { headers });

    if (!response.ok) {
      return {
        provider: providerName,
        results: [],
        success: false,
        error: `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    
    let results: unknown[] = [];
    
    if (data.data && typeof data.data === 'object') {
      if (Array.isArray(data.data.results)) {
        results = data.data.results;
      } else if (Array.isArray(data.data)) {
        results = data.data;
      }
    } else if (Array.isArray(data.results)) {
      results = data.results;
    } else if (Array.isArray(data)) {
      results = data;
    }
    
    const normalizedResults = results.map((result: Record<string, unknown>) => ({
      ...result,
      provider: providerName,
    })) as SearchResult[];

    return {
      provider: providerName,
      results: normalizedResults,
      success: true,
    };
  } catch (error) {
    console.error(`Error searching ${providerName}:`, error);
    return {
      provider: providerName,
      results: [],
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function GET(request: NextRequest) {
  // Validate API key
  const validation = await validateApiKey(request);
  if (!validation.valid) {
    return createUnauthorizedResponse(validation.error || "Unauthorized");
  }

  // Store the API key to pass to internal requests
  const apiKeyValue = validation.keyData?.key;

  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");
    const useCache = searchParams.get("cache") !== "false";

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      );
    }

    // Generate cache key
    const cacheKey = `global-search:${query.toLowerCase()}`;

    // Check cache if enabled
    if (useCache) {
      try {
        const cachedResults = await redis.get(cacheKey);
        if (cachedResults) {
          console.log(`Cache hit for query: ${query}`);
          return NextResponse.json({
            success: true,
            cached: true,
            query,
            ...(typeof cachedResults === 'object' ? cachedResults : {}),
          });
        }
      } catch (cacheError) {
        console.error("Cache read error:", cacheError);
        // Continue without cache
      }
    }

    // Get base URL for API calls
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    console.log(`Searching across ${PROVIDERS.length} providers for: ${query}`);

    // Search all providers in parallel
    const searchPromises = PROVIDERS.map((provider) =>
      searchProvider(provider.name, provider.endpoint, query, baseUrl, apiKeyValue)
    );

    const providerResults = await Promise.all(searchPromises);

    // Aggregate all results
    const allResults: SearchResult[] = [];
    const providerSummary: { [key: string]: { count: number; success: boolean; error?: string } } = {};

    providerResults.forEach((providerResult) => {
      providerSummary[providerResult.provider] = {
        count: providerResult.results.length,
        success: providerResult.success,
        ...(providerResult.error && { error: providerResult.error }),
      };

      allResults.push(...providerResult.results);
    });

    // Prepare response
    const response = {
      totalResults: allResults.length,
      providers: providerSummary,
      results: allResults,
      resultsByProvider: providerResults.reduce((acc, pr) => {
        acc[pr.provider] = pr.results;
        return acc;
      }, {} as Record<string, SearchResult[]>),
    };

    // Cache results for 1 hour (3600 seconds)
    if (useCache) {
      try {
        await redis.set(cacheKey, response, { ex: 3600 });
        console.log(`Cached results for query: ${query}`);
      } catch (cacheError) {
        console.error("Cache write error:", cacheError);
        // Continue without caching
      }
    }

    return NextResponse.json({
      success: true,
      cached: false,
      query,
      ...response,
    });

  } catch (error) {
    console.error("Error in global search API:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
