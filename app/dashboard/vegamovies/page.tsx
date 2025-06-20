"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import { Search, X, Key } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"

// Update the interface to match the actual VegaMovies API response
interface VegaMoviePost {
  id: string
  title: string
  url: string
  image: string
  imageAlt: string
  publishDate: string
  category: string
  quality: string[]
  language: string[]
  size: string[]
  format: string
  featured: boolean
}

interface VegaMoviesApiResponse {
  success: boolean
  data?: {
    movies: VegaMoviePost[]
    pagination?: {
      currentPage: number
      hasNextPage: boolean
    }
  }
  error?: string
  message?: string
  remainingRequests?: number
}

// Update the interface for the transformed data used in the UI
interface TransformedMoviePost {
  id: string
  title: string
  imageUrl: string
  postUrl: string
  description?: string
  isHighQuality?: boolean
  contentType?: 'movie' | 'series'
}

function Navbar({ 
  searchQuery, 
  onSearchChange 
}: { 
  searchQuery: string, 
  onSearchChange: (query: string) => void,
}) {
  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold tracking-tight">VegaMovies</h2>
          </div>
          {/* Search Bar */}
          <div className="relative flex-1 max-w-sm md:max-w-md lg:max-w-lg">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search movies & series..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 pr-10 w-full font-mono text-sm"
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
    </div>
  )
}

// Add debounce hook for search
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

function MoviesGrid({ posts, searchQuery, isSearching }: { posts: TransformedMoviePost[], searchQuery: string, isSearching: boolean }) {
  if (isSearching) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <p className="text-lg font-medium mb-2 font-mono">Searching...</p>
        <p className="text-muted-foreground font-mono text-sm">Finding content for "{searchQuery}"</p>
      </div>
    )
  }

  if (searchQuery && posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <Search className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium mb-2 font-mono">No content found</p>
        <p className="text-muted-foreground font-mono text-sm">No results for "{searchQuery}". Try different keywords.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5 lg:gap-6 mt-6">
      {posts.map((post, index) => {
        // Extract the ID from the URL for our internal routing
        const urlParts = post.postUrl.split('/');
        const id = urlParts[urlParts.length - 2] || post.id;
        
        return (
          <a 
            key={index}
            href={`/dashboard/vegamovies/${id}?url=${encodeURIComponent(post.postUrl)}`}
            className="transition-all duration-200 hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-primary rounded-lg overflow-hidden group"
          >
            <Card className="overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-200">
              <div className="aspect-[2/3] relative rounded-t-lg overflow-hidden">
                <Image
                  src={post.imageUrl || 'https://placehold.jp/24/363636/ffffff/400x600.png?text=ScreenScape'}
                  alt={post.title}
                  fill
                  className="object-cover transition-transform duration-200 group-hover:scale-105"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
                  quality={80}
                />
                {post.contentType === 'series' && (
                  <div className="absolute top-2 left-2">
                    <span className="bg-blue-500/90 text-white text-xs px-2 py-1 rounded font-mono">
                      SERIES
                    </span>
                  </div>
                )}
                {post.isHighQuality && (
                  <div className="absolute top-2 right-2">
                    <span className="bg-green-500/90 text-white text-xs px-2 py-1 rounded font-mono">
                      4K
                    </span>
                  </div>
                )}
              </div>
              <CardContent className="p-3">
                <h3 className="font-mono text-[10px] sm:text-xs md:text-sm line-clamp-2 leading-tight">{post.title}</h3>
              </CardContent>
            </Card>
          </a>
        );
      })}
    </div>
  )
}

export default function VegaMoviesDashboard() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [movies, setMovies] = useState<TransformedMoviePost[]>([])
  const [allMovies, setAllMovies] = useState<TransformedMoviePost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [userApiKey, setUserApiKey] = useState<string | null>(null)
  
  // Debounce search query to avoid too many API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 500)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

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

  const fetchMovies = useCallback(async (page: number = 1, search: string = "") => {
    if (!userApiKey) {
      setError('API key not available. Please create an API key first.');
      return;
    }

    try {
      setLoading(true)
      setError('')

      // Build query parameters
      const params = new URLSearchParams()
      if (search.trim()) {
        params.append('search', search.trim())
      } else {
        params.append('page', page.toString())
      }
      
      const queryString = params.toString()
      const url = `/api/vegamovies${queryString ? `?${queryString}` : ''}`
      
      const res = await fetch(url, {
        headers: {
          'x-api-key': userApiKey
        }
      })
      const data: VegaMoviesApiResponse = await res.json()

      if (data.success && data.data) {
        // Transform the data to match the UI interface
        const transformedMovies: TransformedMoviePost[] = data.data.movies.map(movie => ({
          id: movie.id,
          title: movie.title,
          imageUrl: movie.image,
          postUrl: movie.url,
          description: movie.format,
          isHighQuality: movie.quality.some(q => q.includes('4K') || q.includes('2160P')),
          contentType: movie.category === 'TV Series' ? 'series' as const : 'movie' as const
        }))
        
        setMovies(transformedMovies)
        if (!search.trim()) {
          setAllMovies(transformedMovies)
        }
      } else {
        if (res.status === 401) {
          setError("API key required. Please create an API key in the API Keys section.")
        } else {
          setError(data.error || "Failed to fetch VegaMovies data")
        }
      }
    } catch (err) {
      setError("An error occurred while fetching VegaMovies data")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [userApiKey])

  // Fetch user's API key when component mounts
  useEffect(() => {
    if (user) {
      fetchUserApiKey();
    }
  }, [user]);

  // Fetch initial movie data when userApiKey is available
  useEffect(() => {
    if (user && userApiKey) {
      fetchMovies(currentPage)
    }
  }, [user, currentPage, fetchMovies, userApiKey])

  // Handle search functionality
  const performSearch = useCallback(async (query: string) => {
    if (!userApiKey) {
      setError('API key not available. Please create an API key first.');
      return;
    }

    if (!query.trim()) {
      fetchMovies(currentPage)
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    setError('') // Clear any previous errors
    try {
      const params = new URLSearchParams()
      params.append('search', query.trim())
      
      const res = await fetch(`/api/vegamovies?${params.toString()}`, {
        headers: {
          'x-api-key': userApiKey
        }
      })
      const data: VegaMoviesApiResponse = await res.json()

      if (data.success && data.data) {
        const transformedMovies: TransformedMoviePost[] = data.data.movies.map(movie => ({
          id: movie.id,
          title: movie.title,
          imageUrl: movie.image,
          postUrl: movie.url,
          description: movie.format,
          isHighQuality: movie.quality.some(q => q.includes('4K') || q.includes('2160P')),
          contentType: movie.category === 'TV Series' ? 'series' as const : 'movie' as const
        }))
        setMovies(transformedMovies)
      } else {
        if (res.status === 401) {
          setError("API key required. Please create an API key in the API Keys section.")
        } else {
          console.error('Search failed:', data.error)
          setMovies([])
        }
      }
    } catch (err) {
      console.error("Search error:", err)
      setError("Failed to search movies")
      setMovies([])
    } finally {
      setIsSearching(false)
    }
  }, [currentPage, fetchMovies, userApiKey])

  // Effect for debounced search - only trigger when userApiKey is available
  useEffect(() => {
    if (allMovies.length > 0 && userApiKey) {
      performSearch(debouncedSearchQuery)
    }
  }, [debouncedSearchQuery, performSearch, allMovies.length, userApiKey])

  const loadMore = async () => {
    if (loading || !userApiKey) return;
    
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      params.append('page', nextPage.toString());
      
      const res = await fetch(`/api/vegamovies?${params.toString()}`, {
        headers: {
          'x-api-key': userApiKey
        }
      });
      
      const data: VegaMoviesApiResponse = await res.json();
      
      if (data.success && data.data) {
        const transformedMovies: TransformedMoviePost[] = data.data.movies.map(movie => ({
          id: movie.id,
          title: movie.title,
          imageUrl: movie.image,
          postUrl: movie.url,
          description: movie.format,
          isHighQuality: movie.quality.some(q => q.includes('4K') || q.includes('2160P')),
          contentType: movie.category === 'TV Series' ? 'series' as const : 'movie' as const
        }))
        
        // Append new movies to existing ones
        setMovies(prevMovies => [...prevMovies, ...transformedMovies]);
        setAllMovies(prevMovies => [...prevMovies, ...transformedMovies]);
      } else {
        if (res.status === 401) {
          setError("API key required. Please create an API key in the API Keys section.");
        } else {
          setError("Failed to load more movies");
        }
      }
    } catch (err) {
      setError("An error occurred while loading more movies");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (!userApiKey && !loading && !error) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Key className="w-20 h-20 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2 font-mono">API Key Required</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto font-mono text-sm">
                  You need to create an API key first to access VegaMovies data.
                </p>
                <Button asChild className="font-mono">
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
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar 
        searchQuery={searchQuery} 
        onSearchChange={setSearchQuery}
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0 overflow-y-auto">
        
        {loading && movies.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5 lg:gap-6 mt-6">
            {Array(10).fill(0).map((_, i) => (
              <Card key={i} className="border-border/50 bg-card/50 backdrop-blur-sm">
                <div className="aspect-[2/3] bg-muted animate-pulse rounded-t-lg" />
                <CardContent className="p-3">
                  <div className="h-2 sm:h-3 md:h-4 bg-muted animate-pulse rounded w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center">
            <p className="text-destructive mb-4 font-mono text-sm">{error}</p>
            <Button onClick={() => window.location.reload()} className="font-mono">Retry</Button>
          </div>
        ) : (
          <>
            <MoviesGrid posts={movies} searchQuery={searchQuery} isSearching={isSearching} />
            
            {!searchQuery && !isSearching && (
              <div className="flex justify-center mt-8 mb-6">
                <Button 
                  onClick={loadMore}
                  disabled={loading}
                  variant="outline"
                  className="min-w-[200px] font-mono"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin mr-2">⟳</span>
                      Loading...
                    </>
                  ) : "Load More"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
