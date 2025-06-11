import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';

// TypeScript interfaces for data structures
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

interface Genre {
  name: string;
  url?: string;
}

interface Language {
  name: string;
  url?: string;
}

interface LatestEpisode {
  url?: string;
  text?: string;
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
  latestEpisode: LatestEpisode;
  info: AnimeInfo;
  availableSeasons: Season[];
  overview: string;
  episodes: Episode[];
  genres?: Genre[];
  languages?: Language[];
}

interface ApiResponse {
  success: boolean;
  animeName?: string;
  details?: Omit<AnimeDetails, 'genres' | 'episodes'>;
  episodes?: Episode[];
  error?: string;
}

// Add new interfaces for movie data
interface MovieInfo {
  duration: string;
  year: string;
  network?: string;
  networkIcon?: string;
}

interface MovieDetails {
  title: string;
  imageUrl?: string;
  info: MovieInfo;
  overview: string;
  genres?: Genre[];
  languages?: Language[];
  isMovie: boolean;
}

// Function to fetch episodes for a specific season
async function fetchSeasonEpisodes(postId: string, seasonNumber: number): Promise<Episode[]> {
  try {
    const formData = new URLSearchParams();
    formData.append('action', 'action_select_season');
    formData.append('season', seasonNumber.toString());
    formData.append('post', postId);

    const response = await fetch('https://animesalt.cc/wp-admin/admin-ajax.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      body: formData.toString(),
      cache: 'no-cache'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch season episodes: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const episodes: Episode[] = [];

    // Parse each episode
    $('article.episodes').each((_, el) => {
      const article = $(el);
      const link = article.find('a.lnk-blk').attr('href');
      const title = article.find('h2.entry-title').text().trim();
      const episodeNumber = parseInt(article.find('span.num-epi').text().trim(), 10);
      const imageUrl = normalizeImageUrl(article.find('figure img').attr('src'));
      
      // Extract episode ID from the link
      const id = link ? link.split('/').filter(Boolean).pop() : '';
      
      episodes.push({
        id,
        title,
        link,
        season: seasonNumber,
        number: episodeNumber,
        imageUrl
      });
    });

    return episodes;
  } catch (error) {
    console.error(`Error fetching season ${seasonNumber} episodes:`, error);
    return [];
  }
}

// Add a helper function for delay
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Add this helper function after the delay function
function normalizeImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('//')) return 'https:' + url;
  return url;
}

// Function to fetch and parse HTML content for a specific anime series
async function scrapeAnimeDetails(id: string, fetchAllSeasons = false): Promise<AnimeDetails> {
  try {
    // Make a request to the anime website with the specific anime ID
    const response = await fetch(`https://animesalt.cc/series/${id}/`, { 
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch anime details: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extract the anime image
    let imageUrl = $('div[style*="text-align: center"] img').data('src') || 
                 $('div[style*="text-align: center"] img').attr('src');
    
    // Normalize the image URL
    imageUrl = normalizeImageUrl(imageUrl);
    
    // Extract anime title from page title or other sources
    const title = $('title').text().split('|')[0]?.trim() || 
                  $('.entry-title').first().text().trim();
    
    // Extract play button data
    const playButtonElement = $('a[style*="display: flex; align-items: center; justify-content: center;"]').first();
    const latestEpisodeUrl = playButtonElement.attr('href');
    const latestEpisodeText = playButtonElement.text().trim();
    
    // Extract seasons, episodes, duration, and year
    let seasons = "1";
    let episodeCount = "Unknown";
    let duration = "Unknown";
    let year = "Unknown";
    
    $('div[style*="background-color: rgba(255, 255, 255, 0.05)"]').each((_, el) => {
      const text = $(el).text().trim();
      
      if (text.includes('Seasons')) {
        seasons = text.match(/(\d+)\s*Season/i)?.[1] || "1";
      } 
      else if (text.includes('Episodes')) {
        episodeCount = text.match(/(\d+)\s*Episode/i)?.[1] || "Unknown";
      } 
      else if (text.includes('min')) {
        duration = text.match(/(\d+)\s*min/i)?.[1] || "Unknown";
      } 
      else if (/\b20\d{2}\b/.test(text)) {
        year = text.match(/\b(20\d{2})\b/)?.[1] || "Unknown";
      }
    });
    
    // Extract overview text
    const overview = $('#overview-text p').text().trim();
    
    // Extract available seasons from the season dropdown
    const availableSeasons: Season[] = [];
    $('.choose-season .aa-cnt li a[data-season]').each((_, el) => {
      const seasonElement = $(el);
      const seasonNumber = seasonElement.attr('data-season');
      const seasonText = seasonElement.text().trim();
      const dataPost = seasonElement.attr('data-post');
      
      if (seasonNumber) {
        availableSeasons.push({
          number: parseInt(seasonNumber, 10),
          text: seasonText,
          dataPost: dataPost || ''
        });
      }
    });
    
    // Sort seasons by number
    availableSeasons.sort((a, b) => a.number - b.number);
    
    // Fetch episodes for each season
    const allEpisodes: Episode[] = [];
    
    // If fetchAllSeasons is true, get episodes for all seasons
    if (fetchAllSeasons && availableSeasons.length > 0) {
      for (const season of availableSeasons) {
        if (season.dataPost) {
          console.log(`Fetching episodes for season ${season.number}`);
          const seasonEpisodes = await fetchSeasonEpisodes(season.dataPost, season.number);
          allEpisodes.push(...seasonEpisodes);
          
          // Add a short delay between requests to avoid overwhelming the server
          if (availableSeasons.length > 1) {
            await delay(500);
          }
        }
      }
    } 
    // Otherwise only fetch the first season as before
    else if (availableSeasons.length > 0) {
      const dataPost = availableSeasons[0].dataPost;
      if (dataPost) {
        const seasonEpisodes = await fetchSeasonEpisodes(
          dataPost, 
          availableSeasons[0].number
        );
        allEpisodes.push(...seasonEpisodes);
      }
    }
    
    // Extract genres
    const genres: Genre[] = [];
    $('h4:contains("Genres")').parent().find('a').each((_, el) => {
      const genreElement = $(el);
      genres.push({
        name: genreElement.text().trim(),
        url: genreElement.attr('href')
      });
    });
    
    // Extract languages
    const languages: Language[] = [];
    $('h4:contains("Languages")').parent().find('a').each((_, el) => {
      const langElement = $(el);
      languages.push({
        name: langElement.text().trim(),
        url: langElement.attr('href')
      });
    });
    
    // Create episodes list
    const episodes: Episode[] = [];
    
    // Add the latest episode from the play button
    if (latestEpisodeUrl && latestEpisodeText) {
      const episodeMatch = latestEpisodeText.match(/S(\d+)-E(\d+)/i);
      if (episodeMatch) {
        const seasonNum = parseInt(episodeMatch[1], 10);
        const episodeNum = parseInt(episodeMatch[2], 10);
        
        episodes.push({
          id: latestEpisodeUrl.split('/').filter(Boolean).pop(),
          title: `Episode ${episodeNum}`,
          link: latestEpisodeUrl,
          season: seasonNum,
          number: episodeNum,
          imageUrl: normalizeImageUrl(imageUrl)
        });
      }
    }
    
    // Try to find all episode links and extract all episodes
    $('a[href*="/episode/"]').each((_, el) => {
      const episodeElement = $(el);
      const href = episodeElement.attr('href');
      const text = episodeElement.text().trim();
      
      // Skip if we already added this episode or if it's not a valid link
      if (!href || !text || episodes.some(ep => ep.link === href)) {
        return;
      }
      
      // Extract episode number and season from text
      const episodeMatch = text.match(/S(\d+)-E(\d+)/i);
      if (episodeMatch) {
        const seasonNum = parseInt(episodeMatch[1], 10);
        const episodeNum = parseInt(episodeMatch[2], 10);
        
        episodes.push({
          id: href.split('/').filter(Boolean).pop(),
          title: `Episode ${episodeNum}`,
          link: href,
          season: seasonNum,
          number: episodeNum,
          imageUrl: normalizeImageUrl(imageUrl)
        });
      }
    });
    
    // Sort episodes by season and episode number
    episodes.sort((a, b) => {
      if (a.season !== b.season) return a.season - b.season;
      return a.number - b.number;
    });

    return {
      title,
      imageUrl,
      latestEpisode: {
        url: latestEpisodeUrl,
        text: latestEpisodeText
      },
      info: {
        seasons: parseInt(seasons, 10),
        episodeCount: parseInt(episodeCount, 10) || episodes.length,
        duration: duration ? `${duration} min` : "Unknown",
        year
      },
      availableSeasons,
      overview,
      episodes: allEpisodes.length > 0 ? allEpisodes : episodes, // Use fetched episodes if available
    };
  } catch (error) {
    console.error('Error scraping anime details:', error);
    throw error;
  }
}

// Function to scrape movie details
async function scrapeMovieDetails(id: string): Promise<MovieDetails> {
  try {
    const response = await fetch(`https://animesalt.cc/movie/${id}/`, { 
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch movie details: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Extract movie title
    const title = $('h1').first().text().trim() || 
                  $('title').text().split('|')[0]?.trim() ||
                  $('.entry-title').first().text().trim();
    
    // Extract movie image
    let imageUrl = $('div[style*="text-align: center"] img').data('src') || 
                   $('div[style*="text-align: center"] img').attr('src') ||
                   $('img.lazyload').data('src') ||
                   $('img.lazyload').attr('src');
    
    imageUrl = normalizeImageUrl(imageUrl);
    
    // Extract duration, year, and network from info pills
    let duration = "Unknown";
    let year = "Unknown";
    let network = "";
    let networkIcon = "";
    
    // Look for info pills with duration and year
    $('div[style*="background-color: rgba(255, 255, 255, 0.05)"]').each((_, el) => {
      const text = $(el).text().trim();
      
      // Extract duration (e.g., "1h 50m")
      const durationMatch = text.match(/(\d+h\s*\d*m?|\d+\s*min)/i);
      if (durationMatch) {
        duration = durationMatch[1];
      }
      
      // Extract year
      const yearMatch = text.match(/\b(20\d{2})\b/);
      if (yearMatch) {
        year = yearMatch[1];
      }
      
      // Extract network info
      const networkLink = $(el).find('a[href*="/category/network/"]');
      if (networkLink.length > 0) {
        const networkHref = networkLink.attr('href');
        if (networkHref) {
          network = networkHref.split('/').filter(Boolean).pop() || '';
        }
        
        const networkImg = networkLink.find('img');
        if (networkImg.length > 0) {
          networkIcon = networkImg.attr('src') || networkImg.data('src') || '';
          if (networkIcon && networkIcon.startsWith('//')) {
            networkIcon = 'https:' + networkIcon;
          }
        }
      }
    });
    
    // Extract overview
    const overview = $('#overview-text p').text().trim() || 
                     $('div[style*="rgba(17, 24, 39, 0.4)"] p').first().text().trim() ||
                     '';
    
    // Extract genres
    const genres: Genre[] = [];
    $('h4:contains("Genres")').parent().find('a[href*="/category/genre/"]').each((_, el) => {
      const genreElement = $(el);
      genres.push({
        name: genreElement.text().trim(),
        url: genreElement.attr('href')
      });
    });
    
    // Extract languages
    const languages: Language[] = [];
    $('h4:contains("Languages")').parent().find('a[href*="/category/language/"]').each((_, el) => {
      const langElement = $(el);
      languages.push({
        name: langElement.text().trim(),
        url: langElement.attr('href')
      });
    });

    return {
      title,
      imageUrl,
      info: {
        duration,
        year,
        network,
        networkIcon
      },
      overview,
      // genres,
      languages,
      isMovie: true
    };
  } catch (error) {
    console.error('Error scraping movie details:', error);
    throw error;
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
): Promise<NextResponse<ApiResponse>> {
  try {
    // Validate API key
    const authResult = await validateApiKey(request);
    if (!authResult.isValid) {
      return NextResponse.json({ 
        success: false, 
        error: authResult.error || 'Invalid API key' 
      }, { status: 401 });
    }

    const { id } = params;
    const url = new URL(request.url);
    
    const seasonParam = url.searchParams.get('season');
    const includeEpisodes = url.searchParams.get('episodes') !== 'false';
    const fetchAllSeasons = url.searchParams.get('all_seasons') === 'true';
    
    if (!id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Anime ID is required' 
      }, { status: 400 });
    }
    
    // Improved movie detection logic
    let isMovie = false;
    try {
      // First, try to fetch the series page to check if it exists and has valid content
      const seriesResponse = await fetch(`https://animesalt.cc/series/${id}/`, {
        method: 'GET',
        cache: 'no-cache',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      if (seriesResponse.ok) {
        const seriesHtml = await seriesResponse.text();
        const seriesCheck = seriesHtml.includes('choose-season') || 
                           seriesHtml.includes('data-season') ||
                           seriesHtml.includes('Season') ||
                           seriesHtml.includes('Episodes');
        
        if (seriesCheck) {
          // This is definitely a series
          isMovie = false;
        } else {
          // Check if movie URL exists and has movie-specific content
          const movieResponse = await fetch(`https://animesalt.cc/movie/${id}/`, {
            method: 'GET',
            cache: 'no-cache',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });
          
          if (movieResponse.ok) {
            const movieHtml = await movieResponse.text();
            // Check for movie-specific indicators
            const movieCheck = movieHtml.includes('movie') || 
                              movieHtml.includes('film') ||
                              !movieHtml.includes('choose-season');
            isMovie = movieCheck;
          } else {
            isMovie = false;
          }
        }
      } else {
        // Series URL doesn't work, check movie URL
        const movieResponse = await fetch(`https://animesalt.cc/movie/${id}/`, {
          method: 'GET',
          cache: 'no-cache',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        isMovie = movieResponse.ok;
      }
    } catch {
      // If both fail, assume it's a series
      isMovie = false;
    }
    
    // Handle movie requests
    if (isMovie) {
      const movieDetails = await scrapeMovieDetails(id);
      
      // Create a movie episode that represents the full movie
      const movieEpisode: Episode = {
        id: id,
        title: movieDetails.title,
        link: `https://animesalt.cc/movie/${id}/`,
        season: 1,
        number: 1,
        imageUrl: movieDetails.imageUrl
      };
      
      return NextResponse.json({
        success: true,
        animeName: movieDetails.title,
        details: {
          title: movieDetails.title,
          imageUrl: movieDetails.imageUrl,
          info: {
            seasons: 1,
            episodeCount: 1,
            duration: movieDetails.info.duration,
            year: movieDetails.info.year
          },
          availableSeasons: [{
            number: 1,
            text: "Movie",
            dataPost: ""
          }],
          overview: movieDetails.overview,
          isMovie: true,
          network: movieDetails.info.network,
          networkIcon: movieDetails.info.networkIcon
        },
        languages: movieDetails.languages,
        episodes: [movieEpisode] // Return the movie as a single episode
      });
    }
    
    // Handle series requests (existing logic)
    if (seasonParam && !fetchAllSeasons) {
      console.log(`Fetching episodes for specific season: ${seasonParam}`);
      
      // Initial fetch to get series metadata and season data
      const initialDetails = await scrapeAnimeDetails(id, false);
      
      if (initialDetails.availableSeasons.length > 0) {
        const seasonNumber = parseInt(seasonParam, 10);
        const season = initialDetails.availableSeasons.find(s => s.number === seasonNumber);
        
        if (season && season.dataPost) {
          // Fetch episodes specific to requested season
          const seasonEpisodes = await fetchSeasonEpisodes(season.dataPost, seasonNumber);
          initialDetails.episodes = seasonEpisodes;
          
          // Create response with the season-specific episodes
          const responseData: any = { 
            success: true,
            animeName: initialDetails.title,
            details: {
              ...initialDetails
            }
          };
          
          delete responseData.details.genres;
          delete responseData.details.episodes;
          
          if (includeEpisodes && seasonEpisodes.length > 0) {
            responseData.episodes = seasonEpisodes;
          }
          
          return NextResponse.json(responseData);
        }
      }
    }
    
    // If no specific season or season not found, proceed with normal or all seasons fetch
    const animeDetails = await scrapeAnimeDetails(id, fetchAllSeasons);
    
    // Create a response object
    const responseData: any = { 
      success: true,
      animeName: animeDetails.title,
      details: {
        ...animeDetails
      }
    };
    
    // Always remove genres from the response
    delete responseData.details.genres;
    
    // MODIFIED: Only remove episodes from details but add them as a separate field
    const episodesData = animeDetails.episodes || [];
    delete responseData.details.episodes;
    
    // Add episodes to the response
    if (includeEpisodes && episodesData.length > 0) {
      responseData.episodes = episodesData;
    }
    
    // Add remaining requests to all successful responses
    const addRemainingRequests = (responseData: any) => ({
      ...responseData,
      remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
    });

    return NextResponse.json(addRemainingRequests(responseData));
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch anime details' 
      }, 
      { status: 500 }
    );
  }
}
