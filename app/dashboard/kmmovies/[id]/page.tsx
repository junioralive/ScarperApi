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
  const [hubcloudDialogOpen, setHubcloudDialogOpen] = useState(false)
  const [hubcloudStreamUrls, setHubcloudStreamUrls] = useState<any[]>([])
  const [fetchingHubcloud, setFetchingHubcloud] = useState(false)
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
        const fullUrl = `https://kmmovies.art/${id}/`
        
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

  const fetchAllProviderLinks = async (downloadUrl: string) => {
    if (!userApiKey) {
      toast.error("API key required. Please create an API key in the API Keys section.")
      return
    }
    
    setFetchingMagicLinks(true)
    try {
      // First fetch the magic links
      const magicRes = await fetch(`/api/kmmovies/magic-links?url=${encodeURIComponent(downloadUrl)}`, {
        headers: {
          'x-api-key': userApiKey
        }
      })
      const magicData = await magicRes.json()
      
      if (magicData.success && magicData.data.links) {
        const allLinks = []
        
        // Filter out GDTOT links and process each provider link
        const filteredLinks = magicData.data.links.filter((link: any) => 
          link.provider !== 'GDTOT'
        )
        
        for (const link of filteredLinks) {
          if (link.type === 'hubcloud') {
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
                hubData.links.forEach((streamLink: any) => {
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
          } else if (link.type === 'download' && link.provider === 'GDFLIX') {
            // Fetch GDFLIX stream URLs immediately
            try {
              const gdflixRes = await fetch(`/api/gdflix?url=${encodeURIComponent(link.url)}`, {
                headers: {
                  'x-api-key': userApiKey
                }
              })
              const gdflixData = await gdflixRes.json()
              
              if (gdflixData.success && gdflixData.links && gdflixData.links.length > 0) {
                // Add each stream URL as a separate entry
                gdflixData.links.forEach((streamLink: any) => {
                  allLinks.push({
                    ...link,
                    url: streamLink.link,
                    displayName: `GDFLIX - ${streamLink.server}`,
                    streamServer: streamLink.server,
                    streamType: streamLink.type,
                    isStreamUrl: true,
                    originalProvider: link.provider,
                    canDownload: true,
                    canStream: true
                  })
                })
              } else {
                // If GDFLIX fetch fails, still show the original link
                allLinks.push({
                  ...link,
                  displayName: `${link.provider} (Failed to load links)`,
                  isStreamUrl: false
                })
              }
            } catch (error) {
              console.error("Error fetching GDFLIX streams:", error)
              allLinks.push({
                ...link,
                displayName: `${link.provider} (Error loading links)`,
                isStreamUrl: false
              })
            }
          } else {
            // For non-HubCloud and non-GDFLIX providers, add as-is
            allLinks.push({
              ...link,
              displayName: link.provider,
              isStreamUrl: false
            })
          }
        }
        
        setMagicLinks(allLinks)
      } else {
        toast.error("Failed to fetch download links")
        setMagicLinks([])
      }
    } catch (error) {
      console.error("Error fetching download links:", error)
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
    fetchAllProviderLinks(link.url)
  }

  const handleHubcloudClick = async (hubcloudUrl: string) => {
    if (!userApiKey) {
      toast.error("API key required")
      return
    }

    setFetchingHubcloud(true)
    setHubcloudDialogOpen(true)
    setHubcloudStreamUrls([])

    try {
      const response = await fetch(`/api/hubcloud?url=${encodeURIComponent(hubcloudUrl)}`, {
        headers: {
          'x-api-key': userApiKey
        }
      })
      const data = await response.json()

      if (data.success && data.links && data.links.length > 0) {
        setHubcloudStreamUrls(data.links)
      } else {
        toast.error("Failed to fetch HubCloud stream links")
        setHubcloudStreamUrls([])
      }
    } catch (error) {
      console.error("Error fetching HubCloud links:", error)
      toast.error("Failed to fetch HubCloud stream links")
      setHubcloudStreamUrls([])
    } finally {
      setFetchingHubcloud(false)
    }
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
    return url.includes('video-downloads.googleusercontent.com') || 
           url.includes('drive.google.com') ||
           url.includes('googleapis.com')
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
              <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{selectedLink?.quality} Download</DialogTitle>
                  <DialogDescription>
                    Available download providers and stream links
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {fetchingMagicLinks ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <p className="text-sm text-muted-foreground">Fetching all provider links...</p>
                      </div>
                    </div>
                  ) : magicLinks.length > 0 ? (
                    <div className="space-y-3">
                      <label className="text-sm font-medium">Available Providers & Stream Links</label>
                      {magicLinks.map((link, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-muted-foreground">
                              {link.displayName} {link.isStreamUrl ? 
                                (link.canDownload && link.canStream ? '(Download/Stream)' : '(Stream)') : 
                                `(${link.type?.toUpperCase() || 'Download'})`
                              }
                            </span>
                            {link.streamType && (
                              <Badge variant="outline" className="text-xs">
                                {link.streamType.toUpperCase()}
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Input
                              value={link.url}
                              readOnly
                              className="flex-1 text-xs"
                            />
                            {isGoogleDriveDirectLink(link.url) ? (
                              <div className="flex gap-1">
                                <Button
                                  variant="default"
                                  size="icon"
                                  onClick={() => handleDirectDownload(link.url)}
                                  className="shrink-0"
                                  title="Download"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => copyToClipboard(link.url, index)}
                                  className="shrink-0"
                                  title="Copy URL"
                                >
                                  {copiedIndex === index ? (
                                    <Check className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
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
                        • Stream links can be opened in VLC or your preferred media player<br/>
                        • Download links can be used for file downloads<br/>
                        • GDFLIX links provide direct Google Drive access for streaming and downloading
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
