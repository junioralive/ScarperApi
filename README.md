# ScreenScape - Movie & Series Scraping API 🎬

A comprehensive Next.js-based API service that provides free access to movies, TV series, and anime content from multiple sources. Built with TypeScript, this service offers robust scraping capabilities, user authentication, and API key management.

## 🚀 Features

- **Multi-Source Scraping**: Supports 20+ popular movie and series websites
- **Authentication System**: Firebase-based user authentication
- **API Key Management**: Secure API key generation and usage tracking
- **Rate Limiting**: Built-in request rate limiting per user
- **Global Search**: Search across multiple sources simultaneously
- **Responsive Dashboard**: Modern UI built with shadcn/ui components
- **Real-time Data**: Fresh content scraping with caching optimization
- **Video Streaming**: Direct video link extraction and streaming support

## 📋 Supported Sources

### Movie & Series Platforms
- **VegaMovies** - Latest movies and series
- **Movies4U** - High-quality movie downloads
- **HDHub4U** - HD movie collection
- **MoviesWorld** - Popular movie database
- **MoviesDrive** - Drive-based movie storage
- **DesiRemovies** - Regional content
- **FilmyFly** - Latest releases
- **KMMovies** - Korean and international movies
- **UHDMovies** - Ultra HD content
- **ShowBox** - TV series and movies
- **TopMovies** - Trending content
- **ZinkMovies** - Movie streaming
- **4KHDHub** - 4K quality movies
- **10BitClub** - High bitrate content
- **1Full4Movies** - Full movie collection
- **AllMoviesHub** - Comprehensive movie hub
- **CinemaLux** - Premium movie content
- **GdFlix** - Google Drive hosted content
- **NetMirror** - Mirror streaming service
- **VidSrc** - Video source aggregator

### Special Services
- **VCloud** - Cloud-based video streaming
- **HubCloud** - ⚠️ **VPS Compatibility Warning**: HubCloud service will not work on VPS due to IP restrictions
- **Gyanigurus** - Educational content
- **LeechPro** - Professional leeching service
- **MDrive** - Media drive service

## 🛠️ Installation

1. **Clone the repository**
```bash
git clone https://github.com/Anshu78780/ScarperApi.git
cd ScarperApi
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
Create a `.env.local` file with the following variables:
```env
# Database
DATABASE_URL="your_neon_database_url"

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY="your_firebase_api_key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your_firebase_auth_domain"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your_firebase_project_id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your_firebase_storage_bucket"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your_firebase_messaging_sender_id"
NEXT_PUBLIC_FIREBASE_APP_ID="your_firebase_app_id"

# Application
NEXTAUTH_SECRET="your_nextauth_secret"
NEXTAUTH_URL="http://localhost:3000"
```

4. **Database Setup**
```bash
npm run db:generate
npm run db:migrate
```

5. **Run the development server**
```bash
npm run dev
```

## 🔧 Configuration

### Base URLs Update Required

⚠️ **Important**: Before deploying, you must update the base URLs in the following locations:

1. **Global Search API** (`app/api/global-search/route.ts`)
2. **Authentication callbacks** (`lib/auth.ts`)
3. **Frontend API calls** (various dashboard components)
4. **CORS settings** (`middleware.ts`)

Search for `localhost:3000` or hardcoded URLs and replace with your production domain.

### API Authentication

All API endpoints require authentication via API key. Include your API key in requests using one of these methods:

1. **Header**: `x-api-key: your_api_key`
2. **Authorization**: `Authorization: Bearer your_api_key`
3. **Query Parameter**: `?api_key=your_api_key`

## 📚 API Documentation

### Authentication Endpoints

- `GET /api/auth/sync-user` - Sync user data with Firebase
- `GET /api/api-keys` - Get user API keys
- `POST /api/api-keys` - Generate new API key

### Search Endpoints

- `GET /api/global-search?q={query}` - Search across all sources
- `GET /api/{source}?search={query}` - Search specific source

### Movie/Series Endpoints

- `GET /api/{source}` - List content from source
- `GET /api/{source}/details?url={url}` - Get detailed information
- `GET /api/{source}/stream?url={url}` - Get streaming links

### Episode Endpoints

- `GET /api/episodes/{id}` - Get episode details
- `GET /api/{source}/episodes` - List episodes for series

### Utility Endpoints

- `GET /api/video?url={url}` - Extract video links
- `GET /api/test?url={url}` - Test URL extraction
- `GET /api/posts` - Get anime/series posts

## 🎯 Example Usage

### Search for Movies
```javascript
const response = await fetch('https://your-domain.com/api/global-search?q=avengers', {
  headers: {
    'x-api-key': 'your_api_key'
  }
});
const data = await response.json();
```

### Get Movie Details
```javascript
const response = await fetch('https://your-domain.com/api/vegamovies/details?url=movie_url', {
  headers: {
    'x-api-key': 'your_api_key'
  }
});
const movieDetails = await response.json();
```

### Stream Video
```javascript
const response = await fetch('https://your-domain.com/api/showbox/stream?url=stream_url', {
  headers: {
    'x-api-key': 'your_api_key'
  }
});
const streamLinks = await response.json();
```

## 🚀 Deployment

### Vercel (Recommended)

1. **Deploy to Vercel**
```bash
npx vercel --prod
```

2. **Set Environment Variables**
Add all environment variables in Vercel dashboard

3. **Update Base URLs**
Replace all localhost references with your Vercel domain

### Docker Deployment

```dockerfile
# Use the official Node.js runtime as the base image
FROM node:18-alpine

# Set the working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["npm", "start"]
```

### VPS Deployment

⚠️ **Note**: When deploying on VPS, the HubCloud service will not function due to IP restrictions and anti-bot measures.

1. **Set up Node.js environment**
2. **Install PM2 for process management**
3. **Configure reverse proxy (Nginx)**
4. **Set up SSL certificates**
5. **Update all base URLs to your VPS domain**

## 🔐 Security Features

- **API Key Authentication**: Secure access control
- **Rate Limiting**: Prevents API abuse
- **Request Validation**: Input sanitization
- **User-Agent Rotation**: Prevents blocking
- **Error Handling**: Graceful error responses
- **CORS Protection**: Configurable cross-origin policies

## 🎨 Tech Stack

- **Framework**: Next.js 14 with TypeScript
- **Database**: Neon PostgreSQL with Drizzle ORM
- **Authentication**: Firebase Auth
- **UI Components**: shadcn/ui + Radix UI
- **Styling**: Tailwind CSS
- **Scraping**: Cheerio + Custom extractors
- **State Management**: React Context
- **Build Tool**: Turbopack

## 📊 Dashboard Features

- **User Management**: Track API usage and limits
- **API Key Management**: Generate and manage multiple keys
- **Usage Analytics**: Monitor request patterns
- **Documentation**: Interactive API documentation
- **Global Search**: Search across all sources
- **Responsive Design**: Mobile-friendly interface

## ⚠️ Important Notes

1. **Base URL Updates**: Must update all hardcoded localhost URLs before production
2. **HubCloud VPS Issue**: HubCloud service will not work on VPS deployments
3. **Rate Limits**: Default limit is 1000 requests per user
4. **Legal Compliance**: Ensure compliance with local laws regarding content scraping
5. **Source Availability**: Some sources may become unavailable; monitor and update accordingly

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Update base URLs if needed
5. Test thoroughly
6. Submit a pull request

## 📄 License

This project is for educational purposes only. Users are responsible for ensuring compliance with applicable laws and terms of service of scraped websites.

## 🆘 Support

For issues and questions:
- Check the [Issues](https://github.com/Anshu78780/ScarperApi/issues) section
- Review the API documentation in the dashboard
- Test endpoints using the built-in testing tools

---

**⚠️ Disclaimer**: This tool is for educational and research purposes only. Users are responsible for respecting robots.txt files, rate limits, and terms of service of target websites.