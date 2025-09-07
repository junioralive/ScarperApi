"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState, use } from "react"
import {
  Info,
  ExternalLink,
  Loader2,
  Copy,
  Check,
  Play,
  Download,
  ArrowLeft,
  Calendar,
  Star
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
import { toast } from "sonner"
import Image from "next/image"

// Types for DesireMovies details
interface DesireMovieDetails {
  title: string
  posterUrl?: string
  movieTitle?: string
  year?: string
  availableQualities?: string
  imdbRating?: string
  languages?: string
  genres?: string
  plot?: string
  contentType: 'Movie' | 'TV Series'
  episodes?: Array<{
    episodeNumber: number
    episodeName: string
    downloadLinks: Array<{
      quality: string
      downloadUrl: string
      encoding: string
      type: string
    }>
  }>
  downloadLinks?: Array<{
    quality: string
    size: string
    downloadUrl: string
    type: string
  }>
  totalEpisodes?: number
}

interface ApiResponse {
  success: boolean
  movieDetails?: DesireMovieDetails
  error?: string
}

export default function DesireMovieDetailPage({ params }: { params: { id: string } }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [movieDetails, setMovieDetails] = useState<DesireMovieDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFullOverview, setShowFullOverview] = useState(false)
  const [selectedLink, setSelectedLink] = useState<any>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [downloadLinks, setDownloadLinks] = useState<any[]>([])
  const [fetchingLinks, setFetchingLinks] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [userApiKey, setUserApiKey] = useState<string | null>(null)

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
        const fullUrl = `https://desiremovies.nagoya//${id}/`
        
        const res = await fetch(`/api/desiremovies/details?url=${encodeURIComponent(fullUrl)}`, {
          headers: {
            'x-api-key': userApiKey
          }
        })
        const data: ApiResponse = await res.json()

        if (data.success && data.movieDetails) {
          setMovieDetails(data.movieDetails)
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

  const fetchAllProviderLinks = async (downloadUrl: string) => {
    if (!userApiKey) {
      toast.error("API key required. Please create an API key in the API Keys section.")
      return
    }
    
    setFetchingLinks(true)
    try {
      // First fetch the GyanGurus links
      const gyanRes = await fetch(`/api/gyanigurus?url=${encodeURIComponent(downloadUrl)}`, {
        headers: {
          'x-api-key': userApiKey
        }
      })
      const gyanData = await gyanRes.json()
      
      if (gyanData.success && gyanData.data.links) {
        const allLinks = []
        
        // Process each provider link
        for (const link of gyanData.data.links) {
          if (link.provider === 'HubCloud') {
            // Fetch HubCloud stream URLs immediately
            try {
              const hubRes = await fetch(`/api/hubcloud?url=${encodeURIComponent(link.url)}`, {
                headers: {
                  'x-api-key': userApiKey
                }
              })
              const hubData = await hubRes.json()
              
              if (hubData.success && hubData.links && hubData.links.length > 0) {
                // Add each stream URL as a separate entry
                hubData.links.forEach((streamLink: any, index: number) => {
                  allLinks.push({
                    ...link,
                    url: streamLink.link,
                    displayName: `${link.provider} - ${streamLink.server}`,
                    streamServer: streamLink.server,
                    isStreamUrl: true,
                    originalProvider: link.provider
                  })
                })
              } else {
                // If HubCloud fetch fails, still show the original link
                allLinks.push({
                  ...link,
                  displayName: `${link.provider} (Failed to load streams)`,
                  isStreamUrl: false
                })
              }
            } catch (error) {
              console.error("Error fetching HubCloud streams:", error)
              allLinks.push({
                ...link,
                displayName: `${link.provider} (Error loading streams)`,
                isStreamUrl: false
              })
            }
          } else {
            // For non-HubCloud providers, add as-is
            allLinks.push({
              ...link,
              displayName: link.provider,
              isStreamUrl: false
            })
          }
        }
        
        setDownloadLinks(allLinks)
      } else {
        toast.error("Failed to fetch download links")
        setDownloadLinks([])
      }
    } catch (error) {
      console.error("Error fetching download links:", error)
      toast.error("Failed to fetch download links")
      setDownloadLinks([])
    } finally {
      setFetchingLinks(false)
    }
  }

  const handleDownloadClick = async (link: any) => {
    setSelectedLink(link)
    setDialogOpen(true)
    setDownloadLinks([])
    setCopiedIndex(null)
    fetchAllProviderLinks(link.downloadUrl)
  }

  const handleEpisodeDownloadClick = async (episodeLink: any) => {
    setSelectedLink(episodeLink)
    setDialogOpen(true)
    setDownloadLinks([])
    setCopiedIndex(null)
    fetchAllProviderLinks(episodeLink.downloadUrl)
  }

  const copyToClipboard = async (url: string, index: number) => {
    if (!url) return
    
    try {
      await navigator.clipboard.writeText(url)
      setCopiedIndex(index)
      toast.success("URL copied to clipboard!")
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch (error) {
      toast.error("Failed to copy URL")
    }
  }

  const handleDirectDownload = (url: string) => {
    // Open the Google Drive download link in the same tab
    window.location.href = url
  }

  const isGoogleDriveDirectLink = (url: string) => {
    return url.includes('video-downloads.googleusercontent.com')
  }

  const goBack = () => {
    router.back()
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
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <Button variant="ghost" size="icon" onClick={goBack} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Movie Details</h1>
        </div>
      </div>
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
                    src={movieDetails.posterUrl || 'https://placehold.jp/24/363636/ffffff/400x600.png?text=ScreenScape'}
                    alt={movieDetails.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 25vw"
                    priority
                  />
                </div>
              </div>
              
              {/* Movie Info */}
              <div className="md:col-span-3">
                <h1 className="text-2xl sm:text-3xl font-bold mb-4">
                  {movieDetails.movieTitle || movieDetails.title}
                </h1>
                
                {/* Movie Meta Info */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {movieDetails.year && (
                    <div className="flex items-center text-xs text-muted-foreground bg-white/5 px-2 py-1 rounded-full">
                      <Calendar className="h-3 w-3 mr-1" />
                      <span>{movieDetails.year}</span>
                    </div>
                  )}
                  {movieDetails.imdbRating && (
                    <div className="flex items-center text-xs text-muted-foreground bg-amber-100/50 dark:bg-amber-400/10 px-2 py-1 rounded-full">
                      <Star className="h-3 w-3 mr-1 text-amber-500" />
                      <span>{movieDetails.imdbRating}</span>
                    </div>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {movieDetails.contentType}
                  </Badge>
                </div>

                {/* Available Qualities */}
                {movieDetails.availableQualities && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium mb-2">Available Qualities</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {movieDetails.availableQualities.split('|').map((quality, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {quality.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Languages */}
                {movieDetails.languages && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium mb-2">Languages</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {movieDetails.languages.split(/[,–-]/).map((lang, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {lang.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Genres */}
                {movieDetails.genres && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium mb-2">Genres</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {movieDetails.genres.split('/').map((genre, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {genre.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Plot */}
                {movieDetails.plot && (
                  <div className="bg-slate-100 dark:bg-black/20 rounded-xl p-4 border border-slate-200 dark:border-white/5 mb-6">
                    <h2 className="flex items-center gap-2 text-lg font-semibold mb-3">
                      <Info className="h-4 w-4 text-purple-500" />
                      Plot
                    </h2>
                    <div className="relative">
                      <div className={`relative overflow-hidden transition-all duration-300 text-slate-700 dark:text-muted-foreground ${showFullOverview ? '' : 'max-h-[4.5em]'}`}>
                        <p>{movieDetails.plot}</p>
                      </div>
                      {!showFullOverview && movieDetails.plot.length > 200 && (
                        <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-slate-100 dark:from-black/20 to-transparent"></div>
                      )}
                      {movieDetails.plot.length > 200 && (
                        <button 
                          onClick={() => setShowFullOverview(!showFullOverview)} 
                          className="text-purple-600 dark:text-purple-500 font-medium text-xs mt-2 hover:text-purple-500 dark:hover:text-purple-400 transition-colors"
                        >
                          {showFullOverview ? "Read Less" : "Read More"}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Download Links for Movies */}
                {movieDetails.contentType === 'Movie' && movieDetails.downloadLinks && movieDetails.downloadLinks.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-3">Download Links</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {movieDetails.downloadLinks.map((link, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          className="text-xs h-auto p-3 flex flex-col items-start gap-1"
                          onClick={() => handleDownloadClick(link)}
                        >
                          <div className="flex items-center gap-2 w-full">
                            <Download className="h-3 w-3 text-blue-500" />
                            <span className="font-medium">{link.quality}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            Size: {link.size}
                          </span>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Episodes for TV Series */}
                {movieDetails.contentType === 'TV Series' && movieDetails.episodes && movieDetails.episodes.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-3">
                      Episodes ({movieDetails.totalEpisodes} total)
                    </h3>
                    <div className="space-y-4">
                      {movieDetails.episodes.map((episode, idx) => (
                        <div key={idx} className="border rounded-lg p-4">
                          <h4 className="font-medium mb-2">
                            Episode {episode.episodeNumber}: {episode.episodeName}
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {episode.downloadLinks.map((link, linkIdx) => (
                              <Button
                                key={linkIdx}
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={() => handleEpisodeDownloadClick(link)}
                              >
                                <Download className="h-3 w-3 mr-1" />
                                {link.quality} ({link.encoding})
                              </Button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Download Links Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{selectedLink?.quality} Download</DialogTitle>
                  <DialogDescription>
                    Available download providers and stream links
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {fetchingLinks ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <p className="text-sm text-muted-foreground">Fetching all provider links...</p>
                      </div>
                    </div>
                  ) : downloadLinks.length > 0 ? (
                    <div className="space-y-3">
                      <label className="text-sm font-medium">Available Providers & Stream Links</label>
                      {downloadLinks.map((link, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-muted-foreground">
                              {link.displayName} {link.isStreamUrl ? '(Stream)' : `(${link.type?.toUpperCase() || 'Download'})`}
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
                                onClick={() => copyToClipboard(link.url, index)}
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
                      <div className="pt-2 text-xs text-muted-foreground">
                        Stream links can be opened in VLC or your preferred media player. Download links can be used for file downloads.
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No download links available</p>
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
