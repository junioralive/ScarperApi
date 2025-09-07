"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState, use } from "react"
import {
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
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import Image from "next/image"
import { DashboardNavbar } from "../../layout"

// Navigation items 
// const navItems = [
//   {
//     title: "Dashboard",
//     url: "/dashboard",
//     icon: Home,
//   },
//   {
//     title: "Anime",
//     url: "/dashboard/anime",
//     icon: Film,
//   },
//   {
//     title: "Movies",
//     url: "/dashboard/movies",
//     icon: Video,
//   },
//   {
//     title: "Analytics",
//     url: "/dashboard/analytics",
//     icon: BarChart3,
//   },
//   {
//     title: "Users",
//     url: "/dashboard/users",
//     icon: Users,
//   },
//   {
//     title: "Settings",
//     url: "/dashboard/settings",
//     icon: Settings,
//   },
// ]

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

interface HubCloudLink {
  title: string;
  url: string;
  id: string;
  season?: number; // Add season property
}

interface Episode {
  title: string;
  link: string;
  season?: number; // Add season property
}

interface MdriveEpisode {
  episodeNumber: string;
  quality: string;
  size: string;
  hubCloudLinks: HubCloudLink[];
  season?: number; // Add season property
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

// Helper function to extract season from title or HTML
const extractSeasonFromContent = (title: string, htmlContent?: string): number => {
  // First, try to extract from the title using comprehensive patterns
  const seasonPatterns = [
    /season\s*(\d+)/i,
    /s(\d+)(?:e\d+)?/i,
    /series\s*(\d+)/i,
    /(\d+)(?:st|nd|rd|th)?\s*season/i
  ];
  
  for (const pattern of seasonPatterns) {
    const titleMatch = title.match(pattern);
    if (titleMatch) {
      return parseInt(titleMatch[1]);
    }
  }
  
  // If HTML content is available, try to extract season from it
  if (htmlContent) {
    // Remove HTML tags for better text matching
    const cleanHtml = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
    
    // More specific HTML patterns for season detection
    const htmlPatterns = [
      /Season\s*(\d+)/gi,
      /season\s*(\d+)/gi,
      /S(\d+)/g,
      /Series\s*(\d+)/gi
    ];
    
    // Get all season matches from HTML content
    const allSeasons = new Set<number>();
    
    for (const pattern of htmlPatterns) {
      let match;
      while ((match = pattern.exec(cleanHtml)) !== null) {
        const seasonNum = parseInt(match[1]);
        if (seasonNum > 0 && seasonNum <= 20) { // Reasonable season range
          allSeasons.add(seasonNum);
        }
      }
    }
    
    // If we found seasons in HTML, try to match with the title/link
    if (allSeasons.size > 0) {
      const seasonsArray = Array.from(allSeasons).sort();
      
      // Try to match the title with specific season indicators
      for (const season of seasonsArray) {
        const seasonRegex = new RegExp(`season\\s*${season}|s${season}`, 'i');
        if (seasonRegex.test(title) || seasonRegex.test(htmlContent)) {
          console.log(`Found season ${season} for title: "${title}"`);
          return season;
        }
      }
      
      // If we can't match specifically, return the first season found
      console.log(`Using first detected season ${seasonsArray[0]} for title: "${title}"`);
      return seasonsArray[0];
    }
  }
  
  // Check if title contains episode indicators for different seasons
  const episodeSeasonMatch = title.match(/S(\d+)E\d+/i);
  if (episodeSeasonMatch) {
    return parseInt(episodeSeasonMatch[1]);
  }
  
  // Default to season 1
  return 1;
};

// Helper function to group episodes by season
const groupEpisodesBySeason = (episodes: Episode[]): Record<number, Episode[]> => {
  return episodes.reduce((acc, episode) => {
    const season = episode.season || 1;
    if (!acc[season]) {
      acc[season] = [];
    }
    acc[season].push(episode);
    return acc;
  }, {} as Record<number, Episode[]>);
};

// Helper function to group HubCloud links by season
const groupHubCloudBySeason = (links: HubCloudLink[]): Record<number, HubCloudLink[]> => {
  return links.reduce((acc, link) => {
    const season = link.season || 1;
    if (!acc[season]) {
      acc[season] = [];
    }
    acc[season].push(link);
    return acc;
  }, {} as Record<number, HubCloudLink[]>);
};

// Helper function to group MDrive episodes by season
const groupMdriveBySeason = (episodes: MdriveEpisode[]): Record<number, MdriveEpisode[]> => {
  return episodes.reduce((acc, episode) => {
    const season = episode.season || 1;
    if (!acc[season]) {
      acc[season] = [];
    }
    acc[season].push(episode);
    return acc;
  }, {} as Record<number, MdriveEpisode[]>);
};

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
  const [hubCloudLinks, setHubCloudLinks] = useState<HubCloudLink[]>([])
  const [fetchingHubCloud, setFetchingHubCloud] = useState(false)
  const [mdriveEpisodes, setMdriveEpisodes] = useState<MdriveEpisode[]>([])
  const [activeTab, setActiveTab] = useState<string>("1")
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null)
  const [userApiKey, setUserApiKey] = useState<string | null>(null)

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

  // Fetch user's API key
  useEffect(() => {
    const fetchUserApiKey = async () => {
      if (!user) return;
      
      try {
        const response = await fetch(`/api/api-keys?userId=${user.uid}`);
        const data = await response.json();
        
        if (data.success && data.apiKeys && data.apiKeys.length > 0) {
          // Use the first active API key
          const activeKey = data.apiKeys.find((key: any) => key.isActive);
          if (activeKey) {
            setUserApiKey(activeKey.keyValue);
          }
        }
      } catch (error) {
        console.error('Failed to fetch user API key:', error);
      }
    };

    if (user) {
      fetchUserApiKey();
    }
  }, [user]);

  useEffect(() => {
    const fetchMovieDetails = async () => {
      if (!userApiKey) return;
      
      try {
        setLoading(true)
        // Get the full URL for this movie
        const fullUrl = `https://moviesdrive.rodeo//${id}/`
        
        // Fetch movie details using our API
        const res = await fetch(`/api/moviesdrive/episode?url=${encodeURIComponent(fullUrl)}`, {
          headers: {
            'x-api-key': userApiKey
          }
        })
        const data: ApiResponse = await res.json()

        if (data.success && data.data) {
          setMovieDetails(data.data)
          
          // Get available seasons and auto-select the first one
          const availableSeasons = [...new Set(data.data.episodes.map(ep => ep.season))].sort((a, b) => a - b)
          if (availableSeasons.length > 0) {
            setSelectedSeason(availableSeasons[0])
            
            // Auto-select 480p quality for the first season if available
            const firstSeasonEpisodes = data.data.episodes.filter(ep => ep.season === availableSeasons[0])
            const quality480p = firstSeasonEpisodes.find(ep => ep.quality.includes('480p'))
            if (quality480p) {
              setSelectedQuality(quality480p)
              if (quality480p.url.includes('mdrive.today')) {
                fetchHubCloudLinks(quality480p.url)
              } else {
                fetchEpisodes(quality480p.url)
              }
            }
          }
        } else {
          if (res.status === 401) {
            setError("API key required. Please create an API key in the API Keys section.")
          } else {
            setError(data.error || "Failed to fetch movie details")
          }
        }
      } catch (err) {
        setError("An error occurred while fetching movie details")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    if (user && id && userApiKey) {
      fetchMovieDetails()
    }
  }, [user, id, userApiKey])

  const fetchHubCloudLinks = async (url: string) => {
    if (!url || !userApiKey) {
      toast.error("No episode link available or API key missing")
      return
    }

    setFetchingHubCloud(true)
    try {
      const response = await fetch(`/api/mdrive?url=${encodeURIComponent(url)}`, {
        headers: {
          'x-api-key': userApiKey
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      console.log("MDrive data received:", data)
      
      if (data.success) {
        if (data.episodes && data.episodes.length > 0) {
          // Add season detection for MDrive episodes with debugging
          const episodesWithSeasons = data.episodes.map((ep: MdriveEpisode, index: number) => {
            const season = extractSeasonFromContent(ep.episodeNumber, data.htmlContent);
            console.log(`Episode ${index}: "${ep.episodeNumber}" -> Season ${season}`);
            return {
              ...ep,
              season
            };
          });
          setMdriveEpisodes(episodesWithSeasons)
          
          // Debug: Log detected seasons
          const detectedSeasons = [...new Set(episodesWithSeasons.map(ep => ep.season))];
          console.log("MDrive detected seasons:", detectedSeasons);
          
          toast.success(`Found ${data.episodes.length} episodes`)
        } else if (data.directLinks && data.directLinks.length > 0) {
          // For direct links, we need to analyze the entire HTML content to detect seasons
          const seasonsInHtml = new Set<number>();
          
          if (data.htmlContent) {
            const cleanHtml = data.htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
            const seasonMatches = cleanHtml.match(/Season\s*(\d+)/gi);
            
            if (seasonMatches) {
              seasonMatches.forEach(match => {
                const seasonNum = parseInt(match.match(/(\d+)/)?.[1] || '1');
                if (seasonNum > 0 && seasonNum <= 20) {
                  seasonsInHtml.add(seasonNum);
                }
              });
            }
          }
          
          console.log("Seasons found in HTML:", Array.from(seasonsInHtml));
          
          // Add season detection for direct links with more intelligent mapping
          const linksWithSeasons = data.directLinks.map((link: HubCloudLink, index: number) => {
            // Try to extract season from the link title or URL
            let season = extractSeasonFromContent(link.title, data.htmlContent);
            
            // If multiple seasons detected and we can't determine from title,
            // try to map based on link patterns or index
            if (seasonsInHtml.size > 1 && season === 1) {
              // Check if link title contains quality indicators that might help identify season
              const qualityMatch = link.title.match(/(\d+p)/);
              const sizeMatch = link.title.match(/(\d+(?:\.\d+)?(?:GB|MB))/i);
              
              // More sophisticated season detection based on URL patterns
              if (link.url.includes('archives/')) {
                const archiveId = link.url.match(/archives\/(\d+)/)?.[1];
                if (archiveId) {
                  const archiveNum = parseInt(archiveId);
                  // Use archive ID patterns to guess season (this is heuristic)
                  if (archiveNum > 10000) {
                    season = 2; // Newer archives likely season 2
                  }
                }
              }
            }
            
            console.log(`Link ${index}: "${link.title}" -> Season ${season}`);
            return {
              ...link,
              season
            };
          });
          
          setHubCloudLinks(linksWithSeasons)
          
          // Debug: Log detected seasons
          const detectedSeasons = [...new Set(linksWithSeasons.map(link => link.season))];
          console.log("HubCloud detected seasons:", detectedSeasons);
          
          toast.success(`Found ${data.directLinks.length} HubCloud links`)
        } else {
          toast.error("No content found")
          setHubCloudLinks([])
          setMdriveEpisodes([])
        }
      } else {
        toast.error("Failed to extract content")
        setHubCloudLinks([])
        setMdriveEpisodes([])
      }
    } catch (error) {
      console.error("Error fetching MDrive content:", error)
      toast.error("Failed to fetch content")
      setHubCloudLinks([])
      setMdriveEpisodes([])
    } finally {
      setFetchingHubCloud(false)
    }
  }

  const fetchEpisodes = async (url: string) => {
    if (!url) {
      toast.error("No episode link available")
      return
    }

    setFetchingEpisodes(true)
    try {
      const response = await fetch(`https://screenscape-aipi.vercel.app/api/drive?action=episodes&url=${encodeURIComponent(url)}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const episodeData = await response.json()
      
      console.log("Episode data received:", episodeData)
      
      if (Array.isArray(episodeData) && episodeData.length > 0) {
        // Add season detection for episodes with debugging
        const episodesWithSeasons = episodeData.map((ep: Episode, index: number) => {
          const season = extractSeasonFromContent(ep.title);
          console.log(`Episode ${index}: "${ep.title}" -> Season ${season}`);
          return {
            ...ep,
            season
          };
        });
        setEpisodes(episodesWithSeasons)
        
        // Debug: Log detected seasons
        const detectedSeasons = [...new Set(episodesWithSeasons.map(ep => ep.season))];
        console.log("Detected seasons:", detectedSeasons);
      } else if (episodeData && episodeData.episodes && Array.isArray(episodeData.episodes)) {
        // Add season detection for episodes with debugging
        const episodesWithSeasons = episodeData.episodes.map((ep: Episode, index: number) => {
          const season = extractSeasonFromContent(ep.title);
          console.log(`Episode ${index}: "${ep.title}" -> Season ${season}`);
          return {
            ...ep,
            season
          };
        });
        setEpisodes(episodesWithSeasons)
        
        // Debug: Log detected seasons
        const detectedSeasons = [...new Set(episodesWithSeasons.map(ep => ep.season))];
        console.log("Detected seasons:", detectedSeasons);
      } else {
        console.log("No episodes found, creating single episode from URL")
        const singleEpisode = {
          title: "Movie",
          link: url,
          season: 1
        }
        setEpisodes([singleEpisode])
      }
    } catch (error) {
      console.error("Error fetching episodes:", error)
      
      const fallbackEpisode = {
        title: "Movie",
        link: url,
        season: 1
      }
      setEpisodes([fallbackEpisode])
      
      toast.error("Using direct link as episode API failed")
    } finally {
      setFetchingEpisodes(false)
    }
  }

  const fetchStreamLinks = async (episodeUrl: string) => {
    setFetchingStreams(true)
    try {
      const response = await fetch(`https://scarper-ansh.vercel.app/api/hubcloud?url=${encodeURIComponent(episodeUrl)}`)
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
    if (!episodeLink || !userApiKey) {
      toast.error("No episode link available or API key missing")
      return
    }

    setFetchingVideoUrl(true)
    try {
      const response = await fetch(`/api/hubcloud?url=${encodeURIComponent(episodeLink)}`, {
        headers: {
          'x-api-key': userApiKey
        }
      })
      const data = await response.json()
      
      if (data.success && data.links && data.links.length > 0) {
        setStreamLinks(data.links)
      } else {
        if (response.status === 401) {
          toast.error("API key required. Please create an API key in the API Keys section.")
        } else {
          toast.error(data.error || "Failed to fetch video URLs")
        }
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

  const handleSeasonChange = (season: number) => {
    setSelectedSeason(season)
    setSelectedQuality(null)
    setEpisodes([])
    setHubCloudLinks([])
    setMdriveEpisodes([])
    
    // Auto-select 480p quality for the new season if available
    if (movieDetails) {
      const seasonEpisodes = movieDetails.episodes.filter(ep => ep.season === season)
      const quality480p = seasonEpisodes.find(ep => ep.quality.includes('480p'))
      if (quality480p) {
        setSelectedQuality(quality480p)
        if (quality480p.url.includes('mdrive.today')) {
          fetchHubCloudLinks(quality480p.url)
        } else {
          fetchEpisodes(quality480p.url)
        }
      }
    }
  }

  const handleQualityClick = (quality: {url: string, quality: string}) => {
    setSelectedQuality(quality)
    setEpisodes([])
    setHubCloudLinks([])
    setMdriveEpisodes([])
    
    if (quality.url.includes('mdrive.today')) {
      fetchHubCloudLinks(quality.url)
    } else {
      fetchEpisodes(quality.url)
    }
  }

  const handleHubCloudLinkClick = async (link: HubCloudLink) => {
    const fakeEpisode: Episode = {
      title: link.title,
      link: link.url,
      season: link.season
    }
    setSelectedEpisode(fakeEpisode)
    setDialogOpen(true)
    setStreamLinks([])
    setCopiedIndex(null)
    fetchVideoUrl(link.url)
  }

  // Helper function to extract season from title or HTML
  const extractSeasonFromContent = (title: string, htmlContent?: string): number => {
    // First, try to extract from the title using comprehensive patterns
    const seasonPatterns = [
      /season\s*(\d+)/i,
      /s(\d+)(?:e\d+)?/i,
      /series\s*(\d+)/i,
      /(\d+)(?:st|nd|rd|th)?\s*season/i
    ];
    
    for (const pattern of seasonPatterns) {
      const titleMatch = title.match(pattern);
      if (titleMatch) {
        return parseInt(titleMatch[1]);
      }
    }
    
    // If HTML content is available, try to extract season from it
    if (htmlContent) {
      // Remove HTML tags for better text matching
      const cleanHtml = htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
      
      // More specific HTML patterns for season detection
      const htmlPatterns = [
        /Season\s*(\d+)/gi,
        /season\s*(\d+)/gi,
        /S(\d+)/g,
        /Series\s*(\d+)/gi
      ];
      
      // Get all season matches from HTML content
      const allSeasons = new Set<number>();
      
      for (const pattern of htmlPatterns) {
        let match;
        while ((match = pattern.exec(cleanHtml)) !== null) {
          const seasonNum = parseInt(match[1]);
          if (seasonNum > 0 && seasonNum <= 20) { // Reasonable season range
            allSeasons.add(seasonNum);
          }
        }
      }
      
      // If we found seasons in HTML, try to match with the title/link
      if (allSeasons.size > 0) {
        const seasonsArray = Array.from(allSeasons).sort();
        
        // Try to match the title with specific season indicators
        for (const season of seasonsArray) {
          const seasonRegex = new RegExp(`season\\s*${season}|s${season}`, 'i');
          if (seasonRegex.test(title) || seasonRegex.test(htmlContent)) {
            console.log(`Found season ${season} for title: "${title}"`);
            return season;
          }
        }
        
        // If we can't match specifically, return the first season found
        console.log(`Using first detected season ${seasonsArray[0]} for title: "${title}"`);
        return seasonsArray[0];
      }
    }
    
    // Check if title contains episode indicators for different seasons
    const episodeSeasonMatch = title.match(/S(\d+)E\d+/i);
    if (episodeSeasonMatch) {
      return parseInt(episodeSeasonMatch[1]);
    }
    
    // Default to season 1
    return 1;
  };

  // Helper function to group episodes by season
  const groupEpisodesBySeason = (episodes: Episode[]): Record<number, Episode[]> => {
    return episodes.reduce((acc, episode) => {
      const season = episode.season || 1;
      if (!acc[season]) {
        acc[season] = [];
      }
      acc[season].push(episode);
      return acc;
    }, {} as Record<number, Episode[]>);
  };

  // Helper function to group HubCloud links by season
  const groupHubCloudBySeason = (links: HubCloudLink[]): Record<number, HubCloudLink[]> => {
    return links.reduce((acc, link) => {
      const season = link.season || 1;
      if (!acc[season]) {
        acc[season] = [];
      }
      acc[season].push(link);
      return acc;
    }, {} as Record<number, HubCloudLink[]>);
  };

  // Helper function to group MDrive episodes by season
  const groupMdriveBySeason = (episodes: MdriveEpisode[]): Record<number, MdriveEpisode[]> => {
    return episodes.reduce((acc, episode) => {
      const season = episode.season || 1;
      if (!acc[season]) {
        acc[season] = [];
      }
      acc[season].push(episode);
      return acc;
    }, {} as Record<number, MdriveEpisode[]>);
  };

  // Get available seasons from API response
  const getAvailableSeasonsFromAPI = () => {
    if (!movieDetails) return []
    const seasons = [...new Set(movieDetails.episodes.map(ep => ep.season))].sort((a, b) => a - b)
    return seasons
  }

  // Get quality options for selected season
  const getQualityOptionsForSeason = () => {
    if (!movieDetails || selectedSeason === null) return []
    return movieDetails.episodes.filter(ep => ep.season === selectedSeason)
  }

  const apiSeasons = getAvailableSeasonsFromAPI()
  const seasonQualityOptions = getQualityOptionsForSeason()

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
      <DashboardNavbar title={inferredTitle} />
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
                
                {/* Season Selector */}
                {apiSeasons.length > 1 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-3">Select Season</h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="flex items-center gap-2">
                          Season {selectedSeason}
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
                        {apiSeasons.map((season) => (
                          <DropdownMenuItem 
                            key={season}
                            onClick={() => handleSeasonChange(season)}
                            className={selectedSeason === season ? "bg-accent" : ""}
                          >
                            Season {season}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
                
                {/* Quality Selector - Only show qualities for selected season */}
                {selectedSeason !== null && seasonQualityOptions.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-3">
                      Select Quality - Season {selectedSeason}
                    </h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" className="w-auto shadow-sm">
                          {selectedQuality ? extractQuality(selectedQuality.quality) : "Select Quality"}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-40" align="center">
                        {seasonQualityOptions.map((quality, idx) => (
                          <DropdownMenuItem 
                            key={idx}
                            onClick={() => handleQualityClick(quality)}
                            className="cursor-pointer"
                          >
                            {extractQuality(quality.quality)}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}

                {/* HubCloud Links Section */}
                {selectedQuality && selectedQuality.url.includes('mdrive.today') && mdriveEpisodes.length === 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-3">
                      HubCloud Links - {extractQuality(selectedQuality.quality)} - Season {selectedSeason}
                    </h3>
                    {fetchingHubCloud ? (
                      <div className="flex items-center gap-2 py-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Loading HubCloud links...</span>
                      </div>
                    ) : hubCloudLinks.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {hubCloudLinks.map((link, idx) => (
                          <Button
                            key={idx}
                            variant="outline"
                            className="text-xs h-auto p-3 flex flex-col items-start gap-1 max-w-full"
                            onClick={() => handleHubCloudLinkClick(link)}
                          >
                            <div className="flex items-center gap-2 w-full min-w-0">
                              <Download className="h-3 w-3 text-blue-500 flex-shrink-0" />
                              <span className="font-medium truncate" title={link.title}>
                                {link.title.length > 40 ? `${link.title.slice(0, 40)}...` : link.title}
                              </span>
                            </div>
                            {link.id && (
                              <span className="text-xs text-muted-foreground self-start">
                                {link.id.replace('HubCloud-', '')}
                              </span>
                            )}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground py-4">
                        No HubCloud links found
                      </div>
                    )}
                  </div>
                )}

                {/* Episodes Section (for non-mdrive URLs) */}
                {selectedQuality && !selectedQuality.url.includes('mdrive.today') && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-3">
                      Episodes - {extractQuality(selectedQuality.quality)} - Season {selectedSeason}
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
                        No episodes found
                      </div>
                    )}
                  </div>
                )}

                {/* MDrive Episodes Section */}
                {selectedQuality && selectedQuality.url.includes('mdrive.today') && mdriveEpisodes.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-3">
                      Episodes - {extractQuality(selectedQuality.quality)} - Season {selectedSeason}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {mdriveEpisodes.map((episode, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          className="text-xs relative"
                          onClick={() => {
                            if (episode.hubCloudLinks.length > 0) {
                              handleHubCloudLinkClick(episode.hubCloudLinks[0])
                            }
                          }}
                          disabled={episode.hubCloudLinks.length === 0}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Episode {episode.episodeNumber.padStart(2, '0')}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
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
    </div>
  )
}
