import { NextResponse } from "next/server"
import { load } from "cheerio"
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth'

interface HubCloudLink {
  title: string;
  url: string;
  id: string;
}

interface Episode {
  episodeNumber: string;
  quality: string;
  size: string;
  hubCloudLinks: HubCloudLink[];
}

interface ExtractedData {
  episodes: Episode[];
  directLinks: HubCloudLink[];
}

async function extractHubCloudLinks(url: string): Promise<ExtractedData> {
  try {
    console.log(`Fetching HubCloud links from: ${url}`)
    
    const response = await fetch(url, {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      next: {
        revalidate: 0
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch page: ${response.status}`)
    }

    const html = await response.text()
    const $ = load(html)
    const episodes: Episode[] = []
    const directLinks: HubCloudLink[] = []
    let currentEpisode: Episode | null = null

    // Process all h5 elements in order
    $('h5').each((_, element) => {
      const $element = $(element)
      const text = $element.text().trim()
      const html = $element.html() || ''

      // Check if this is an episode header (contains Ep01, Ep02, etc.)
      const episodeMatch = text.match(/Ep(\d+)/i)
      if (episodeMatch) {
        // Save previous episode if exists
        if (currentEpisode) {
          episodes.push(currentEpisode)
        }

        // Extract quality and size info
        const qualityMatch = text.match(/(\d+p)/i)
        const sizeMatch = text.match(/\[([^\]]*(?:MB|GB)[^\]]*)\]/i)

        currentEpisode = {
          episodeNumber: episodeMatch[1],
          quality: qualityMatch ? qualityMatch[1] : '',
          size: sizeMatch ? sizeMatch[1] : '',
          hubCloudLinks: []
        }
      }
      // Check if this is a HubCloud link
      else {
        const $link = $element.find('a[href*="hubcloud"]')
        if ($link.length > 0) {
          const href = $link.attr('href')
          const linkText = $link.text().trim()
          const id = $element.attr('id') || ''

          if (href && linkText) {
            const hubCloudLink = {
              title: linkText,
              url: href,
              id: id
            }

            // Add to current episode if we're processing one
            if (currentEpisode) {
              currentEpisode.hubCloudLinks.push(hubCloudLink)
            } else {
              // Add to direct links if not part of an episode
              directLinks.push(hubCloudLink)
            }
          }
        }
      }
    })

    // Don't forget to add the last episode
    if (currentEpisode) {
      episodes.push(currentEpisode)
    }

    // Look for h4 elements with HubCloud links (fallback)
    $('h4').each((_, element) => {
      const $element = $(element)
      const $link = $element.find('a[href*="hubcloud"]')
      
      if ($link.length > 0) {
        const href = $link.attr('href')
        const $img = $link.find('img[src*="hubcloud"]')
        
        if (href && $img.length > 0) {
          const $parent = $element.parent()
          const contextText = $parent.prev().text() || $parent.next().text() || 'HubCloud Link'
          
          const exists = directLinks.some(link => link.url === href)
          if (!exists) {
            directLinks.push({
              title: contextText.trim() || 'HubCloud Download',
              url: href,
              id: `HubCloud-${directLinks.length + 1}`
            })
          }
        }
      }
    })

    // Final fallback: look for any remaining hubcloud links
    $('a[href*="hubcloud"]').each((_, element) => {
      const $element = $(element)
      const href = $element.attr('href')
      const $img = $element.find('img')
      
      if (href && $img.length > 0) {
        const imgSrc = $img.attr('src') || ''
        const imgAlt = $img.attr('alt') || ''
        
        if (imgSrc.includes('hubcloud') || imgAlt.includes('hubcloud')) {
          const exists = directLinks.some(link => link.url === href) || 
                        episodes.some(ep => ep.hubCloudLinks.some(link => link.url === href))
          if (!exists) {
            directLinks.push({
              title: imgAlt || 'HubCloud Download',
              url: href,
              id: `HubCloud-${directLinks.length + 1}`
            })
          }
        }
      }
    })

    console.log(`Found ${episodes.length} episodes and ${directLinks.length} direct links`)
    return { episodes, directLinks }

  } catch (error) {
    console.error('Error extracting data:', error)
    throw error
  }
}

export async function GET(request: Request) {
  try {
    // Validate API key
    const authResult = await validateApiKey(request);
    if (!authResult.isValid) {
      return createUnauthorizedResponse(authResult.error || 'Invalid API key');
    }

    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')

    if (!url) {
      return NextResponse.json({
        success: false,
        error: 'URL parameter is required'
      }, { status: 400 })
    }

    if (!url.includes('mdrive.today')) {
      return NextResponse.json({
        success: false,
        error: 'Only mdrive.today URLs are supported'
      }, { status: 400 })
    }

    const data = await extractHubCloudLinks(url)

    return NextResponse.json({
      success: true,
      episodes: data.episodes,
      directLinks: data.directLinks,
      episodeCount: data.episodes.length,
      linkCount: data.directLinks.length,
      sourceUrl: url,
      remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
    })

  } catch (error) {
    console.error('Error in mdrive API:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to extract data'
    }, { status: 500 })
  }
}
