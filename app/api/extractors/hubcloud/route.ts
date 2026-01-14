import { NextRequest, NextResponse } from 'next/server'
import { load } from 'cheerio'

interface Stream {
  server: string;
  link: string;
  type: string;
}

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Referer': 'https://hubcloud.lol/',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
}

const cookies = 'xyt=2; ads-counter-97455=0-1'

const decode = function (value: string) {
  if (value === undefined) {
    return '';
  }
  return atob(value.toString());
};

const rot13 = function (str: string): string {
  return str.replace(/[a-zA-Z]/g, function (char) {
    const charCode = char.charCodeAt(0);
    const isUpperCase = char <= 'Z';
    const baseCharCode = isUpperCase ? 65 : 97;
    return String.fromCharCode(
      ((charCode - baseCharCode + 13) % 26) + baseCharCode,
    );
  });
};

const pen = function (value: string): string {
  return value.replace(/[a-zA-Z]/g, function (char: string) {
    return String.fromCharCode(
      (char <= 'Z' ? 90 : 122) >=
        (char = char.charCodeAt(0) + 13)
        ? char
        : char - 26,
    );
  });
};

const encode = function (value: string): string {
  return btoa(value.toString());
};

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
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        const reurlMatch = blogText.match(/var reurl = "([^"]+)"/);
        if (reurlMatch) {
          vcloudLink = reurlMatch[1];
          break;
        }
      }
    }

    return vcloudLink;
  } catch (err) {
    console.log('Error in getRedirectLinks:', err);
    return link;
  }
}

async function hubcloudExtracter(link: string): Promise<Stream[]> {
  try {
    console.log('hubcloudExtracter', link);
    const baseUrl = link.split('/').slice(0, 3).join('/');
    const streamLinks: Stream[] = [];

    // Handle gadgetsweb.xyz/?id= links specially
    if (link.includes('gadgetsweb.xyz') && link.includes('/?id=')) {
      console.log('Detected gadgetsweb.xyz link with encrypted ID');
      
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

      const decodedLink = atob(decodedString.o);
      console.log('Decoded link:', decodedLink);

      const redirectLink = await getRedirectLinks(decodedLink);
      console.log('Redirect link:', redirectLink);

      // Check if the redirect link is already a hubcloud drive link
      if (redirectLink.includes('hubcloud') && redirectLink.includes('/drive/')) {
        return [{
          server: 'HubCloud',
          link: redirectLink,
          type: 'mkv',
        }];
      }

      // Fetch the redirect page to find download links
      const redirectLinkRes = await fetch(redirectLink, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
      });

      const redirectLinkText = await redirectLinkRes.text();
      const $ = load(redirectLinkText);

      // Try multiple selectors to find download/stream links
      let hubcloudLink = $('h3:contains("1080p")').find('a').attr('href') ||
        $('a[href*="hubdrive"]').first().attr('href') ||
        $('a[href*="hubcloud"]').first().attr('href') ||
        $('a[href*="drive"]').first().attr('href') || '';

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

      if (hubcloudLink) {
        console.log('Extracted hubcloud link:', hubcloudLink);
        return [{
          server: 'HubCloud',
          link: hubcloudLink,
          type: 'mkv',
        }];
      }
    }

    const vLinkRes = await fetch(link, { 
      headers: {
        ...headers,
        'Cookie': cookies,
      }
    });

    if (!vLinkRes.ok) {
      throw new Error(`Failed to fetch: ${vLinkRes.status}`);
    }

    const vLinkText = await vLinkRes.text();
    const $vLink = load(vLinkText);
    const vLinkRedirect = vLinkText.match(/var\s+url\s*=\s*'([^']+)';/) || [];

    let vcloudLink =
      decode(vLinkRedirect[1]?.split('r=')?.[1]) ||
      vLinkRedirect[1] ||
      $vLink('.fa-file-download.fa-lg').parent().attr('href') ||
      link;

    console.log('vcloudLink', vcloudLink);

    if (vcloudLink?.startsWith('/')) {
      vcloudLink = `${baseUrl}${vcloudLink}`;
      console.log('New vcloudLink', vcloudLink);
    }

    // Check if this is a gamerxyt.com/hubcloud.php link
    if (vcloudLink.includes('gamerxyt.com/hubcloud.php')) {
      console.log('Detected gamerxyt.com hubcloud.php link, fetching with cookie...');
      
      try {
        const gamerxytRes = await fetch(vcloudLink, {
          headers: {
            ...headers,
            'Cookie': cookies,
            'Referer': baseUrl,
          },
        });

        if (!gamerxytRes.ok) {
          throw new Error(`Failed to fetch gamerxyt page: ${gamerxytRes.status}`);
        }

        const gamerxytText = await gamerxytRes.text();
        const $gamerxyt = load(gamerxytText);
        console.log('gamerxyt.com page loaded, extracting links...');

        // Extract all download links from the page
        const linkPromises: Promise<void>[] = [];
        
        $gamerxyt('a.btn').each((_, element) => {
          const $link = $gamerxyt(element);
          const href = $link.attr('href');
          const buttonText = $link.text().trim();

          if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
            // Skip Telegram/bloggingvector/ampproject links
            if (href.includes('bloggingvector') || 
                href.includes('ampproject.org') || 
                href.includes('telegram') ||
                buttonText.toLowerCase().includes('telegram')) {
              console.log(`Skipping Telegram/bloggingvector link: ${buttonText}`);
              return;
            }
            
            console.log(`Found button: ${buttonText} - ${href}`);
            
            if (buttonText.includes('FSL Server') || buttonText.includes('FSLv2 Server') || href.includes('.r2.dev') || href.includes('fsl.cdnbaba') || href.includes('cdn.fsl-buckets')) {
              streamLinks.push({server: 'Cf Worker', link: href, type: 'mkv'});
              console.log(`Added Cf Worker link: ${href}`);
            } else if (href.includes('gpdl2.hubcdn.fans') || href.includes('gpdl.hubcdn.fans')) {
              const extractGpdlLink = async () => {
                try {
                  console.log('Processing gpdl link through redirect API:', href);
                  const redirectApiUrl = `https://net-cookie-kacj.vercel.app/api/redirect?url=${encodeURIComponent(href)}`;
                  
                  const redirectRes = await fetch(redirectApiUrl, {
                    headers: {
                      'Accept': 'application/json',
                    },
                  });

                  if (!redirectRes.ok) {
                    console.log(`Failed to fetch redirect API: ${redirectRes.status}`);
                    return;
                  }

                  const redirectData = await redirectRes.json();
                  
                  // Extract URL from nested JSON response structure
                  let finalUrl = redirectData?.data?.finalUrl || redirectData?.finalUrl || redirectData?.url || redirectData;
                  
                  // Remove the gamerxyt.com/dl.php?link= prefix if present
                  if (typeof finalUrl === 'string' && finalUrl.includes('gamerxyt.com/dl.php?link=')) {
                    finalUrl = finalUrl.split('gamerxyt.com/dl.php?link=')[1];
                  }
                  
                  if (finalUrl && typeof finalUrl === 'string') {
                    console.log('Final video URL:', finalUrl);
                    streamLinks.push({server: 'HubCdn', link: finalUrl, type: 'mkv'});
                  }
                } catch (redirectError) {
                  console.log('Error processing gpdl link through redirect API:', redirectError);
                }
              };
              linkPromises.push(extractGpdlLink());
            } else if (href.includes('pixel.hubcdn.fans')) {
              const extractPixelLink = async () => {
                try {
                  console.log('Extracting final URL from pixel.hubcdn.fans:', href);
                  const pixelRes = await fetch(href, {
                    headers: {
                      ...headers,
                      'Cookie': cookies,
                      'Referer': 'https://gamerxyt.com/',
                    },
                  });

                  if (!pixelRes.ok) {
                    console.log(`Failed to fetch pixel.hubcdn.fans: ${pixelRes.status}`);
                    return;
                  }

                  const pixelText = await pixelRes.text();
                  const $pixel = load(pixelText);
                  let finalVideoUrl = $pixel('a#vd').attr('href');
                  
                  if (!finalVideoUrl) {
                    finalVideoUrl = $pixel('div.vd a').attr('href');
                  }
                  
                  if (!finalVideoUrl) {
                    console.log('pixel.hubcdn.fans page content (first 500 chars):', pixelText.substring(0, 500));
                  }

                  if (finalVideoUrl) {
                    console.log('Found final video URL from pixel.hubcdn.fans:', finalVideoUrl);
                    streamLinks.push({server: 'HubCdn', link: finalVideoUrl, type: 'mkv'});
                  } else {
                    console.log('No video URL found in pixel.hubcdn.fans page');
                  }
                } catch (pixelError) {
                  console.log('Error extracting from pixel.hubcdn.fans:', pixelError);
                }
              };
              linkPromises.push(extractPixelLink());
            } else if (buttonText.includes('PixeLServer') || href.includes('pixeldrain.dev')) {
              let pixeldrainLink = href;
              // Convert /u/TOKEN to /api/file/TOKEN
              if (href.includes('/u/')) {
                const token = href.split('/u/')[1]?.split('?')[0];
                if (token) {
                  const baseUrl = href.split('/u/')[0];
                  pixeldrainLink = `${baseUrl}/api/file/${token}`;
                  console.log(`Converted pixeldrain link: ${href} -> ${pixeldrainLink}`);
                }
              }
              streamLinks.push({server: 'Pixeldrain', link: pixeldrainLink, type: 'mkv'});
              console.log(`Added Pixeldrain link: ${pixeldrainLink}`);
            } else if (href.includes('mega.hubcloud') || buttonText.toLowerCase().includes('mega')) {
              streamLinks.push({server: 'Mega', link: href, type: 'mkv'});
              console.log(`Added Mega link: ${href}`);
            } else if (href.includes('cloudserver') || href.includes('workers.dev') || buttonText.toLowerCase().includes('zipdisk')) {
              streamLinks.push({server: 'ZipDisk', link: href, type: 'zip'});
              console.log(`Added ZipDisk link: ${href}`);
            } else if (href.includes('cloudflarestorage')) {
              streamLinks.push({server: 'CfStorage', link: href, type: 'mkv'});
              console.log(`Added CfStorage link: ${href}`);
            } else if (href.includes('fastdl')) {
              streamLinks.push({server: 'FastDl', link: href, type: 'mkv'});
              console.log(`Added FastDl link: ${href}`);
            }
          }
        });

        await Promise.all(linkPromises);

        console.log(`Extracted ${streamLinks.length} links from gamerxyt.com`);
        console.log('streamLinks', streamLinks);
        return streamLinks;
      } catch (gamerxytError) {
        console.log('hubcloudExtracter error in gamerxyt.com request:', gamerxytError);
      }
    }

    const vcloudRes = await fetch(vcloudLink, {
      headers: {
        ...headers,
        'Cookie': cookies,
      },
      redirect: 'follow',
    });

    if (!vcloudRes.ok) {
      throw new Error(`Failed to fetch vcloud link: ${vcloudRes.status}`);
    }

    const $ = load(await vcloudRes.text());
    console.log('vcloudRes page loaded, looking for download links...');

    const linkClass = $('.btn-success.btn-lg.h6,.btn-danger,.btn-secondary');

    for (let i = 0; i < linkClass.length; i++) {
      const element = linkClass[i];
      const itm = $(element);
      let link = itm.attr('href') || '';

      if (link?.includes('.dev') && !link?.includes('/?id=')) {
        streamLinks.push({ server: 'Cf Worker', link: link, type: 'mkv' });
      }

      if (link?.includes('pixeld')) {
        // Convert /u/TOKEN to /api/file/TOKEN
        if (link.includes('/u/')) {
          const token = link.split('/u/')[1]?.split('?')[0];
          if (token) {
            const baseUrl = link.split('/u/')[0];
            link = `${baseUrl}/api/file/${token}`;
            console.log(`Converted pixeldrain link to: ${link}`);
          }
        } else if (!link?.includes('api')) {
          const token = link.split('/').pop();
          const baseUrl = link.split('/').slice(0, -2).join('/');
          link = `${baseUrl}/api/file/${token}`;
        }
        streamLinks.push({ server: 'Pixeldrain', link: link, type: 'mkv' });
      }

      if (link?.includes('hubcloud') || link?.includes('/?id=')) {
        try {
          const newLinkRes = await fetch(link, {
            method: 'HEAD',
            headers: {
              ...headers,
              'Cookie': cookies,
            },
            redirect: 'follow'
          });
          const newLink = newLinkRes.url?.split('link=')?.[1] || link;
          streamLinks.push({ server: 'hubcloud', link: newLink, type: 'mkv' });
        } catch (error) {
          console.log('hubcloudExtracter error in hubcloud link: ', error);
        }
      }

      if (link?.includes('cloudflarestorage')) {
        streamLinks.push({ server: 'CfStorage', link: link, type: 'mkv' });
      }

      if (link?.includes('fastdl')) {
        streamLinks.push({ server: 'FastDl', link: link, type: 'mkv' });
      }

      if (link.includes('hubcdn')) {
        // Check if this is a gpdl link that needs redirect API processing
        if (link.includes('gpdl2.hubcdn.fans') || link.includes('gpdl.hubcdn.fans')) {
          try {
            console.log('Processing gpdl link through redirect API:', link);
            const redirectApiUrl = `https://net-cookie-kacj.vercel.app/api/redirect?url=${encodeURIComponent(link)}`;
            
            const redirectRes = await fetch(redirectApiUrl, {
              headers: {
                'Accept': 'application/json',
              },
            });

            if (redirectRes.ok) {
              const redirectData = await redirectRes.json();
              
              // Extract URL from nested JSON response structure
              let finalUrl = redirectData?.data?.finalUrl || redirectData?.finalUrl || redirectData?.url || redirectData;
              
              // Remove the gamerxyt.com/dl.php?link= prefix if present
              if (typeof finalUrl === 'string' && finalUrl.includes('gamerxyt.com/dl.php?link=')) {
                finalUrl = finalUrl.split('gamerxyt.com/dl.php?link=')[1];
              }
              
              if (finalUrl && typeof finalUrl === 'string') {
                console.log('Final video URL:', finalUrl);
                streamLinks.push({
                  server: 'HubCdn',
                  link: finalUrl,
                  type: 'mkv',
                });
              }
            }
          } catch (redirectError) {
            console.log('Error processing gpdl link through redirect API:', redirectError);
          }
        } else {
          streamLinks.push({
            server: 'HubCdn',
            link: link,
            type: 'mkv',
          });
        }
      }
    }

    console.log('streamLinks', streamLinks);
    return streamLinks;
  } catch (error) {
    console.log('hubcloudExtracter error: ', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const url = searchParams.get('url')

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL parameter is required' },
        { status: 400 }
      )
    }

    console.log(`Processing HubCloud URL: ${url}`);

    // Use the new hubcloudExtracter function
    const streamLinks = await hubcloudExtracter(url);

    if (streamLinks.length > 0) {
      return NextResponse.json({
        success: true,
        links: streamLinks.map(stream => ({
          name: stream.server,
          link: stream.link,
          type: stream.type,
          server: stream.server,
          isDirect: true
        }))
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'No stream links found',
        links: []
      });
    }

  } catch (error) {
    console.error('Error processing HubCloud URL:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to extract stream links',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}