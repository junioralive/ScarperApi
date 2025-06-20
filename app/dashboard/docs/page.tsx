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
import { Copy, Play, Key, Code2, ExternalLink, Home, Search, Film, Video, FileVideo, Clapperboard } from "lucide-react";
import { toast } from "sonner";
import MoviesDocs from "@/components/ui/movies-docs";
import AllMoviesDocs from "@/components/ui/allmovies-docs";
import TenBitClubDocs from "@/components/ui/10bitclub-docs";
import KMmoviesDocs from "@/components/ui/kmmovies-docs";
import DesireMoviesDocs from "@/components/ui/desiremovies-docs";
import VidSrcDocs from "@/components/ui/vidsrc-docs";
import Movies4UDocs from "@/components/ui/movies4u-docs";
import UHDMoviesDocs from "@/components/ui/uhdmovies-docs";
import HDHub4uDocs from "@/components/ui/hdhub4u-docs";
import FilmyFlyDocs from "@/components/ui/filmyfly-docs";

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
}

const apiCategories: ApiCategory[] = [
  {
    name: "Get All Posts",
    icon: <Home className="h-4 w-4" />,
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/posts",
        description: "Get all anime posts with pagination and search",
        params: []
      }
    ]
  },
  {
    name: "Search Anime",
    icon: <Search className="h-4 w-4" />,
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/posts",
        description: "Search anime by title using the search parameter",
        params: [
          { name: "search", type: "string", required: true, description: "Search query (anime title)" }
        ]
      }
    ]
  },
  {
    name: "Episode Details",
    icon: <Film className="h-4 w-4" />,
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/episodes/{id}",
        description: "Get anime details with seasons and episodes",
        params: [
          { name: "id", type: "string", required: true, description: "Anime ID from post URL Eg /blood-of-zeus-1x1/" },
          { name: "all_seasons", type: "boolean", required: false, description: "Get all seasons episodes (default: false)" },
          { name: "season", type: "number", required: false, description: "Get specific season episodes only" }
        ]
      }
    ]
  },
  {
    name: "Get Stream Links",
    icon: <Video className="h-4 w-4" />,
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/video",
        description: "Get streaming links for episode URL",
        params: [
          { name: "url", type: "string", required: true, description: "Episode URL from episodes response (e.g., /blood-of-zeus-1x1/)" }
        ]
      }
    ]
  }
];

export default function DocsPage() {
  const [apiKey, setApiKey] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(apiCategories[0]);
  const [selectedEndpoint, setSelectedEndpoint] = useState(apiCategories[0].endpoints[0]);
  const [testParams, setTestParams] = useState<Record<string, string>>({});
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedApiType, setSelectedApiType] = useState("anime");

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handleCategoryChange = (categoryName: string) => {
    const category = apiCategories.find(cat => cat.name === categoryName);
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

    // Check required parameters
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
      
      // Replace path parameters
      Object.entries(testParams).forEach(([key, value]) => {
        if (value && url.includes(`{${key}}`)) {
          url = url.replace(`{${key}}`, value);
        }
      });

      // Add query parameters
      const queryParams = new URLSearchParams();
      Object.entries(testParams).forEach(([key, value]) => {
        if (value && !selectedEndpoint.endpoint.includes(`{${key}}`)) {
          queryParams.append(key, value);
        }
      });

      if (queryParams.toString()) {
        url += "?" + queryParams.toString();
      }

      const res = await fetch(url, {
        headers: {
          "x-api-key": apiKey,  // Changed from X-API-Key to x-api-key to match your middleware
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
    let url = selectedEndpoint.endpoint;
    const params = Object.entries(testParams).filter(([_, value]) => value);
    
    // Replace path parameters
    Object.entries(testParams).forEach(([key, value]) => {
      if (value && url.includes(`{${key}}`)) {
        url = url.replace(`{${key}}`, value || key.toUpperCase());
      }
    });

    const queryParams = params.filter(([key]) => !selectedEndpoint.endpoint.includes(`{${key}}`))
      .map(([key, value]) => `${key}=${value}`).join("&");
    if (queryParams) {
      url += "?" + queryParams;
    }

    const baseUrl = "https://totu.me";

    // Generate realistic examples based on the selected category
    switch (language) {
      case "javascript":
        if (selectedCategory.name === "Get All Posts") {
          return `// Get all anime posts
const response = await fetch("${baseUrl}/api/posts", {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.posts); // Array of anime posts`;
        } else if (selectedCategory.name === "Search Anime") {
          return `// Search for anime
const searchQuery = "attack on titan";
const response = await fetch("${baseUrl}/api/posts?search=" + encodeURIComponent(searchQuery), {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.posts); // Search results`;
        } else if (selectedCategory.name === "Episode Details") {
          return `// Get episode details (Step 1)
// Extract ID from postUrl: https://animesalt.cc/series/blood-of-zeus/ -> "blood-of-zeus"
const animeId = "blood-of-zeus"; 
const response = await fetch("${baseUrl}/api/episodes/" + animeId, {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.episodes); // Episodes with links`;
        } else {
          return `// Get streaming URL (Step 2)
const episodeUrl = "https://animesalt.cc/episode/blood-of-zeus-1x1/";
const response = await fetch("${baseUrl}/api/video?url=" + encodeURIComponent(episodeUrl), {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.securedLink); // Direct streaming URL`;
        }

      case "python":
        if (selectedCategory.name === "Get All Posts") {
          return `# Get all anime posts
import requests

url = "${baseUrl}/api/posts"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data["posts"])  # Array of anime posts`;
        } else if (selectedCategory.name === "Search Anime") {
          return `# Search for anime
import requests

search_query = "attack on titan"
url = "${baseUrl}/api/posts"
params = {"search": search_query}
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, params=params, headers=headers)
data = response.json()
print(data["posts"])  # Search results`;
        } else if (selectedCategory.name === "Episode Details") {
          return `# Get episode details (Step 1)
import requests

# Extract ID from postUrl: https://animesalt.cc/series/blood-of-zeus/ -> "blood-of-zeus"
anime_id = "blood-of-zeus"
url = f"${baseUrl}/api/episodes/{anime_id}"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data["episodes"])  # Episodes with links`;
        } else {
          return `# Get streaming URL (Step 2)
import requests
from urllib.parse import quote

episode_url = "https://animesalt.cc/episode/blood-of-zeus-1x1/"
url = f"${baseUrl}/api/video?url={quote(episode_url)}"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data["securedLink"])  # Direct streaming URL`;
        }

      case "curl":
        if (selectedCategory.name === "Get All Posts") {
          return `# Get all anime posts
curl -X GET \\
  "${baseUrl}/api/posts" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        } else if (selectedCategory.name === "Search Anime") {
          return `# Search for anime
curl -X GET \\
  "${baseUrl}/api/posts?search=attack%20on%20titan" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        } else if (selectedCategory.name === "Episode Details") {
          return `# Get episode details (Step 1)
# Extract ID from postUrl: https://animesalt.cc/series/blood-of-zeus/ -> "blood-of-zeus"
curl -X GET \\
  "${baseUrl}/api/episodes/blood-of-zeus" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        } else {
          return `# Get streaming URL (Step 2)
curl -X GET \\
  "${baseUrl}/api/video?url=https%3A//animesalt.cc/episode/blood-of-zeus-1x1/" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        }

      default:
        return "";
    }
  };

  return (
    <div className="container mx-auto py-4 px-4 sm:py-6 space-y-4 sm:space-y-6 max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold truncate">API Documentation</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Test and explore our Anime & Movies API endpoints
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0">
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <Label className="text-xs text-muted-foreground">Select API Type</Label>
            <Select value={selectedApiType} onValueChange={setSelectedApiType}>
              <SelectTrigger className="w-full sm:w-40 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anime" className="text-sm">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    Anime API
                  </div>
                </SelectItem>
                <SelectItem value="movies" className="text-sm">
                  <div className="flex items-center gap-2">
                    <FileVideo className="h-4 w-4" />
                    Movies API
                  </div>
                </SelectItem>
                <SelectItem value="allmovies" className="text-sm">
                  <div className="flex items-center gap-2">
                    <Film className="h-4 w-4" />
                    AllMoviesHub API
                  </div>
                </SelectItem>
                <SelectItem value="10bitclub" className="text-sm">
                  <div className="flex items-center gap-2">
                    <Film className="h-4 w-4" />
                    10BitClub API
                  </div>
                </SelectItem>
                <SelectItem value="kmmovies" className="text-sm">
                  <div className="flex items-center gap-2">
                    <Film className="h-4 w-4" />
                    KMmovies API
                  </div>
                </SelectItem>
                <SelectItem value="uhdmovies" className="text-sm">
                  <div className="flex items-center gap-2">
                    <Film className="h-4 w-4" />
                    UHDMovies API
                  </div>
                </SelectItem>
                <SelectItem value="movies4u" className="text-sm">
                  <div className="flex items-center gap-2">
                    <Clapperboard className="h-4 w-4" />
                    Movies4U API
                  </div>
                </SelectItem>
                <SelectItem value="gyanigurus" className="text-sm">
                  <div className="flex items-center gap-2">
                    <Film className="h-4 w-4" />
                    GyanGurus API
                  </div>
                </SelectItem>
                <SelectItem value="desiremovies" className="text-sm">
                  <div className="flex items-center gap-2">
                    <Film className="h-4 w-4" />
                    DesireMovies API
                  </div>
                </SelectItem>
                <SelectItem value="vidsrc" className="text-sm">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    VidSrc API
                  </div>
                </SelectItem>
                <SelectItem value="hdhub4u" className="text-sm">
                  <div className="flex items-center gap-2">
                    <Clapperboard className="h-4 w-4" />
                    HDHub4u API
                  </div>
                </SelectItem>
                <SelectItem value="filmyfly" className="text-sm">
                  <div className="flex items-center gap-2">
                    <Film className="h-4 w-4" />
                    FilmyFly API
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {selectedApiType === "anime" ? (
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
                <CardTitle className="text-lg sm:text-xl">API Key Setup</CardTitle>
                <CardDescription className="text-sm">
                  Enter your API key to test the endpoints. Get your API key from the{" "}
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
                    onChange={(e) => setApiKey(e.target.value)}
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
                        {apiCategories.map((category) => (
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

            <Card>
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl">Response</CardTitle>
                <CardDescription className="text-sm">API response will appear here</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full overflow-hidden">
                  <Textarea
                    placeholder="API response will appear here..."
                    value={response}
                    readOnly
                    className="min-h-[200px] sm:min-h-[300px] font-mono text-xs sm:text-sm w-full resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="docs" className="space-y-4 sm:space-y-6">
            <Card>
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl">API Usage Examples</CardTitle>
                <CardDescription className="text-sm">
                  Code examples for integrating with our Anime API
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
                        {apiCategories.map((category) => (
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
                    <div className="relative w-full overflow-hidden">
                      <div className="bg-[#1e1e1e] rounded-lg overflow-hidden border border-gray-800">
                        {/* VS Code-like header */}
                        <div className="flex items-center justify-between bg-[#2d2d30] px-4 py-2 border-b border-gray-700">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex gap-1.5 shrink-0">
                              <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                              <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                              <div className="w-3 h-3 rounded-full bg-[#27ca3f]"></div>
                            </div>
                            <span className="text-gray-300 text-sm ml-2 truncate">example.js</span>
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
                        {/* Code content */}
                        <div className="overflow-x-auto">
                          <pre className="p-4">
                            <code className="text-sm text-gray-300 font-mono whitespace-pre-wrap break-words">
                              {generateCodeExample("javascript")}
                            </code>
                          </pre>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="python">
                    <div className="relative w-full overflow-hidden">
                      <div className="bg-[#1e1e1e] rounded-lg overflow-hidden border border-gray-800">
                        {/* VS Code-like header */}
                        <div className="flex items-center justify-between bg-[#2d2d30] px-4 py-2 border-b border-gray-700">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex gap-1.5 shrink-0">
                              <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                              <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                              <div className="w-3 h-3 rounded-full bg-[#27ca3f]"></div>
                            </div>
                            <span className="text-gray-300 text-sm ml-2 truncate">example.py</span>
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
                        {/* Code content */}
                        <div className="overflow-x-auto">
                          <pre className="p-4">
                            <code className="text-sm text-gray-300 font-mono whitespace-pre-wrap break-words">
                              {generateCodeExample("python")}
                            </code>
                          </pre>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="curl">
                    <div className="relative w-full overflow-hidden">
                      <div className="bg-[#1e1e1e] rounded-lg overflow-hidden border border-gray-800">
                        {/* Terminal-like header */}
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
                        {/* Code content */}
                        <div className="overflow-x-auto">
                          <pre className="p-4">
                            <code className="text-sm text-gray-300 font-mono whitespace-pre-wrap break-words">
                              {generateCodeExample("curl")}
                            </code>
                          </pre>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl">Response Examples</CardTitle>
                <CardDescription className="text-sm">Expected response structures for each endpoint</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs defaultValue="home" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="home" className="text-xs sm:text-sm">Home Data</TabsTrigger>
                    <TabsTrigger value="details" className="text-xs sm:text-sm">Anime Details</TabsTrigger>
                    <TabsTrigger value="streaming" className="text-xs sm:text-sm">Streaming</TabsTrigger>
                  </TabsList>

                  <TabsContent value="home">
                    <div className="relative w-full overflow-hidden">
                      <div className="bg-[#1e1e1e] rounded-lg overflow-hidden border border-gray-800">
                        {/* VS Code-like header */}
                        <div className="flex items-center justify-between bg-[#2d2d30] px-4 py-2 border-b border-gray-700">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex gap-1.5 shrink-0">
                              <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                              <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                              <div className="w-3 h-3 rounded-full bg-[#27ca3f]"></div>
                            </div>
                            <span className="text-gray-300 text-sm ml-2 truncate">response.json</span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-400 hover:text-white hover:bg-gray-700 h-6 px-2 shrink-0"
                            onClick={() => copyToClipboard(`{
  "success": true,
  "posts": [...],
  "count": 20
}`)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        {/* Code content */}
                        <div className="overflow-x-auto">
                          <pre className="p-4 text-xs sm:text-sm">
                            <code className="text-gray-300 font-mono whitespace-pre-wrap break-words">{`{
  "success": true,
  "count": 20,
  "posts": [
    {
      "imageUrl": "https://example.com/image.jpg",
      "title": "Attack on Titan Final Season",
      "postUrl": "/series/attack-on-titan/" // now here to get epsodes you can ignore /series
    }
  ],
  "searchQuery": null,
  "category": "all",
  "source": "category"
}`}</code>
                          </pre>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="details">
                    <div className="relative w-full overflow-hidden">
                      <div className="bg-[#1e1e1e] rounded-lg overflow-hidden border border-gray-800">
                        {/* VS Code-like header */}
                        <div className="flex items-center justify-between bg-[#2d2d30] px-4 py-2 border-b border-gray-700">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex gap-1.5 shrink-0">
                              <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                              <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                              <div className="w-3 h-3 rounded-full bg-[#27ca3f]"></div>
                            </div>
                            <span className="text-gray-300 text-sm ml-2 truncate">episodes.json</span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-400 hover:text-white hover:bg-gray-700 h-6 px-2 shrink-0"
                            onClick={() => copyToClipboard(`{
  "success": true,
  "animeName": "Blood of Zeus",
  "details": {...},
  "episodes": [...]
}`)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        {/* Code content */}
                        <div className="overflow-x-auto">
                          <pre className="p-4 text-xs sm:text-sm">
                            <code className="text-gray-300 font-mono whitespace-pre-wrap break-words">{`{
  "success": true,
  "animeName": "Blood of Zeus",
  "details": {
    "title": "Blood of Zeus - Watch Now in Hindi & English",
    "imageUrl": "https://image.tmdb.org/t/p/w342/example.jpg",
    "info": {
      "seasons": 3,
      "episodeCount": 24,
      "duration": "24 min",
      "year": "2020"
    },
    "availableSeasons": [
      {
        "number": 1,
        "text": "Season 1",
        "dataPost": "199"
      }
    ],
    "overview": "In a brewing war between the gods..."
  },
  "episodes": [
    {
      "id": "blood-of-zeus-1x1",
      "title": "Blood of Zeus 1x1",
      "link": "episode/blood-of-zeus-1x1/",
      "season": 1,
      "number": 1,
      "imageUrl": "https://img.imdb.com/image/199/1/1.webp"
    }
  ]
}`}</code>
                          </pre>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="streaming">
                    <div className="relative w-full overflow-hidden">
                      <div className="bg-[#1e1e1e] rounded-lg overflow-hidden border border-gray-800">
                        {/* VS Code-like header */}
                        <div className="flex items-center justify-between bg-[#2d2d30] px-4 py-2 border-b border-gray-700">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex gap-1.5 shrink-0">
                              <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                              <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                              <div className="w-3 h-3 rounded-full bg-[#27ca3f]"></div>
                            </div>
                            <span className="text-gray-300 text-sm ml-2 truncate">stream.json</span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-400 hover:text-white hover:bg-gray-700 h-6 px-2 shrink-0"
                            onClick={() => copyToClipboard(`{
  "success": true,
  "securedLink": "https://example.com/stream/video.m3u8"
}`)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        {/* Code content */}
                        <div className="overflow-x-auto">
                          <pre className="p-4 text-xs sm:text-sm">
                            <code className="text-gray-300 font-mono whitespace-pre-wrap break-words">{`{
  "success": true,
  "securedLink": "https://example.com/stream/video.m3u8",
  "remainingRequests": 99
}`}</code>
                          </pre>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl">API Workflow</CardTitle>
                <CardDescription className="text-sm">How to get streaming links for anime episodes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 sm:p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2 text-sm sm:text-base">Step-by-Step Process</h4>
                  <ol className="text-xs sm:text-sm space-y-2">
                    <li><strong>1. Get Posts:</strong> Use <code>/api/posts</code> to get anime list</li>
                    <li><strong>2. Get Episodes:</strong> Use <code>/api/episodes/{`{id}`}</code> with anime ID to get episode details</li>
                    <li><strong>3. Get Stream Links:</strong> Use <code>/api/video?url={`{episode_link}`}</code> with episode link to get streaming URL</li>
                  </ol>
                  <div className="mt-3 p-2 sm:p-3 bg-blue-100 dark:bg-blue-900/20 rounded-md">
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      <strong>How to extract ID:</strong> From postUrl <code>https://animesalt.cc/series/blood-of-zeus/</code> → use <code>/blood-of-zeus/</code> as the ID parameter.
                    </p>
                  </div>
                  <div className="mt-3 p-2 sm:p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-md">
                    <p className="text-xs text-yellow-800 dark:text-yellow-200">
                      <strong>Note:</strong> The episodes endpoint gives you episode links, not streaming links. 
                      Use the episode link with the video endpoint to get the actual streaming URL.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : selectedApiType === "movies" ? (
        <div className="w-full overflow-hidden">
          <MoviesDocs apiKey={apiKey} onApiKeyChange={setApiKey} />
        </div>
      ) : selectedApiType === "allmovies" ? (
        <div className="w-full overflow-hidden">
          <AllMoviesDocs apiKey={apiKey} onApiKeyChange={setApiKey} />
        </div>
      ) : selectedApiType === "10bitclub" ? (
        <div className="w-full overflow-hidden">
          <TenBitClubDocs apiKey={apiKey} onApiKeyChange={setApiKey} />
        </div>
      ) : selectedApiType === "kmmovies" ? (
        <div className="w-full overflow-hidden">
          <KMmoviesDocs apiKey={apiKey} onApiKeyChange={setApiKey} />
        </div>
      ) : selectedApiType === "uhdmovies" ? (
        <div className="w-full overflow-hidden">
          <UHDMoviesDocs apiKey={apiKey} onApiKeyChange={setApiKey} />
        </div>
      ) : selectedApiType === "movies4u" ? (
        <div className="w-full overflow-hidden">
          <Movies4UDocs apiKey={apiKey} onApiKeyChange={setApiKey} />
        </div>
      ) : selectedApiType === "gyanigurus" ? (
        <div className="w-full overflow-hidden">
          <DesireMoviesDocs apiKey={apiKey} onApiKeyChange={setApiKey} />
        </div>
      ) : selectedApiType === "desiremovies" ? (
        <div className="w-full overflow-hidden">
          <DesireMoviesDocs apiKey={apiKey} onApiKeyChange={setApiKey} />
        </div>
      ) : selectedApiType === "vidsrc" ? (
        <div className="w-full overflow-hidden">
          <VidSrcDocs apiKey={apiKey} onApiKeyChange={setApiKey} />
        </div>
      ) : selectedApiType === "hdhub4u" ? (
        <div className="w-full overflow-hidden">
          <HDHub4uDocs apiKey={apiKey} onApiKeyChange={setApiKey} />
        </div>
      ) : selectedApiType === "filmyfly" ? (
        <div className="w-full overflow-hidden">
          <FilmyFlyDocs apiKey={apiKey} onApiKeyChange={setApiKey} />
        </div>
      ) : (
        <div className="w-full overflow-hidden">
          <AllMoviesDocs apiKey={apiKey} onApiKeyChange={setApiKey} />
        </div>
      )}
    </div>
  );
}