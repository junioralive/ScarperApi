import { NextRequest, NextResponse } from 'next/server';
import { getNetMirrorUrl, fetchNetMirrorCookies } from '@/lib/utils/providers';

interface NetMirrorPostResponse {
    success: boolean;
    data?: any;
    requestParams?: {
        id: string;
        timestamp: string;
    };
    error?: string;
    message?: string;
}

/**
 * Function to fetch post details from NetMirror post.php endpoint
 */
async function fetchNetMirrorPost(id: string, timestamp: string): Promise<any> {
    try {
        const baseUrl = await getNetMirrorUrl();
        const cookies = await fetchNetMirrorCookies();

        // Remove trailing slash from baseUrl if it exists, then add post.php
        const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        const postUrl = `${cleanBaseUrl}/post.php?id=${id}&t=${timestamp}`;

        console.log(`Fetching NetMirror post from: ${postUrl}`);

        const response = await fetch(postUrl, {
            method: 'GET',
            cache: 'no-cache',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.5',
                'Cookie': cookies,
                'Referer': baseUrl,
                'X-Requested-With': 'XMLHttpRequest',
            },
            next: { revalidate: 0 }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch post details: ${response.status} ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');

        // Try to parse as JSON first
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        } else {
            // If not JSON, return as text
            const text = await response.text();
            try {
                // Try to parse text as JSON in case content-type is wrong
                return JSON.parse(text);
            } catch {
                // If parsing fails, return as plain text wrapped in object
                return {
                    rawResponse: text,
                    contentType: contentType || 'unknown',
                    responseHeaders: Object.fromEntries(response.headers.entries())
                };
            }
        }

    } catch (error) {
        console.error('Error fetching NetMirror post:', error);
        throw error;
    }
}

export async function GET(request: NextRequest): Promise<NextResponse<NetMirrorPostResponse>> {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const t = searchParams.get('t');

        if (!id) {
            return NextResponse.json({
                success: false,
                error: 'Missing required parameter: id',
                message: 'Please provide an id parameter in the query string (?id=your_id)'
            }, { status: 400 });
        }

        // Always use current timestamp if t is not provided
        const currentTimestamp = Date.now().toString();
        const timestampToUse = t || currentTimestamp;

        const postData = await fetchNetMirrorPost(id, timestampToUse);

        return NextResponse.json({
            success: true,
            data: postData,
            requestParams: {
                id: id,
                timestamp: timestampToUse
            }
        });

    } catch (error) {
        console.error('NetMirror GetPost API Error:', error);

        return NextResponse.json({
            success: false,
            error: 'Failed to fetch post details',
            message: error instanceof Error ? error.message : 'Unknown error occurred'
        }, { status: 500 });
    }
}