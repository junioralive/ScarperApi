"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useState, use } from "react"
import {
  Home,
  Settings,
  Users,
  BarChart3,
  FileText,
  LogOut,
  User,
  Film,
  Video,
  Calendar,
  Clock,
  Info,
  ExternalLink,
  Loader2,
  Copy,
  Check,
  Play,
  Download
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
import { signOut } from "@/lib/auth"
import { ThemeToggle } from "@/components/theme-toggle"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { toast } from "sonner"
import Image from "next/image"

// Navigation items 
const navItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Anime",
    url: "/dashboard/anime",
    icon: Film,
  },
  {
    title: "Movies",
    url: "/dashboard/movies",
    icon: Video,
  },
  {
    title: "Analytics",
    url: "/dashboard/analytics",
    icon: BarChart3,
  },
  {
    title: "Users",
    url: "/dashboard/users",
    icon: Users,
  },
  {
    title: "Settings",
    url: "/dashboard/settings",
    icon: Settings,
  },
]

// Types
interface MovieDetails {
  mainImage?: string;
  imdbRating?: {
    url?: string;
    text?: string;
  };
  storyline?: string;
  episodes: {
    url: string;
    quality: string;
  }[];
}

interface Episode {
  title: string;
  link: string;
}

interface StreamLink {
  server: string;
  link: string;
  type: string;
}

interface StreamResponse {
  links: StreamLink[];
  success: boolean;
  count: number;
}

interface ApiResponse {
  success: boolean;
  data?: MovieDetails;
  error?: string;
}

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

function Navbar({ title }: { title: string }) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 sticky top-0 bg-background z-10">
      <SidebarTrigger className="-ml-1" />
      <div className="flex flex-1 items-center justify-between">
        <h1 className="text-lg font-semibold">{title}</h1>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

export default function MovieDetailPage({ params }: { params: { id: string } }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [movieDetails, setMovieDetails] = useState<MovieDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedQuality, setSelectedQuality] = useState<{url: string, quality: string} | null>(null)
  const [showFullOverview, setShowFullOverview] = useState(false)
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [fetchingEpisodes, setFetchingEpisodes] = useState(false)
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null)
  const [streamLinks, setStreamLinks] = useState<StreamLink[]>([])
  const [fetchingStreams, setFetchingStreams] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [videoUrl, setVideoUrl] = useState<string>("")
  const [fetchingVideoUrl, setFetchingVideoUrl] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  // Unwrap the params object using React.use()
  const unwrappedParams = use(params);
  const { id } = unwrappedParams;
  
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  // Function to extract title from URL
  const extractTitle = (id: string): string => {
    return id.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  // Function to extract quality from quality string
  const extractQuality = (qualityString: string): string => {
    const match = qualityString.match(/(\d+p)/);
    return match ? match[1] : qualityString;
  }

  // Function to extract episode number
  const extractEpisodeNumber = (title: string): string => {
    const match = title.match(/Ep(\d+)/i);
    return match ? `Episode ${match[1]}` : title.split('–')[0].trim();
  }

  // Inferred title from URL
  const inferredTitle = extractTitle(id);

  useEffect(() => {
    const fetchMovieDetails = async () => {
      try {
        setLoading(true)
        // Get the full URL for this movie
        const fullUrl = `https://moviesdrive.design/${id}/`
        
        // Fetch movie details using our API
        const res = await fetch(`/api/moviesdrive/episode?url=${encodeURIComponent(fullUrl)}`)
        const data: ApiResponse = await res.json()

        if (data.success && data.data) {
          setMovieDetails(data.data)
        } else {
          setError(data.error || "Failed to fetch movie details")
        }
      } catch (err) {
        setError("An error occurred while fetching movie details")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    if (user && id) {
      fetchMovieDetails()
    }
  }, [user, id])

  const fetchEpisodes = async (url: string) => {
    if (!url) {
      toast.error("No episode link available")
      return
    }

    setFetchingEpisodes(true)
    try {
      const response = await fetch(`https://screenscape-aipi.vercel.app/api/drive?action=episodes&url=${encodeURIComponent(url)}`)
      const episodeData = await response.json()
      
      if (Array.isArray(episodeData)) {
        setEpisodes(episodeData)
      } else {
        toast.error("Failed to fetch episodes")
        setEpisodes([])
      }
    } catch (error) {
      console.error("Error fetching episodes:", error)
      toast.error("Failed to fetch episodes")
      setEpisodes([])
    } finally {
      setFetchingEpisodes(false)
    }
  }

  const fetchStreamLinks = async (episodeUrl: string) => {
    setFetchingStreams(true)
    try {
      const response = await fetch(`https://kmmovies-ansh.8man.me/api/hubcloud?url=${encodeURIComponent(episodeUrl)}`)
      const streamData: StreamResponse = await response.json()
      
      if (streamData.success && streamData.links) {
        setStreamLinks(streamData.links)
        return streamData.links
      } else {
        toast.error("Failed to fetch stream links")
        return []
      }
    } catch (error) {
      console.error("Error fetching stream links:", error)
      toast.error("Failed to fetch stream links")
      return []
    } finally {
      setFetchingStreams(false)
    }
  }

  const fetchVideoUrl = async (episodeLink: string) => {
    if (!episodeLink) {
      toast.error("No episode link available")
      return
    }

    setFetchingVideoUrl(true)
    try {
      const response = await fetch(`/api/hubcloud?url=${encodeURIComponent(episodeLink)}`)
      const data = await response.json()
      
      if (data.success && data.links && data.links.length > 0) {
        setStreamLinks(data.links)
      } else {
        toast.error(data.error || "Failed to fetch video URLs")
        setStreamLinks([])
      }
    } catch (error) {
      console.error("Error fetching video URL:", error)
      toast.error("Failed to fetch video URLs")
      setStreamLinks([])
    } finally {
      setFetchingVideoUrl(false)
    }
  }

  const handleEpisodeClick = async (episode: Episode) => {
    setSelectedEpisode(episode)
    setDialogOpen(true)
    setStreamLinks([])
    setCopiedIndex(null)
    fetchVideoUrl(episode.link)
  }

  const copyToClipboard = async (url: string, index: number) => {
    if (!url) return
    
    try {
      await navigator.clipboard.writeText(url)
      setCopiedIndex(index)
      toast.success("Video URL copied to clipboard!")
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch (error) {
      toast.error("Failed to copy URL")
    }
  }

  const handleQualityClick = (quality: {url: string, quality: string}) => {
    setSelectedQuality(quality)
    setEpisodes([])
    fetchEpisodes(quality.url)
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
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col">
        <Navbar title={inferredTitle} />
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0 overflow-y-auto">
          {loading ? (
            <div className="w-full mt-4">
              <div className="w-full h-64 bg-muted animate-pulse rounded-lg mb-4" />
              <div className="h-8 bg-muted animate-pulse rounded w-1/3 mb-2" />
              <div className="h-4 bg-muted animate-pulse rounded w-full mb-1" />
              <div className="h-4 bg-muted animate-pulse rounded w-5/6" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
          ) : movieDetails ? (
            <>
              {/* Movie Header Section */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Movie Poster */}
                <div className="md:col-span-1">
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden">
                    <Image
                      src={movieDetails.mainImage || '/placeholder.jpg'}
                      alt={inferredTitle}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 25vw"
                      priority
                    />
                  </div>
                </div>
                
                {/* Movie Info */}
                <div className="md:col-span-3">
                  <h1 className="text-2xl sm:text-3xl font-bold mb-4">{inferredTitle}</h1>
                  
                  {/* IMDB Rating */}
                  {movieDetails.imdbRating?.text && (
                    <div className="mb-4">
                      <a 
                        href={movieDetails.imdbRating.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium hover:underline"
                      >
                        <Badge variant="outline" className="bg-amber-100/50 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-400/20">
                          IMDb
                        </Badge>
                        {movieDetails.imdbRating.text}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  )}
                  
                  {/* Storyline */}
                  <div className="bg-slate-100 dark:bg-black/20 rounded-xl p-4 border border-slate-200 dark:border-white/5 mb-6">
                    <h2 className="flex items-center gap-2 text-lg font-semibold mb-3">
                      <Info className="h-4 w-4 text-purple-500" />
                      Overview
                    </h2>
                    <div className="relative">
                      <div className={`relative overflow-hidden transition-all duration-300 text-slate-700 dark:text-muted-foreground ${showFullOverview ? '' : 'max-h-[4.5em]'}`}>
                        <p>{movieDetails.storyline || "No overview available."}</p>
                      </div>
                      {!showFullOverview && movieDetails.storyline && movieDetails.storyline.length > 200 && (
                        <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-slate-100 dark:from-black/20 to-transparent"></div>
                      )}
                      {movieDetails.storyline && movieDetails.storyline.length > 200 && (
                        <button 
                          onClick={() => setShowFullOverview(!showFullOverview)} 
                          className="text-purple-600 dark:text-purple-500 font-medium text-xs mt-2 hover:text-purple-500 dark:hover:text-purple-400 transition-colors"
                        >
                          {showFullOverview ? "Read Less" : "Read More"}
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Download Options with Dropdown */}
                  <div className="mt-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" className="w-auto shadow-sm">
                          Select Quality
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-28" align="center">
                        {movieDetails.episodes.map((quality, idx) => (
                          <DropdownMenuItem 
                            key={idx}
                            onClick={() => handleQualityClick(quality)}
                            className="cursor-pointer justify-center"
                          >
                            {extractQuality(quality.quality)}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Episodes Section */}
                  {selectedQuality && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold mb-3">
                        Episodes - {extractQuality(selectedQuality.quality)}
                      </h3>
                      {fetchingEpisodes ? (
                        <div className="flex items-center gap-2 py-4">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">Loading episodes...</span>
                        </div>
                      ) : episodes.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                          {episodes.map((episode, idx) => (
                            <Button
                              key={idx}
                              variant={selectedEpisode?.link === episode.link ? "default" : "outline"}
                              size="sm"
                              className="text-xs relative"
                              onClick={() => handleEpisodeClick(episode)}
                              disabled={fetchingVideoUrl && selectedEpisode?.link === episode.link}
                            >
                              {fetchingVideoUrl && selectedEpisode?.link === episode.link ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Play className="h-3 w-3 mr-1" />
                              )}
                              {extractEpisodeNumber(episode.title)}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground py-4">
                          No episodes found for this quality
                        </div>
                      )}
                    </div>
                  )}

                  {/* Remove the Stream Links Display section as it's no longer needed */}
                </div>
              </div>

              {/* Video URL Dialog */}
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{selectedEpisode?.title || "Video"}</DialogTitle>
                    <DialogDescription>
                      {inferredTitle}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {fetchingVideoUrl ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="h-8 w-8 animate-spin" />
                          <p className="text-sm text-muted-foreground">Fetching video links...</p>
                        </div>
                      </div>
                    ) : streamLinks.length > 0 ? (
                      <div className="space-y-3">
                        <label className="text-sm font-medium">Available Servers</label>
                        {streamLinks.map((link, index) => (
                          <div key={index} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-muted-foreground">
                                {link.server} ({link.type.toUpperCase()})
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <Input
                                value={link.link}
                                readOnly
                                className="flex-1 text-xs"
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => copyToClipboard(link.link, index)}
                                className="shrink-0"
                              >
                                {copiedIndex === index ? (
                                  <Check className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                        <div className="pt-2 text-xs text-muted-foreground">
                          Copy the URL and open it in VLC or your preferred media player
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">No video links available</p>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </>
          ) : (
            <div className="flex items-center justify-center h-[50vh]">
              <p className="text-muted-foreground">No details found for this movie.</p>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
