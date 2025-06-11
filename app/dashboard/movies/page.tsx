"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import {
  Home,
  Settings,
  Users,
  BarChart3,
  FileText,
  LogOut,
  User,
  Film,
  Search,
  X,
  Video
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import { DashboardNavbar } from "../layout"

// Interface for the API response
interface MoviePost {
  imageUrl: string
  title: string
  postUrl: string
}

interface ApiResponse {
  success: boolean
  count: number
  posts: MoviePost[]
}

// Navigation items


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
              placeholder="Search movies..."
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

function MoviesGrid({ posts, searchQuery, isSearching }: { posts: MoviePost[], searchQuery: string, isSearching: boolean }) {
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
        // The ID is the second-to-last part in the URL
        const id = urlParts[urlParts.length - 2] || '';
        
        return (
          <a 
            key={index}
            href={`/dashboard/movies/${id}`}
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
              </div>
              <h3 className="text-center font-medium mt-1 sm:mt-2 text-[10px] sm:text-xs md:text-sm line-clamp-1 sm:line-clamp-2">{post.title}</h3>
            </div>
          </a>
        );
      })}
    </div>
  )
}

export default function MoviesDashboard() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [movies, setMovies] = useState<MoviePost[]>([])
  const [allMovies, setAllMovies] = useState<MoviePost[]>([]) // Store original data
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  
  // Debounce search query to avoid too many API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 500)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  const fetchMovies = useCallback(async (page: number = 1, search: string = "") => {
    try {
      setLoading(true)
      
      // Build query parameters
      const params = new URLSearchParams()
      if (search.trim()) {
        params.append('search', search.trim())
      }
      if (page > 1) {
        params.append('page', page.toString())
      }
      
      const queryString = params.toString()
      const url = `/api/moviesdrive${queryString ? `?${queryString}` : ''}`
      
      const res = await fetch(url, {
        headers: {
          'x-api-key': 'ak_33ec1317f28b9126487af7639c7aab16e813d4064972829d' // This should come from user's API keys
        }
      })
      const data: ApiResponse = await res.json()

      if (data.success) {
        setMovies(data.posts)
        if (!search.trim()) {
          setAllMovies(data.posts) // Only update all movies when not searching
        }
      } else {
        if (res.status === 401) {
          setError("API key required. Please create an API key in the API Keys section.")
        } else {
          setError(data.error || "Failed to fetch movie data")
        }
      }
    } catch (err) {
      setError("An error occurred while fetching movie data")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch initial movie data
  useEffect(() => {
    if (user) {
      fetchMovies(currentPage)
    }
  }, [user, currentPage, fetchMovies])

  // Handle search functionality
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      // If search is empty, fetch default data
      fetchMovies(currentPage)
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    try {
      const params = new URLSearchParams()
      params.append('search', query.trim())
      
      const res = await fetch(`/api/moviesdrive?${params.toString()}`, {
        headers: {
          'x-api-key': 'ak_33ec1317f28b9126487af7639c7aab16e813d4064972829d' // This should come from user's API keys
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
  }, [currentPage, fetchMovies])

  // Effect for debounced search
  useEffect(() => {
    if (allMovies.length > 0) { // Only search if we have loaded initial data
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

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar 
        searchQuery={searchQuery} 
        onSearchChange={setSearchQuery}
      />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0 overflow-y-auto">
        {/* Removed the duplicate title since it's now in the Navbar */}
        
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
