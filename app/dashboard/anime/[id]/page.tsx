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
  Play,
  Info,
  Calendar,
  Clock,
  Mic,
  Copy,
  Check,
  Loader2
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
import { Badge } from "@/components/ui/badge"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

// Types for anime details
interface Episode {
  id: string;
  title: string;
  link?: string;
  season: number;
  number: number;
  imageUrl?: string;
}

interface Season {
  number: number;
  text: string;
  dataPost: string;
}

interface Language {
  name: string;
  url?: string;
}

interface AnimeInfo {
  seasons: number;
  episodeCount: number;
  duration: string;
  year: string;
}

interface AnimeDetails {
  title: string;
  imageUrl?: string;
  info: AnimeInfo;
  availableSeasons: Season[];
  overview: string;
  languages?: Language[];
}

interface ApiResponse {
  success: boolean;
  animeName?: string;
  details?: AnimeDetails;
  episodes?: Episode[];
  error?: string;
}

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

// Episode card component
function EpisodeCard({ episode }: { episode: Episode }) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [videoUrl, setVideoUrl] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const fetchVideoUrl = async () => {
    if (!episode.link) {
      toast.error("No episode link available")
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/video?url=${encodeURIComponent(episode.link)}`)
      const data = await response.json()
      
      if (data.success && data.securedLink) {
        setVideoUrl(data.securedLink)
      } else {
        toast.error(data.error || "Failed to fetch video URL")
        setVideoUrl("")
      }
    } catch (error) {
      console.error("Error fetching video URL:", error)
      toast.error("Failed to fetch video URL")
      setVideoUrl("")
    } finally {
      setLoading(false)
    }
  }

  const handleEpisodeClick = (e: React.MouseEvent) => {
    e.preventDefault()
    setDialogOpen(true)
    fetchVideoUrl()
  }

  const copyToClipboard = async () => {
    if (!videoUrl) return
    
    try {
      await navigator.clipboard.writeText(videoUrl)
      setCopied(true)
      toast.success("Video URL copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error("Failed to copy URL")
    }
  }

  return (
    <>
      <Card className="overflow-hidden border p-0 hover:shadow-md transition-shadow cursor-pointer">
        <div onClick={handleEpisodeClick} className="block">
          <div className="relative aspect-video">
            <Image
              src={episode.imageUrl || '/placeholder-episode.jpg'} 
              alt={episode.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
              <Play className="h-12 w-12 text-white" />
            </div>
            <Badge className="absolute bottom-2 right-2">
              S{episode.season} E{episode.number}
            </Badge>
          </div>
          <div className="p-3">
            <h3 className="font-medium truncate">{episode.title}</h3>
          </div>
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{episode.title}</DialogTitle>
            <DialogDescription>
              Season {episode.season}, Episode {episode.number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Open In Vlc</label>
              <div className="flex gap-2">
                <Input
                  value={loading ? "Loading..." : videoUrl}
                  readOnly
                  placeholder={loading ? "Fetching video URL..." : "No video URL available"}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                  disabled={!videoUrl || loading}
                  className="shrink-0"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            {/* {videoUrl && (
              <div className="flex gap-2">
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={() => window.open(videoUrl, '_blank')}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Watch Now
                </Button>
              </div>
            )} */}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Helper function to group episodes by season
function groupEpisodesBySeason(episodes: Episode[]): Record<number, Episode[]> {
  return episodes.reduce((acc, episode) => {
    if (!acc[episode.season]) {
      acc[episode.season] = [];
    }
    acc[episode.season].push(episode);
    return acc;
  }, {} as Record<number, Episode[]>);
}

export default function AnimeDetailPage({ params }: { params: { id: string } }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [animeDetails, setAnimeDetails] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>("1")
  const [showFullOverview, setShowFullOverview] = useState(false)

  // Unwrap the params object using React.use()
  const unwrappedParams = use(params);
  // Extract the ID from unwrapped params
  const { id } = unwrappedParams;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    const fetchAnimeDetails = async () => {
      try {
        setLoading(true)
        // Make request to our API endpoint with the anime ID
        const res = await fetch(`/api/episodes/${id}?all_seasons=true`)
        const data: ApiResponse = await res.json()

        if (data.success) {
          setAnimeDetails(data)
        } else {
          setError(data.error || "Failed to fetch anime details")
        }
      } catch (err) {
        setError("An error occurred while fetching anime details")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    if (user && id) {
      fetchAnimeDetails()
    }
  }, [user, id])

  // Group episodes by season for tab display
  const episodesBySeason = animeDetails?.episodes 
    ? groupEpisodesBySeason(animeDetails.episodes)
    : {};

  // Get available season numbers
  const seasonNumbers = Object.keys(episodesBySeason).map(Number).sort((a, b) => a - b);

  // Set active tab to first season when data loads
  useEffect(() => {
    if (seasonNumbers.length > 0 && loading === false) {
      setActiveTab(seasonNumbers[0].toString());
    }
  }, [loading, seasonNumbers.length]);

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

  const details = animeDetails?.details;
  const title = details?.title || "Anime Details";

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col">
        <Navbar title={title} />
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
          ) : details ? (
            <>
              {/* Anime Header Section */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Anime Image - Reduced size from 1/3 to 1/4 */}
                <div className="md:col-span-1">
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden">
                    <Image
                      src={details.imageUrl || '/placeholder.jpg'}
                      alt={details.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 25vw"
                      priority
                    />
                  </div>
                </div>
                
                {/* Anime Info - Increased from 2/3 to 3/4 of space */}
                <div className="md:col-span-3">
                  <h1 className="text-2xl sm:text-3xl font-bold mb-4">{details.title}</h1>
                  
                  {/* Language Tags */}
                  {details.languages && details.languages.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs text-muted-foreground mb-1">Languages</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {details.languages.map((lang, idx) => (
                          <Badge key={idx} variant="outline" className="bg-pink-500/15 text-pink-500 border-pink-500/20 hover:bg-pink-500/20 text-xs rounded-full">
                            {lang.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Info Pills - Redesigned as horizontal pills */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <div className="flex items-center text-xs text-muted-foreground bg-white/5 px-2 py-1 rounded-full">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>{details.info.duration}</span>
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground bg-white/5 px-2 py-1 rounded-full">
                      <Calendar className="h-3 w-3 mr-1" />
                      <span>{details.info.year}</span>
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground bg-white/5 px-2 py-1 rounded-full">
                      <Film className="h-3 w-3 mr-1" />
                      <span>{details.info.episodeCount} Episodes</span>
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground bg-white/5 px-2 py-1 rounded-full">
                      <Info className="h-3 w-3 mr-1" />
                      <span>{details.info.seasons} Seasons</span>
                    </div>
                  </div>
                  
                  {/* Overview Section */}
                  <div className="bg-black/20 rounded-xl p-4 border border-white/5 mb-6">
                    <h2 className="flex items-center gap-2 text-lg font-semibold mb-3">
                      <Mic className="h-4 w-4 text-purple-500" />
                      Overview
                    </h2>
                    <div className="relative">
                      <div className={`relative overflow-hidden transition-all duration-300 text-muted-foreground ${showFullOverview ? '' : 'max-h-[4.5em]'}`}>
                        <p>{details.overview}</p>
                      </div>
                      {!showFullOverview && (
                        <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-background to-transparent"></div>
                      )}
                      <button 
                        onClick={() => setShowFullOverview(!showFullOverview)} 
                        className="text-purple-500 font-medium text-xs mt-2 hover:text-purple-400 transition-colors"
                      >
                        {showFullOverview ? "Read Less" : "Read More"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Episodes Section with Dropdown for Seasons */}
              <div className="mt-6">
                <div className="flex items-center gap-4 mb-4">
                  {/* <h2 className="text-xl font-semibold">Episodes</h2> */}
                  
                  {seasonNumbers.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="flex items-center gap-2">
                          Season {activeTab}
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 15 15"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                          >
                            <path
                              d="M4.93179 5.43179C4.75605 5.60753 4.75605 5.89245 4.93179 6.06819C5.10753 6.24392 5.39245 6.24392 5.56819 6.06819L7.49999 4.13638L9.43179 6.06819C9.60753 6.24392 9.89245 6.24392 10.0682 6.06819C10.2439 5.89245 10.2439 5.60753 10.0682 5.43179L7.81819 3.18179C7.73379 3.0974 7.61933 3.04999 7.49999 3.04999C7.38064 3.04999 7.26618 3.0974 7.18179 3.18179L4.93179 5.43179ZM10.0682 9.56819C10.2439 9.39245 10.2439 9.10753 10.0682 8.93179C9.89245 8.75606 9.60753 8.75606 9.43179 8.93179L7.49999 10.8636L5.56819 8.93179C5.39245 8.75606 5.10753 8.75606 4.93179 8.93179C4.75605 9.10753 4.75605 9.39245 4.93179 9.56819L7.18179 11.8182C7.26618 11.9026 7.38064 11.95 7.49999 11.95C7.61933 11.95 7.73379 11.9026 7.81819 11.8182L10.0682 9.56819Z"
                              fill="currentColor"
                              fillRule="evenodd"
                              clipRule="evenodd"
                            ></path>
                          </svg>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {seasonNumbers.map((season) => (
                          <DropdownMenuItem 
                            key={season}
                            onClick={() => setActiveTab(season.toString())}
                            className={activeTab === season.toString() ? "bg-accent" : ""}
                          >
                            Season {season}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                
                {seasonNumbers.length > 0 ? (
                  <div>
                    {seasonNumbers.map((season) => (
                      season.toString() === activeTab && (
                        <div key={season} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {episodesBySeason[season].map((episode) => (
                            <EpisodeCard key={episode.id} episode={episode} />
                          ))}
                        </div>
                      )
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No episodes available.</p>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[50vh]">
              <p className="text-muted-foreground">No details found for this anime.</p>
            </div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
