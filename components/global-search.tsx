"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, Film, Video, Loader2, ExternalLink } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"

// Debounce hook
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

interface SearchResult {
  id: string
  title: string
  imageUrl?: string
  postUrl: string
  isSeries?: boolean
  type?: string
}

interface ProviderResults {
  success: boolean
  data: SearchResult[]
  count: number
}

interface GlobalSearchResults {
  success: boolean
  query: string
  totalResults: number
  results: {
    anime?: ProviderResults
    movies?: ProviderResults
    kmmovies?: ProviderResults
  }
}

export function GlobalSearch() {
  const { user } = useAuth()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<GlobalSearchResults | null>(null)
  const [userApiKey, setUserApiKey] = useState<string | null>(null)

  const debouncedQuery = useDebounce(query, 500)

  // Fetch user's API key
  useEffect(() => {
    const fetchUserApiKey = async () => {
      if (!user) return

      try {
        const response = await fetch(`/api/api-keys?userId=${user.uid}`)
        const data = await response.json()
        
        if (data.success && data.apiKeys && data.apiKeys.length > 0) {
          const activeKey = data.apiKeys.find((key: any) => key.isActive)
          if (activeKey) {
            setUserApiKey(activeKey.keyValue)
          }
        }
      } catch (error) {
        console.error('Failed to fetch user API key:', error)
      }
    }

    if (user) {
      fetchUserApiKey()
    }
  }, [user])

  // Perform search when debounced query changes
  useEffect(() => {
    if (debouncedQuery && debouncedQuery.length >= 2 && open && userApiKey) {
      performSearch(debouncedQuery)
    } else {
      setResults(null)
    }
  }, [debouncedQuery, open, userApiKey])

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || !userApiKey) return

    setLoading(true)
    try {
      console.log('Performing search with query:', searchQuery)
      const response = await fetch(`/api/global-search?q=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'x-api-key': userApiKey
        }
      })

      console.log('Search response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Search response data:', data)
        
        if (data.success) {
          setResults(data)
          console.log('Results updated:', data)
        } else {
          console.error('Search API returned success: false')
          setResults(null)
          toast.error('Search failed')
        }
      } else {
        console.error('Search failed with status:', response.status)
        const errorData = await response.text()
        console.error('Error response:', errorData)
        setResults(null)
        toast.error('Search failed')
      }
    } catch (error) {
      console.error('Search error:', error)
      setResults(null)
      toast.error('Search failed')
    } finally {
      setLoading(false)
    }
  }, [userApiKey])

  const handleResultClick = (item: SearchResult, provider: string) => {
    setOpen(false)
    setQuery("")
    setResults(null)

    // Navigate based on provider
    if (provider === 'anime') {
      const urlParts = item.postUrl?.split('/') || []
      const id = urlParts[urlParts.length - 2] || ''
      if (id) {
        router.push(`/dashboard/anime/${id}`)
      }
    } else if (provider === 'movies') {
      const urlParts = item.postUrl?.split('/') || []
      const id = urlParts[urlParts.length - 2] || ''
      if (id) {
        router.push(`/dashboard/movies/${id}`)
      }
    } else if (provider === 'kmmovies') {
      const urlParts = item.postUrl?.split('/') || []
      const id = urlParts[urlParts.length - 2] || ''
      if (id) {
        router.push(`/dashboard/kmmovies/${id}`)
      }
    }
  }

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'anime':
        return <Film className="h-4 w-4" />
      case 'movies':
      case 'kmmovies':
        return <Video className="h-4 w-4" />
      default:
        return <Search className="h-4 w-4" />
    }
  }

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'anime':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'movies':
        return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'kmmovies':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20'
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    }
  }

  // Keyboard shortcut to open search
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  if (!user || !userApiKey) {
    return null // Don't show search if user is not logged in or has no API key
  }

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-9 p-0 xl:h-10 xl:w-60 xl:justify-start xl:px-3 xl:py-2"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 xl:mr-2" />
        <span className="hidden xl:inline-flex">Search all providers...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 xl:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search across all providers..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {loading && (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}

          {!loading && query.length < 2 && (
            <CommandEmpty>Type at least 2 characters to search</CommandEmpty>
          )}

          {!loading && query.length >= 2 && !results && (
            <CommandEmpty>No results found</CommandEmpty>
          )}

          {!loading && results && (
            <>
              {/* Anime Results */}
              {results.results.anime && results.results.anime.success && results.results.anime.data.length > 0 && (
                <CommandGroup heading={`Anime (${results.results.anime.count})`}>
                  {results.results.anime.data.slice(0, 5).map((item, index) => (
                    <CommandItem
                      key={`anime-${index}`}
                      onSelect={() => handleResultClick(item, 'anime')}
                      className="flex items-center gap-3 p-3"
                    >
                      <div className="flex h-12 w-8 items-center justify-center rounded-md bg-muted overflow-hidden">
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt={item.title}
                            width={32}
                            height={48}
                            className="rounded object-cover w-full h-full"
                            onError={(e) => {
                              console.log('Image failed to load:', item.imageUrl);
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <Film className={`h-4 w-4 ${item.imageUrl ? 'hidden' : ''}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="outline"
                            className={`text-xs ${getProviderColor('anime')}`}
                          >
                            {getProviderIcon('anime')}
                            <span className="ml-1">Anime</span>
                          </Badge>
                          {item.isSeries && (
                            <Badge variant="secondary" className="text-xs">
                              Series
                            </Badge>
                          )}
                        </div>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Movies Results */}
              {results.results.movies && results.results.movies.success && results.results.movies.data.length > 0 && (
                <>
                  {results.results.anime && results.results.anime.success && results.results.anime.data.length > 0 && (
                    <CommandSeparator />
                  )}
                  <CommandGroup heading={`Movies (${results.results.movies.count})`}>
                    {results.results.movies.data.slice(0, 5).map((item, index) => (
                      <CommandItem
                        key={`movies-${index}`}
                        onSelect={() => handleResultClick(item, 'movies')}
                        className="flex items-center gap-3 p-3"
                      >
                        <div className="flex h-12 w-8 items-center justify-center rounded-md bg-muted overflow-hidden">
                          {item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt={item.title}
                              width={32}
                              height={48}
                              className="rounded object-cover w-full h-full"
                              onError={(e) => {
                                console.log('Image failed to load:', item.imageUrl);
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <Video className={`h-4 w-4 ${item.imageUrl ? 'hidden' : ''}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant="outline"
                              className={`text-xs ${getProviderColor('movies')}`}
                            >
                              {getProviderIcon('movies')}
                              <span className="ml-1">Movies</span>
                            </Badge>
                            {item.type && (
                              <Badge variant="secondary" className="text-xs">
                                {item.type}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {/* KM Movies Results */}
              {results.results.kmmovies && results.results.kmmovies.success && results.results.kmmovies.data.length > 0 && (
                <>
                  {((results.results.anime && results.results.anime.success && results.results.anime.data.length > 0) ||
                    (results.results.movies && results.results.movies.success && results.results.movies.data.length > 0)) && (
                    <CommandSeparator />
                  )}
                  <CommandGroup heading={`KM Movies (${results.results.kmmovies.count})`}>
                    {results.results.kmmovies.data.slice(0, 5).map((item, index) => (
                      <CommandItem
                        key={`kmmovies-${index}`}
                        onSelect={() => handleResultClick(item, 'kmmovies')}
                        className="flex items-center gap-3 p-3"
                      >
                        <div className="flex h-12 w-8 items-center justify-center rounded-md bg-muted overflow-hidden">
                          {item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt={item.title}
                              width={32}
                              height={48}
                              className="rounded object-cover w-full h-full"
                              onError={(e) => {
                                console.log('Image failed to load:', item.imageUrl);
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          <Video className={`h-4 w-4 ${item.imageUrl ? 'hidden' : ''}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant="outline"
                              className={`text-xs ${getProviderColor('kmmovies')}`}
                            >
                              {getProviderIcon('kmmovies')}
                              <span className="ml-1">KM Movies</span>
                            </Badge>
                            {item.type && (
                              <Badge variant="secondary" className="text-xs">
                                {item.type}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {/* Summary */}
              {results.totalResults > 0 && (
                <>
                  <CommandSeparator />
                  <div className="px-2 py-1 text-xs text-muted-foreground">
                    Found {results.totalResults} total results for "{results.query}"
                  </div>
                </>
              )}

              {/* No results found */}
              {results.totalResults === 0 && (
                <CommandEmpty>
                  No results found for "{results.query}"
                </CommandEmpty>
              )}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
