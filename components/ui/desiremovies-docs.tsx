"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Play, Code2, Home, Search, Film, Download, Star, Clapperboard, Cloud, Info, Link2 } from "lucide-react";
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

const desireMoviesApiCategories: ApiCategory[] = [
  {
    name: "Get Movies",
    icon: <Home className="h-4 w-4" />,
    color: "bg-pink-500",
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/desiremovies",
        description: "Get all movies and shows with pagination from DesireMovies",
        params: [
          { name: "page", type: "number", required: false, description: "Page number for pagination (default: 1)" }
        ]
      }
    ]
  },
  {
    name: "Search Movies",
    icon: <Search className="h-4 w-4" />,
    color: "bg-violet-500",
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/desiremovies",
        description: "Search movies and shows by title on DesireMovies",
        params: [
          { name: "search", type: "string", required: true, description: "Search query (movie/show title)" }
        ]
      }
    ]
  },
  {
    name: "Movie Details",
    icon: <Info className="h-4 w-4" />,
    color: "bg-purple-500",
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/desiremovies/details",
        description: "Get detailed movie information including synopsis and download links",
        params: [
          { name: "url", type: "string", required: true, description: "Full movie URL from DesireMovies (e.g., https://desiremovies.nagoya//movie-name/)" }
        ]
      }
    ]
  },
  {
    name: "GyanGurus",
    icon: <Link2 className="h-4 w-4" />,
    color: "bg-teal-500",
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/gyanigurus",
        description: "Extract HubCloud, GDflix, and HubDrive download links from GyanGurus pages",
        params: [
          { name: "url", type: "string", required: true, description: "Full GyanGurus page URL (e.g., https://gyanigurus.info/movie-name/)" }
        ]
      }
    ]
  },
  {
    name: "HubCloud Links",
    icon: <Cloud className="h-4 w-4" />,
    color: "bg-orange-500",
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/hubcloud",
        description: "Get direct streaming/download links from HubCloud file URLs",
        params: [
          { name: "url", type: "string", required: true, description: "HubCloud file URL (e.g., https://hubcloud.lol/file/xyz123)" }
        ]
      }
    ]
  }
];

interface DesireMoviesDocsProps {
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

export default function DesireMoviesDocs({ apiKey, onApiKeyChange }: DesireMoviesDocsProps) {
  const [selectedCategory, setSelectedCategory] = useState(desireMoviesApiCategories[0]);
  const [selectedEndpoint, setSelectedEndpoint] = useState(desireMoviesApiCategories[0].endpoints[0]);
  const [testParams, setTestParams] = useState<Record<string, string>>({});
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handleCategoryChange = (categoryName: string) => {
    const category = desireMoviesApiCategories.find(cat => cat.name === categoryName);
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
        if (selectedCategory.name === "GyanGurus") {
          return `// Extract download links from GyanGurus
const gyanGurusUrl = "https://gyanigurus.info/spider-man-no-way-home-2021/";
const response = await fetch(\`${baseUrl}/api/gyanigurus?url=\${encodeURIComponent(gyanGurusUrl)}\`, {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.data);

// Access different provider links
const hubCloudLinks = data.data.groupedByProvider.HubCloud || [];
const gdflixLinks = data.data.groupedByProvider.GDflix || [];
const hubDriveLinks = data.data.groupedByProvider.HubDrive || [];

console.log(\`Found \${hubCloudLinks.length} HubCloud links\`);
console.log(\`Found \${gdflixLinks.length} GDflix links\`);
console.log(\`Found \${hubDriveLinks.length} HubDrive links\`);`;
        } else if (selectedCategory.name === "Get Movies") {
          return `// Get movies from DesireMovies
const response = await fetch("${baseUrl}/api/desiremovies", {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.posts); // Array of movies and shows

// DesireMovies features:
// - High-quality movies (4K, HEVC, x265)
// - Multi-language support (Hindi, English, Tamil, etc.)
// - Dual audio releases
// - Various formats (BluRay, WEB-HDRip, etc.)

// With pagination
const page2 = await fetch("${baseUrl}/api/desiremovies?page=2", {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});`;
        } else if (selectedCategory.name === "Search Movies") {
          return `// Search movies on DesireMovies
const searchQuery = "spider man";
const response = await fetch(\`${baseUrl}/api/desiremovies?search=\${encodeURIComponent(searchQuery)}\`, {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.posts); // Search results

// Access movie details
data.posts.forEach(movie => {
  console.log(\`Title: \${movie.title}\`);
  console.log(\`Year: \${movie.releaseYear}\`);
  console.log(\`Type: \${movie.movieType}\`);
  console.log(\`Categories: \${movie.categories.join(', ')}\`);
  console.log(\`Languages: \${movie.languages.join(', ')}\`);
  console.log(\`Qualities: \${movie.qualities.join(', ')}\`);
  console.log(\`Dual Audio: \${movie.isDualAudio}\`);
});`;
        } else if (selectedCategory.name === "Movie Details") {
          return `// Get movie details from DesireMovies
const movieUrl = "https://desiremovies.nagoya//spider-man-no-way-home-2021/";
const response = await fetch(\`${baseUrl}/api/desiremovies/details?url=\${encodeURIComponent(movieUrl)}\`, {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.data); // Movie details with download links

// Access streaming links
data.data.downloadSections.forEach(section => {
  console.log(\`Quality: \${section.quality}\`);
  console.log(\`Size: \${section.fileSize}\`);
  section.streamingLinks.forEach(link => {
    console.log(\`Provider: \${link.provider}\`);
    console.log(\`URL: \${link.url}\`);
  });
});`;
        } else if (selectedCategory.name === "HubCloud Links") {
          return `// Get HubCloud streaming links
const hubcloudUrl = "https://hubcloud.lol/file/xyz123";
const response = await fetch(\`${baseUrl}/api/hubcloud?url=\${encodeURIComponent(hubcloudUrl)}\`, {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.links); // Direct streaming/download links`;
        }

      case "python":
        if (selectedCategory.name === "GyanGurus") {
          return `# Extract download links from GyanGurus
import requests
from urllib.parse import quote

gyangurus_url = "https://gyanigurus.info/spider-man-no-way-home-2021/"
url = f"${baseUrl}/api/gyanigurus?url={quote(gyangurus_url)}"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()

# Access different provider links
hubcloud_links = data["data"]["groupedByProvider"].get("HubCloud", [])
gdflix_links = data["data"]["groupedByProvider"].get("GDflix", [])
hubdrive_links = data["data"]["groupedByProvider"].get("HubDrive", [])

print(f"Found {len(hubcloud_links)} HubCloud links")
print(f"Found {len(gdflix_links)} GDflix links")
print(f"Found {len(hubdrive_links)} HubDrive links")`;
        } else if (selectedCategory.name === "Get Movies") {
          return `# Get movies from DesireMovies
import requests

url = "${baseUrl}/api/desiremovies"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data["posts"])  # Array of movies and shows

# With pagination
page_2_response = requests.get(f"${url}?page=2", headers=headers)`;
        } else if (selectedCategory.name === "Search Movies") {
          return `# Search movies on DesireMovies
import requests
from urllib.parse import quote

search_query = "spider man"
url = f"${baseUrl}/api/desiremovies?search={quote(search_query)}"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data["posts"])  # Search results`;
        } else if (selectedCategory.name === "Movie Details") {
          return `# Get movie details from DesireMovies
import requests
from urllib.parse import quote

movie_url = "https://desiremovies.uno/spider-man-no-way-home-2021/"
url = f"${baseUrl}/api/desiremovies/details?url={quote(movie_url)}"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data["data"])  # Movie details with download links`;
        } else if (selectedCategory.name === "HubCloud Links") {
          return `# Get HubCloud streaming links
import requests
from urllib.parse import quote

hubcloud_url = "https://hubcloud.lol/file/xyz123"
url = f"${baseUrl}/api/hubcloud?url={quote(hubcloud_url)}"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data["links"])  # Direct streaming/download links`;
        }

      case "curl":
        if (selectedCategory.name === "GyanGurus") {
          return `# Extract download links from GyanGurus
curl -X GET \\
  "${baseUrl}/api/gyanigurus?url=https%3A//gyanigurus.info/spider-man-no-way-home-2021/" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        } else if (selectedCategory.name === "Get Movies") {
          return `# Get movies from DesireMovies
curl -X GET \\
  "${baseUrl}/api/desiremovies" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"

# With pagination
curl -X GET \\
  "${baseUrl}/api/desiremovies?page=2" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        } else if (selectedCategory.name === "Search Movies") {
          return `# Search movies on DesireMovies
curl -X GET \\
  "${baseUrl}/api/desiremovies?search=spider%20man" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        } else if (selectedCategory.name === "Movie Details") {
          return `# Get movie details from DesireMovies
curl -X GET \\
  "${baseUrl}/api/desiremovies/details?url=https%3A//desiremovies.cologne/spider-man-no-way-home-2021/" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        } else if (selectedCategory.name === "HubCloud Links") {
          return `# Get HubCloud streaming links
curl -X GET \\
  "${baseUrl}/api/hubcloud?url=https%3A//hubcloud.lol/file/xyz123" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        }

      default:
        return "";
    }
  };

  const getResponseExample = (category: string) => {
    switch (category) {
      case "GyanGurus":
        return `{
  "success": true,
  "data": {
    "totalLinks": 6,
    "providers": ["HubCloud", "GDflix", "HubDrive"],
    "links": [
      {
        "url": "https://hubcloud.lol/file/abc123def456",
        "provider": "HubCloud",
        "type": "cloud",
        "quality": "1080p",
        "fileName": "Spider-Man-NWH-2021-1080p.mp4",
        "fileSize": "Unknown",
        "displayText": "HubCloud 1080p Download",
        "isWorking": true
      },
      {
        "url": "https://gdflix.lol/file/def456ghi789",
        "provider": "GDflix",
        "type": "gdrive",
        "quality": "720p",
        "fileName": "Spider-Man-NWH-2021-720p.mp4",
        "fileSize": "Unknown",
        "displayText": "GDflix 720p Download",
        "isWorking": true
      },
      {
        "url": "https://hubdrive.lol/file/ghi789jkl012",
        "provider": "HubDrive",
        "type": "cloud",
        "quality": "480p",
        "fileName": "Spider-Man-NWH-2021-480p.mp4",
        "fileSize": "Unknown",
        "displayText": "HubDrive 480p Download",
        "isWorking": true
      }
    ],
    "groupedByProvider": {
      "HubCloud": [
        {
          "url": "https://hubcloud.lol/file/abc123def456",
          "provider": "HubCloud",
          "type": "cloud",
          "quality": "1080p",
          "fileName": "Spider-Man-NWH-2021-1080p.mp4",
          "fileSize": "Unknown",
          "displayText": "HubCloud 1080p Download",
          "isWorking": true
        }
      ],
      "GDflix": [
        {
          "url": "https://gdflix.lol/file/def456ghi789",
          "provider": "GDflix",
          "type": "gdrive",
          "quality": "720p",
          "fileName": "Spider-Man-NWH-2021-720p.mp4",
          "fileSize": "Unknown",
          "displayText": "GDflix 720p Download",
          "isWorking": true
        }
      ],
      "HubDrive": [
        {
          "url": "https://hubdrive.lol/file/ghi789jkl012",
          "provider": "HubDrive",
          "type": "cloud",
          "quality": "480p",
          "fileName": "Spider-Man-NWH-2021-480p.mp4",
          "fileSize": "Unknown",
          "displayText": "HubDrive 480p Download",
          "isWorking": true
        }
      ]
    },
    "sourceUrl": "https://gyanigurus.info/spider-man-no-way-home-2021/"
  },
  "website": "GyanGurus",
  "remainingRequests": 95
}`;

      case "Get Movies":
        return `{
  "success": true,
  "count": 20,
  "posts": [
    {
      "id": "123456",
      "title": "Spider-Man: No Way Home (2021) Hindi Dubbed Movie [Dual Audio] WEB-HDRip 480p 720p 1080p HD",
      "imageUrl": "https://desiremovies.nagoya//wp-content/uploads/2022/01/spider-man-nwh.jpg",
      "postUrl": "https://desiremovies.nagoya//spider-man-no-way-home-2021-hindi-dubbed/",
      "description": "When a spell goes wrong, dangerous foes from other worlds start to appear, forcing Peter to discover what it truly means to be Spider-Man.",
      "releaseYear": "2021",
      "movieType": "WEB-HDRip",
      "categories": ["Hollywood", "Action", "Adventure"],
      "qualities": ["480p", "720p", "1080p", "HEVC"],
      "languages": ["Hindi", "English", "Dual Audio"],
      "isDualAudio": true,
      "audioFormat": "DD 5.1",
      "hasSubtitles": true,
      "website": "DesireMovies"
    },
    {
      "id": "123457",
      "title": "RRR (2022) Hindi Dubbed Movie [Dual Audio] BluRay 480p 720p 1080p 4K UHD",
      "imageUrl": "https://desiremovies.nagoya//wp-content/uploads/2022/03/rrr-movie.jpg",
      "postUrl": "https://desiremovies.nagoya//rrr-2022-hindi-dubbed-movie/",
      "description": "A fearless revolutionary and an officer in the British force, who once shared a deep bond, decide to join forces and chart out an inspirational path of freedom against the despotic rule.",
      "releaseYear": "2022",
      "movieType": "BluRay",
      "categories": ["South Indian", "Action", "Drama", "4K Movies"],
      "qualities": ["480p", "720p", "1080p", "4K UHD", "HEVC"],
      "languages": ["Hindi", "Telugu", "Tamil", "Dual Audio"],
      "isDualAudio": true,
      "audioFormat": "DD 5.1",
      "hasSubtitles": true,
      "website": "DesireMovies"
    }
  ],
  "searchQuery": null,
  "page": 1,
  "source": "page",
  "website": "DesireMovies",
  "remainingRequests": 95
}`;

      case "Search Movies":
        return `{
  "success": true,
  "count": 8,
  "posts": [
    {
      "id": "123456",
      "title": "Spider-Man: No Way Home (2021) Hindi Dubbed Movie [Dual Audio] WEB-HDRip",
      "imageUrl": "https://desiremovies.nagoya//wp-content/uploads/2022/01/spider-man-nwh.jpg",
      "postUrl": "https://desiremovies.nagoya//spider-man-no-way-home-2021-hindi-dubbed/",
      "description": "When a spell goes wrong, dangerous foes from other worlds start to appear, forcing Peter to discover what it truly means to be Spider-Man.",
      "releaseYear": "2021",
      "movieType": "WEB-HDRip",
      "categories": ["Hollywood", "Action", "Adventure"],
      "qualities": ["480p", "720p", "1080p", "HEVC"],
      "languages": ["Hindi", "English", "Dual Audio"],
      "isDualAudio": true,
      "audioFormat": "DD 5.1",
      "hasSubtitles": true,
      "website": "DesireMovies"
    },
    {
      "id": "123458",
      "title": "Spider-Man: Far From Home (2019) Hindi Dubbed Movie [Dual Audio] BluRay",
      "imageUrl": "https://desiremovies.nagoya//wp-content/uploads/2019/07/spider-man-ffh.jpg",
      "postUrl": "https://desiremovies.nagoya//spider-man-far-from-home-2019-hindi-dubbed/",
      "description": "Following the events of Avengers: Endgame, Spider-Man must step up to take on new threats in a world that has changed forever.",
      "releaseYear": "2019",
      "movieType": "BluRay",
      "categories": ["Hollywood", "Action", "Adventure"],
      "qualities": ["480p", "720p", "1080p"],
      "languages": ["Hindi", "English", "Dual Audio"],
      "isDualAudio": true,
      "audioFormat": "DD 5.1",
      "hasSubtitles": true,
      "website": "DesireMovies"
    },
    {
      "id": "123459",
      "title": "Spider-Man: Into the Spider-Verse (2018) Hindi Dubbed Movie [Dual Audio] BluRay",
      "imageUrl": "https://desiremovies.nagoya//wp-content/uploads/2018/12/spider-verse.jpg",
      "postUrl": "https://desiremovies.nagoya//spider-man-into-spider-verse-2018-hindi-dubbed/",
      "description": "Teen Miles Morales becomes the Spider-Man of his universe, and must join with five spider-powered individuals from other dimensions.",
      "releaseYear": "2018",
      "movieType": "BluRay",
      "categories": ["Hollywood", "Animation", "Action"],
      "qualities": ["480p", "720p", "1080p"],
      "languages": ["Hindi", "English", "Dual Audio"],
      "isDualAudio": true,
      "audioFormat": "DD 5.1",
      "hasSubtitles": true,
      "website": "DesireMovies"
    }
  ],
  "searchQuery": "spider man",
  "page": 1,
  "source": "search",
  "website": "DesireMovies",
  "remainingRequests": 94
}`;

      case "Movie Details":
        return `{
  "success": true,
  "data": {
    "title": "Spider-Man: No Way Home (2021) Hindi Dubbed Movie [Dual Audio] WEB-HDRip",
    "posterImage": "https://desiremovies.nagoya//wp-content/uploads/2022/01/spider-man-nwh-poster.jpg",
    "releaseYear": "2021",
    "director": "Jon Watts",
    "cast": "Tom Holland, Zendaya, Benedict Cumberbatch, Jacob Batalon",
    "genres": ["Action", "Adventure", "Sci-Fi"],
    "runtime": "148 min",
    "languages": ["Hindi", "English", "Dual Audio"],
    "audioFormat": "DD 5.1",
    "hasSubtitles": true,
    "synopsis": "When a spell goes wrong, dangerous foes from other worlds start to appear, forcing Peter to discover what it truly means to be Spider-Man. With Spider-Man's identity now revealed, Peter asks Doctor Strange for help.",
    "downloadSections": [
      {
        "quality": "480p",
        "fileSize": "450MB",
        "format": "WEB-HDRip",
        "streamingLinks": [
          {
            "provider": "StreamSB",
            "url": "https://streamsb.net/e/xyz123",
            "type": "stream"
          },
          {
            "provider": "Doodstream",
            "url": "https://dood.la/e/abc456",
            "type": "stream"
          },
          {
            "provider": "HubCloud",
            "url": "https://hubcloud.lol/file/def789",
            "type": "download"
          }
        ]
      },
      {
        "quality": "720p",
        "fileSize": "1.2GB",
        "format": "WEB-HDRip",
        "streamingLinks": [
          {
            "provider": "StreamSB",
            "url": "https://streamsb.net/e/xyz124",
            "type": "stream"
          },
          {
            "provider": "Doodstream",
            "url": "https://dood.la/e/abc457",
            "type": "stream"
          },
          {
            "provider": "HubCloud",
            "url": "https://hubcloud.lol/file/def790",
            "type": "download"
          }
        ]
      },
      {
        "quality": "1080p",
        "fileSize": "2.5GB",
        "format": "WEB-HDRip",
        "streamingLinks": [
          {
            "provider": "StreamSB",
            "url": "https://streamsb.net/e/xyz125",
            "type": "stream"
          },
          {
            "provider": "Doodstream",
            "url": "https://dood.la/e/abc458",
            "type": "stream"
          },
          {
            "provider": "HubCloud",
            "url": "https://hubcloud.lol/file/def791",
            "type": "download"
          }
        ]
      }
    ],
    "availableQualities": ["480p", "720p", "1080p"],
    "totalStreamingLinks": 9,
    "website": "DesireMovies"
  },
  "sourceUrl": "https://desiremovies.nagoya//spider-man-no-way-home-2021-hindi-dubbed/",
  "remainingRequests": 93
}`;

      case "HubCloud Links":
        return `{
  "success": true,
  "links": [
    {
      "quality": "1080p",
      "size": "2.5GB",
      "link": "https://gpdl.hubcdn.fans/d/abc123/Spider-Man-NWH-2021-Hindi-1080p.mp4",
      "server": "HubCloud Server 1",
      "type": "MP4",
      "isDirect": true
    },
    {
      "quality": "1080p",
      "size": "2.5GB",
      "link": "https://gpdl2.hubcdn.fans/d/abc123/Spider-Man-NWH-2021-Hindi-1080p.mp4",
      "server": "HubCloud Server 2",
      "type": "MP4",
      "isDirect": true
    },
    {
      "quality": "720p",
      "size": "1.2GB",
      "link": "https://gpdl.hubcdn.fans/d/abc123/Spider-Man-NWH-2021-Hindi-720p.mp4",
      "server": "HubCloud Server 1",
      "type": "MP4",
      "isDirect": true
    },
    {
      "quality": "480p",
      "size": "450MB",
      "link": "https://gpdl.hubcdn.fans/d/abc123/Spider-Man-NWH-2021-Hindi-480p.mp4",
      "server": "HubCloud Server 1",
      "type": "MP4",
      "isDirect": true
    }
  ],
  "totalLinks": 4,
  "sourceUrl": "https://hubcloud.lol/file/abc123",
  "remainingRequests": 92
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
              <Clapperboard className="h-5 w-5 text-pink-500" />
              DesireMovies & GyanGurus API Testing
            </CardTitle>
            <CardDescription className="text-sm">
              Enter your API key to test the DesireMovies and GyanGurus endpoints. Get your API key from the{" "}
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
                    {desireMoviesApiCategories.map((category) => (
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
              <Clapperboard className="h-5 w-5 text-pink-500" />
              DesireMovies API Examples
            </CardTitle>
            <CardDescription className="text-sm">
              Code examples for integrating with our DesireMovies API
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
                    {desireMoviesApiCategories.map((category) => (
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
                      <span className="text-gray-300 text-sm ml-2 truncate">desiremovies.js</span>
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
                      <span className="text-gray-300 text-sm ml-2 truncate">desiremovies.py</span>
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
            <CardDescription className="text-sm">Expected response structures for DesireMovies endpoints</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs defaultValue="movies" className="space-y-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="movies" className="text-xs sm:text-sm">Movies List</TabsTrigger>
                <TabsTrigger value="search" className="text-xs sm:text-sm">Search Results</TabsTrigger>
                <TabsTrigger value="details" className="text-xs sm:text-sm">Movie Details</TabsTrigger>
                <TabsTrigger value="gyanigurus" className="text-xs sm:text-sm">GyanGurus</TabsTrigger>
                <TabsTrigger value="hubcloud" className="text-xs sm:text-sm">HubCloud</TabsTrigger>
              </TabsList>

              <TabsContent value="movies">
                <ColorizedJSON data={getResponseExample("Get Movies")} title="movies-list" />
              </TabsContent>

              <TabsContent value="search">
                <ColorizedJSON data={getResponseExample("Search Movies")} title="search-results" />
              </TabsContent>

              <TabsContent value="details">
                <ColorizedJSON data={getResponseExample("Movie Details")} title="movie-details" />
              </TabsContent>

              <TabsContent value="gyanigurus">
                <ColorizedJSON data={getResponseExample("GyanGurus")} title="gyanigurus-links" />
              </TabsContent>

              <TabsContent value="hubcloud">
                <ColorizedJSON data={getResponseExample("HubCloud Links")} title="hubcloud-links" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl">DesireMovies Features</CardTitle>
            <CardDescription className="text-sm">What makes DesireMovies special</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gradient-to-br from-pink-50 to-violet-50 dark:from-pink-900/20 dark:to-violet-900/20 rounded-lg">
                <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                  <Star className="h-4 w-4 text-pink-500" />
                  High Quality Releases
                </h4>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>• 4K UHD movies with HDR support</li>
                  <li>• HEVC/x265 encoded for smaller file sizes</li>
                  <li>• BluRay and WEB-DL sources</li>
                  <li>• Multiple quality options (480p to 4K)</li>
                </ul>
              </div>
              
              <div className="p-4 bg-gradient-to-br from-violet-50 to-blue-50 dark:from-violet-900/20 dark:to-blue-900/20 rounded-lg">
                <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                  <Film className="h-4 w-4 text-violet-500" />
                  Multi-Language Support
                </h4>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>• Hindi dubbed movies</li>
                  <li>• Dual audio (Original + Hindi)</li>
                  <li>• Regional languages (Tamil, Telugu, etc.)</li>
                  <li>• English subtitles available</li>
                </ul>
              </div>
            </div>

            <div className="p-3 sm:p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2 text-sm sm:text-base">Content Categories</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-pink-500"></div>
                  <span>Hollywood Movies</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-violet-500"></div>
                  <span>Bollywood Movies</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span>South Indian Movies</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span>720p HEVC</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                  <span>4K Movies</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <span>Dual Audio</span>
                </div>
              </div>
            </div>

            <div className="p-3 sm:p-4 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg">
              <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                <Cloud className="h-4 w-4 text-orange-500" />
                Streaming & Download Options
              </h4>
              <div className="text-xs space-y-1 text-muted-foreground">
                <p>• Multiple streaming providers (StreamSB, Doodstream, etc.)</p>
                <p>• Direct HubCloud download links</p>
                <p>• Fast streaming with minimal buffering</p>
                <p>• Mobile-optimized streaming links</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
