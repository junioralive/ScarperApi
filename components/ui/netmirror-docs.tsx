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
import { Copy, Play, Code2, Home, Search, Film, Download, Star, Clapperboard, Cloud, Info, Link2, Video } from "lucide-react";
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

const netMirrorApiCategories: ApiCategory[] = [
  {
    name: "Get Movies",
    icon: <Home className="h-4 w-4" />,
    color: "bg-blue-500",
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/netmirror",
        description: "Get all movies and shows from NetMirror homepage",
        params: []
      }
    ]
  },
  {
    name: "Search Movies",
    icon: <Search className="h-4 w-4" />,
    color: "bg-green-500",
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/netmirror/search",
        description: "Search movies and shows by title on NetMirror",
        params: [
          { name: "p", type: "string", required: true, description: "Search query (movie/show title)" }
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
        endpoint: "/api/netmirror/getpost",
        description: "Get detailed movie information and metadata",
        params: [
          { name: "id", type: "string", required: true, description: "Movie ID from NetMirror (e.g., from data-post attribute)" },
          { name: "t", type: "string", required: false, description: "Timestamp (auto-generated if not provided)" }
        ]
      }
    ]
  },
  {
    name: "Stream Links",
    icon: <Video className="h-4 w-4" />,
    color: "bg-red-500",
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/netmirror/stream",
        description: "Get streaming links and playlist data for movies",
        params: [
          { name: "id", type: "string", required: true, description: "Movie ID from NetMirror" }
        ]
      }
    ]
  }
];

interface NetMirrorDocsProps {
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

export default function NetMirrorDocs({ apiKey, onApiKeyChange }: NetMirrorDocsProps) {
  const [selectedCategory, setSelectedCategory] = useState(netMirrorApiCategories[0]);
  const [selectedEndpoint, setSelectedEndpoint] = useState(netMirrorApiCategories[0].endpoints[0]);
  const [testParams, setTestParams] = useState<Record<string, string>>({});
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handleCategoryChange = (categoryName: string) => {
    const category = netMirrorApiCategories.find(cat => cat.name === categoryName);
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
          return `// Get movies from NetMirror
const response = await fetch("${baseUrl}/api/netmirror", {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.data.items); // Array of movies and shows

// NetMirror features:
// - Netflix-style interface
// - High-quality streaming content
// - Multiple categories and genres
// - Direct streaming links

// Access movie details
data.data.items.forEach(movie => {
  console.log(\`Title: \${movie.title}\`);
  console.log(\`ID: \${movie.id}\`);
  console.log(\`Category: \${movie.category}\`);
  console.log(\`Image: \${movie.imageUrl}\`);
  console.log(\`Watch URL: \${movie.postUrl}\`);
});`;
        } else if (selectedCategory.name === "Search Movies") {
          return `// Search movies on NetMirror
const searchQuery = "spider man";
const response = await fetch(\`${baseUrl}/api/netmirror/search?p=\${encodeURIComponent(searchQuery)}\`, {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.data.searchResults); // Search results

// The search returns structured data with movie information
// Use the returned IDs to get detailed information or streaming links`;
        } else if (selectedCategory.name === "Movie Details") {
          return `// Get movie details from NetMirror
const movieId = "12345"; // From NetMirror movie listing
const response = await fetch(\`${baseUrl}/api/netmirror/getpost?id=\${movieId}\`, {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.data); // Movie details and metadata

// Optional: Include timestamp parameter
const withTimestamp = await fetch(\`${baseUrl}/api/netmirror/getpost?id=\${movieId}&t=\${Date.now()}\`, {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});`;
        } else if (selectedCategory.name === "Stream Links") {
          return `// Get streaming links from NetMirror
const movieId = "12345"; // From NetMirror movie listing
const response = await fetch(\`${baseUrl}/api/netmirror/stream?id=\${movieId}\`, {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.data.streamData); // Streaming playlist and sources

// Access streaming sources
if (data.data.streamData.sources) {
  data.data.streamData.sources.forEach(source => {
    console.log(\`Quality: \${source.label}\`);
    console.log(\`File URL: \${source.file}\`);
    console.log(\`Type: \${source.type}\`);
  });
}`;
        }

      case "python":
        if (selectedCategory.name === "Get Movies") {
          return `# Get movies from NetMirror
import requests

url = "${baseUrl}/api/netmirror"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data["data"]["items"])  # Array of movies and shows

# Access movie details
for movie in data["data"]["items"]:
    print(f"Title: {movie['title']}")
    print(f"ID: {movie['id']}")
    print(f"Category: {movie['category']}")`;
        } else if (selectedCategory.name === "Search Movies") {
          return `# Search movies on NetMirror
import requests
from urllib.parse import quote

search_query = "spider man"
url = f"${baseUrl}/api/netmirror/search?p={quote(search_query)}"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data["data"]["searchResults"])  # Search results`;
        } else if (selectedCategory.name === "Movie Details") {
          return `# Get movie details from NetMirror
import requests

movie_id = "12345"  # From NetMirror movie listing
url = f"${baseUrl}/api/netmirror/getpost?id={movie_id}"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data["data"])  # Movie details and metadata`;
        } else if (selectedCategory.name === "Stream Links") {
          return `# Get streaming links from NetMirror
import requests

movie_id = "12345"  # From NetMirror movie listing
url = f"${baseUrl}/api/netmirror/stream?id={movie_id}"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data["data"]["streamData"])  # Streaming playlist and sources`;
        }

      case "curl":
        if (selectedCategory.name === "Get Movies") {
          return `# Get movies from NetMirror
curl -X GET \\
  "${baseUrl}/api/netmirror" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        } else if (selectedCategory.name === "Search Movies") {
          return `# Search movies on NetMirror
curl -X GET \\
  "${baseUrl}/api/netmirror/search?p=spider%20man" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        } else if (selectedCategory.name === "Movie Details") {
          return `# Get movie details from NetMirror
curl -X GET \\
  "${baseUrl}/api/netmirror/getpost?id=12345" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        } else if (selectedCategory.name === "Stream Links") {
          return `# Get streaming links from NetMirror
curl -X GET \\
  "${baseUrl}/api/netmirror/stream?id=12345" \\
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
    "items": [
      {
        "id": "12345",
        "title": "Spider-Man: No Way Home",
        "imageUrl": "https://image.tmdb.org/t/p/w342/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg",
        "postUrl": "https://net20.cc/watch/12345",
        "category": "Action Movies"
      },
      {
        "id": "12346",
        "title": "The Batman",
        "imageUrl": "https://image.tmdb.org/t/p/w342/74xTEgt7R36Fpooo50r9T25onhq.jpg",
        "postUrl": "https://net20.cc/watch/12346",
        "category": "Superhero Movies"
      },
      {
        "id": "12347",
        "title": "Dune",
        "imageUrl": "https://image.tmdb.org/t/p/w342/d5NXSklXo0qyIYkgV94XAgMIckC.jpg",
        "postUrl": "https://net20.cc/watch/12347",
        "category": "Sci-Fi Movies"
      }
    ],
    "totalResults": 150
  }
}`;

      case "Search Movies":
        return `{
  "success": true,
  "data": {
    "searchUrl": "https://net20.cc/search.php?s=spider%20man&t=1640995200000",
    "searchResults": {
      "results": [
        {
          "id": "12345",
          "title": "Spider-Man: No Way Home",
          "year": "2021",
          "type": "movie",
          "poster": "https://image.tmdb.org/t/p/w342/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg"
        },
        {
          "id": "12348",
          "title": "Spider-Man: Far From Home",
          "year": "2019",
          "type": "movie",
          "poster": "https://image.tmdb.org/t/p/w342/4q2NNj4S5dG2RLF9CpXsej7yXl.jpg"
        },
        {
          "id": "12349",
          "title": "Spider-Man: Into the Spider-Verse",
          "year": "2018",
          "type": "movie",
          "poster": "https://image.tmdb.org/t/p/w342/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg"
        }
      ],
      "totalFound": 8
    },
    "requestParams": {
      "query": "spider man",
      "timestamp": "1640995200000"
    }
  }
}`;

      case "Movie Details":
        return `{
  "success": true,
  "data": {
    "title": "Spider-Man: No Way Home",
    "year": "2021",
    "genre": ["Action", "Adventure", "Fantasy"],
    "director": "Jon Watts",
    "cast": ["Tom Holland", "Zendaya", "Benedict Cumberbatch"],
    "runtime": "148 min",
    "rating": "8.4",
    "plot": "With Spider-Man's identity now revealed, Peter asks Doctor Strange for help. When a spell goes wrong, dangerous foes from other worlds start to appear, forcing Peter to discover what it truly means to be Spider-Man.",
    "poster": "https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg",
    "backdrop": "https://image.tmdb.org/t/p/original/14QbnygCuTO0vl7CAFmPf1fgZfV.jpg",
    "imdbId": "tt10872600",
    "tmdbId": "634649"
  },
  "requestParams": {
    "id": "12345",
    "timestamp": "1640995200000"
  }
}`;

      case "Stream Links":
        return `{
  "success": true,
  "data": {
    "playlistUrl": "https://net51.cc/playlist.php?id=12345&tm=1640995200000&h=abc123def456",
    "streamData": {
      "sources": [
        {
          "file": "https://net51.cc/hls/12345/1080p/playlist.m3u8",
          "label": "1080p",
          "type": "hls"
        },
        {
          "file": "https://net51.cc/hls/12345/720p/playlist.m3u8",
          "label": "720p",
          "type": "hls"
        },
        {
          "file": "https://net51.cc/hls/12345/480p/playlist.m3u8",
          "label": "480p",
          "type": "hls"
        }
      ],
      "tracks": [
        {
          "file": "https://net51.cc/subtitles/12345/english.vtt",
          "label": "English",
          "kind": "captions"
        },
        {
          "file": "https://net51.cc/subtitles/12345/spanish.vtt",
          "label": "Spanish",
          "kind": "captions"
        }
      ],
      "image": "https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg"
    },
    "requestParams": {
      "id": "12345",
      "timestamp": "1640995200000",
      "h": "abc123def456"
    }
  }
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
              <Video className="h-5 w-5 text-blue-500" />
              NetMirror API Testing
            </CardTitle>
            <CardDescription className="text-sm">
              Enter your API key to test the NetMirror endpoints. Get your API key from the{" "}
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
                    {netMirrorApiCategories.map((category) => (
                      <SelectItem key={category.name} value={category.name} className="text-sm">
                        <div className="flex items-center gap-2">
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

              <div className="p-3 bg-muted rounded-lg">
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

        {response && (
          <Card>
            <CardHeader className="pb-4 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl">Response</CardTitle>
              <CardDescription className="text-sm">API response from NetMirror</CardDescription>
            </CardHeader>
            <CardContent>
              <ColorizedJSON data={response} title="NetMirror Response" />
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="docs" className="space-y-4 sm:space-y-6">
        <Card>
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              <Video className="h-5 w-5 text-blue-500" />
              NetMirror API Examples
            </CardTitle>
            <CardDescription className="text-sm">
              Code examples for integrating with the NetMirror API
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
                    {netMirrorApiCategories.map((category) => (
                      <SelectItem key={category.name} value={category.name} className="text-sm">
                        <div className="flex items-center gap-2">
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
                      <span className="text-gray-300 text-sm ml-2 truncate">netmirror.js</span>
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
                      <span className="text-gray-300 text-sm ml-2 truncate">netmirror.py</span>
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
            <CardDescription className="text-sm">Expected response structures for NetMirror endpoints</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="movies" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="movies" className="text-xs sm:text-sm">Movies</TabsTrigger>
                <TabsTrigger value="search" className="text-xs sm:text-sm">Search</TabsTrigger>
                <TabsTrigger value="details" className="text-xs sm:text-sm">Details</TabsTrigger>
                <TabsTrigger value="stream" className="text-xs sm:text-sm">Stream</TabsTrigger>
              </TabsList>

              <TabsContent value="movies">
                <ColorizedJSON data={getResponseExample("Get Movies")} title="Movies Response" />
              </TabsContent>

              <TabsContent value="search">
                <ColorizedJSON data={getResponseExample("Search Movies")} title="Search Response" />
              </TabsContent>

              <TabsContent value="details">
                <ColorizedJSON data={getResponseExample("Movie Details")} title="Details Response" />
              </TabsContent>

              <TabsContent value="stream">
                <ColorizedJSON data={getResponseExample("Stream Links")} title="Stream Response" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl">NetMirror API Workflow</CardTitle>
            <CardDescription className="text-sm">How to get streaming links for movies and shows</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 sm:p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2 text-sm sm:text-base">Step-by-Step Process</h4>
              <ol className="text-xs sm:text-sm space-y-2">
                <li><strong>1. Get Movies:</strong> Use <code>/api/netmirror</code> to get all available movies and shows</li>
                <li><strong>2. Search (Optional):</strong> Use <code>/api/netmirror/search?p=query</code> to search for specific content</li>
                <li><strong>3. Get Details:</strong> Use <code>/api/netmirror/getpost?id=movie_id</code> to get detailed movie information</li>
                <li><strong>4. Get Stream Links:</strong> Use <code>/api/netmirror/stream?id=movie_id</code> to get streaming URLs</li>
              </ol>
              <div className="mt-3 p-2 sm:p-3 bg-blue-100 dark:bg-blue-900/20 rounded-md">
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  <strong>Movie ID:</strong> Extract the movie ID from the data-post attribute or URL structure from the movies listing.
                </p>
              </div>
              <div className="mt-3 p-2 sm:p-3 bg-green-100 dark:bg-green-900/20 rounded-md">
                <p className="text-xs text-green-800 dark:text-green-200">
                  <strong>NetMirror Features:</strong> High-quality streaming, multiple resolutions (480p, 720p, 1080p), subtitles support, and direct HLS streaming.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
          