import { NextRequest, NextResponse } from 'next/server';
import { load } from 'cheerio';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';
import { validate4kHDHubUrl } from '@/lib/utils/providers';

interface DownloadLink {
  name: string;
  url: string;
  type: 'HubDrive' | 'HubCloud';
}

interface EpisodeFile {
  title: string;
  size: string;
  episodeNumber: string;
  links: DownloadLink[];
}

interface SeasonPack {
  id: string;
  title: string;
  season: string;
  size: string;
  languages: string[];
  quality: string;
  format: string;
  source: string;
  badges: string[];
  links: DownloadLink[];
}

interface EpisodeSeason {
  id: string;
  title: string;
  season: string;
  episodeCount: number;
  languages: string[];
  quality: string;
  episodes: EpisodeFile[];
}

interface FourKHDHubDetailsResponse {
  success: boolean;
  data?: {
    title: string;
    url: string;
    completePacks: SeasonPack[];
    episodeSeasons: EpisodeSeason[];
    totalPacks: number;
    totalEpisodeSeasons: number;
  };
  error?: string;
  message?: string;
  remainingRequests?: number;
}

// Function to extract download links from the new structure
function extractDownloadLinks($: any, $element: any): DownloadLink[] {
  const links: DownloadLink[] = [];

  // Look for download links in the grid structure
  $element.find('.grid a[href*="viralkhabarbull.com"]').each((_: any, linkElement: any) => {
    const $link = $(linkElement);
    const url = $link.attr('href');
    const text = $link.find('span').first().text().trim();

    if (url && text) {
      let type: 'HubDrive' | 'HubCloud' = 'HubDrive';
      if (text.toLowerCase().includes('hubcloud')) {
        type = 'HubCloud';
      }

      links.push({
        name: text.replace(/\s+/g, ' '),
        url: url,
        type: type
      });
    }
  });

  return links;
}

// Function to extract badges/metadata
function extractBadges($: any, $element: any): string[] {
  const badges: string[] = [];

  $element.find('.badge').each((_: any, badgeElement: any) => {
    const badgeText = $(badgeElement).text().trim();
    if (badgeText) {
      badges.push(badgeText);
    }
  });

  return badges;
}

// Function to parse language badges
function extractLanguages(badges: string[]): string[] {
  const languageBadge = badges.find(badge =>
    badge.includes(',') ||
    badge.toLowerCase().includes('hindi') ||
    badge.toLowerCase().includes('english') ||
    badge.toLowerCase().includes('tamil') ||
    badge.toLowerCase().includes('telugu')
  );

  if (languageBadge && languageBadge.includes(',')) {
    return languageBadge.split(',').map(lang => lang.trim());
  }

  return languageBadge ? [languageBadge] : [];
}

// Function to extract episode information from episode sections
function extractEpisodes($: any, $seasonElement: any): EpisodeFile[] {
  const episodes: EpisodeFile[] = [];

  $seasonElement.find('.episode-download-item').each((_: any, episodeElement: any) => {
    const $episode = $(episodeElement);

    // Extract episode title
    const title = $episode.find('.episode-file-title').text().trim();

    // Extract episode number from badge
    const episodeNumberBadge = $episode.find('.badge-psa').text().trim();
    const episodeNumber = episodeNumberBadge.replace('Episode-', '').trim();

    // Extract file size
    const size = $episode.find('.badge-size').text().trim();

    // Extract download links
    const links: DownloadLink[] = [];
    $episode.find('.episode-links a').each((_: any, linkElement: any) => {
      const $link = $(linkElement);
      const url = $link.attr('href');
      const text = $link.text().trim();

      if (url && text) {
        let type: 'HubDrive' | 'HubCloud' = 'HubDrive';
        if (text.toLowerCase().includes('hubcloud')) {
          type = 'HubCloud';
        }

        links.push({
          name: text.replace(/\s+/g, ' '),
          url: url,
          type: type
        });
      }
    });

    if (title && episodeNumber && links.length > 0) {
      episodes.push({
        title: title,
        size: size || 'Unknown',
        episodeNumber: episodeNumber,
        links: links
      });
    }
  });

  return episodes;
}

// Main function to scrape 4KHDHub details page
async function scrape4KHDHubDetails(url: string): Promise<any> {
  try {
    console.log(`Scraping 4KHDHub details from: ${url}`);

    const response = await fetch(url, {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': new URL(url).origin + '/',
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch details: ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);

    // Extract page title
    const pageTitle = $('title').text().trim() || 'Unknown Title';

    // Parse Complete Packs from the complete-pack tab
    const completePacks: SeasonPack[] = [];

    $('#complete-pack .space-y-4 .download-item').each((_, packElement) => {
      const $pack = $(packElement);
      const header = $pack.find('.download-header');
      const content = $pack.find('div[id^="content-"]');

      // Extract data-file-id from header
      const fileId = header.attr('data-file-id') || '';

      // Extract title from the flex-1 div (get first text node, not including <br> and <code>)
      const titleElement = header.find('.flex-1');
      let mainTitle = '';

      // Get the first text node before any <br> or <code> tags
      titleElement.contents().each((_, node: any) => {
        if (node.nodeType === 3) { // Text node
          const text = $(node).text().trim();
          if (text && !mainTitle) {
            mainTitle = text;
            return false; // Break the loop
          }
        } else if (node.nodeName && node.nodeName.toLowerCase() === 'br') {
          return false; // Stop at <br>
        }
      });

      // Clean up title
      mainTitle = mainTitle.replace(/\s+/g, ' ').trim();

      // Extract badges from header (inside <code> element)
      const headerBadges = extractBadges($, header);

      // Extract full file title from content
      const fullTitle = content.find('.file-title').text().trim();

      // Extract additional badges from content
      const contentBadges = extractBadges($, content);

      // Combine all badges
      const allBadges = [...headerBadges, ...contentBadges];

      // Extract download links from the grid
      const links = extractDownloadLinks($, content);

      if (mainTitle && links.length > 0) {
        const languages = extractLanguages(allBadges);
        const sizeBadge = allBadges.find(b => b.includes('GB') || b.includes('MB'));
        const qualityBadge = allBadges.find(b =>
          b.includes('1080p') ||
          b.includes('2160p') ||
          b.includes('720p') ||
          b.includes('4K')
        );
        const formatBadge = allBadges.find(b =>
          b.includes('BluRay') ||
          b.includes('WEB-DL') ||
          b.includes('REMUX') ||
          b.includes('HEVC') ||
          b.includes('x264') ||
          b.includes('x265') ||
          b.includes('HDR') ||
          b.includes('DV')
        );

        completePacks.push({
          id: fileId,
          title: fullTitle || mainTitle,
          season: mainTitle, // Use main title as season identifier
          size: sizeBadge || 'Unknown',
          languages: languages,
          quality: qualityBadge || 'Unknown',
          format: formatBadge || 'Unknown',
          source: '4kHDHub.Com',
          badges: allBadges,
          links: links
        });
      }
    });

    // Parse Episode Seasons from the episodes tab
    const episodeSeasons: EpisodeSeason[] = [];

    $('#episodes .season-item').each((_, seasonElement) => {
      const $season = $(seasonElement);
      const header = $season.find('.episode-header');

      // Extract season ID from data-episode-id
      const seasonId = header.attr('data-episode-id') || '';

      // Extract season title and info
      const seasonTitle = header.find('.episode-title').text().trim();
      const seasonNumber = header.find('.episode-number').text().trim();

      // Extract episode count and languages from badges
      const badges = extractBadges($, header.find('.episode-meta'));
      const episodeCountBadge = badges.find(b => b.toLowerCase().includes('episodes'));
      const episodeCount = episodeCountBadge ? parseInt(episodeCountBadge.match(/\d+/)?.[0] || '0') : 0;

      const languages = extractLanguages(badges);

      // Extract quality from season title
      const qualityMatch = seasonTitle.match(/(1080p|2160p|720p|4K)/i);
      const quality = qualityMatch ? qualityMatch[0] : 'Unknown';

      // Extract episodes from the episode content
      const episodeContent = $season.find('.episode-content');
      const episodes = extractEpisodes($, episodeContent);

      if (seasonTitle && episodes.length > 0) {
        episodeSeasons.push({
          id: seasonId,
          title: seasonTitle,
          season: seasonNumber,
          episodeCount: episodeCount || episodes.length,
          languages: languages,
          quality: quality,
          episodes: episodes
        });
      }
    });

    return {
      title: pageTitle,
      url: url,
      completePacks: completePacks,
      episodeSeasons: episodeSeasons,
      totalPacks: completePacks.length,
      totalEpisodeSeasons: episodeSeasons.length
    };

  } catch (error) {
    console.error('Error scraping 4KHDHub details:', error);
    throw error;
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<FourKHDHubDetailsResponse>> {
  try {
    // Validate API key
    const authResult = await validateApiKey(request);
    if (!authResult.isValid) {
      return createUnauthorizedResponse(authResult.error || 'Invalid API key') as NextResponse<FourKHDHubDetailsResponse>;
    }

    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url || !url.trim()) {
      return NextResponse.json<FourKHDHubDetailsResponse>(
        {
          success: false,
          error: 'URL parameter is required',
          message: 'Please provide a valid 4KHDHub URL'
        },
        { status: 400 }
      );
    }

    // Validate URL format
    const isValidUrl = await validate4kHDHubUrl(url.trim());
    if (!isValidUrl) {
      return NextResponse.json<FourKHDHubDetailsResponse>(
        {
          success: false,
          error: 'Invalid URL format',
          message: 'URL must be from a valid 4kHDHub domain'
        },
        { status: 400 }
      );
    }

    console.log('Processing 4KHDHub details request:', { url });

    const data = await scrape4KHDHubDetails(url.trim());

    if (!data || (data.completePacks.length === 0 && data.episodeSeasons.length === 0)) {
      return NextResponse.json<FourKHDHubDetailsResponse>({
        success: false,
        error: 'No content found',
        message: 'No download content found on this page',
        remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
      });
    }

    return NextResponse.json<FourKHDHubDetailsResponse>({
      success: true,
      data: data,
      remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
    });

  } catch (error: unknown) {
    console.error('4KHDHub Details API error:', error);

    return NextResponse.json<FourKHDHubDetailsResponse>(
      {
        success: false,
        error: 'Failed to extract details from 4KHDHub',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
