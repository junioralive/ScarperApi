"use client"

import { useAuth } from "@/contexts/auth-context"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { ArrowLeft, Loader2, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"

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

export default function WatchMoviePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Get parameters from URL
  const episodeUrl = searchParams.get("episodeUrl")
  const movieTitle = searchParams.get("movieTitle")

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  // Fetch stream links when component mounts
  useEffect(() => {
    const fetchStreamLinks = async () => {
      if (!episodeUrl) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        
        const response = await fetch(`/api/hubcloud?url=${encodeURIComponent(episodeUrl)}`, {
          headers: {
            'x-api-key': 'ak_33ec1317f28b9126487af7639c7aab16e813d4064972829d' // This should come from user's API keys
          }
        })
        
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("API key required. Please create an API key in the API Keys section.")
          }
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const streamData: StreamResponse = await response.json()
        
        if (streamData.success && streamData.links && streamData.links.length > 0) {
          // Use first available stream link
          setCurrentVideoUrl(streamData.links[0].link)
        }
      } catch (err) {
        console.error("Failed to fetch stream links:", err)
      } finally {
        setLoading(false)
      }
    }

    if (user && episodeUrl) {
      fetchStreamLinks()
    }
  }, [user, episodeUrl])

  const goBack = () => {
    router.back()
  }

  const openInNewTab = () => {
    if (currentVideoUrl) {
      window.open(currentVideoUrl, '_blank')
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-2 text-white">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Loading video...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex flex-col min-h-svh bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <Button variant="ghost" size="icon" onClick={goBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">{movieTitle || "Watch Movie"}</h1>
        <div />
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        {currentVideoUrl ? (
          <div className="text-center space-y-4">
            <h2 className="text-xl font-semibold">Video Ready</h2>
            <p className="text-muted-foreground">Click below to watch the video in a new tab</p>
            <Button onClick={openInNewTab} className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Open Video
            </Button>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-muted-foreground">No video available</p>
          </div>
        )}
      </div>
    </div>
  )
}
