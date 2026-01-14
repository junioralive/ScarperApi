import { NextRequest, NextResponse } from 'next/server';
import { getCookies } from '@/lib/baseurl';

interface NetMirrorStreamResponse {
    success: boolean;
    data?: {
        playlistUrl: string;
        streamData?: any;
        requestParams: {
            id: string;
            timestamp: string;
            h: string;
        };
    };
    error?: string;
    message?: string;
}

interface PlayResponse {
    h: string;
}

/**
 * Function to get the 'h' parameter from play.php
 */
async function getPlayHash(id: string): Promise<string> {
    try {
        const cookies = await getCookies();

        console.log(`Getting play hash for ID: ${id}`);

        const response = await fetch('https://net20.cc/play.php', {
            method: 'POST',
            cache: 'no-cache',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.5',
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookies,
                'Referer': 'https://net20.cc/',
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: `id=${id}`,
            next: { revalidate: 0 }
        });

        if (!response.ok) {
            throw new Error(`Failed to get play hash: ${response.status} ${response.statusText}`);
        }

        const data: PlayResponse = await response.json();

        if (!data.h) {
            throw new Error('Hash parameter not found in play.php response');
        }

        console.log(`Successfully got play hash: ${data.h}`);
        return data.h;

    } catch (error) {
        console.error('Error getting play hash:', error);
        throw error;
    }
}

/**
 * Function to add prefix to file URLs in sources
 */
function addPrefixToSources(data: any): any {
    const PREFIX_URL = 'https://net51.cc';

    if (data && typeof data === 'object') {
        // If data has sources array, process it
        if (Array.isArray(data.sources)) {
            data.sources = data.sources.map((source: any) => {
                if (source.file && typeof source.file === 'string' && source.file.startsWith('/')) {
                    return {
                        ...source,
                        file: PREFIX_URL + source.file
                    };
                }
                return source;
            });
        }

        // If data is an array, process each item
        if (Array.isArray(data)) {
            return data.map((item: any) => addPrefixToSources(item));
        }

        // Process nested objects
        const processedData = { ...data };
        for (const key in processedData) {
            if (processedData[key] && typeof processedData[key] === 'object') {
                processedData[key] = addPrefixToSources(processedData[key]);
            }
        }

        return processedData;
    }

    return data;
}

/**
 * Function to get playlist from playlist.php
 */
async function getPlaylist(id: string, timestamp: string, h: string): Promise<any> {
    try {
        const cookies = await getCookies();
        const playlistUrl = `https://net51.cc/playlist.php?id=${id}&tm=${timestamp}&h=${encodeURIComponent(h)}`;

        console.log(`Getting playlist from: ${playlistUrl}`);

        const response = await fetch(playlistUrl, {
            method: 'GET',
            cache: 'no-cache',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.5',
                'Cookie': cookies,
                'Referer': 'https://net51.cc/',
                'X-Requested-With': 'XMLHttpRequest',
            },
            next: { revalidate: 0 }
        });

        if (!response.ok) {
            throw new Error(`Failed to get playlist: ${response.status} ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        let responseData;

        // Try to parse as JSON first
        if (contentType && contentType.includes('application/json')) {
            responseData = await response.json();
        } else {
            // If not JSON, return as text
            const text = await response.text();
            try {
                // Try to parse text as JSON in case content-type is wrong
                responseData = JSON.parse(text);
            } catch {
                // If parsing fails, return as plain text wrapped in object
                return {
                    rawResponse: text,
                    contentType: contentType || 'unknown',
                    playlistUrl: playlistUrl
                };
            }
        }

        // Add prefix to file URLs in sources
        const processedData = addPrefixToSources(responseData);

        console.log('Successfully processed playlist data with URL prefixes');
        return processedData;

    } catch (error) {
        console.error('Error getting playlist:', error);
        throw error;
    }
}

export async function GET(request: NextRequest): Promise<NextResponse<NetMirrorStreamResponse>> {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({
                success: false,
                error: 'Missing required parameter: id',
                message: 'Please provide an id parameter in the query string (?id=your_id)'
            }, { status: 400 });
        }

        // Step 1: Get the hash from play.php
        const h = await getPlayHash(id);

        // Step 2: Generate current timestamp
        const currentTimestamp = Date.now().toString();

        // Step 3: Get playlist using the hash and timestamp
        const streamData = await getPlaylist(id, currentTimestamp, h);

        // Construct the playlist URL for reference
        const playlistUrl = `https://net51.cc/playlist.php?id=${id}&tm=${currentTimestamp}&h=${encodeURIComponent(h)}`;

        return NextResponse.json({
            success: true,
            data: {
                playlistUrl: playlistUrl,
                streamData: streamData,
                requestParams: {
                    id: id,
                    timestamp: currentTimestamp,
                    h: h
                }
            }
        });

    } catch (error) {
        console.error('NetMirror Stream API Error:', error);

        return NextResponse.json({
            success: false,
            error: 'Failed to get stream data',
            message: error instanceof Error ? error.message : 'Unknown error occurred'
        }, { status: 500 });
    }
}