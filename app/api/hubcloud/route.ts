import { NextRequest, NextResponse } from 'next/server'

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

    const response = await fetch(`https://kmmovies-ansh.8man.me/api/hubcloud?url=${encodeURIComponent(url)}`)
    const data = await response.json()
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching from hubcloud API:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch video links' },
      { status: 500 }
    )
  }
}
