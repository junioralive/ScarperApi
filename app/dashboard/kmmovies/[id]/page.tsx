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
  ArrowLeft
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

// Types for KM movie details
interface KMMovieDetails {
  title: string
  mainImage?: string
  storyline: string
  releaseYear: string
  director?: string
  cast?: string
  genres?: string
  duration?: string
  writer?: string
  ott?: string
  languages: string[]
  downloadLinks: Array<{
    url: string
    quality: string
    size: string
    text: string
  }>
  screenshot?: string
  imdbRating?: {
    text: string
    url: string
  }
}

interface ApiResponse {
  success: boolean
  data?: KMMovieDetails
  error?: string
}

export default function KMMovieDetailPage({ params }: { params: { id: string } }) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [movieDetails, setMovieDetails] = useState<KMMovieDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFullOverview, setShowFullOverview] = useState(false)
  const [selectedLink, setSelectedLink] = useState<any>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [magicLinks, setMagicLinks] = useState<any[]>([])
  const [fetchingMagicLinks, setFetchingMagicLinks] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [streamDialogOpen, setStreamDialogOpen] = useState(false)
  const [selectedStreamUrl, setSelectedStreamUrl] = useState<string>('')
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
        const fullUrl = `https://w1.kmmovies.mobi/${id}/`
        
        const res = await fetch(`/api/kmmovies/details?url=${encodeURIComponent(fullUrl)}`, {
          headers: {
            'x-api-key': userApiKey
          }
        })
        const data: ApiResponse = await res.json()

        if (data.success && data.data) {
          setMovieDetails(data.data)
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

  const fetchMagicLinks = async (downloadUrl: string) => {
    if (!userApiKey) {
      toast.error("API key required. Please create an API key in the API Keys section.")
      return
    }
    
    setFetchingMagicLinks(true)
    try {
      const res = await fetch(`/api/kmmovies/magic-links?url=${encodeURIComponent(downloadUrl)}`, {
        headers: {
          'x-api-key': userApiKey
        }
      })
      const data = await res.json()
      
      if (data.success && data.data.links) {
        // Filter out GDTOT links and keep only GDFLIX and Watch Online
        const filteredLinks = data.data.links.filter((link: any) => 
          link.provider !== 'GDTOT'
        )
        setMagicLinks(filteredLinks)
      } else {
        toast.error("Failed to fetch download links")
        setMagicLinks([])
      }
    } catch (error) {
      console.error("Error fetching magic links:", error)
      toast.error("Failed to fetch download links")
      setMagicLinks([])
    } finally {
      setFetchingMagicLinks(false)
    }
  }

  const handleDownloadClick = async (link: any) => {
    setSelectedLink(link)
    setDialogOpen(true)
    setMagicLinks([])
    setCopiedIndex(null)
    fetchMagicLinks(link.url)
  }

  const handleStreamClick = (streamUrl: string) => {
    setSelectedStreamUrl(streamUrl)
    setStreamDialogOpen(true)
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
                    src={movieDetails.mainImage || '/placeholder.jpg'}
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
                <h1 className="text-2xl sm:text-3xl font-bold mb-4">{movieDetails.title}</h1>
                
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

                {/* Movie Details */}
                {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {movieDetails.releaseYear && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Year:</span>
                      <span className="text-sm text-muted-foreground">{movieDetails.releaseYear}</span>
                    </div>
                  )}
                  {movieDetails.duration && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Duration:</span>
                      <span className="text-sm text-muted-foreground">{movieDetails.duration}</span>
                    </div>
                  )}
                  {movieDetails.director && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Director:</span>
                      <span className="text-sm text-muted-foreground">{movieDetails.director}</span>
                    </div>
                  )}
                  {movieDetails.genres && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Genres:</span>
                      <span className="text-sm text-muted-foreground">{movieDetails.genres}</span>
                    </div>
                  )}
                </div> */}

                {/* Languages */}
                {movieDetails.languages && movieDetails.languages.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium mb-2">Languages</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {movieDetails.languages.map((lang, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {lang}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Storyline */}
                {/* <div className="bg-slate-100 dark:bg-black/20 rounded-xl p-4 border border-slate-200 dark:border-white/5 mb-6">
                  <h2 className="flex items-center gap-2 text-lg font-semibold mb-3">
                    <Info className="h-4 w-4 text-purple-500" />
                    Storyline
                  </h2>
                  <div className="relative">
                    <div className={`relative overflow-hidden transition-all duration-300 text-slate-700 dark:text-muted-foreground ${showFullOverview ? '' : 'max-h-[4.5em]'}`}>
                      <p>{movieDetails.storyline || "No storyline available."}</p>
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
                </div> */}

                {/* Download Links */}
                {movieDetails.downloadLinks && movieDetails.downloadLinks.length > 0 && (
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
              </div>
            </div>

            {/* Download Links Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{selectedLink?.quality} Download</DialogTitle>
                  {/* <DialogDescription>
                    Available download options for {movieDetails.title}
                  </DialogDescription> */}
                </DialogHeader>
                <div className="space-y-4">
                  {fetchingMagicLinks ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <p className="text-sm text-muted-foreground">Fetching download links...</p>
                      </div>
                    </div>
                  ) : magicLinks.length > 0 ? (
                    <div className="space-y-3">
                      <label className="text-sm font-medium">Available Options</label>
                      {magicLinks.map((link, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-muted-foreground">
                              {link.provider} ({link.type.toUpperCase()})
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <Input
                              value={link.url}
                              readOnly
                              className="flex-1 text-xs"
                            />
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
                          </div>
                        </div>
                      ))}
                      <div className="pt-2 text-xs text-muted-foreground">
                        {magicLinks.some(link => link.type === 'stream') ? 
                          'Use stream links to watch online or download links for offline viewing' :
                          'Use these links to download the movie files'
                        }
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

            {/* Stream Dialog */}
            <Dialog open={streamDialogOpen} onOpenChange={setStreamDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Watch Online</DialogTitle>
                  {/* <DialogDescription>
                    Direct video stream for {movieDetails.title}
                  </DialogDescription> */}
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Stream URL</label>
                    <div className="flex gap-2">
                      <Input
                        value={selectedStreamUrl}
                        readOnly
                        className="flex-1 text-xs"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(selectedStreamUrl, 0)}
                        className="shrink-0"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Copy this URL and open it in VLC or your preferred media player to watch the movie.
                  </div>
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
