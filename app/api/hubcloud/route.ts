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

const decode = function (value: string) {
  if (value === undefined) {
    return '';
  }
  return atob(value.toString());
};

async function hubcloudExtracter(link: string): Promise<Stream[]> {
  try {
    console.log('hubcloudExtracter', link);
    const baseUrl = link.split('/').slice(0, 3).join('/');
    const streamLinks: Stream[] = [];

    const vLinkRes = await fetch(link, { headers });

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

    const vcloudRes = await fetch(vcloudLink, {
      headers,
      redirect: 'follow',
    });

    if (!vcloudRes.ok) {
      throw new Error(`Failed to fetch vcloud link: ${vcloudRes.status}`);
    }

    const $ = load(await vcloudRes.text());

    const linkClass = $('.btn-success.btn-lg.h6,.btn-danger,.btn-secondary');

    for (let i = 0; i < linkClass.length; i++) {
      const element = linkClass[i];
      const itm = $(element);
      let link = itm.attr('href') || '';

      if (link?.includes('.dev') && !link?.includes('/?id=')) {
        streamLinks.push({ server: 'Cf Worker', link: link, type: 'mkv' });
      }

      if (link?.includes('pixeld')) {
        if (!link?.includes('api')) {
          const token = link.split('/').pop();
          const baseUrl = link.split('/').slice(0, -2).join('/');
          link = `${baseUrl}/api/file/${token}?download`;
        }
        streamLinks.push({ server: 'Pixeldrain', link: link, type: 'mkv' });
      }

      if (link?.includes('hubcloud') || link?.includes('/?id=')) {
        try {
          const newLinkRes = await fetch(link, {
            method: 'HEAD',
            headers,
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
        streamLinks.push({
          server: 'HubCdn',
          link: link,
          type: 'mkv',
        });
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