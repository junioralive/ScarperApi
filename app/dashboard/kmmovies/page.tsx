"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Key } from "lucide-react"

// Interface for the API response
interface KMMoviePost {
  id: string
  imageUrl: string
  title: string
  postUrl: string
  isSeries: boolean
  type: string
}

interface ApiResponse {
  success: boolean
  count: number
  posts: KMMoviePost[]
}

function Navbar({ 
  searchQuery, 
  onSearchChange 
}: { 
  searchQuery: string, 
  onSearchChange: (query: string) => void,
}) {
  return (
    <div className="border-b">
      <div className="flex h-16 items-center px-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center space-x-4">
          </div>
          {/* Search Bar */}
          <div className="relative flex-1 max-w-sm md:max-w-md lg:max-w-lg">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search KM movies..."
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

function MoviesGrid({ posts, searchQuery, isSearching }: { posts: KMMoviePost[], searchQuery: string, isSearching: boolean }) {
  // Filter posts based on search query
  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isSearching) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <p className="text-lg font-medium mb-2">Searching...</p>
        <p className="text-muted-foreground">Finding movies for you</p>
      </div>
    )
  }

  if (searchQuery && filteredPosts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <Search className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium mb-2">No movies found</p>
        <p className="text-muted-foreground">Try searching with different keywords</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5 lg:gap-6 mt-6">
      {filteredPosts.map((post, index) => {
        // Extract the ID from the URL for our internal routing
        const urlParts = post.postUrl.split('/');
        const id = urlParts[urlParts.length - 2] || post.id;
        
        return (
          <a 
            key={index}
            href={`/dashboard/kmmovies/${id}`}
            className="transition-transform hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-primary rounded-lg overflow-hidden"
          >
            <div className="overflow-hidden flex flex-col">
              <div className="aspect-[2/3] relative rounded-lg overflow-hidden">
                <Image
                  src={post.imageUrl || '/placeholder-movie.jpg'}
                  alt={post.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
                  quality={80}
                />
                {post.isSeries && (
                  <div className="absolute top-2 left-2">
                    <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                      Series
                    </span>
                  </div>
                )}
              </div>
              <h3 className="text-center font-medium mt-1 sm:mt-2 text-[10px] sm:text-xs md:text-sm line-clamp-1 sm:line-clamp-2">{post.title}</h3>
            </div>
          </a>
        );
      })}
    </div>
  )
}

export default function KMMoviesDashboard() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [movies, setMovies] = useState<KMMoviePost[]>([])
  const [allMovies, setAllMovies] = useState<KMMoviePost[]>([])
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
      const url = `/api/kmmovies${queryString ? `?${queryString}` : ''}`
      
      const res = await fetch(url, {
        headers: {
          'x-api-key': userApiKey // Use user's API key from database
        }
      })
      const data: ApiResponse = await res.json()

      if (data.success) {
        setMovies(data.posts)
        if (!search.trim()) {
          setAllMovies(data.posts)
        }
      } else {
        if (res.status === 401) {
          setError("API key required. Please create an API key in the API Keys section.")
        } else {
          setError("Failed to fetch movie data")
        }
      }
    } catch (err) {
      setError("An error occurred while fetching movie data")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [userApiKey])

  // Fetch initial movie data
  useEffect(() => {
    if (user) {
      fetchMovies(currentPage)
    }
  }, [user, currentPage, fetchMovies])

  // Handle search functionality
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      fetchMovies(currentPage)
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    try {
      const params = new URLSearchParams()
      params.append('search', query.trim())
      
      const res = await fetch(`/api/kmmovies?${params.toString()}`, {
        headers: {
          'x-api-key': userApiKey // Use user's API key from database
        }
      })
      const data: ApiResponse = await res.json()

      if (data.success) {
        setMovies(data.posts)
      } else {
        if (res.status === 401) {
          setError("API key required. Please create an API key in the API Keys section.")
        } else {
          setMovies([])
        }
      }
    } catch (err) {
      console.error("Search error:", err)
      setMovies([])
    } finally {
      setIsSearching(false)
    }
  }, [currentPage, fetchMovies, userApiKey])

  // Effect for debounced search
  useEffect(() => {
    if (allMovies.length > 0) {
      performSearch(debouncedSearchQuery)
    }
  }, [debouncedSearchQuery, performSearch, allMovies.length])

  // Function to load more movies
  const loadMore = () => {
    setCurrentPage(prev => prev + 1)
  }

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
      <div className="flex flex-col min-h-screen">
        <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Key className="w-20 h-20 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">API Key Required</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  You need to create an API key first to access KMmovies data.
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
    <div className="flex flex-col min-h-screen">
      <Navbar 
        searchQuery={searchQuery} 
        onSearchChange={setSearchQuery}
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0 overflow-y-auto">
        
        {loading && movies.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5 lg:gap-6 mt-6">
            {Array(10).fill(0).map((_, i) => (
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
          <>
            <MoviesGrid posts={movies} searchQuery={searchQuery} isSearching={isSearching} />
            
            {!searchQuery && !isSearching && (
              <div className="flex justify-center mt-8 mb-6">
                <Button 
                  onClick={loadMore}
                  disabled={loading}
                  variant="outline"
                  className="min-w-[200px]"
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
