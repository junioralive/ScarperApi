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
import { Copy, Play, Code2, Home, Search, Film, Download, Cloud } from "lucide-react";
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
}

const allMoviesApiCategories: ApiCategory[] = [
  {
    name: "Get Movies",
    icon: <Home className="h-4 w-4" />,
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/allmovieshub",
        description: "Get all movies and shows with pagination",
        params: [
          { name: "page", type: "number", required: false, description: "Page number for pagination (default: 1)" }
        ]
      }
    ]
  },
  {
    name: "Search Movies",
    icon: <Search className="h-4 w-4" />,
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/allmovieshub",
        description: "Search movies and shows by title",
        params: [
          { name: "search", type: "string", required: true, description: "Search query (movie/show title)" }
        ]
      }
    ]
  },
  {
    name: "Download Links",
    icon: <Download className="h-4 w-4" />,
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/allmovieshub/download",
        description: "Get download links with quality options for a specific movie",
        params: [
          { name: "movie", type: "string", required: true, description: "Movie URL slug (e.g., download-housefull-5a-2025-hindi-dd2-0-hq-hdtc-full-movie-480p-720p-1080p)" }
        ]
      }
    ]
  },
  {
    name: "HBCloud Links",
    icon: <Cloud className="h-4 w-4" />,
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/hubcloud",
        description: "Get direct streaming links from HubCloud file URLs",
        params: [
          { name: "url", type: "string", required: true, description: "HubCloud file URL (e.g., https://hubcloud.lol/file/xyz123)" }
        ]
      }
    ]
  }
];

interface AllMoviesDocsProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

export default function AllMoviesDocs({ apiKey, onApiKeyChange }: AllMoviesDocsProps) {
  const [selectedCategory, setSelectedCategory] = useState(allMoviesApiCategories[0]);
  const [selectedEndpoint, setSelectedEndpoint] = useState(allMoviesApiCategories[0].endpoints[0]);
  const [testParams, setTestParams] = useState<Record<string, string>>({});
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handleCategoryChange = (categoryName: string) => {
    const category = allMoviesApiCategories.find(cat => cat.name === categoryName);
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
          return `// Get all movies and shows
const response = await fetch("${baseUrl}/api/allmovieshub", {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.posts); // Array of movies and shows`;
        } else if (selectedCategory.name === "Search Movies") {
          return `// Search for movies
const searchQuery = "housefull";
const response = await fetch("${baseUrl}/api/allmovieshub?search=" + encodeURIComponent(searchQuery), {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.posts); // Search results`;
        } else if (selectedCategory.name === "Download Links") {
          return `// Get download links for a movie
const movieSlug = "download-housefull-5a-2025-hindi-dd2-0-hq-hdtc-full-movie-480p-720p-1080p";
const response = await fetch("${baseUrl}/api/allmovieshub/download?movie=" + encodeURIComponent(movieSlug), {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.movieData.downloadLinks); // Download links with quality options`;
        } else if (selectedCategory.name === "HBCloud Links") {
          return `// Get HubCloud streaming link
const hubcloudUrl = "https://hubcloud.lol/file/xyz123";
const response = await fetch("${baseUrl}/api/hubcloud?url=" + encodeURIComponent(hubcloudUrl), {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.links); // Direct download/streaming links`;
        }

      case "python":
        if (selectedCategory.name === "Get Movies") {
          return `# Get all movies and shows
import requests

url = "${baseUrl}/api/allmovieshub"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data["posts"])  # Array of movies and shows`;
        } else if (selectedCategory.name === "Search Movies") {
          return `# Search for movies
import requests

search_query = "housefull"
url = "${baseUrl}/api/allmovieshub"
params = {"search": search_query}
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, params=params, headers=headers)
data = response.json()
print(data["posts"])  # Search results`;
        } else if (selectedCategory.name === "Download Links") {
          return `# Get download links for a movie
import requests
from urllib.parse import quote

movie_slug = "download-housefull-5a-2025-hindi-dd2-0-hq-hdtc-full-movie-480p-720p-1080p"
url = f"${baseUrl}/api/allmovieshub/download?movie={quote(movie_slug)}"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data["movieData"]["downloadLinks"])  # Download links with quality options`;
        } else if (selectedCategory.name === "HBCloud Links") {
          return `# Get HubCloud streaming link
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
print(data["links"])  # Direct download/streaming links`;
        }

      case "curl":
        if (selectedCategory.name === "Get Movies") {
          return `# Get all movies and shows
curl -X GET \\
  "${baseUrl}/api/allmovieshub" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        } else if (selectedCategory.name === "Search Movies") {
          return `# Search for movies
curl -X GET \\
  "${baseUrl}/api/allmovieshub?search=housefull" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        } else if (selectedCategory.name === "Download Links") {
          return `# Get download links for a movie
curl -X GET \\
  "${baseUrl}/api/allmovieshub/download?movie=download-housefull-5a-2025-hindi-dd2-0-hq-hdtc-full-movie-480p-720p-1080p" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        } else if (selectedCategory.name === "HBCloud Links") {
          return `# Get HubCloud streaming link
curl -X GET \\
  "${baseUrl}/api/hubcloud?url=https%3A//hubcloud.lol/file/xyz123" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        }

      default:
        return "";
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
            <CardTitle className="text-lg sm:text-xl">API Key Setup</CardTitle>
            <CardDescription className="text-sm">
              Enter your API key to test the AllMoviesHub endpoints. Get your API key from the{" "}
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
                    {allMoviesApiCategories.map((category) => (
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
                className="min-h-[200px] sm:min-h-[300px] font-mono text-xs sm:text-sm w-full resize-none api-response selectable-text"
              />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="docs" className="space-y-4 sm:space-y-6">
        <Card>
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl">AllMoviesHub API Examples</CardTitle>
            <CardDescription className="text-sm">
              Code examples for integrating with our Movies API
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
                    {allMoviesApiCategories.map((category) => (
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
                    <div className="flex items-center justify-between bg-[#2d2d30] px-4 py-2 border-b border-gray-700">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex gap-1.5 shrink-0">
                          <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                          <div className="w-3 h-3 rounded-full bg-[#27ca3f]"></div>
                        </div>
                        <span className="text-gray-300 text-sm ml-2 truncate">allmovies.js</span>
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
                      <pre className="p-4 copyable">
                        <code className="text-sm text-gray-300 font-mono whitespace-pre-wrap break-words copyable">
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
                    <div className="flex items-center justify-between bg-[#2d2d30] px-4 py-2 border-b border-gray-700">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex gap-1.5 shrink-0">
                          <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                          <div className="w-3 h-3 rounded-full bg-[#27ca3f]"></div>
                        </div>
                        <span className="text-gray-300 text-sm ml-2 truncate">allmovies.py</span>
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
                      <pre className="p-4 copyable">
                        <code className="text-sm text-gray-300 font-mono whitespace-pre-wrap break-words copyable">
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
                      <pre className="p-4 copyable">
                        <code className="text-sm text-gray-300 font-mono whitespace-pre-wrap break-words copyable">
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
            <CardDescription className="text-sm">Expected response structures for AllMoviesHub endpoints</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs defaultValue="movies" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="movies" className="text-xs sm:text-sm">Movies List</TabsTrigger>
                <TabsTrigger value="search" className="text-xs sm:text-sm">Search Results</TabsTrigger>
                <TabsTrigger value="download" className="text-xs sm:text-sm">Download Links</TabsTrigger>
                <TabsTrigger value="hbcloud" className="text-xs sm:text-sm">HBCloud</TabsTrigger>
              </TabsList>

              <TabsContent value="movies">
                <div className="relative w-full overflow-hidden">
                  <div className="bg-[#1e1e1e] rounded-lg overflow-hidden border border-gray-800">
                    <div className="flex items-center justify-between bg-[#2d2d30] px-4 py-2 border-b border-gray-700">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex gap-1.5 shrink-0">
                          <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                          <div className="w-3 h-3 rounded-full bg-[#27ca3f]"></div>
                        </div>
                        <span className="text-gray-300 text-sm ml-2 truncate">movies.json</span>
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
                    <div className="overflow-x-auto">
                      <pre className="p-4 text-xs sm:text-sm">
                        <code className="text-gray-300 font-mono whitespace-pre-wrap break-words">{`{
  "success": true,
  "count": 20,
  "posts": [
    {
      "id": "12345",
      "title": "Housefull 5 (2025) Hindi DD2.0 HQ HDTC Full Movie",
      "imageUrl": "https://allmovieshub.dev//wp-content/uploads/2025/01/housefull-5.jpg",
      "postUrl": "https://allmovieshub.dev//download-housefull-5a-2025-hindi-dd2-0-hq-hdtc-full-movie-480p-720p-1080p/",
      "releaseYear": "2025",
      "qualities": ["480p", "720p", "1080p"],
      "languages": ["Hindi"],
      "categories": ["Bollywood"],
      "genres": ["Comedy"],
      "isSeries": false,
      "isDualAudio": false,
      "format": "HDTC",
      "website": "AllMoviesHub"
    }
  ],
  "page": 1,
  "website": "AllMoviesHub"
}`}</code>
                      </pre>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="search">
                <div className="relative w-full overflow-hidden">
                  <div className="bg-[#1e1e1e] rounded-lg overflow-hidden border border-gray-800">
                    <div className="flex items-center justify-between bg-[#2d2d30] px-4 py-2 border-b border-gray-700">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex gap-1.5 shrink-0">
                          <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                          <div className="w-3 h-3 rounded-full bg-[#27ca3f]"></div>
                        </div>
                        <span className="text-gray-300 text-sm ml-2 truncate">search.json</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-gray-400 hover:text-white hover:bg-gray-700 h-6 px-2 shrink-0"
                        onClick={() => copyToClipboard(`{
  "success": true,
  "searchQuery": "housefull",
  "posts": [...]
}`)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="overflow-x-auto">
                      <pre className="p-4 text-xs sm:text-sm">
                        <code className="text-gray-300 font-mono whitespace-pre-wrap break-words">{`{
  "success": true,
  "count": 5,
  "posts": [
    {
      "id": "12345",
      "title": "Housefull 5 (2025) Hindi DD2.0 HQ HDTC Full Movie",
      "imageUrl": "https://allmovieshub.dev//wp-content/uploads/2025/01/housefull-5.jpg",
      "postUrl": "https://allmovieshub.dev//download-housefull-5a-2025-hindi-dd2-0-hq-hdtc-full-movie-480p-720p-1080p/",
      "releaseYear": "2025",
      "qualities": ["480p", "720p", "1080p"],
      "languages": ["Hindi"],
      "categories": ["Bollywood"],
      "genres": ["Comedy"],
      "isSeries": false,
      "isDualAudio": false,
      "format": "HDTC",
      "website": "AllMoviesHub"
    }
  ],
  "searchQuery": "housefull",
  "source": "search",
  "website": "AllMoviesHub"
}`}</code>
                      </pre>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="download">
                <div className="relative w-full overflow-hidden">
                  <div className="bg-[#1e1e1e] rounded-lg overflow-hidden border border-gray-800">
                    <div className="flex items-center justify-between bg-[#2d2d30] px-4 py-2 border-b border-gray-700">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex gap-1.5 shrink-0">
                          <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                          <div className="w-3 h-3 rounded-full bg-[#27ca3f]"></div>
                        </div>
                        <span className="text-gray-300 text-sm ml-2 truncate">download.json</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-gray-400 hover:text-white hover:bg-gray-700 h-6 px-2 shrink-0"
                        onClick={() => copyToClipboard(`{
  "success": true,
  "movieData": {...},
  "downloadLinks": [...]
}`)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="overflow-x-auto">
                      <pre className="p-4 text-xs sm:text-sm">
                        <code className="text-gray-300 font-mono whitespace-pre-wrap break-words">{`{
  "success": true,
  "movieData": {
    "movieName": "download-housefull-5a-2025-hindi-dd2-0-hq-hdtc-full-movie-480p-720p-1080p",
    "title": "Download Housefull 5 (2025) Hindi DD2.0 HQ HDTC Full Movie",
    "url": "https://allmovieshub.dev//download-housefull-5a-2025-hindi-dd2-0-hq-hdtc-full-movie-480p-720p-1080p/",
    "downloadLinks": [
      {
        "quality": "480p",
        "size": "410MB",
        "url": "https://bollydrive.blog/file/95350992",
        "text": "480p Links [410MB]",
        "fileDetails": {
          "success": true,
          "directLink": "https://example.com/direct-link.mp4",
          "fileName": "Housefull-5-480p.mp4"
        }
      },
      {
        "quality": "720p",
        "size": "1.4GB",
        "url": "https://bollydrive.blog/file/92445867",
        "text": "720p Links [1.4GB]",
        "fileDetails": {
          "success": true,
          "directLink": "https://example.com/direct-link-720p.mp4",
          "fileName": "Housefull-5-720p.mp4"
        }
      }
    ],
    "metadata": {
      "releaseYear": "2025",
      "languages": ["Hindi"],
      "format": "HDTC"
    }
  },
  "linksCount": 2,
  "availableQualities": ["480p", "720p"],
  "website": "AllMoviesHub"
}`}</code>
                      </pre>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="hbcloud">
                <div className="relative w-full overflow-hidden">
                  <div className="bg-[#1e1e1e] rounded-lg overflow-hidden border border-gray-800">
                    <div className="flex items-center justify-between bg-[#2d2d30] px-4 py-2 border-b border-gray-700">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="flex gap-1.5 shrink-0">
                          <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                          <div className="w-3 h-3 rounded-full bg-[#27ca3f]"></div>
                        </div>
                        <span className="text-gray-300 text-sm ml-2 truncate">hubcloud.json</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-gray-400 hover:text-white hover:bg-gray-700 h-6 px-2 shrink-0"
                        onClick={() => copyToClipboard(`{
  "success": true,
  "links": [...]
}`)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="overflow-x-auto">
                      <pre className="p-4 text-xs sm:text-sm">
                        <code className="text-gray-300 font-mono whitespace-pre-wrap break-words">{`{
  "success": true,
  "links": [
    {
      "quality": "1080p",
      "size": "2.5GB",
      "link": "https://direct-download-url.com/file.mp4",
      "originalLink": "https://gpdl.hubcdn.fans/...",
      "isDirect": true
    },
    {
      "quality": "720p",
      "size": "1.2GB",
      "link": "https://hubcloud.lol/file/...",
      "isDirect": false
    }
  ],
  "remainingRequests": 95
}`}</code>
                      </pre>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}