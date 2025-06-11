"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Search, X, Key } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import Image from "next/image";

import { Card, CardContent } from "@/components/ui/card";

const categories = [
  { id: "all", name: "All", url: "" },
  { id: "hindi", name: "Hindi", url: "/category/language/hindi/" },
  { id: "english", name: "English", url: "/category/language/english/" },
  { id: "tamil", name: "Tamil", url: "/category/language/tamil/" },
  { id: "crunchyroll", name: "Crunchyroll", url: "/category/network/crunchyroll/" },
  { id: "disney", name: "Disney", url: "/category/network/disney/" }
];

function Navbar({ searchQuery, onSearchChange, selectedCategory, onCategoryChange }) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <div className="flex flex-1 items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <Select value={selectedCategory} onValueChange={onCategoryChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex-1 max-w-sm md:max-w-md lg:max-w-lg">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search anime..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 pr-10 w-full"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

// Add debounce hook for search
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

function AnimeGrid({ posts, searchQuery, isSearching }) {
  // Filter posts based on search query
  const filteredPosts = posts.filter((post) =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isSearching) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
        <p className="text-lg font-medium mb-2">Searching...</p>
        <p className="text-muted-foreground">Finding anime for you</p>
      </div>
    );
  }

  if (searchQuery && filteredPosts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <Search className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium mb-2">No anime found</p>
        <p className="text-muted-foreground">Try searching with different keywords</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-5 lg:gap-6 mt-2">
      {filteredPosts.map((post, index) => {
        // Detect if this is a movie or series based on URL
        const isMovie = post.postUrl.includes('/movie/');
        // Extract the ID from the URL for our internal routing
        const urlParts = post.postUrl.split('/');
        // The ID is the second-to-last part in the URL
        const id = urlParts[urlParts.length - 2] || '';
        // Generate the appropriate route based on content type
        const linkUrl = `/dashboard/anime/${id}`;

        return (
          <a
            key={index}
            href={linkUrl}
            className="transition-transform hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-primary rounded-lg overflow-hidden"
          >
            <div className="overflow-hidden flex flex-col">
              <div className="aspect-[2/3] relative rounded-lg overflow-hidden">
                <Image
                  src={post.imageUrl}
                  alt={post.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 33vw, (max-width: 768px) 33vw, 25vw"
                  quality={80}
                />
                {isMovie && (
                  <div className="absolute top-2 left-2">
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      Movie
                    </span>
                  </div>
                )}
              </div>
              <h3 className="text-center font-medium mt-1 sm:mt-2 text-[10px] sm:text-xs md:text-sm line-clamp-1 sm:line-clamp-2">
                {post.title}
              </h3>
            </div>
          </a>
        );
      })}
    </div>
  );
}

export default function AnimeDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [anime, setAnime] = useState([]);
  const [allAnime, setAllAnime] = useState([]); // Store original data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [userApiKey, setUserApiKey] = useState<string | null>(null);

  // Debounce search query to avoid too many API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Fetch user's API key
  const fetchUserApiKey = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/api-keys?userId=${user.uid}`);
      const data = await response.json();

      if (data.success && data.apiKeys && data.apiKeys.length > 0) {
        // Get the first active API key
        const activeKey = data.apiKeys.find((key: any) => key.isActive);
        if (activeKey) {
          setUserApiKey(activeKey.keyValue);
        } else {
          setError('No active API key found. Please create an API key first.');
        }
      } else {
        setError('No API keys found. Please create an API key first.');
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
      setError('Failed to fetch API keys');
    }
  };

  // Update fetchAnime to handle categories
  const fetchAnime = useCallback(async (category = "all", search = "") => {
    if (!userApiKey) {
      setError('API key not available. Please create an API key first.');
      return;
    }

    try {
      setLoading(true);
      // Build query parameters
      const params = new URLSearchParams();
      if (search.trim()) {
        params.append('search', search.trim());
      }
      if (category !== "all") {
        params.append('category', category);
      }

      const queryString = params.toString();
      const url = `/api/posts${queryString ? `?${queryString}` : ''}`;
      
      const res = await fetch(url, {
        headers: {
          'x-api-key': userApiKey // Use user's API key from database
        }
      });
      const data = await res.json();
      
      if (data.success) {
        setAnime(data.posts);
        if (!search.trim()) {
          setAllAnime(data.posts); // Only update all anime when not searching
        }
      } else {
        if (res.status === 401) {
          setError("API key required. Please create an API key in the API Keys section.");
        } else {
          setError("Failed to fetch anime data");
        }
      }
    } catch (err) {
      setError("An error occurred while fetching anime data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [userApiKey]);

  // Fetch initial anime data
  useEffect(() => {
    if (user) {
      fetchUserApiKey();
    }
  }, [user]);

  // Fetch anime when API key is available
  useEffect(() => {
    if (user && userApiKey) {
      fetchAnime(selectedCategory);
    }
  }, [user, selectedCategory, fetchAnime, userApiKey]);

  // Handle search functionality
  const performSearch = useCallback(async (query) => {
    if (!query.trim()) {
      // If search is empty, fetch category data
      fetchAnime(selectedCategory);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      // Always search via API when there's a query
      const params = new URLSearchParams();
      params.append('search', query.trim());
      if (selectedCategory !== "all") {
        params.append('category', selectedCategory);
      }

      const res = await fetch(`/api/posts?${params.toString()}`, {
        headers: {
          'x-api-key': userApiKey || 'ak_33ec1317f28b9126487af7639c7aab16e813d4064972829d'
        }
      });
      const data = await res.json();
      
      if (data.success) {
        setAnime(data.posts);
      } else {
        if (res.status === 401) {
          setError('API key required. Please create an API key in the API Keys section.');
        } else {
          setAnime([]);
        }
      }
    } catch (err) {
      console.error("Search error:", err);
      setAnime([]);
    } finally {
      setIsSearching(false);
    }
  }, [selectedCategory, fetchAnime, userApiKey]);

  // Update category change handler
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setSearchQuery(""); // Clear search when changing category
  };

  // Effect for debounced search
  useEffect(() => {
    if (allAnime.length > 0) {
      performSearch(debouncedSearchQuery);
    }
  }, [debouncedSearchQuery, performSearch, allAnime.length]);

  if (authLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!userApiKey && !loading && !error) {
    return (
      <div className="flex flex-col min-h-screen">
        <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Key className="w-20 h-20 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">API Key Required</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  You need to create an API key first to access anime data.
                </p>
                <Button asChild>
                  <a href="/dashboard/api-keys">
                    <Key className="w-4 h-4 mr-2" />
                    Create API Key
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={handleCategoryChange}
      />
      <div className="flex flex-1 flex-col gap-4 p-2 pt-2">
        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-5 lg:gap-6 mt-2">
            {Array(12).fill(0).map((_, i) => (
              <div key={i} className="flex flex-col">
                <div className="aspect-[2/3] bg-muted animate-pulse rounded-lg" />
                <div className="h-2 sm:h-3 md:h-4 bg-muted animate-pulse rounded w-3/4 mt-1 sm:mt-2 mx-auto" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center">
            <p className="text-destructive mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        ) : (
          <AnimeGrid posts={anime} searchQuery={searchQuery} isSearching={isSearching} />
        )}
      </div>
    </div>
  );
}
