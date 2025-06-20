"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState, use } from "react"
import { cn } from "@/lib/utils"
import {
  Info,
  ExternalLink,
  Loader2,
  Copy,
  Check,
  Download,
  ArrowLeft,
  Calendar,
  Star,
  Play,
  ChevronDown
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
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import Image from "next/image"

// Types for VegaMovies details
interface VegaMovieDetails {
  seriesInfo?: {
    title?: string
    imdbRating?: string
    imdbUrl?: string
    seriesName?: string
    movieName?: string
    season?: string
    episode?: string
    language?: string
    subtitle?: string
    releasedYear?: string
    releaseYear?: string
    episodeSize?: string
    size?: string
    completeZip?: string
    quality?: string
    format?: string
    contentType?: 'series' | 'movie'
  }
  synopsis?: string
  seasonQualities?: Array<{
    quality: string
    language?: string
    size?: string
    vCloudLink?: string
  }>
  movieQualities?: Array<{
    quality: string
    language?: string
    size?: string
    downloadLink?: string
  }>
  sourceUrl: string
}

interface ApiResponse {
  success: boolean
  data?: VegaMovieDetails
  error?: string
}

interface VCloudLink {
  url: string;
  server: string;
  type: 'download';
  resumeSupported: boolean;
  description: string;
}

interface NextDriveLink {
  url: string;
  server: string;
  type: string;
  description: string;
  episode?: number;
}

interface NextDriveResponse {
  success: boolean;
  data?: {
    vCloudLinks: NextDriveLink[];
    episodeLinks: NextDriveLink[];
    totalLinks: number;
  };
  error?: string;
  message?: string;
  remainingRequests?: number;
}

interface VCloudResponse {
  success: boolean;
  originalUrl?: string;
  downloadLinks?: VCloudLink[];
  totalLinks?: number;
  extractedAt?: string;
  remainingRequests?: number;
  error?: string;
  message?: string;
}

export default function VegaMovieDetailPage({ params }: { params: { id: string } }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [movieDetails, setMovieDetails] = useState<VegaMovieDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFullOverview, setShowFullOverview] = useState(false)
  const [selectedLink, setSelectedLink] = useState<any>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [userApiKey, setUserApiKey] = useState<string | null>(null)
  const [vcloudLinks, setVcloudLinks] = useState<{[key: string]: VCloudLink[]}>({})
  const [loadingVcloud, setLoadingVcloud] = useState<{[key: string]: boolean}>({})
  const [nextDriveLinks, setNextDriveLinks] = useState<NextDriveLink[]>([])
  const [loadingNextDrive, setLoadingNextDrive] = useState(false)
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null)
  const [downloadLinks, setDownloadLinks] = useState<VCloudLink[]>([])
  const [fetchingLinks, setFetchingLinks] = useState(false)
  const [selectedMovie, setSelectedMovie] = useState<string | null>(null)
  const [movieDownloadLinks, setMovieDownloadLinks] = useState<VCloudLink[]>([])

  // Unwrap the params object using React.use()
  const unwrappedParams = use(params);
  const { id } = unwrappedParams;
  
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

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
        // Reconstruct the VegaMovies URL from the ID
        const fullUrl = `https://vegamovies.yoga/${id}/`
        
        const res = await fetch(`/api/vegamovies/details?url=${encodeURIComponent(fullUrl)}`, {
          headers: {
            'x-api-key': userApiKey
          }
        })
        const data: ApiResponse = await res.json()

        if (data.success && data.data) {
          setMovieDetails(data.data)
          
          // Auto-select first season if it's a series
          if (data.data.seriesInfo?.contentType !== 'movie' && 
              data.data.seasonQualities && 
              data.data.seasonQualities.length > 0) {
            
            const firstLink = data.data.seasonQualities[0];
            const seasonMatch = firstLink.quality.match(/Season\s*(\d+)/i);
            const qualityMatch = firstLink.quality.match(/(480p|720p|1080p|2160p|4K)/i);
            const languageMatch = firstLink.quality.match(/\{([^}]+)\}/);
            
            const seasonNumber = seasonMatch ? seasonMatch[1] : '1';
            const quality = qualityMatch ? qualityMatch[1] : 'HD';
            const parsedLanguage = languageMatch ? languageMatch[1] : firstLink.language;
            
            const displayText = `S${seasonNumber} ${quality}`;
            const fullDisplayText = `${displayText}${parsedLanguage ? ` (${parsedLanguage})` : ''}`;
            
            if (firstLink.vCloudLink) {
              extractNextDriveLinks(firstLink.vCloudLink, fullDisplayText);
            }
          }
          // Auto-select first movie quality if it's a movie
          else if (data.data.seriesInfo?.contentType === 'movie' && 
                   data.data.movieQualities && 
                   data.data.movieQualities.length > 0) {
            
            const firstLink = data.data.movieQualities[0];
            // Parse movie quality display similar to series
            const qualityMatch = firstLink.quality.match(/(480p|720p|1080p|2160p|4K)/i);
            const quality = qualityMatch ? qualityMatch[1] : firstLink.quality;
            const movieInfo = `${quality}${firstLink.language ? ` (${firstLink.language})` : ''}`;
            
            if (firstLink.downloadLink) {
              extractVCloudLinksForMovie(firstLink.downloadLink, movieInfo);
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

  const extractVCloudLinks = async (vcloudUrl: string, linkKey: string) => {
    if (!userApiKey || !vcloudUrl) return;

    setLoadingVcloud(prev => ({ ...prev, [linkKey]: true }));
    
    try {
      const response = await fetch(`/api/vcloud?url=${encodeURIComponent(vcloudUrl)}`, {
        headers: {
          'x-api-key': userApiKey
        }
      });
      
      const data: VCloudResponse = await response.json();
      
      if (data.success && data.downloadLinks) {
        setVcloudLinks(prev => ({ ...prev, [linkKey]: data.downloadLinks || [] }));
        toast.success(`Extracted ${data.downloadLinks.length} download links`);
      } else {
        toast.error(data.error || 'Failed to extract VCloud links');
      }
    } catch (error) {
      console.error('VCloud extraction error:', error);
      toast.error('Failed to extract VCloud links');
    } finally {
      setLoadingVcloud(prev => ({ ...prev, [linkKey]: false }));
    }
  };

  const extractNextDriveLinks = async (nextDriveUrl: string, seasonInfo: string) => {
    if (!userApiKey || !nextDriveUrl) return;

    setLoadingNextDrive(true);
    setSelectedSeason(seasonInfo);
    
    try {
      const response = await fetch(`/api/vegamovies/nextdrive?url=${encodeURIComponent(nextDriveUrl)}`, {
        headers: {
          'x-api-key': userApiKey
        }
      });
      
      const data: NextDriveResponse = await response.json();
      
      if (data.success && data.data) {
        // Combine both general and episode links
        const allLinks = [...(data.data.vCloudLinks || []), ...(data.data.episodeLinks || [])];
        setNextDriveLinks(allLinks);
        toast.success(`Loaded ${allLinks.length} episode links for ${seasonInfo}`);
      } else {
        toast.error(data.error || 'Failed to extract NextDrive links');
        setNextDriveLinks([]);
      }
    } catch (error) {
      console.error('NextDrive extraction error:', error);
      toast.error('Failed to extract NextDrive links');
      setNextDriveLinks([]);
    } finally {
      setLoadingNextDrive(false);
    }
  };

  const extractVCloudLinksForEpisode = async (vcloudUrl: string) => {
    if (!userApiKey || !vcloudUrl) return;

    setFetchingLinks(true);
    setDownloadLinks([]);
    
    try {
      const response = await fetch(`/api/vcloud?url=${encodeURIComponent(vcloudUrl)}`, {
        headers: {
          'x-api-key': userApiKey
        }
      });
      
      const data: VCloudResponse = await response.json();
      
      if (data.success && data.downloadLinks) {
        setDownloadLinks(data.downloadLinks);
        toast.success(`Extracted ${data.downloadLinks.length} download links`);
      } else {
        toast.error(data.error || 'Failed to extract VCloud links');
        setDownloadLinks([]);
      }
    } catch (error) {
      console.error('VCloud extraction error:', error);
      toast.error('Failed to extract VCloud links');
      setDownloadLinks([]);
    } finally {
      setFetchingLinks(false);
    }
  };

  const extractVCloudLinksForMovie = async (vcloudUrl: string, movieInfo: string) => {
    if (!userApiKey || !vcloudUrl) return;

    setLoadingNextDrive(true);
    setSelectedMovie(movieInfo);
    setMovieDownloadLinks([]);
    
    try {
      // First call NextDrive API
      const nextDriveResponse = await fetch(`/api/vegamovies/nextdrive?url=${encodeURIComponent(vcloudUrl)}`, {
        headers: {
          'x-api-key': userApiKey
        }
      });
      
      const nextDriveData: NextDriveResponse = await nextDriveResponse.json();
      
      if (nextDriveData.success && nextDriveData.data) {
        // Get the first VCloud link from NextDrive response
        const allLinks = [...(nextDriveData.data.vCloudLinks || []), ...(nextDriveData.data.episodeLinks || [])];
        
        if (allLinks.length > 0) {
          // Use the first available link for VCloud extraction
          const firstVCloudLink = allLinks[0];
          
          // Now call VCloud API with the extracted link
          const vcloudResponse = await fetch(`/api/vcloud?url=${encodeURIComponent(firstVCloudLink.url)}`, {
            headers: {
              'x-api-key': userApiKey
            }
          });
          
          const vcloudData: VCloudResponse = await vcloudResponse.json();
          
          if (vcloudData.success && vcloudData.downloadLinks) {
            setMovieDownloadLinks(vcloudData.downloadLinks);
            toast.success(`Extracted ${vcloudData.downloadLinks.length} download links for ${movieInfo}`);
          } else {
            toast.error(vcloudData.error || 'Failed to extract VCloud links');
            setMovieDownloadLinks([]);
          }
        } else {
          toast.error('No VCloud links found in NextDrive response');
          setMovieDownloadLinks([]);
        }
      } else {
        toast.error(nextDriveData.error || 'Failed to extract NextDrive links');
        setMovieDownloadLinks([]);
      }
    } catch (error) {
      console.error('Movie download extraction error:', error);
      toast.error('Failed to extract download links');
      setMovieDownloadLinks([]);
    } finally {
      setLoadingNextDrive(false);
    }
  };

  const copyToClipboard = async (url: string) => {
    if (!url) return
    
    try {
      await navigator.clipboard.writeText(url)
      toast.success("URL copied to clipboard!")
    } catch (error) {
      toast.error("Failed to copy URL")
    }
  }

  const goBack = () => {
    router.back()
  }

  const handleDownloadClick = async (link: any) => {
    setSelectedLink(link)
    setDialogOpen(true)
    setCopiedIndex(null)
  }

  const handleEpisodeClick = async (episodeLink: NextDriveLink) => {
    setSelectedLink(episodeLink);
    setDialogOpen(true);
    setCopiedIndex(null);
    await extractVCloudLinksForEpisode(episodeLink.url);
  };

  const handleMovieDownloadClick = async (downloadLink: VCloudLink) => {
    setSelectedLink(downloadLink);
    setDialogOpen(true);
    setCopiedIndex(null);
    setDownloadLinks([downloadLink]);
  };

  const handleDirectDownload = (url: string) => {
    window.location.href = url;
  };

  const isGoogleDriveDirectLink = (url: string) => {
    return url.includes('video-downloads.googleusercontent.com');
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

  const seriesInfo = movieDetails?.seriesInfo
  const isMovie = seriesInfo?.contentType === 'movie'
  const title = seriesInfo?.movieName || seriesInfo?.seriesName || seriesInfo?.title || "VegaMovies Content"

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center px-4">
          <Button variant="ghost" size="icon" onClick={goBack} className="mr-2 font-mono">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold font-mono tracking-tight">VegaMovies Details</h1>
        </div>
      </div>
      
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0 overflow-y-auto">
        {loading ? (
          <div className="w-full mt-4">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="w-full h-64 bg-muted animate-pulse rounded-lg mb-4" />
                <div className="h-8 bg-muted animate-pulse rounded w-1/3 mb-2" />
                <div className="h-4 bg-muted animate-pulse rounded w-full mb-1" />
                <div className="h-4 bg-muted animate-pulse rounded w-5/6" />
              </CardContent>
            </Card>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-[50vh] text-center">
            <p className="text-destructive mb-4 font-mono text-sm">{error}</p>
            <Button onClick={() => window.location.reload()} className="font-mono">Retry</Button>
          </div>
        ) : movieDetails ? (
          <>
            {/* Header Section */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {/* Poster placeholder */}
                  <div className="md:col-span-1">
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-muted flex items-center justify-center border border-border/50">
                      <Play className="h-12 w-12 text-muted-foreground" />
                    </div>
                  </div>
                  
                  {/* Info */}
                  <div className="md:col-span-3">
                    <h1 className="text-2xl sm:text-3xl font-bold mb-4 font-mono tracking-tight">{title}</h1>
                    
                    {/* Meta Info */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant="outline" className="font-mono text-xs">
                        {isMovie ? 'MOVIE' : 'TV SERIES'}
                      </Badge>
                      {(seriesInfo?.releaseYear || seriesInfo?.releasedYear) && (
                        <div className="flex items-center text-xs text-muted-foreground bg-accent/50 px-2 py-1 rounded font-mono">
                          <Calendar className="h-3 w-3 mr-1" />
                          <span>{seriesInfo.releaseYear || seriesInfo.releasedYear}</span>
                        </div>
                      )}
                      {seriesInfo?.quality && (
                        <Badge variant="outline" className="font-mono text-xs">
                          {seriesInfo.quality}
                        </Badge>
                      )}
                    </div>

                    {/* IMDb Rating */}
                    {seriesInfo?.imdbRating && (
                      <div className="mb-4">
                        <a 
                          href={seriesInfo.imdbUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-mono hover:underline"
                        >
                          <Badge variant="outline" className="bg-amber-100/50 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-400/20 font-mono">
                            IMDb
                          </Badge>
                          {seriesInfo.imdbRating}
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    )}

                    {/* Languages */}
                    {seriesInfo?.language && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium mb-2 font-mono">Language</h4>
                        <Badge variant="outline" className="font-mono text-xs">
                          {seriesInfo.language}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Synopsis */}
            {movieDetails.synopsis && (
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-6">
                  <h2 className="flex items-center gap-2 text-lg font-semibold mb-3 font-mono">
                    <Info className="h-4 w-4 text-purple-500" />
                    Synopsis
                  </h2>
                  <div className="relative">
                    <div className={`relative overflow-hidden transition-all duration-300 text-muted-foreground font-mono text-sm leading-relaxed ${showFullOverview ? '' : 'max-h-[4.5em]'}`}>
                      <p>{movieDetails.synopsis}</p>
                    </div>
                    {!showFullOverview && movieDetails.synopsis.length > 200 && (
                      <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-card to-transparent"></div>
                    )}
                    {movieDetails.synopsis.length > 200 && (
                      <button 
                        onClick={() => setShowFullOverview(!showFullOverview)} 
                        className="text-purple-600 dark:text-purple-500 font-mono text-xs mt-2 hover:text-purple-500 dark:hover:text-purple-400 transition-colors"
                      >
                        {showFullOverview ? "Read Less" : "Read More"}
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Download Links for Movies */}
            {isMovie && movieDetails.movieQualities && movieDetails.movieQualities.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Download Links
                </h3>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between bg-transparent border border-border/50 hover:bg-accent/50">
                      <span>{selectedMovie || "Select Quality"}</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto">
                    {movieDetails.movieQualities.map((link, idx) => {
                      // Enhanced parsing for movie quality - similar to series parsing
                      const qualityMatch = link.quality.match(/(480p|720p|1080p|2160p|4K)/i);
                      const quality = qualityMatch ? qualityMatch[1] : 'HD';
                      const languageMatch = link.quality.match(/\{([^}]+)\}/);
                      const parsedLanguage = languageMatch ? languageMatch[1] : link.language;
                      
                      // Create clean display text: "1080p (English)"
                      const displayText = quality;
                      const fullDisplayText = `${displayText}${parsedLanguage ? ` (${parsedLanguage})` : ''}`;

                      return (
                        <DropdownMenuItem 
                          key={idx}
                          onClick={() => {
                            if (link.downloadLink) {
                              extractVCloudLinksForMovie(link.downloadLink, fullDisplayText);
                            }
                          }}
                          className="cursor-pointer"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          {fullDisplayText}
                          {link.size && (
                            <span className="ml-auto text-xs text-muted-foreground">
                              {link.size}
                            </span>
                          )}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Movie Download Links Display - Main Page */}
            {isMovie && (loadingNextDrive || movieDownloadLinks.length > 0) && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  {selectedMovie ? `Download Servers - ${selectedMovie}` : 'Download Servers'}
                </h3>

                {loadingNextDrive ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Loading download servers...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {movieDownloadLinks.map((dlLink, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        className="text-xs h-auto p-3 flex flex-col items-start gap-1"
                        onClick={() => handleMovieDownloadClick(dlLink)}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <Download className="h-3 w-3 text-blue-500" />
                          <span className="font-medium text-sm">{dlLink.server}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {dlLink.resumeSupported ? 'Resume Supported' : 'No Resume'}
                        </span>
                      </Button>
                    ))}
                  </div>
                )}

                {!loadingNextDrive && movieDownloadLinks.length === 0 && selectedMovie && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No download servers found for {selectedMovie}</p>
                  </div>
                )}
              </div>
            )}

            {/* Download Links for Series */}
            {!isMovie && movieDetails.seasonQualities && movieDetails.seasonQualities.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Season Downloads
                </h3>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between bg-transparent border border-border/50 hover:bg-accent/50">
                      <span>{selectedSeason || "Select Season"}</span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto">
                    {movieDetails.seasonQualities.map((link, idx) => {
                      // Enhanced parsing for season information
                      const seasonMatch = link.quality.match(/Season\s*(\d+)/i);
                      const qualityMatch = link.quality.match(/(480p|720p|1080p|2160p|4K)/i);
                      const languageMatch = link.quality.match(/\{([^}]+)\}/);
                      
                      const seasonNumber = seasonMatch ? seasonMatch[1] : (idx + 1).toString();
                      const quality = qualityMatch ? qualityMatch[1] : 'HD';
                      const parsedLanguage = languageMatch ? languageMatch[1] : link.language;
                      
                      // Create clean display text: "S1 1080p"
                      const displayText = `S${seasonNumber} ${quality}`;
                      const fullDisplayText = `${displayText}${parsedLanguage ? ` (${parsedLanguage})` : ''}`;

                      return (
                        <DropdownMenuItem 
                          key={idx}
                          onClick={() => {
                            if (link.vCloudLink) {
                              extractNextDriveLinks(link.vCloudLink, fullDisplayText);
                            }
                          }}
                          className="cursor-pointer"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          {fullDisplayText}
                          {link.size && (
                            <span className="ml-auto text-xs text-muted-foreground">
                              {link.size}
                            </span>
                          )}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Episode Links Display - Main Page */}
            {!isMovie && (loadingNextDrive || nextDriveLinks.length > 0) && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  {selectedSeason ? `Episodes - ${selectedSeason}` : 'Episodes'}
                </h3>

                {loadingNextDrive ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Loading episodes...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {nextDriveLinks
                      .sort((a, b) => (a.episode || 0) - (b.episode || 0))
                      .map((epLink, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                        className="text-xs h-auto p-3 flex flex-col items-start gap-1 max-w-full"
                          onClick={() => handleEpisodeClick(epLink)}
                        >
                          <span className="font-medium text-sm">
                            {epLink.episode ? `Episode ${epLink.episode}` : `Episode ${idx + 1}`}
                          </span>
                        </Button>
                      ))}
                  </div>
                )}

                {!loadingNextDrive && nextDriveLinks.length === 0 && selectedSeason && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No episodes found for {selectedSeason}</p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-[50vh]">
            <p className="text-muted-foreground text-sm font-mono">No movie details found</p>
          </div>
        )}
      </div>

      {/* Download Links Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedLink?.episode ? `Episode ${selectedLink.episode}` : selectedLink?.description} Download
            </DialogTitle>
            <DialogDescription>
              Available download servers
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {fetchingLinks ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p className="text-sm text-muted-foreground">Fetching download links...</p>
                </div>
              </div>
            ) : downloadLinks.length > 0 ? (
              <div className="space-y-3">
                <label className="text-sm font-medium">Download Servers</label>
                {downloadLinks.map((link, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        {link.server} {link.resumeSupported ? '(Resume)' : '(No Resume)'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={link.url}
                        readOnly
                        className="flex-1 text-xs"
                      />
                      {isGoogleDriveDirectLink(link.url) ? (
                        <Button
                          variant="default"
                          size="icon"
                          onClick={() => handleDirectDownload(link.url)}
                          className="shrink-0"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            copyToClipboard(link.url);
                            setCopiedIndex(index);
                            setTimeout(() => setCopiedIndex(null), 2000);
                          }}
                          className="shrink-0"
                        >
                          {copiedIndex === index ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No download links available</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}