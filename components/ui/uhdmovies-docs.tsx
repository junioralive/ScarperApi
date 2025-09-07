"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Play, Code2, Home, Search, Film, Download, Cloud, Info, Link2 } from "lucide-react";
import { toast } from "sonner";

interface ApiEndpoint {
  method: string;
  endpoint: string;
  description: string;
  params?: { name: string; type: string; required: boolean; description: string }[];
}

interface ApiCategory {
  name: string;
  icon: React.ReactNode;
  endpoints: ApiEndpoint[];
  color: string;
}

const uhdMoviesApiCategories: ApiCategory[] = [
  {
    name: "Get Movies",
    icon: <Home className="h-4 w-4" />,
    color: "bg-emerald-500",
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/uhdmovies",
        description: "Get all movies and series with pagination from UHDMovies",
        params: [
          { name: "page", type: "number", required: false, description: "Page number for pagination (default: 1)" }
        ]
      }
    ]
  },
  {
    name: "Search Movies",
    icon: <Search className="h-4 w-4" />,
    color: "bg-blue-500",
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/uhdmovies",
        description: "Search movies and series by title on UHDMovies",
        params: [
          { name: "search", type: "string", required: true, description: "Search query (movie/series title)" }
        ]
      }
    ]
  },
  {
    name: "Stream Data",
    icon: <Info className="h-4 w-4" />,
    color: "bg-purple-500",
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/uhdmovies/stream",
        description: "Get detailed movie/series information with episode structure and download links",
        params: [
          { name: "stream", type: "string", required: true, description: "Full movie URL from UHDMovies (e.g., https://uhdmovies.tube/download-loki-season-2-hindi-1080p-2160p/)" }
        ]
      }
    ]
  },
  {
    name: "Episode Streams",
    icon: <Link2 className="h-4 w-4" />,
    color: "bg-indigo-500",
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/uhdmovies/episode",
        description: "Extract actual streaming links from UHDMovies episode URLs",
        params: [
          { name: "url", type: "string", required: true, description: "Episode URL from tech.unblockedgames.world (e.g., https://tech.unblockedgames.world/?sid=xyz123)" }
        ]
      }
    ]
  },
  {
    name: "Drive Extractor",
    icon: <Download className="h-4 w-4" />,
    color: "bg-orange-500",
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/uhdmovies/drive",
        description: "Extract direct download links from driveleech.net URLs and URLs with sid parameters",
        params: [
          { name: "url", type: "string", required: true, description: "Drive URL (e.g., https://driveleech.net/r?key=abc123 or https://example.com/?sid=xyz789)" }
        ]
      }
    ]
  }
];

interface UHDMoviesDocsProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

// Colorized JSON component
const ColorizedJSON = ({ data, title = "Response" }: { data: string; title?: string }) => {
  const colorizeJSON = (jsonString: string) => {
    return jsonString
      .replace(/"([^"]+)":/g, '<span class="text-blue-400">"$1"</span>:')
      .replace(/: "([^"]+)"/g, ': <span class="text-green-400">"$1"</span>')
      .replace(/: (\d+)/g, ': <span class="text-yellow-400">$1</span>')
      .replace(/: (true|false)/g, ': <span class="text-purple-400">$1</span>')
      .replace(/: null/g, ': <span class="text-gray-400">null</span>')
      .replace(/\[/g, '<span class="text-red-400">[</span>')
      .replace(/\]/g, '<span class="text-red-400">]</span>')
      .replace(/{/g, '<span class="text-cyan-400">{</span>')
      .replace(/}/g, '<span class="text-cyan-400">}</span>');
  };

  return (
    <div className="bg-[#1e1e1e] rounded-lg overflow-hidden border border-gray-800">
      <div className="flex items-center justify-between bg-[#2d2d30] px-4 py-2 border-b border-gray-700">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex gap-1.5 shrink-0">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
            <div className="w-3 h-3 rounded-full bg-[#27ca3f]"></div>
          </div>
          <span className="text-gray-300 text-sm ml-2 truncate">{title}.json</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="text-gray-400 hover:text-white hover:bg-gray-700 h-6 px-2 shrink-0"
          onClick={() => {
            navigator.clipboard.writeText(data);
            toast.success("Copied to clipboard!");
          }}
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>
      <div className="overflow-x-auto">
        <pre className="p-4">
          <code 
            className="text-sm text-gray-300 font-mono whitespace-pre-wrap break-words"
            dangerouslySetInnerHTML={{ __html: colorizeJSON(data) }}
          />
        </pre>
      </div>
    </div>
  );
};

export default function UHDMoviesDocs({ apiKey, onApiKeyChange }: UHDMoviesDocsProps) {
  const [selectedCategory, setSelectedCategory] = useState(uhdMoviesApiCategories[0]);
  const [selectedEndpoint, setSelectedEndpoint] = useState(uhdMoviesApiCategories[0].endpoints[0]);
  const [testParams, setTestParams] = useState<Record<string, string>>({});
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handleCategoryChange = (categoryName: string) => {
    const category = uhdMoviesApiCategories.find(cat => cat.name === categoryName);
    if (category) {
      setSelectedCategory(category);
      setSelectedEndpoint(category.endpoints[0]);
      setTestParams({});
    }
  };

  const handleEndpointChange = (endpointPath: string) => {
    const endpoint = selectedCategory.endpoints.find(ep => ep.endpoint === endpointPath);
    if (endpoint) {
      setSelectedEndpoint(endpoint);
      setTestParams({});
    }
  };

  const testApi = async () => {
    if (!apiKey) {
      toast.error("Please enter your API key");
      return;
    }

    const missingParams = selectedEndpoint.params?.filter(param => 
      param.required && !testParams[param.name]
    ) || [];

    if (missingParams.length > 0) {
      toast.error(`Missing required parameters: ${missingParams.map(p => p.name).join(', ')}`);
      return;
    }

    setLoading(true);
    try {
      let url = selectedEndpoint.endpoint;
      
      const queryParams = new URLSearchParams();
      Object.entries(testParams).forEach(([key, value]) => {
        if (value) {
          queryParams.append(key, value);
        }
      });

      if (queryParams.toString()) {
        url += "?" + queryParams.toString();
      }

      const res = await fetch(url, {
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json"
        }
      });

      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
      
      if (!res.ok) {
        toast.error(`Error: ${res.status}`);
      } else {
        toast.success("API call successful!");
      }
    } catch (error) {
      toast.error("Failed to call API");
      setResponse(JSON.stringify({ error: "Failed to call API" }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const generateCodeExample = (language: string) => {
    const params = Object.entries(testParams).filter(([_, value]) => value);
    const baseUrl = "https://totu.me";
    
    let url = selectedEndpoint.endpoint;
    const queryParams = params.map(([key, value]) => `${key}=${value}`).join("&");
    if (queryParams) {
      url += "?" + queryParams;
    }

    switch (language) {
      case "javascript":
        if (selectedCategory.name === "Get Movies") {
          return `// Get movies and series from UHDMovies
const response = await fetch("${baseUrl}/api/uhdmovies", {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.data.movies); // Array of movies and series

// UHDMovies features:
// - 4K UHD content with HDR support
// - High-quality series (multiple seasons)
// - Multi-language releases (Hindi, English, etc.)
// - Various formats (BluRay, WEB-DL, etc.)

// With pagination
const page2 = await fetch("${baseUrl}/api/uhdmovies?page=2", {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});`;
        } else if (selectedCategory.name === "Search Movies") {
          return `// Search for movies and series
const searchQuery = "loki";
const response = await fetch(\`${baseUrl}/api/uhdmovies?search=\${encodeURIComponent(searchQuery)}\`, {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.data.movies); // Search results

// Access movie details
data.data.movies.forEach(movie => {
  console.log(\`Title: \${movie.title}\`);
  console.log(\`Year: \${movie.year}\`);
  console.log(\`Quality: \${movie.quality.join(', ')}\`);
  console.log(\`Languages: \${movie.language.join(', ')}\`);
  console.log(\`Is Series: \${movie.isSeries}\`);
});`;
        } else if (selectedCategory.name === "Stream Data") {
          return `// Get detailed movie/series information with episodes
const movieUrl = "https://uhdmovies.tube/download-loki-season-2-hindi-1080p-2160p/";
const response = await fetch(\`${baseUrl}/api/uhdmovies/stream?stream=\${encodeURIComponent(movieUrl)}\`, {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.data);

// For TV Series
if (data.data.type === 'series') {
  data.data.qualities.forEach(quality => {
    console.log(\`Quality: \${quality.quality}\`);
    quality.seasons.forEach(season => {
      console.log(\`Season \${season.seasonNumber}: \${season.episodes.length} episodes\`);
      season.episodes.forEach(episode => {
        console.log(\`Episode \${episode.episodeNumber}: \${episode.url}\`);
      });
    });
  });
}

// For Movies
if (data.data.type === 'movie') {
  data.data.movieDownloads.forEach(download => {
    console.log(\`\${download.quality} - \${download.size}: \${download.url}\`);
  });
}`;
        } else if (selectedCategory.name === "Episode Streams") {
          return `// Get actual streaming links for episode
const episodeUrl = "https://tech.unblockedgames.world/?sid=abc123...";
const response = await fetch(\`${baseUrl}/api/uhdmovies/episode?url=\${encodeURIComponent(episodeUrl)}\`, {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.data.streamLinks);

// Different streaming servers available
data.data.streamLinks.forEach(link => {
  console.log(\`Server: \${link.server}\`);
  console.log(\`Direct Link: \${link.link}\`);
  console.log(\`Type: \${link.type}\`);
});`;
        } else if (selectedCategory.name === "Drive Extractor") {
          return `// Extract direct download links from drive URLs
const driveUrl = "https://driveleech.net/r?key=UkVwSTIzU1gzQ3czMFBpQlBmeHB6NklzQjRRZFdMYStJaWI4UnZLdVd4QT0=&id=ck80cWRaZlJUSUdkV3VxT0Z4NVB3R2FUeGJPVDAzQVNkVm9HT3oyT3NwNWUrL1lGTWU5WkhQYjA3QTJkRWhrMg==";
const response = await fetch(\`${baseUrl}/api/uhdmovies/drive?url=\${encodeURIComponent(driveUrl)}\`, {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.data.extractedUrl); // Direct download link

// For URLs with sid parameter
const sidUrl = "https://tech.unblockedgames.world/?sid=abc123xyz";
const sidResponse = await fetch(\`${baseUrl}/api/uhdmovies/drive?url=\${encodeURIComponent(sidUrl)}\`, {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const sidData = await sidResponse.json();
console.log(\`Original: \${sidData.data.originalUrl}\`);
console.log(\`Extracted: \${sidData.data.extractedUrl}\`);
console.log(\`Method: \${sidData.data.extractionMethod}\`);

// Supported URL formats:
// - driveleech.net URLs
// - URLs with sid parameters
// - Direct Google Drive links`;
        }

      case "python":
        if (selectedCategory.name === "Get Movies") {
          return `# Get movies and series from UHDMovies
import requests

url = "${baseUrl}/api/uhdmovies"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data["data"]["movies"])  # Array of movies and series

# With pagination
page_2_response = requests.get(f"{url}?page=2", headers=headers)`;
        } else if (selectedCategory.name === "Search Movies") {
          return `# Search for movies and series
import requests
from urllib.parse import quote

search_query = "loki"
url = f"${baseUrl}/api/uhdmovies?search={quote(search_query)}"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data["data"]["movies"])  # Search results`;
        } else if (selectedCategory.name === "Stream Data") {
          return `# Get detailed movie/series information
import requests
from urllib.parse import quote

movie_url = "https://uhdmovies.tube/download-loki-season-2-hindi-1080p-2160p/"
url = f"${baseUrl}/api/uhdmovies/stream?stream={quote(movie_url)}"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()

if data["data"]["type"] == "series":
    for quality in data["data"]["qualities"]:
        print(f"Quality: {quality['quality']}")
        for season in quality["seasons"]:
            print(f"Season {season['seasonNumber']}: {len(season['episodes'])} episodes")

if data["data"]["type"] == "movie":
    for download in data["data"]["movieDownloads"]:
        print(f"{download['quality']} - {download['size']}: {download['url']}")`;
        } else if (selectedCategory.name === "Episode Streams") {
          return `# Get actual streaming links for episode
import requests
from urllib.parse import quote

episode_url = "https://tech.unblockedgames.world/?sid=abc123..."
url = f"${baseUrl}/api/uhdmovies/episode?url={quote(episode_url)}"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()

for link in data["data"]["streamLinks"]:
    print(f"Server: {link['server']}")
    print(f"Direct Link: {link['link']}")
    print(f"Type: {link['type']}")`;
        } else if (selectedCategory.name === "Drive Extractor") {
          return `# Extract direct download links from drive URLs
import requests
from urllib.parse import quote

drive_url = "https://driveleech.net/r?key=UkVwSTIzU1gzQ3czMFBpQlBmeHB6NklzQjRRZFdMYStJaWI4UnZLdVd4QT0=&id=ck80cWRaZlJUSUdkV3VxT0Z4NVB3R2FUeGJPVDAzQVNkVm9HT3oyT3NwNWUrL1lGTWU5WkhQYjA3QTJkRWhrMg=="
url = f"${baseUrl}/api/uhdmovies/drive?url={quote(drive_url)}"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()

if data["success"]:
    print(f"Original URL: {data['data']['originalUrl']}")
    print(f"Extracted URL: {data['data']['extractedUrl']}")
    print(f"Extraction Method: {data['data']['extractionMethod']}")
else:
    print(f"Error: {data['error']}")`;
        }

      case "curl":
        if (selectedCategory.name === "Get Movies") {
          return `# Get movies and series from UHDMovies
curl -X GET \\
  "${baseUrl}/api/uhdmovies" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"

# With pagination
curl -X GET \\
  "${baseUrl}/api/uhdmovies?page=2" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        } else if (selectedCategory.name === "Search Movies") {
          return `# Search for movies and series
curl -X GET \\
  "${baseUrl}/api/uhdmovies?search=loki" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        } else if (selectedCategory.name === "Stream Data") {
          return `# Get detailed movie/series information
curl -X GET \\
  "${baseUrl}/api/uhdmovies/stream?stream=https%3A//uhdmovies.email/download-loki-season-2-hindi-1080p-2160p/" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        } else if (selectedCategory.name === "Episode Streams") {
          return `# Get actual streaming links for episode
curl -X GET \\
  "${baseUrl}/api/uhdmovies/episode?url=https%3A//tech.unblockedgames.world/%3Fsid%3Dabc123..." \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        } else if (selectedCategory.name === "Drive Extractor") {
          return `# Extract direct download links from drive URLs
curl -X GET \\
  "${baseUrl}/api/uhdmovies/drive?url=https%3A//driveleech.net/r%3Fkey%3DUkVwSTIzU1gzQ3czMFBpQlBmeHB6NklzQjRRZFdMYStJaWI4UnZLdVd4QT0%3D%26id%3Dck80cWRaZlJUSUdkV3VxT0Z4NVB3R2FUeGJPVDAzQVNkVm9HT3oyT3NwNWUrL1lGTWU5WkhQYjA3QTJkRWhrMg%3D%3D" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        }

      default:
        return "";
    }
  };

  const getResponseExample = (category: string) => {
    switch (category) {
      case "Get Movies":
        return `{
  "success": true,
  "data": {
    "movies": [
      {
        "id": "download-loki-season-2-hindi-1080p-2160p",
        "title": "Download Loki (Season 01-02) [S02E06 Added] {Hindi-English} 1080p || 2160p || WeB-DL Esubs",
        "url": "https://uhdmovies.tube/download-loki-season-2-hindi-1080p-2160p/",
        "image": "https://uhdmovies.tube/wp-content/uploads/2023/11/loki-season-2.jpg",
        "imageAlt": "Loki Season 2",
        "category": "TV Series",
        "quality": ["1080p", "2160p", "4K", "HEVC", "10-Bit"],
        "language": ["Hindi", "English", "Dual Audio"],
        "size": ["7 GB/E", "4.5GB/E"],
        "format": "WeB-DL",
        "year": "2023",
        "isSeries": true
      },
      {
        "id": "download-spider-man-no-way-home-2021",
        "title": "Spider-Man: No Way Home (2021) Hindi Dubbed Movie [Dual Audio] WEB-HDRip 480p 720p 1080p",
        "url": "https://uhdmovies.tube/download-spider-man-no-way-home-2021/",
        "image": "https://uhdmovies.tube/wp-content/uploads/2022/01/spider-man-nwh.jpg",
        "imageAlt": "Spider-Man No Way Home",
        "category": "Movie",
        "quality": ["480p", "720p", "1080p", "HEVC"],
        "language": ["Hindi", "English", "Dual Audio"],
        "size": ["450MB", "1.2GB", "2.5GB"],
        "format": "WEB-HDRip",
        "year": "2021",
        "isSeries": false
      }
    ],
    "pagination": {
      "currentPage": 1,
      "hasNextPage": true
    }
  },
  "remainingRequests": 95
}`;

      case "Search Movies":
        return `{
  "success": true,
  "data": {
    "movies": [
      {
        "id": "download-loki-season-2-hindi-1080p-2160p",
        "title": "Download Loki (Season 01-02) [S02E06 Added] {Hindi-English} 1080p || 2160p || WeB-DL Esubs",
        "url": "https://uhdmovies.tube/download-loki-season-2-hindi-1080p-2160p/",
        "image": "https://uhdmovies.tube/wp-content/uploads/2023/11/loki-season-2.jpg",
        "imageAlt": "Loki Season 2",
        "category": "TV Series",
        "quality": ["1080p", "2160p", "4K", "HEVC", "10-Bit"],
        "language": ["Hindi", "English", "Dual Audio"],
        "size": ["7 GB/E", "4.5GB/E"],
        "format": "WeB-DL",
        "year": "2023",
        "isSeries": true
      },
      {
        "id": "download-loki-season-1-hindi-1080p-2160p",
        "title": "Download Loki Season 1 {Hindi-English} 1080p || 2160p || WeB-DL Esubs",
        "url": "https://uhdmovies.tube/download-loki-season-1-hindi-1080p-2160p/",
        "image": "https://uhdmovies.tube/wp-content/uploads/2021/07/loki-season-1.jpg",
        "imageAlt": "Loki Season 1",
        "category": "TV Series",
        "quality": ["1080p", "2160p", "4K", "HEVC"],
        "language": ["Hindi", "English", "Dual Audio"],
        "size": ["6 GB/E", "3.5GB/E"],
        "format": "WeB-DL",
        "year": "2021",
        "isSeries": true
      }
    ],
    "pagination": {
      "currentPage": 1,
      "hasNextPage": false
    }
  },
  "remainingRequests": 94
}`;

      case "Stream Data":
        return `{
  "success": true,
  "data": {
    "title": "Download Loki (Season 01-02) [S02E06 Added] {Hindi-English} 1080p || 2160p || WeB-DL Esubs",
    "plot": "After stealing the Tesseract, Loki comes into contact with a mysterious organization that gives him an ominous ultimatum, either fix the timeline or cease to exist completely.",
    "poster": "https://uhdmovies.tube/wp-content/uploads/2023/11/loki-season-2.jpg",
    "type": "series",
    "qualities": [
      {
        "quality": "4K 2160p SDR",
        "seasons": [
          {
            "seasonNumber": "1",
            "episodes": [
              {
                "episodeNumber": "1",
                "url": "https://tech.unblockedgames.world/?sid=bnpxOTF5Uk9VOVFZM2lEMkxXUmp0VTdoWDBEcGZMVWlrSmRYNlplRk9lQUdoYmJPbisvYi83VjZWNEdWbXVUai8vc3hQdGRwQ3lFRWtlZVVMR3YxSnR1MGV5dE1HTWs0bEtqM0x1bHhCT2lVbElINEhHV3U0VmJHRHF1WjJxb1VzL3RRamp2bmdQUTdmeWY1S09GbFlnU1M4WEUwdnM5SittcXlhc2t0VW5HYlZ5VVl6anhpZzNKVmY5NGVDMWUwMzZjdy9sbXB4OHBGdDVXUm81VWUrRFdHdlZYcHFsTFVnQXQzamRLVGZsWVJxeTlaNGtkUHlFNG0zYnhrak04WQ==",
                "title": "Episode 1",
                "size": "7 GB"
              },
              {
                "episodeNumber": "2",
                "url": "https://tech.unblockedgames.world/?sid=bnpxOTF5Uk9VOVFZM2lEMkxXUmp0VTdoWDBEcGZMVWlrSmRYNlplRk9lQUdoYmJPbisvYi83VjZWNEdWbXVUai8vc3hQdGRwQ3lFRWtlZVVMR3YxSnR1MGV5dE1HTWs0bEtqM0x1bHhCT2c2Qkh6R3BmOU9lWnhqN2ZJc0lyWWpIc0lNL0tRN1ZuUlgvbHlleEY5VzFqUzFsWXozelg5RUpVRjU3RDVRSVd2YmJFQm8vVk5Za09nRlM0MkhGZHdsM2pUaTZBYlZsZW1DalFtY2ptM1VacHVqMmZVNFFTTHoreVl4eE0xb2hsUUt4S3NaNC9najZiVjRBOE5xZGVaRQ==",
                "title": "Episode 2",
                "size": "7 GB"
              }
            ]
          },
          {
            "seasonNumber": "2",
            "episodes": [
              {
                "episodeNumber": "1",
                "url": "https://tech.unblockedgames.world/?sid=bnpxOTF5Uk9VOVFZM2lEMkxXUmp0VTdoWDBEcGZMVWlrSmRYNlplRk9lQUdoYmJPbisvYi83VjZWNEdWbXVUai8vc3hQdGRwQ3lFRWtlZVVMR3YxSnR1MGV5dE1HTWs0bEtqM0x1bHhCT2htWHVjOGp1YjVDdERhekwyY0hKYlBPRzVNeUFSSGllSkw1cHpDTERWRit1ZjE2S1hQQlFQZGo1UisxMWYzUnJ6NzV2RVZjSm90N1V5ZUxCdTJ2YkRnTXZsZUpwc05nUkVobngxNUl5UDJUdVNpaEw1NGloRVpCaGFXUlhFL28zSEdFUTdZVkUzdEdOaERUSjJoYm1ZUQ==",
                "title": "Episode 1",
                "size": "4.5GB"
              }
            ]
          }
        ],
        "totalSize": "7 GB/E"
      },
      {
        "quality": "4K 2160p HDR",
        "seasons": [
          {
            "seasonNumber": "1",
            "episodes": [
              {
                "episodeNumber": "1",
                "url": "https://tech.unblockedgames.world/?sid=bnpxOTF5Uk9VOVFZM2lEMkxXUmp0VTdoWDBEcGZMVWlrSmRYNlplRk9lQUdoYmJPbisvYi83VjZWNEdWbXVUai8vc3hQdGRwQ3lFRWtlZVVMR3YxSnR1MGV5dE1HTWs0bEtqM0x1bHhCT2lyTlcyamxoSTQ3b3dzZm1TalY4YzBqMjNxUnpZUzhHMFd6S3lBU3R6a0xaalNaNDEvWUsvajVpR0dQY2NVdEVBdEl0VUUvcnplUnJDY3JoajgxNlROakM3VzdBY2tBeTFRU2FtNnRPSUNmQVB1YWVQNHY2YUVXWlQ5N1pRNjcwczJaeVVGY1Jma0JmQ1RXZGJZbUxQNw==",
                "title": "Episode 1",
                "size": "7.5 GB"
              }
            ]
          }
        ],
        "totalSize": "7.5 GB/E"
      }
    ]
  },
  "remainingRequests": 93
}`;

      case "Episode Streams":
        return `{
  "success": true,
  "data": {
    "episodeUrl": "https://tech.unblockedgames.world/?sid=bnpxOTF5Uk9VOVFZM2lEMkxXUmp0VTdoWDBEcGZMVWlrSmRYNlplRk9lQUdoYmJPbisvYi83VjZWNEdWbXVUai8vc3hQdGRwQ3lFRWtlZVVMR3YxSnR1MGV5dE1HTWs0bEtqM0x1bHhCT2lVbElINEhHV3U0VmJHRHF1WjJxb1VzL3RRamp2bmdQUTdmeWY1S09GbFlnU1M4WEUwdnM5SittcXlhc2t0VW5HYlZ5VVl6anhpZzNKVmY5NGVDMWUwMzZjdy9sbXB4OHBGdDVXUm81VWUrRFdHdlZYcHFsTFVnQXQzamRLVGZsWVJxeTlaNGtkUHlFNG0zYnhrak04WQ==",
    "streamLinks": [
      {
        "server": "Gdrive-Instant",
        "link": "https://gpdl.hubcdn.fans/d/abc123/Loki-S01E01-2021-Hindi-4K.mkv",
        "type": "mkv"
      },
      {
        "server": "ResumeCloud",
        "link": "https://resumecloud.pro/d/def456/Loki-S01E01-2021-Hindi-4K.mkv",
        "type": "mkv"
      },
      {
        "server": "Cf Worker 1.0",
        "link": "https://worker1.cloudflare.com/d/ghi789/Loki-S01E01-2021-Hindi-4K.mkv",
        "type": "mkv"
      },
      {
        "server": "Cf Worker 2.0",
        "link": "https://worker2.cloudflare.com/d/jkl012/Loki-S01E01-2021-Hindi-4K.mkv",
        "type": "mkv"
      }
    ]
  },
  "remainingRequests": 92
}`;

      case "Drive Extractor":
        return `{
  "success": true,
  "data": {
    "originalUrl": "https://driveleech.net/r?key=UkVwSTIzU1gzQ3czMFBpQlBmeHB6NklzQjRRZFdMYStJaWI4UnZLdVd4QT0=&id=ck80cWRaZlJUSUdkV3VxT0Z4NVB3R2FUeGJPVDAzQVNkVm9HT3oyT3NwNWUrL1lGTWU5WkhQYjA3QTJkRWhrMg==",
    "extractedUrl": "https://driveleech.net/file/COKBFSVUlhWIkzfHJPUf",
    "redirectPath": "/file/COKBFSVUlhWIkzfHJPUf"
  },
  "remainingRequests": 91
}`;

      default:
        return "{}";
    }
  };

  return (
    <Tabs defaultValue="test" className="space-y-4 sm:space-y-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="test" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
          <Play className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden xs:inline">API Testing</span>
          <span className="xs:hidden">Testing</span>
        </TabsTrigger>
        <TabsTrigger value="docs" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
          <Code2 className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden xs:inline">Code Examples</span>
          <span className="xs:hidden">Examples</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="test" className="space-y-4 sm:space-y-6">
        <Card>
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              <Film className="h-5 w-5 text-emerald-500" />
              UHDMovies API Testing
            </CardTitle>
            <CardDescription className="text-sm">
              Enter your API key to test the UHDMovies endpoints. Get your API key from the{" "}
              <a href="/dashboard/api-keys" className="text-primary hover:underline">
                API Keys page
              </a>
              .
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="password"
                placeholder="Enter your API key"
                value={apiKey}
                onChange={(e) => onApiKeyChange(e.target.value)}
                className="flex-1 text-sm min-w-0"
              />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(apiKey)} className="shrink-0 self-start sm:self-auto">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Card>
            <CardHeader className="pb-4 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl">API Categories</CardTitle>
              <CardDescription className="text-sm">Select a category and endpoint to test</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Category</Label>
                <Select value={selectedCategory.name} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="text-sm w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {uhdMoviesApiCategories.map((category) => (
                      <SelectItem key={category.name} value={category.name} className="text-sm">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${category.color}`}></div>
                          {category.icon}
                          <span className="truncate">{category.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Endpoint</Label>
                <Select value={selectedEndpoint.endpoint} onValueChange={handleEndpointChange}>
                  <SelectTrigger className="text-sm w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedCategory.endpoints.map((endpoint) => (
                      <SelectItem key={endpoint.endpoint} value={endpoint.endpoint} className="text-sm">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={endpoint.method === "GET" ? "default" : "secondary"} className="text-xs shrink-0">
                              {endpoint.method}
                            </Badge>
                            <code className="text-xs truncate min-w-0">{endpoint.endpoint}</code>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className={`p-3 rounded-lg border-l-4 ${selectedCategory.color} bg-muted/50`}>
                <p className="text-xs sm:text-sm text-muted-foreground break-words">{selectedEndpoint.description}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl">Parameters</CardTitle>
              <CardDescription className="text-sm">
                Configure parameters for <code className="text-xs break-all">{selectedEndpoint.endpoint}</code>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              {selectedEndpoint.params && selectedEndpoint.params.length > 0 ? (
                selectedEndpoint.params.map((param) => (
                  <div key={param.name} className="space-y-2">
                    <Label htmlFor={param.name} className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="break-words">{param.name}</span>
                      <Badge variant={param.required ? "destructive" : "secondary"} className="text-xs shrink-0">
                        {param.required ? "Required" : "Optional"}
                      </Badge>
                      <span className="text-xs text-muted-foreground shrink-0">({param.type})</span>
                    </Label>
                    <Input
                      id={param.name}
                      placeholder={param.description}
                      value={testParams[param.name] || ""}
                      onChange={(e) => setTestParams({ ...testParams, [param.name]: e.target.value })}
                      className="text-sm w-full min-w-0"
                    />
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No parameters required</p>
              )}

              <Button onClick={testApi} disabled={loading} className="w-full text-sm">
                {loading ? "Testing..." : "Test API"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl">Response</CardTitle>
            <CardDescription className="text-sm">API response will appear here</CardDescription>
          </CardHeader>
          <CardContent>
            {response ? (
              <ColorizedJSON data={response} title="api-response" />
            ) : (
              <div className="bg-muted rounded-lg p-8 text-center">
                <p className="text-muted-foreground">API response will appear here...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="docs" className="space-y-4 sm:space-y-6">
        <Card>
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              <Film className="h-5 w-5 text-emerald-500" />
              UHDMovies API Examples
            </CardTitle>
            <CardDescription className="text-sm">
              Code examples for integrating with our UHDMovies API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2 min-w-0">
                <Label className="text-sm">Category</Label>
                <Select value={selectedCategory.name} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="text-sm w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {uhdMoviesApiCategories.map((category) => (
                      <SelectItem key={category.name} value={category.name} className="text-sm">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${category.color}`}></div>
                          {category.icon}
                          <span className="truncate">{category.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 min-w-0">
                <Label className="text-sm">Endpoint</Label>
                <Select value={selectedEndpoint.endpoint} onValueChange={handleEndpointChange}>
                  <SelectTrigger className="text-sm w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedCategory.endpoints.map((endpoint) => (
                      <SelectItem key={endpoint.endpoint} value={endpoint.endpoint} className="text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant={endpoint.method === "GET" ? "default" : "secondary"} className="text-xs shrink-0">
                            {endpoint.method}
                          </Badge>
                          <code className="text-xs truncate min-w-0">{endpoint.endpoint}</code>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Tabs defaultValue="javascript" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="javascript" className="text-xs sm:text-sm">JavaScript</TabsTrigger>
                <TabsTrigger value="python" className="text-xs sm:text-sm">Python</TabsTrigger>
                <TabsTrigger value="curl" className="text-xs sm:text-sm">cURL</TabsTrigger>
              </TabsList>

              <TabsContent value="javascript">
                <div className="bg-[#1e1e1e] rounded-lg overflow-hidden border border-gray-800">
                  <div className="flex items-center justify-between bg-[#2d2d30] px-4 py-2 border-b border-gray-700">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex gap-1.5 shrink-0">
                        <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#27ca3f]"></div>
                      </div>
                      <span className="text-gray-300 text-sm ml-2 truncate">uhdmovies.js</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-gray-400 hover:text-white hover:bg-gray-700 h-6 px-2 shrink-0"
                      onClick={() => copyToClipboard(generateCodeExample("javascript"))}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <pre className="p-4">
                      <code className="text-sm text-gray-300 font-mono whitespace-pre-wrap break-words">
                        {generateCodeExample("javascript")}
                      </code>
                    </pre>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="python">
                <div className="bg-[#1e1e1e] rounded-lg overflow-hidden border border-gray-800">
                  <div className="flex items-center justify-between bg-[#2d2d30] px-4 py-2 border-b border-gray-700">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex gap-1.5 shrink-0">
                        <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#27ca3f]"></div>
                      </div>
                      <span className="text-gray-300 text-sm ml-2 truncate">uhdmovies.py</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-gray-400 hover:text-white hover:bg-gray-700 h-6 px-2 shrink-0"
                      onClick={() => copyToClipboard(generateCodeExample("python"))}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <pre className="p-4">
                      <code className="text-sm text-gray-300 font-mono whitespace-pre-wrap break-words">
                        {generateCodeExample("python")}
                      </code>
                    </pre>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="curl">
                <div className="bg-[#1e1e1e] rounded-lg overflow-hidden border border-gray-800">
                  <div className="flex items-center justify-between bg-[#2d2d30] px-4 py-2 border-b border-gray-700">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex gap-1.5 shrink-0">
                        <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                        <div className="w-3 h-3 rounded-full bg-[#27ca3f]"></div>
                      </div>
                      <span className="text-gray-300 text-sm ml-2 truncate">terminal</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-gray-400 hover:text-white hover:bg-gray-700 h-6 px-2 shrink-0"
                      onClick={() => copyToClipboard(generateCodeExample("curl"))}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <pre className="p-4">
                      <code className="text-sm text-gray-300 font-mono whitespace-pre-wrap break-words">
                        {generateCodeExample("curl")}
                      </code>
                    </pre>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl">Response Examples</CardTitle>
            <CardDescription className="text-sm">Expected response structures for UHDMovies endpoints</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs defaultValue="movies" className="space-y-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="movies" className="text-xs sm:text-sm">Movies List</TabsTrigger>
                <TabsTrigger value="search" className="text-xs sm:text-sm">Search Results</TabsTrigger>
                <TabsTrigger value="stream" className="text-xs sm:text-sm">Stream Data</TabsTrigger>
                <TabsTrigger value="episodes" className="text-xs sm:text-sm">Episode Streams</TabsTrigger>
                <TabsTrigger value="drive" className="text-xs sm:text-sm">Drive Extractor</TabsTrigger>
              </TabsList>

              <TabsContent value="movies">
                <ColorizedJSON data={getResponseExample("Get Movies")} title="movies-list" />
              </TabsContent>

              <TabsContent value="search">
                <ColorizedJSON data={getResponseExample("Search Movies")} title="search-results" />
              </TabsContent>

              <TabsContent value="stream">
                <ColorizedJSON data={getResponseExample("Stream Data")} title="stream-data" />
              </TabsContent>

              <TabsContent value="episodes">
                <ColorizedJSON data={getResponseExample("Episode Streams")} title="episode-streams" />
              </TabsContent>

              <TabsContent value="drive">
                <ColorizedJSON data={getResponseExample("Drive Extractor")} title="drive-extractor" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl">UHDMovies API Workflow</CardTitle>
            <CardDescription className="text-sm">Complete workflow for accessing UHDMovies content</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 sm:p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2 text-sm sm:text-base">Step-by-Step Process</h4>
              <ol className="text-xs sm:text-sm space-y-2">
                <li><strong>1. Get Movies:</strong> Use <code>/api/uhdmovies</code> to get movie/series list</li>
                <li><strong>2. Get Stream Data:</strong> Use <code>/api/uhdmovies/stream</code> with movie URL to get episode structure</li>
                <li><strong>3. Get Episode Streams:</strong> Use <code>/api/uhdmovies/episode</code> with episode URL to get actual streaming links</li>
                <li><strong>4. Extract Drive Links:</strong> Use <code>/api/uhdmovies/drive</code> to extract direct download links from driveleech URLs</li>
              </ol>
              
              <div className="mt-3 p-2 sm:p-3 bg-blue-100 dark:bg-blue-900/20 rounded-md">
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  <strong>Drive Extractor:</strong> Supports driveleech.net URLs and URLs with sid parameters. Automatically detects URL format and applies appropriate extraction method.
                </p>
              </div>
              
              <div className="mt-3 p-2 sm:p-3 bg-green-100 dark:bg-green-900/20 rounded-md">
                <p className="text-xs text-green-800 dark:text-green-200">
                  <strong>UHDMovies Features:</strong> 4K UHD content, multiple seasons for series, high-quality audio (Dolby Atmos), multiple streaming servers, and direct drive link extraction.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

