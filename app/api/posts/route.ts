import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

// Function to fetch and parse HTML content
async function scrapeAnimeData() {
  try {
    // Make a request to the anime website
    const response = await fetch('https://animesalt.cc/category/language/hindi/', { 
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch posts: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    const posts = [];

    // Parse each post based on the HTML structure we observed
    $('li[class*="post-"]').each((_, element) => {
      const $element = $(element);
      
      // Extract the image URL
      const imageUrl = $element.find('img').data('src') || $element.find('img').attr('src');
      
      // Extract the title
      const title = $element.find('h2.entry-title').text().trim();
      
      // Extract the post URL
      const postUrl = $element.find('a.lnk-blk').attr('href') || $element.find('a').attr('href');

      // Extract any category/tag info
      const categories = [];
      $element.find('[class*="category-"]').each((_, catEl) => {
        const className = $(catEl).attr('class') || '';
        const matches = className.match(/category-([a-z0-9-]+)/g);
        if (matches) {
          matches.forEach(match => {
            const category = match.replace('category-', '').replace(/-/g, ' ');
            if (category !== 'publish' && !categories.includes(category)) {
              categories.push(category);
            }
          });
        }
      });

      // Only add posts with all required fields
      if (imageUrl && title && postUrl) {
        posts.push({
          imageUrl,
          title,
          postUrl,
          categories
        });
      }
    });

    return posts;
  } catch (error) {
    console.error('Error scraping anime data:', error);
    throw error;
  }
}

export async function GET() {
  try {
    const posts = await scrapeAnimeData();
    
    return NextResponse.json({ 
      success: true, 
      count: posts.length,
      posts 
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch posts' 
      }, 
      { status: 500 }
    );
  }
}
