"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter, usePathname } from "next/navigation"
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
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent } from "@/components/ui/card"
import { signOut } from "@/lib/auth"
import { ThemeToggle } from "@/components/theme-toggle"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Interface for the API response
interface AnimePost {
  imageUrl: string
  title: string
  postUrl: string
}

interface ApiResponse {
  success: boolean
  count: number
  posts: AnimePost[]
}

// Navigation items
const navItems = [
  // {
  //   title: "Dashboard",
  //   url: "/dashboard",
  //   icon: Home,
  // },
  {
    title: "Anime",
    url: "/dashboard/anime",
    icon: Film,
  },
  {
    title: "movies",
    url: "/dashboard/movies",
    icon: Video,
  },
  {
    title: "Users",
    url: "/dashboard/users",
    icon: Users,
  },
  {
    title: "Documents",
    url: "/dashboard/documents",
    icon: FileText,
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: Settings,
  },
]

function AppSidebar() {
  const pathname = usePathname()
  const { user } = useAuth()
  
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.photoURL || "/avatars/01.png"} alt={user?.email} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium group-data-[collapsible=icon]:hidden">
            {user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || "User"}
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="data-[state=collapsed]:hidden font-medium">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = pathname === item.url || (item.url !== "/dashboard" && pathname.startsWith(item.url))
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <a 
                        href={item.url} 
                        className={`group-data-[state=collapsed]:justify-center font-medium transition-colors ${
                          isActive 
                            ? "bg-primary text-primary-foreground shadow-sm" 
                            : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        }`}
                      >
                        <item.icon className={isActive ? "text-primary-foreground" : ""} />
                        <span className="data-[state=collapsed]:hidden font-medium">{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <UserMenu />
      </SidebarFooter>
    </Sidebar>
  )
}

function UserMenu() {
  const { user } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.push("/login")
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="w-full justify-start gap-2 h-12 group-data-[state=collapsed]:justify-center">
          <Avatar className="h-8 w-8">
           <AvatarImage src={user?.photoURL || "/avatars/01.png"} alt={user?.email} />
            <AvatarFallback>
              {user?.email?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight data-[state=collapsed]:hidden">
            <span className="truncate font-semibold">{user?.displayName}</span>
            <span className="truncate text-xs text-muted-foreground">
              {user?.email}
            </span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.email}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface Category {
  id: string
  name: string
  url: string
}

const categories: Category[] = [
  { id: "all", name: "All", url: "" },
  { id: "hindi", name: "Hindi", url: "/category/language/hindi/" },
  { id: "english", name: "English", url: "/category/language/english/" },
  { id: "tamil", name: "Tamil", url: "/category/language/tamil/" },
  { id: "crunchyroll", name: "Crunchyroll", url: "/category/network/crunchyroll/" },
  { id: "disney", name: "Disney", url: "/category/network/disney/" },
  // { id: "hotstar", name: "Hotstar", url: "/category/network/hotstar/" },
]

function Navbar({ 
  searchQuery, 
  onSearchChange, 
  selectedCategory, 
  onCategoryChange 
}: { 
  searchQuery: string, 
  onSearchChange: (query: string) => void,
  selectedCategory: string,
  onCategoryChange: (category: string) => void
}) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <div className="flex flex-1 items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          {/* Category Dropdown */}
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

          {/* Search Bar */}
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
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
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

function AnimeGrid({ posts, searchQuery, isSearching }: { posts: AnimePost[], searchQuery: string, isSearching: boolean }) {
  // Filter posts based on search query
  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isSearching) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <p className="text-lg font-medium mb-2">Searching...</p>
        <p className="text-muted-foreground">Finding anime for you</p>
      </div>
    )
  }

  if (searchQuery && filteredPosts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <Search className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium mb-2">No anime found</p>
        <p className="text-muted-foreground">Try searching with different keywords</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-5 lg:gap-6 mt-6">
      {filteredPosts.map((post, index) => {
        // Detect if this is a movie or series based on URL
        const isMovie = post.postUrl.includes('/movie/')
        
        // Extract the ID from the URL for our internal routing
        const urlParts = post.postUrl.split('/');
        // The ID is the second-to-last part in the URL
        const id = urlParts[urlParts.length - 2] || '';
        
        // Generate the appropriate route based on content type
        const linkUrl = `/dashboard/anime/${id}`
        
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
                {/* Add a badge to distinguish movies from series */}
                {isMovie && (
                  <div className="absolute top-2 left-2">
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      Movie
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

// Update loading skeleton to match the new grid layout
export default function AnimeDashboard() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [anime, setAnime] = useState<AnimePost[]>([])
  const [allAnime, setAllAnime] = useState<AnimePost[]>([]) // Store original data
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("all")
  
  // Debounce search query to avoid too many API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 500)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  // Update fetchAnime to handle categories
  const fetchAnime = useCallback(async (category: string = "all", search: string = "") => {
    try {
      setLoading(true)
      
      // Build query parameters
      const params = new URLSearchParams()
      if (search.trim()) {
        params.append('search', search.trim())
      }
      if (category !== "all") {
        params.append('category', category)
      }
      
      const queryString = params.toString()
      const url = `/api/posts${queryString ? `?${queryString}` : ''}`
      
      const res = await fetch(url)
      const data: ApiResponse = await res.json()

      if (data.success) {
        setAnime(data.posts)
        if (!search.trim()) {
          setAllAnime(data.posts) // Only update all anime when not searching
        }
      } else {
        setError("Failed to fetch anime data")
      }
    } catch (err) {
      setError("An error occurred while fetching anime data")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch initial anime data
  useEffect(() => {
    if (user) {
      fetchAnime(selectedCategory)
    }
  }, [user, selectedCategory, fetchAnime])

  // Handle search functionality
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      // If search is empty, fetch category data
      fetchAnime(selectedCategory)
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    try {
      // Always search via API when there's a query
      const params = new URLSearchParams()
      params.append('search', query.trim())
      if (selectedCategory !== "all") {
        params.append('category', selectedCategory)
      }
      
      const res = await fetch(`/api/posts?${params.toString()}`)
      const data: ApiResponse = await res.json()

      if (data.success) {
        setAnime(data.posts)
      } else {
        setAnime([])
      }
    } catch (err) {
      console.error("Search error:", err)
      setAnime([])
    } finally {
      setIsSearching(false)
    }
  }, [selectedCategory, fetchAnime])

  // Update category change handler
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    setSearchQuery("") // Clear search when changing category
  }

  // Effect for debounced search
  useEffect(() => {
    if (allAnime.length > 0) { // Only search if we have loaded initial data
      performSearch(debouncedSearchQuery)
    }
  }, [debouncedSearchQuery, performSearch, allAnime.length])

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
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Navbar 
          searchQuery={searchQuery} 
          onSearchChange={setSearchQuery}
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
        />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {loading ? (
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-5 lg:gap-6 mt-6">
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
      </SidebarInset>
    </SidebarProvider>
  )
}
