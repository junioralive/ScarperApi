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

const kmMoviesApiCategories: ApiCategory[] = [
  {
    name: "Get Movies",
    icon: <Home className="h-4 w-4" />,
    color: "bg-emerald-500",
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/kmmovies",
        description: "Get all movies and TV series with pagination from KMmovies",
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
        endpoint: "/api/kmmovies",
        description: "Search movies and TV series by title on KMmovies",
        params: [
          { name: "search", type: "string", required: true, description: "Search query (movie/series title)" }
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
        endpoint: "/api/kmmovies/details",
        description: "Get detailed movie information including storyline, cast, director, and download links",
        params: [
          { name: "url", type: "string", required: true, description: "Full movie URL from kmmovies.mobi (e.g., https://kmmovies.art/movie-name/)" }
        ]
      }
    ]
  },
  {
    name: "Magic Links",
    icon: <Link2 className="h-4 w-4" />,
    color: "bg-indigo-500",
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/kmmovies/magic-links",
        description: "Extract streaming and download links from Magic Links pages",
        params: [
          { name: "url", type: "string", required: true, description: "Magic Links URL (e.g., https://magiclinks.my/xyz123)" }
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

interface KMmoviesDocsProps {
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

export default function KMmoviesDocs({ apiKey, onApiKeyChange }: KMmoviesDocsProps) {
  const [selectedCategory, setSelectedCategory] = useState(kmMoviesApiCategories[0]);
  const [selectedEndpoint, setSelectedEndpoint] = useState(kmMoviesApiCategories[0].endpoints[0]);
  const [testParams, setTestParams] = useState<Record<string, string>>({});
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handleCategoryChange = (categoryName: string) => {
    const category = kmMoviesApiCategories.find(cat => cat.name === categoryName);
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
          return `// Get movies and series from KMmovies
const response = await fetch("${baseUrl}/api/kmmovies", {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.posts); // Array of movies and series

// With pagination
const page2 = await fetch("${baseUrl}/api/kmmovies?page=2", {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});`;
        } else if (selectedCategory.name === "Search Movies") {
          return `// Search for movies and series
const searchQuery = "spider man";
const response = await fetch(\`${baseUrl}/api/kmmovies?search=\${encodeURIComponent(searchQuery)}\`, {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.posts); // Search results

// KMmovies returns both movies and series
data.posts.forEach(post => {
  console.log(\`\${post.title} - Type: \${post.type}\`);
});`;
        } else if (selectedCategory.name === "Movie Details") {
          return `// Get detailed movie information
const movieUrl = "https://kmmovies.art/spider-man-no-way-home-2021/";
const response = await fetch(\`${baseUrl}/api/kmmovies/details?url=\${encodeURIComponent(movieUrl)}\`, {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.data);

// Access movie details
const movie = data.data;
console.log("Title:", movie.title);
console.log("Storyline:", movie.storyline);
console.log("Download Links:", movie.downloadLinks);
console.log("Languages:", movie.languages);`;
        } else if (selectedCategory.name === "Magic Links") {
          return `// Extract links from Magic Links page
const magicUrl = "https://magiclinks.my/abc123";
const response = await fetch(\`${baseUrl}/api/kmmovies/magic-links?url=\${encodeURIComponent(magicUrl)}\`, {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.data.links);

// Different link types available
data.data.links.forEach(link => {
  console.log(\`\${link.provider} - \${link.type} - \${link.quality}\`);
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
        if (selectedCategory.name === "Get Movies") {
          return `# Get movies and series from KMmovies
import requests

url = "${baseUrl}/api/kmmovies"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data["posts"])  # Array of movies and series

# With pagination
page_2_response = requests.get(f"{url}?page=2", headers=headers)`;
        } else if (selectedCategory.name === "Search Movies") {
          return `# Search for movies and series
import requests
from urllib.parse import quote

search_query = "spider man"
url = f"${baseUrl}/api/kmmovies?search={quote(search_query)}"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data["posts"])  # Search results

# Check content type
for post in data["posts"]:
    print(f"{post['title']} - Type: {post['type']}")`;
        } else if (selectedCategory.name === "Movie Details") {
          return `# Get detailed movie information
import requests
from urllib.parse import quote

movie_url = "https://kmmovies.art/spider-man-no-way-home-2021/"
url = f"${baseUrl}/api/kmmovies/details?url={quote(movie_url)}"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
movie = data["data"]

print("Title:", movie["title"])
print("Storyline:", movie["storyline"])
print("Download Links:", len(movie["downloadLinks"]))
print("Languages:", movie["languages"])`;
        } else if (selectedCategory.name === "Magic Links") {
          return `# Extract links from Magic Links page
import requests
from urllib.parse import quote

magic_url = "https://magiclinks.my/abc123"
url = f"${baseUrl}/api/kmmovies/magic-links?url={quote(magic_url)}"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()

# Process different link types
for link in data["data"]["links"]:
    print(f"{link['provider']} - {link['type']} - {link['quality']}")`;
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
        if (selectedCategory.name === "Get Movies") {
          return `# Get movies and series from KMmovies
curl -X GET \\
  "${baseUrl}/api/kmmovies" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"

# With pagination
curl -X GET \\
  "${baseUrl}/api/kmmovies?page=2" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        } else if (selectedCategory.name === "Search Movies") {
          return `# Search for movies and series
curl -X GET \\
  "${baseUrl}/api/kmmovies?search=spider%20man" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        } else if (selectedCategory.name === "Movie Details") {
          return `# Get detailed movie information
curl -X GET \\
  "${baseUrl}/api/kmmovies/details?url=https%3A//w1.kmmovies.mobi/spider-man-no-way-home-2021/" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        } else if (selectedCategory.name === "Magic Links") {
          return `# Extract links from Magic Links page
curl -X GET \\
  "${baseUrl}/api/kmmovies/magic-links?url=https%3A//magiclinks.my/abc123" \\
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
      case "Get Movies":
        return `{
  "success": true,
  "count": 20,
  "posts": [
    {
      "id": "post-12345",
      "imageUrl": "https://kmmovies.art/wp-content/uploads/2024/01/spider-man.jpg",
      "title": "Spider-Man: No Way Home (2021) Hindi Dubbed Movie",
      "postUrl": "https://kmmovies.art/spider-man-no-way-home-2021/",
      "isSeries": false,
      "type": "movie"
    },
    {
      "id": "post-12346",
      "imageUrl": "https://kmmovies.art/wp-content/uploads/2024/01/stranger-things.jpg",
      "title": "Stranger Things S04 (2022) Complete Web Series",
      "postUrl": "https://kmmovies.art/stranger-things-s04-2022/",
      "isSeries": true,
      "type": "series"
    }
  ],
  "searchQuery": null,
  "page": 1,
  "source": "page",
  "website": "KMmovies",
  "remainingRequests": 95
}`;

      case "Search Movies":
        return `{
  "success": true,
  "count": 8,
  "posts": [
    {
      "id": "post-12345",
      "imageUrl": "https://kmmovies.art/wp-content/uploads/2024/01/spider-man-nwh.jpg",
      "title": "Spider-Man: No Way Home (2021) Hindi Dubbed Movie",
      "postUrl": "https://kmmovies.art/spider-man-no-way-home-2021/",
      "isSeries": false,
      "type": "movie"
    },
    {
      "id": "post-12346",
      "imageUrl": "https://kmmovies.art/wp-content/uploads/2024/01/spider-man-ffh.jpg",
      "title": "Spider-Man: Far From Home (2019) Hindi Dubbed",
      "postUrl": "https://kmmovies.art/spider-man-far-from-home-2019/",
      "isSeries": false,
      "type": "movie"
    },
    {
      "id": "post-12347",
      "imageUrl": "https://kmmovies.art/wp-content/uploads/2024/01/spider-man-animated.jpg",
      "title": "Spider-Man: Into the Spider-Verse (2018) Animation Movie",
      "postUrl": "https://kmmovies.art/spider-man-into-the-spider-verse-2018/",
      "isSeries": false,
      "type": "movie"
    }
  ],
  "searchQuery": "spider man",
  "page": 1,
  "source": "search",
  "website": "KMmovies",
  "remainingRequests": 94
}`;

      case "Movie Details":
        return `{
  "success": true,
  "data": {
    "title": "Spider-Man: No Way Home (2021) Hindi Dubbed Movie",
    "mainImage": "https://kmmovies.art/wp-content/uploads/2024/01/spider-man-nwh-poster.jpg",
    "storyline": "With Spider-Man's identity now revealed, Peter asks Doctor Strange for help. When a spell goes wrong, dangerous foes from other worlds start to appear, forcing Peter to discover what it truly means to be Spider-Man.",
    "releaseYear": "2021",
    "director": "Jon Watts",
    "cast": "Tom Holland, Zendaya, Benedict Cumberbatch, Jacob Batalon",
    "genres": "Action, Adventure, Sci-Fi",
    "duration": "148 min",
    "writer": "Chris McKenna, Erik Sommers",
    "ott": "Sony Pictures",
    "isSeries": false,
    "languages": ["Hindi", "English", "Dual Audio"],
    "availableQualities": ["480p", "720p", "1080p"],
    "downloadLinks": [
      {
        "url": "https://magiclinks.my/spider-man-480p",
        "quality": "480p",
        "size": "450MB",
        "text": "FAST DOWNLOAD"
      },
      {
        "url": "https://magiclinks.my/spider-man-720p",
        "quality": "720p",
        "size": "1.2GB",
        "text": "FAST DOWNLOAD"
      },
      {
        "url": "https://magiclinks.my/spider-man-1080p",
        "quality": "1080p",
        "size": "2.5GB",
        "text": "FAST DOWNLOAD"
      }
    ],
    "screenshot": "https://kmmovies.art/wp-content/uploads/2024/01/spider-man-screenshot.jpg",
    "imdbRating": {
      "text": "8.2/10",
      "url": "https://www.imdb.com/"
    },
    "sourceUrl": "https://kmmovies.art/spider-man-no-way-home-2021/"
  },
  "website": "KMmovies",
  "remainingRequests": 93
}`;

      case "Magic Links":
        return `{
  "success": true,
  "data": {
    "links": [
      {
        "type": "stream",
        "provider": "Watch Online",
        "url": "https://example.com/stream/spider-man-nwh.mp4",
        "quality": "Stream",
        "description": "Direct video stream URL"
      },
      {
        "type": "stream",
        "provider": "SkyTech",
        "url": "https://skytech-stream.com/spider-man-nwh-720p.mp4",
        "quality": "Stream",
        "description": "Direct video stream URL from SkyTech"
      },
      {
        "type": "hubcloud",
        "provider": "HUBCLOUD",
        "url": "https://hubcloud.lol/file/spider-man-abc123",
        "quality": "Stream",
        "description": "HubCloud streaming link"
      },
      {
        "type": "download",
        "provider": "GDFLIX",
        "url": "https://gdflix.lol/file/spider-man-def456",
        "quality": "Download",
        "description": "Google Drive based download (will be processed for direct links)"
      }
    ],
    "sourceUrl": "https://magiclinks.my/spider-man-nwh",
    "totalFound": 4
  },
  "website": "Magic Links",
  "remainingRequests": 92
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
              KMmovies API Testing
            </CardTitle>
            <CardDescription className="text-sm">
              Enter your API key to test the KMmovies endpoints. Get your API key from the{" "}
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
                    {kmMoviesApiCategories.map((category) => (
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
              KMmovies API Examples
            </CardTitle>
            <CardDescription className="text-sm">
              Code examples for integrating with our KMmovies API
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
                    {kmMoviesApiCategories.map((category) => (
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
                      <span className="text-gray-300 text-sm ml-2 truncate">kmmovies.js</span>
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
                      <span className="text-gray-300 text-sm ml-2 truncate">kmmovies.py</span>
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
            <CardDescription className="text-sm">Expected response structures for KMmovies endpoints</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs defaultValue="movies" className="space-y-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="movies" className="text-xs sm:text-sm">Movies</TabsTrigger>
                <TabsTrigger value="search" className="text-xs sm:text-sm">Search</TabsTrigger>
                <TabsTrigger value="details" className="text-xs sm:text-sm">Details</TabsTrigger>
                <TabsTrigger value="magic" className="text-xs sm:text-sm">Magic</TabsTrigger>
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

              <TabsContent value="magic">
                <ColorizedJSON data={getResponseExample("Magic Links")} title="magic-links" />
              </TabsContent>

              <TabsContent value="hubcloud">
                <ColorizedJSON data={getResponseExample("HubCloud Links")} title="hubcloud-links" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl">API Workflow</CardTitle>
            <CardDescription className="text-sm">Complete workflow for accessing movie content through KMmovies</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 sm:p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2 text-sm sm:text-base">Step-by-Step Process</h4>
              <ol className="text-xs sm:text-sm space-y-2">
                <li><strong>1. Browse/Search:</strong> Use <code>/api/kmmovies</code> to get movie lists or search for specific titles</li>
                <li><strong>2. Get Details:</strong> Use <code>/api/kmmovies/details</code> with movie URL to get complete information and download links</li>
                <li><strong>3. Process Magic Links:</strong> Use <code>/api/kmmovies/magic-links</code> to extract streaming/download options from Magic Links pages</li>
                <li><strong>4. Get Direct Links:</strong> Use <code>/api/hubcloud</code> with HubCloud URLs to get direct streaming/download links</li>
              </ol>
              <div className="mt-3 p-2 sm:p-3 bg-emerald-100 dark:bg-emerald-900/20 rounded-md">
                <p className="text-xs text-emerald-800 dark:text-emerald-200">
                  <strong>KMmovies Advantage:</strong> Provides both movies and TV series with detailed information including cast, director, storyline, and multiple quality options.
                </p>
              </div>
              <div className="mt-3 p-2 sm:p-3 bg-blue-100 dark:bg-blue-900/20 rounded-md">
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  <strong>Magic Links:</strong> Magic Links pages contain multiple streaming and download options. The API extracts all available links including Watch Online, SkyTech, HubCloud, and GDFLIX options.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
