import { NextRequest, NextResponse } from 'next/server';
import { load } from 'cheerio';
import { validateApiKey, createUnauthorizedResponse } from '@/lib/middleware/api-auth';

interface StreamLink {
  server: string;
  link: string;
  type: string;
  copyable?: boolean;
}

interface HDHub4uStreamResponse {
  success: boolean;
  data?: {
    episodeUrl: string;
    streamLinks: StreamLink[];
  };
  error?: string;
  message?: string;
  remainingRequests?: number;
}

function rot13(str: string): string {
  return str.replace(/[a-zA-Z]/g, function (char) {
    const charCode = char.charCodeAt(0);
    const isUpperCase = char <= 'Z';
    const baseCharCode = isUpperCase ? 65 : 97;
    return String.fromCharCode(
      ((charCode - baseCharCode + 13) % 26) + baseCharCode,
    );
  });
}

function decodeString(encryptedString: string): any {
  try {
    console.log('Starting decode with:', encryptedString);

    // First base64 decode
    let decoded = atob(encryptedString);
    console.log('After first base64 decode:', decoded);

    // Second base64 decode
    decoded = atob(decoded);
    console.log('After second base64 decode:', decoded);

    // ROT13 decode
    decoded = rot13(decoded);
    console.log('After ROT13 decode:', decoded);

    // Third base64 decode
    decoded = atob(decoded);
    console.log('After third base64 decode:', decoded);

    // Parse JSON
    const result = JSON.parse(decoded);
    console.log('Final parsed result:', result);
    return result;
  } catch (error) {
    console.error('Error decoding string:', error);

    // Try alternative decoding approaches
    try {
      console.log('Trying alternative decode approach...');
      let altDecoded = atob(encryptedString);
      altDecoded = atob(altDecoded);
      const altResult = JSON.parse(altDecoded);
      console.log('Alternative decode successful:', altResult);
      return altResult;
    } catch (altError) {
      console.error('Alternative decode also failed:', altError);
      return null;
    }
  }
}

function encode(value: string): string {
  return btoa(value.toString());
}

function decode(value: string): string {
  if (value === undefined) {
    return '';
  }
  return atob(value.toString());
}

function pen(value: string): string {
  return value.replace(/[a-zA-Z]/g, function (char: string) {
    return String.fromCharCode(
      (char <= 'Z' ? 90 : 122) >=
        (char = char.charCodeAt(0) + 13)
        ? char
        : char - 26,
    );
  });
}

async function getRedirectLinks(link: string): Promise<string> {
  try {
    const res = await fetch(link, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });

    const resText = await res.text();

    const regex = /ck\('_wp_http_\d+','([^']+)'/g;
    let combinedString = '';

    let match;
    while ((match = regex.exec(resText)) !== null) {
      combinedString += match[1];
    }

    const decodedString = decode(pen(decode(decode(combinedString))));
    const data = JSON.parse(decodedString);
    console.log('Redirect data:', data);

    const token = encode(data?.data);
    const blogLink = data?.wp_http1 + '?re=' + token;

    // Wait for the required time
    const waitTime = (Number(data?.total_time) + 3) * 1000;
    console.log(`Waiting ${waitTime}ms before proceeding...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));

    console.log('Blog link:', blogLink);

    let vcloudLink = 'Invalid Request';
    let attempts = 0;
    const maxAttempts = 5;

    while (vcloudLink.includes('Invalid Request') && attempts < maxAttempts) {
      const blogRes = await fetch(blogLink, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
      });

      const blogText = await blogRes.text();

      if (blogText.includes('Invalid Request')) {
        console.log('Invalid request, retrying...');
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
      } else {
        const reurlMatch = blogText.match(/var reurl = "([^"]+)"/);
        if (reurlMatch) {
          vcloudLink = reurlMatch[1];
          break;
        }
      }
    }

    return blogLink;
  } catch (err) {
    console.log('Error in getRedirectLinks:', err);
    return link;
  }
}

async function hdhub4uGetStream(link: string): Promise<StreamLink[]> {
  try {
    console.log('Processing HDHub4u stream link:', link);

    let hubcloudLink = '';

    // Handle hubcdn.fans links directly
    if (link.includes('hubcdn.fans')) {
      console.log('Processing hubcdn.fans link:', link);
      const hubcdnRes = await fetch(link, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
      });

      const hubcdnText = await hubcdnRes.text();

      // Extract reurl from script tag
      const reurlMatch = hubcdnText.match(/var reurl = "([^"]+)"/);
      if (reurlMatch && reurlMatch[1]) {
        const reurlValue = reurlMatch[1];
        console.log('Found reurl:', reurlValue);

        // Extract base64 encoded part after r=
        const urlMatch = reurlValue.match(/\?r=(.+)$/);
        if (urlMatch && urlMatch[1]) {
          const base64Encoded = urlMatch[1];
          console.log('Base64 encoded part:', base64Encoded);

          try {
            const decodedUrl = atob(base64Encoded);
            console.log('Decoded URL:', decodedUrl);

            let finalVideoUrl = decodedUrl;
            const linkMatch = decodedUrl.match(/[?&]link=(.+)$/);
            if (linkMatch && linkMatch[1]) {
              finalVideoUrl = decodeURIComponent(linkMatch[1]);
              console.log('Extracted video URL:', finalVideoUrl);
            }

            return [
              {
                server: 'HDHub4u Direct',
                link: finalVideoUrl,
                type: 'mp4',
                copyable: true,
              },
            ];
          } catch (decodeError) {
            console.error('Error decoding base64:', decodeError);
          }
        }
      }
    }

    if (link.includes('hubdrive') || link.includes('hubcloud')) {
      hubcloudLink = link;
    } else {
      const res = await fetch(link, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
      });

      const text = await res.text();
      const encryptedString = text.split("s('o','")?.[1]?.split("',180")?.[0];
      console.log('Encrypted string:', encryptedString);

      if (!encryptedString) {
        throw new Error('Could not extract encrypted string from response');
      }

      const decodedString: any = decodeString(encryptedString);
      console.log('Decoded string:', decodedString);

      if (!decodedString?.o) {
        throw new Error('Invalid decoded data structure');
      }

      link = atob(decodedString.o);
      console.log('New link:', link);

      const redirectLink = await getRedirectLinks(link);
      console.log('Redirect link:', redirectLink);

      // Check if the redirect link is already a hubcloud drive link
      if (redirectLink.includes('hubcloud') && redirectLink.includes('/drive/')) {
        hubcloudLink = redirectLink;
        console.log('Using redirect link as hubcloud link:', hubcloudLink);
      } else {
        // Fetch the redirect page to find download links
        const redirectLinkRes = await fetch(redirectLink, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          }
        });

        const redirectLinkText = await redirectLinkRes.text();
        const $ = load(redirectLinkText);

        // Try multiple selectors to find download/stream links
        hubcloudLink = $('h3:contains("1080p")').find('a').attr('href') ||
          $('a[href*="hubdrive"]').first().attr('href') ||
          $('a[href*="hubcloud"]').first().attr('href') ||
          $('a[href*="drive"]').first().attr('href');

        // If still not found, try regex patterns
        if (!hubcloudLink) {
          const hubcloudPatterns = [
            /href="(https:\/\/hubcloud\.[^\/]+\/drive\/[^"]+)"/g,
            /href="(https:\/\/[^"]*hubdrive[^"]*)"/g,
            /href="(https:\/\/[^"]*drive[^"]*[a-zA-Z0-9]+)"/g
          ];

          for (const pattern of hubcloudPatterns) {
            const matches = [...redirectLinkText.matchAll(pattern)];
            if (matches.length > 0) {
              hubcloudLink = matches[matches.length - 1][1];
              break;
            }
          }
        }

        console.log('Extracted hubcloud link from page:', hubcloudLink);
      }
    }

    if (!hubcloudLink) {
      throw new Error('Could not extract hubcloud link');
    }

    console.log('Final hubcloud link:', hubcloudLink);

    // Extract the final video URL from hubcloud
    const hubcloudRes = await fetch(hubcloudLink, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }
    });

    const finalText = await hubcloudRes.text();

    // Try to extract video URL from various patterns
    const videoUrlPatterns = [
      /sources:\s*\[\s*{\s*file:\s*"([^"]+)"/,
      /file:\s*"([^"]+\.mp4[^"]*)"/,
      /src:\s*"([^"]+\.mp4[^"]*)"/,
      /"file":"([^"]+\.mp4[^"]*)"/,
      /"src":"([^"]+\.mp4[^"]*)"/,
      /video[^>]*src="([^"]+\.mp4[^"]*)"/
    ];

    for (const pattern of videoUrlPatterns) {
      const match = finalText.match(pattern);
      if (match && match[1]) {
        console.log('Found video URL:', match[1]);
        return [
          {
            server: 'HDHub4u Stream',
            link: match[1],
            type: 'mp4',
            copyable: true,
          }
        ];
      }
    }

    // If no direct video URL found, return the hubcloud link
    return [
      {
        server: 'HDHub4u Hubcloud',
        link: hubcloudLink,
        type: 'redirect',
        copyable: true,
      }
    ];

  } catch (error) {
    console.error('Error in HDHub4u stream extraction:', error);
    return [];
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<HDHub4uStreamResponse>> {
  try {
    // Validate API key
    const authResult = await validateApiKey(request);
    if (!authResult.isValid) {
      return createUnauthorizedResponse(authResult.error || 'Invalid API key') as NextResponse<HDHub4uStreamResponse>;
    }

    const { searchParams } = new URL(request.url);
    const episodeUrl = searchParams.get('url');

    if (!episodeUrl) {
      return NextResponse.json<HDHub4uStreamResponse>(
        {
          success: false,
          error: 'Episode URL is required',
          message: 'Please provide an episode URL parameter'
        },
        { status: 400 }
      );
    }

  
    console.log('Processing HDHub4u stream request for URL:', episodeUrl);

    const streamLinks = await hdhub4uGetStream(episodeUrl);

    if (!streamLinks || streamLinks.length === 0) {
      return NextResponse.json<HDHub4uStreamResponse>({
        success: false,
        error: 'No stream links found',
        message: 'No streaming links could be extracted from the provided URL',
        remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
      });
    }

    return NextResponse.json<HDHub4uStreamResponse>({
      success: true,
      data: {
        episodeUrl,
        streamLinks
      },
      remainingRequests: authResult.apiKey ? (authResult.apiKey.requestsLimit - authResult.apiKey.requestsUsed) : 0
    });

  } catch (error: unknown) {
    console.error('HDHub4u stream API error:', error);

    return NextResponse.json<HDHub4uStreamResponse>(
      {
        success: false,
        error: 'Failed to extract stream links',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
