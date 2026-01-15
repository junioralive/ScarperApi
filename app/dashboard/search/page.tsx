"use client";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchIcon, Loader2Icon, ImageIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

type SearchResult = {
  title: string;
  url: string;
  imageUrl?: string;
  provider: string;
  [key: string]: string | number | undefined;
};

type ProviderResults = {
  provider: string;
  results: SearchResult[];
  success: boolean;
  error?: string;
};

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<ProviderResults[]>([]);
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [isLoadingKey, setIsLoadingKey] = useState(true);

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    try {
      const response = await fetch("/api/keys");
      if (response.ok) {
        const keys = await response.json();
        setHasApiKey(keys.length > 0);
        if (keys.length === 0) {
          toast.error("Please create an API key first in the APIs page");
        }
      }
    } catch (error) {
      console.error("Error checking API key:", error);
    } finally {
      setIsLoadingKey(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error("Please enter a search query");
      return;
    }

    if (!hasApiKey) {
      toast.error("API key not found. Please create one in the APIs page");
      return;
    }

    setIsSearching(true);
    setResults([]);

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}`
      );

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || "Search failed");
        return;
      }

      const data = await response.json();
      
      if (data.success && data.providers && data.resultsByProvider) {
        // Transform the API response to match our expected format
        const transformedResults: ProviderResults[] = Object.entries(data.providers).map(
          ([providerName, providerData]: [string, any]) => ({
            provider: providerName,
            results: data.resultsByProvider[providerName] || [],
            success: providerData.success,
            error: providerData.error,
          })
        );
        
        setResults(transformedResults);
        const totalResults = data.totalResults || 0;
        const successfulProviders = transformedResults.filter(p => p.success).length;
        toast.success(`Found ${totalResults} results across ${successfulProviders} providers`);
      } else {
        toast.error("No results found");
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Failed to perform search");
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  if (isLoadingKey) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Search</h1>
        <p className="text-muted-foreground mt-2">
          Search across all available APIs and scrapers
        </p>
      </div>

      <Card className="p-6">
        <div className="flex gap-2">
          <Input
            placeholder="Search for movies, shows, or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
            disabled={isSearching || !hasApiKey}
          />
          <Button
            onClick={handleSearch}
            disabled={isSearching || !hasApiKey}
          >
            {isSearching ? (
              <>
                <Loader2Icon className="mr-2 size-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <SearchIcon className="mr-2 size-4" />
                Search
              </>
            )}
          </Button>
        </div>
        {!hasApiKey && (
          <p className="text-sm text-destructive mt-2">
            ⚠️ API key not found. Please create one in the APIs page.
          </p>
        )}
      </Card>

      {results.length > 0 && (
        <div className="space-y-6">
          {results.map((providerResult) => (
            <div key={providerResult.provider} className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">
                    {providerResult.provider}
                  </h2>
                  <Badge variant={providerResult.success ? "outline" : "destructive"}>
                    {providerResult.success
                      ? `${providerResult.results.length} results`
                      : "Failed"}
                  </Badge>
                </div>
              </div>

              {providerResult.success && providerResult.results.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {providerResult.results.map((result, idx) => (
                    <Card
                      key={`${providerResult.provider}-${idx}`}
                      className="aspect-[2/3] relative overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group bg-muted"
                      onClick={() => window.open(result.url, "_blank")}
                    >
                      {result.imageUrl ? (
                        <img
                          src={result.imageUrl}
                          alt={result.title}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <ImageIcon className="size-12 text-muted-foreground" />
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              ) : providerResult.error ? (
                <Card className="p-6">
                  <p className="text-sm text-muted-foreground">
                    Error: {providerResult.error}
                  </p>
                </Card>
              ) : (
                <Card className="p-6">
                  <p className="text-sm text-muted-foreground">
                    No results found from this provider
                  </p>
                </Card>
              )}
            </div>
          ))}
        </div>
      )}

      {!isSearching && results.length === 0 && searchQuery && (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <div className="rounded-full bg-muted p-4 w-fit mx-auto">
              <SearchIcon className="size-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">No results yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Click search to find content across all providers
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
