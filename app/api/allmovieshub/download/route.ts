import { NextResponse } from 'next/server';
import { load } from 'cheerio';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';

interface Episode {
  episodeNumber: number;
  episodeName: string;
  downloadUrl: string;
  size?: string;
  fileDetails?: any; // Results from kmmovies API
}

interface DownloadLink {
  quality: string;
  size: string;
  url: string;
  text: string;
  format?: string; // e.g., HEVC, H.264
  fileDetails?: any;
  episodes?: Episode[]; // Individual episodes with their API results
}

interface Season {
  seasonNumber: number;
  seasonName: string;
  downloadLinks: DownloadLink[];
}

interface MovieDownloadData {
  movieName: string;
  title: string;
  url: string;
  type: 'movie' | 'series';
  downloadLinks: DownloadLink[]; // For movies
  seasons?: Season[]; // For TV series
  metadata?: {
    releaseYear?: string;
    languages?: string[];
    format?: string;
    description?: string;
    totalSeasons?: number;
  };
}

// Function to fetch file details from kmmovies API
async function fetchFileDetails(fileUrl: string): Promise<any> {
  try {
    const apiUrl = `https://scarper-ansh.vercel.app/api/allmovieshub/file?url=${encodeURIComponent(fileUrl)}`;
    
    console.log(`Fetching file details from: ${apiUrl}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Failed to fetch file details for ${fileUrl}: ${response.status} ${response.statusText}`);
      return {
        error: `HTTP ${response.status}: ${response.statusText}`,
        success: false
      };
    }

    const data = await response.json();
    console.log(`Successfully fetched file details for: ${fileUrl}`);
    return data;

  } catch (error) {
    console.error(`Error fetching file details for ${fileUrl}:`, error);
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    };
  }
}

// Function to fetch individual episodes from BollyDrive archive URLs
async function fetchEpisodesFromArchive(archiveUrl: string): Promise<Episode[]> {
  try {
    console.log(`Fetching episodes from archive: ${archiveUrl}`);
    
    const response = await fetch(archiveUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://allmovieshub.dev//'
      }
    });

    if (!response.ok) {
      console.warn(`Failed to fetch archive page: ${response.status}`);
      return [];
    }

    const html = await response.text();
    const $ = load(html);
    const episodes: Episode[] = [];

    // Look for episode links in various formats
    // Method 1: Look for numbered episode links
    $('a[href*="drive"], a[href*="file"]').each((_, element) => {
      const $element = $(element);
      const href = $element.attr('href');
      const linkText = $element.text().trim();
      
      if (href && linkText) {
        // Try to extract episode number from text
        const episodeMatch = linkText.match(/(?:episode|ep|e)\s*(\d+)/i) || 
                           linkText.match(/(\d+)/);
        
        if (episodeMatch) {
          const episodeNumber = parseInt(episodeMatch[1]);
          
          // Extract size if available
          const sizeMatch = linkText.match(/(\d+(?:\.\d+)?\s*(?:MB|GB))/i);
          
          // Check if this episode already exists
          if (!episodes.find(ep => ep.episodeNumber === episodeNumber && ep.downloadUrl === href)) {
            episodes.push({
              episodeNumber,
              episodeName: linkText,
              downloadUrl: href,
              size: sizeMatch ? sizeMatch[1] : undefined
            });
          }
        }
      }
    });

    // Method 2: Look for structured episode lists
    $('ul li a, ol li a').each((_, element) => {
      const $element = $(element);
      const href = $element.attr('href');
      const linkText = $element.text().trim();
      
      if (href && linkText && (href.includes('drive') || href.includes('file'))) {
        const episodeMatch = linkText.match(/(?:episode|ep|e)\s*(\d+)/i) || 
                           linkText.match(/(\d+)/);
        
        if (episodeMatch) {
          const episodeNumber = parseInt(episodeMatch[1]);
          
          // Check if this episode already exists
          if (!episodes.find(ep => ep.episodeNumber === episodeNumber && ep.downloadUrl === href)) {
            const sizeMatch = linkText.match(/(\d+(?:\.\d+)?\s*(?:MB|GB))/i);
            
            episodes.push({
              episodeNumber,
              episodeName: linkText,
              downloadUrl: href,
              size: sizeMatch ? sizeMatch[1] : undefined
            });
          }
        }
      }
    });

    // Method 3: Look for episode links in paragraphs or divs
    $('p a, div a').each((_, element) => {
      const $element = $(element);
      const href = $element.attr('href');
      const linkText = $element.text().trim();
      
      if (href && linkText && (href.includes('drive') || href.includes('file'))) {
        const episodeMatch = linkText.match(/(?:episode|ep|e)\s*(\d+)/i);
        
        if (episodeMatch) {
          const episodeNumber = parseInt(episodeMatch[1]);
          
          // Check if this episode already exists
          if (!episodes.find(ep => ep.episodeNumber === episodeNumber && ep.downloadUrl === href)) {
            const sizeMatch = linkText.match(/(\d+(?:\.\d+)?\s*(?:MB|GB))/i);
            
            episodes.push({
              episodeNumber,
              episodeName: linkText,
              downloadUrl: href,
              size: sizeMatch ? sizeMatch[1] : undefined
            });
          }
        }
      }
    });

    // Sort episodes by episode number
    episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
    
    console.log(`Found ${episodes.length} episodes in archive`);
    
    // Process each episode through the kmmovies API
    if (episodes.length > 0) {
      console.log(`Processing ${episodes.length} episodes through kmmovies API...`);
      
      const episodesWithDetails = await Promise.all(
        episodes.map(async (episode) => {
          try {
            console.log(`Processing episode ${episode.episodeNumber}: ${episode.downloadUrl}`);
            const fileDetails = await fetchFileDetails(episode.downloadUrl);
            return {
              ...episode,
              fileDetails
            };
          } catch (error) {
            console.error(`Failed to process episode ${episode.episodeNumber}:`, error);
            return {
              ...episode,
              fileDetails: {
                error: 'Failed to fetch episode details',
                success: false
              }
            };
          }
        })
      );
      
      return episodesWithDetails;
    }
    
    return episodes;

  } catch (error) {
    console.error(`Error fetching episodes from archive ${archiveUrl}:`, error);
    return [];
  }
}

// Function to extract download links from the movie page
async function scrapeMovieDownloadLinks(movieName: string): Promise<MovieDownloadData> {
  try {
    const movieUrl = `https://allmovieshub.dev//${movieName}/`;
    
    console.log(`Fetching movie download page: ${movieUrl}`);

    const response = await fetch(movieUrl, {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://allmovieshub.dev//'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch movie page: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const $ = load(html);
    const downloadLinks: DownloadLink[] = [];
    const seasons: Season[] = [];

    // Extract page title
    const pageTitle = $('title').text().trim() || $('h1').first().text().trim() || 'Unknown Movie';

    // Check if this is a TV series by looking for season indicators
    const isSeries = html.toLowerCase().includes('season') || 
                    html.toLowerCase().includes('complete season') ||
                    $('.download-message-box').length > 1;

    if (isSeries) {
      // Handle TV Series with seasons
      console.log('Detected TV series, parsing seasons...');
      
      // Find all season containers
      $('.download-message-box').each((seasonIndex, seasonElement) => {
        const $seasonBox = $(seasonElement);
        const seasonText = $seasonBox.find('h5').text().trim();
        
        // Extract season number and name
        const seasonMatch = seasonText.match(/Season\s+(\d+)/i);
        if (!seasonMatch) return;
        
        const seasonNumber = parseInt(seasonMatch[1]);
        const seasonName = seasonText;
        
        console.log(`Processing ${seasonName}...`);
        
        // Find download links for this season
        const seasonLinks: DownloadLink[] = [];
        
        // Look for h3 elements with download links after this season box
        let nextElement = $seasonBox.parent().next();
        while (nextElement.length > 0 && !nextElement.hasClass('download-message-box')) {
          if (nextElement.is('h3')) {
            const linkElement = nextElement.find('a');
            if (linkElement.length > 0) {
              const href = linkElement.attr('href');
              const linkText = linkElement.find('em').text().trim() || linkElement.text().trim();
              
              if (href && linkText && (href.includes('bollydrive') || href.includes('drive') || href.includes('file'))) {
                // Parse quality and size
                const qualityMatch = linkText.match(/(\d+p)/i);
                const sizeMatch = linkText.match(/(\d+(?:\.\d+)?(?:MB|GB))/i);
                const formatMatch = linkText.match(/(HEVC|H\.264|x264|x265)/i);
                
                if (qualityMatch) {
                  seasonLinks.push({
                    quality: qualityMatch[1],
                    size: sizeMatch ? sizeMatch[1] : 'Unknown',
                    url: href,
                    text: linkText,
                    format: formatMatch ? formatMatch[1] : undefined
                  });
                }
              }
            }
          }
          nextElement = nextElement.next();
        }
        
        // Sort links by quality
        seasonLinks.sort((a, b) => {
          const qualityA = parseInt(a.quality.replace('p', ''));
          const qualityB = parseInt(b.quality.replace('p', ''));
          return qualityA - qualityB;
        });
        
        if (seasonLinks.length > 0) {
          seasons.push({
            seasonNumber,
            seasonName,
            downloadLinks: seasonLinks
          });
        }
      });
      
      // Sort seasons by season number
      seasons.sort((a, b) => a.seasonNumber - b.seasonNumber);
      
      // Now fetch episodes for each BollyDrive archive link
      console.log('Fetching episodes from BollyDrive archives...');
      
      for (const season of seasons) {
        for (let i = 0; i < season.downloadLinks.length; i++) {
          const link = season.downloadLinks[i];
          
          // If this is a BollyDrive archive link, fetch individual episodes
          if (link.url.includes('bollydrive.blog/archives/')) {
            console.log(`Fetching episodes for ${season.seasonName} - ${link.quality} quality...`);
            
            try {
              const episodes = await fetchEpisodesFromArchive(link.url);
              
              if (episodes.length > 0) {
                season.downloadLinks[i] = {
                  ...link,
                  episodes,
                  fileDetails: {
                    success: true,
                    message: `Archive contains ${episodes.length} episodes`,
                    totalEpisodes: episodes.length,
                    successfulEpisodes: episodes.filter(ep => ep.fileDetails?.success !== false).length,
                    failedEpisodes: episodes.filter(ep => ep.fileDetails?.success === false).length
                  }
                };
                
                console.log(`Successfully processed ${episodes.length} episodes for ${link.quality} quality`);
              } else {
                // If no episodes found, still fetch file details for the archive link
                const fileDetails = await fetchFileDetails(link.url);
                season.downloadLinks[i] = {
                  ...link,
                  fileDetails
                };
              }
              
            } catch (error) {
              console.error(`Failed to fetch episodes for ${link.url}:`, error);
              season.downloadLinks[i] = {
                ...link,
                fileDetails: {
                  error: 'Failed to fetch episodes from archive',
                  success: false
                }
              };
            }
          } else {
            // For non-archive links, fetch file details normally
            try {
              const fileDetails = await fetchFileDetails(link.url);
              season.downloadLinks[i] = {
                ...link,
                fileDetails
              };
            } catch (error) {
              console.error(`Failed to fetch details for ${link.url}:`, error);
              season.downloadLinks[i] = {
                ...link,
                fileDetails: {
                  error: 'Failed to fetch file details',
                  success: false
                }
              };
            }
          }
        }
      }
      
    } else {
      // Handle regular movies
      console.log('Detected movie, parsing download links...');
      
      // Method 1: Look for h3 elements with download links
      $('h3').each((_, element) => {
        const $element = $(element);
        const linkElement = $element.find('a');
        
        if (linkElement.length > 0) {
          const href = linkElement.attr('href');
          const linkText = linkElement.find('em').text().trim() || linkElement.text().trim();
          
          if (href && linkText) {
            const qualityMatch = linkText.match(/(\d+p)/i);
            const sizeMatch = linkText.match(/\[([^\]]+)\]/);
            const formatMatch = linkText.match(/(HEVC|H\.264|x264|x265)/i);
            
            if (qualityMatch && (href.includes('bollydrive') || href.includes('drive') || href.includes('file'))) {
              downloadLinks.push({
                quality: qualityMatch[1],
                size: sizeMatch ? sizeMatch[1] : 'Unknown',
                url: href,
                text: linkText,
                format: formatMatch ? formatMatch[1] : undefined
              });
            }
          }
        }
      });

      // Method 2: Look for specific div containers with download links
      $('div[style*="text-align: center"] a[style*="color: #ff9900"]').each((_, element) => {
        const $element = $(element);
        const href = $element.attr('href');
        const linkText = $element.find('em').text().trim() || $element.text().trim();
        
        if (href && linkText) {
          const qualityMatch = linkText.match(/(\d+p)/i);
          const sizeMatch = linkText.match(/\[([^\]]+)\]/);
          const formatMatch = linkText.match(/(HEVC|H\.264|x264|x265)/i);
          
          if (qualityMatch && (href.includes('bollydrive') || href.includes('drive') || href.includes('file'))) {
            const existingLink = downloadLinks.find(link => link.url === href);
            if (!existingLink) {
              downloadLinks.push({
                quality: qualityMatch[1],
                size: sizeMatch ? sizeMatch[1] : 'Unknown',
                url: href,
                text: linkText,
                format: formatMatch ? formatMatch[1] : undefined
              });
            }
          }
        }
      });

      // Sort download links by quality
      downloadLinks.sort((a, b) => {
        const qualityA = parseInt(a.quality.replace('p', ''));
        const qualityB = parseInt(b.quality.replace('p', ''));
        return qualityA - qualityB;
      });
    }

    // Fetch file details for download links
    const allLinks = isSeries ? 
      seasons.flatMap(season => season.downloadLinks) : 
      downloadLinks;

    if (allLinks.length > 0) {
      console.log(`Found ${allLinks.length} download links, fetching file details...`);
      
      const linksWithDetails = await Promise.all(
        allLinks.map(async (link) => {
          try {
            const fileDetails = await fetchFileDetails(link.url);
            return {
              ...link,
              fileDetails
            };
          } catch (error) {
            console.error(`Failed to fetch details for ${link.url}:`, error);
            return {
              ...link,
              fileDetails: {
                error: 'Failed to fetch file details',
                success: false
              }
            };
          }
        })
      );

      // Update links with file details
      if (isSeries) {
        let linkIndex = 0;
        seasons.forEach(season => {
          season.downloadLinks.forEach((link, index) => {
            season.downloadLinks[index] = linksWithDetails[linkIndex++];
          });
        });
      } else {
        linksWithDetails.forEach((link, index) => {
          downloadLinks[index] = link;
        });
      }
    }

    // Extract metadata
    const description = $('.entry-content p').first().text().trim();
    const yearMatch = pageTitle.match(/(\d{4})/);
    
    // Extract language information
    const languages: string[] = [];
    const titleLower = pageTitle.toLowerCase();
    if (titleLower.includes('hindi')) languages.push('Hindi');
    if (titleLower.includes('english')) languages.push('English');
    if (titleLower.includes('tamil')) languages.push('Tamil');
    if (titleLower.includes('telugu')) languages.push('Telugu');
    if (titleLower.includes('dual audio')) languages.push('Dual Audio');

    // Extract format information
    let format = 'Unknown';
    if (titleLower.includes('bluray')) format = 'BluRay';
    else if (titleLower.includes('web-dl')) format = 'WEB-DL';
    else if (titleLower.includes('webrip')) format = 'WEBRip';
    else if (titleLower.includes('hdrip')) format = 'HDRip';
    else if (titleLower.includes('hdtc')) format = 'HDTC';
    else if (titleLower.includes('cam')) format = 'CAM';

    return {
      movieName,
      title: pageTitle,
      url: movieUrl,
      type: isSeries ? 'series' : 'movie',
      downloadLinks: isSeries ? [] : downloadLinks,
      seasons: isSeries ? seasons : undefined,
      metadata: {
        releaseYear: yearMatch ? yearMatch[1] : undefined,
        languages: languages.length > 0 ? languages : undefined,
        format,
        description: description || undefined,
        totalSeasons: isSeries ? seasons.length : undefined
      }
    };

  } catch (error) {
    console.error('Error scraping movie download links:', error);
    throw error;
  }
}

export async function GET(request: Request) {
  try {
    // Validate API key first
    const authResult = await validateApiKey(request);
    if (!authResult.isValid) {
      console.log('API key validation failed:', authResult.error);
      return createUnauthorizedResponse(authResult.error || 'Invalid API key');
    }

    console.log('API key validated successfully for AllMoviesHub download request');

    const { searchParams } = new URL(request.url);
    const movieName = searchParams.get('movie');

    if (!movieName) {
      return NextResponse.json({
        success: false,
        error: 'Movie name parameter is required'
      }, {
        status: 400
      });
    }

    try {
      const movieData = await scrapeMovieDownloadLinks(movieName);

      const totalLinks = movieData.type === 'series' ? 
        movieData.seasons?.reduce((sum, season) => sum + season.downloadLinks.length, 0) || 0 :
        movieData.downloadLinks.length;

      // Count total episodes across all seasons and qualities
      const totalEpisodes = movieData.type === 'series' ? 
        movieData.seasons?.reduce((sum, season) => 
          sum + season.downloadLinks.reduce((episodeSum, link) => 
            episodeSum + (link.episodes ? link.episodes.length : 0), 0
          ), 0) || 0 : 0;

      if (totalLinks === 0) {
        return NextResponse.json({
          success: false,
          error: 'No download links found for this movie/series',
          movieData: {
            movieName,
            title: movieData.title,
            url: movieData.url,
            type: movieData.type
          }
        }, {
          status: 404
        });
      }

      // Get all links for file details statistics
      const allLinks = movieData.type === 'series' ? 
        movieData.seasons?.flatMap(season => season.downloadLinks) || [] :
        movieData.downloadLinks;

      const successfulLinks = allLinks.filter(link => 
        link.fileDetails && link.fileDetails.success !== false
      );
      
      const failedLinks = allLinks.filter(link => 
        !link.fileDetails || link.fileDetails.success === false
      );

      // Get available qualities
      const availableQualities = [...new Set(allLinks.map(link => link.quality))];

      const response = {
        success: true,
        movieData,
        contentType: movieData.type,
        totalDownloadLinks: totalLinks,
        totalEpisodes: totalEpisodes,
        successfulFileDetails: successfulLinks.length,
        failedFileDetails: failedLinks.length,
        availableQualities,
        website: 'AllMoviesHub',
        kmmoviesApiStatus: {
          total: totalLinks,
          successful: successfulLinks.length,
          failed: failedLinks.length
        },
        remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed - 1) : 0
      };

      // Add series-specific information with episode details
      if (movieData.type === 'series' && movieData.seasons) {
        response.movieData.seasonsInfo = movieData.seasons.map(season => ({
          seasonNumber: season.seasonNumber,
          seasonName: season.seasonName,
          totalLinks: season.downloadLinks.length,
          totalEpisodes: season.downloadLinks.reduce((sum, link) => 
            sum + (link.episodes ? link.episodes.length : 0), 0
          ),
          availableQualities: [...new Set(season.downloadLinks.map(link => link.quality))],
          formats: [...new Set(season.downloadLinks.map(link => link.format).filter(Boolean))],
          episodeBreakdown: season.downloadLinks.map(link => ({
            quality: link.quality,
            format: link.format,
            episodeCount: link.episodes ? link.episodes.length : 0,
            successfulEpisodes: link.episodes ? link.episodes.filter(ep => ep.fileDetails?.success !== false).length : 0,
            failedEpisodes: link.episodes ? link.episodes.filter(ep => ep.fileDetails?.success === false).length : 0,
            archiveUrl: link.url,
            hasEpisodeDetails: !!link.episodes
          }))
        }));
      }

      return NextResponse.json(response);

    } catch (scrapeError) {
      console.error('AllMoviesHub download scraping error:', scrapeError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch download links from AllMoviesHub',
        details: scrapeError instanceof Error ? scrapeError.message : 'Unknown scraping error',
        movieName
      }, {
        status: 500
      });
    }

  } catch (error) {
    console.error('AllMoviesHub download API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, {
      status: 500
    });
  }
}
