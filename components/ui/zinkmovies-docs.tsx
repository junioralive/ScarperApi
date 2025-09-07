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
import { Copy, Play, Code2, Search, Video, Download, Link, ExternalLink } from "lucide-react";
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

const apiCategories: ApiCategory[] = [
  {
    name: "Search Movies/TV",
    icon: <Search className="h-4 w-4" />,
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/zinkmovies",
        description: "Search for movies and TV shows or get homepage content",
        params: [
          { name: "search", type: "string", required: false, description: "Search query (movie/TV show title)" },
          { name: "page", type: "number", required: false, description: "Page number (default: 1)" }
        ]
      }
    ]
  },
  {
    name: "Movie/TV Details",
    icon: <Video className="h-4 w-4" />,
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/zinkmovies/details",
        description: "Get movie details including player URL and download links",
        params: [
          { name: "url", type: "string", required: true, description: "ZinkMovies movie/TV show URL (e.g., https://zinkmovies.hair/movies/avengers-endgame)" }
        ]
      }
    ]
  },
  {
    name: "JioStar Episodes",
    icon: <Download className="h-4 w-4" />,
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/zinkmovies/jio",
        description: "Extract episode download links from JioStar pages",
        params: [
          { name: "url", type: "string", required: true, description: "JioStar URL (e.g., https://jiostar.work/3499)" }
        ]
      }
    ]
  },
  {
    name: "Mirror Links",
    icon: <Link className="h-4 w-4" />,
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/zinkmovies/mirror",
        description: "Extract HubCloud mirror links from videosaver.me URLs",
        params: [
          { name: "url", type: "string", required: true, description: "Videosaver.me URL from ZinkMovies details page" }
        ]
      }
    ]
  }
];

interface ZinkMoviesDocsProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

export default function ZinkMoviesDocs({ apiKey, onApiKeyChange }: ZinkMoviesDocsProps) {
  const [selectedCategory, setSelectedCategory] = useState(apiCategories[0]);
  const [selectedEndpoint, setSelectedEndpoint] = useState(apiCategories[0].endpoints[0]);
  const [testParams, setTestParams] = useState<Record<string, string>>({});
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

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
    
    let url = selectedEndpoint.endpoint;
    const queryParams = params.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join("&");
    if (queryParams) {
      url += "?" + queryParams;
    }

    const baseUrl = "https://totu.me";

    switch (language) {
      case "javascript":
        if (selectedCategory.name === "Search Movies/TV") {
          return `// Search for movies/TV shows
const searchQuery = "avengers";
const response = await fetch("${baseUrl}/api/zinkmovies?search=" + encodeURIComponent(searchQuery), {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.data.items); // Array of movies/TV shows`;
        } else if (selectedCategory.name === "Movie/TV Details") {
          return `// Get movie/TV show details
const movieUrl = "https://zinkmovies.hair/movies/avengers-endgame";
const response = await fetch("${baseUrl}/api/zinkmovies/details?url=" + encodeURIComponent(movieUrl), {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.data.playerUrl); // Streaming URL
console.log(data.data.downloadLinks); // Download links
console.log(data.data.jioStarLinks); // JioStar episode links`;
        } else if (selectedCategory.name === "JioStar Episodes") {
          return `// Extract episodes from JioStar pages
const jioStarUrl = "https://jiostar.work/3499";
const response = await fetch("${baseUrl}/api/zinkmovies/jio?url=" + encodeURIComponent(jioStarUrl), {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.data.episodes); // Array of episode download links
console.log(data.data.totalEpisodes); // Total number of episodes`;
        } else {
          return `// Extract HubCloud mirror links
const videoSaverUrl = "https://videosaver.me/file/db6d60224badcdbc";
const response = await fetch("${baseUrl}/api/zinkmovies/mirror?url=" + encodeURIComponent(videoSaverUrl), {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.data.hubCloudUrl); // HubCloud direct link`;
        }

      case "python":
        if (selectedCategory.name === "Search Movies/TV") {
          return `# Search for movies/TV shows
import requests
from urllib.parse import quote

search_query = "avengers"
url = f"${baseUrl}/api/zinkmovies?search={quote(search_query)}"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data["data"]["items"])  # Array of movies/TV shows`;
        } else if (selectedCategory.name === "Movie/TV Details") {
          return `# Get movie/TV show details
import requests
from urllib.parse import quote

movie_url = "https://zinkmovies.hair/movies/avengers-endgame"
url = f"${baseUrl}/api/zinkmovies/details?url={quote(movie_url)}"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data["data"]["playerUrl"])  # Streaming URL
print(data["data"]["downloadLinks"])  # Download links
print(data["data"]["jioStarLinks"])  # JioStar episode links`;
        } else if (selectedCategory.name === "JioStar Episodes") {
          return `# Extract episodes from JioStar pages
import requests
from urllib.parse import quote

jiostar_url = "https://jiostar.work/3499"
url = f"${baseUrl}/api/zinkmovies/jio?url={quote(jiostar_url)}"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data["data"]["episodes"])  # Array of episode download links
print(data["data"]["totalEpisodes"])  # Total number of episodes`;
        } else {
          return `# Extract HubCloud mirror links
import requests
from urllib.parse import quote

videosaver_url = "https://videosaver.me/file/db6d60224badcdbc"
url = f"${baseUrl}/api/zinkmovies/mirror?url={quote(videosaver_url)}"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data["data"]["hubCloudUrl"])  # HubCloud direct link`;
        }

      case "curl":
        if (selectedCategory.name === "Search Movies/TV") {
          return `# Search for movies/TV shows
curl -X GET \\
  "${baseUrl}/api/zinkmovies?search=avengers" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        } else if (selectedCategory.name === "Movie/TV Details") {
          return `# Get movie/TV show details
curl -X GET \\
  "${baseUrl}/api/zinkmovies/details?url=https%3A%2F%2Fzinkmovies.autos%2Fmovies%2Favengers-endgame" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        } else if (selectedCategory.name === "JioStar Episodes") {
          return `# Extract episodes from JioStar pages
curl -X GET \\
  "${baseUrl}/api/zinkmovies/jio?url=https%3A%2F%2Fjiostar.work%2F3499" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        } else {
          return `# Extract HubCloud mirror links
curl -X GET \\
  "${baseUrl}/api/zinkmovies/mirror?url=https%3A%2F%2Fvideosaver.me%2Ffile%2Fdb6d60224badcdbc" \\
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
          <h1 className="text-2xl sm:text-3xl font-bold truncate">ZinkMovies API Documentation</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Test and explore our ZinkMovies API endpoints
          </p>
        </div>
      </div>

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
                Enter your API key to test the ZinkMovies endpoints.
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
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(apiKey)} className="shrink-0">
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
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="default" className="text-xs">
                        {selectedEndpoint.method}
                      </Badge>
                      <code className="text-xs">{selectedEndpoint.endpoint}</code>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground break-words">{selectedEndpoint.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl">Parameters</CardTitle>
                <CardDescription className="text-sm">
                  Configure parameters for the endpoint
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
              <Textarea
                placeholder="API response will appear here..."
                value={response}
                readOnly
                className="min-h-[200px] sm:min-h-[300px] font-mono text-xs sm:text-sm w-full resize-none"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="pb-4 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl">API Usage Examples</CardTitle>
              <CardDescription className="text-sm">
                Code examples for integrating with our ZinkMovies API
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
                      <span className="text-gray-300 text-sm">example.js</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-gray-400 hover:text-white hover:bg-gray-700 h-6 px-2"
                        onClick={() => copyToClipboard(generateCodeExample("javascript"))}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <pre className="p-4 overflow-x-auto">
                      <code className="text-sm text-gray-300 font-mono">
                        {generateCodeExample("javascript")}
                      </code>
                    </pre>
                  </div>
                </TabsContent>

                <TabsContent value="python">
                  <div className="bg-[#1e1e1e] rounded-lg overflow-hidden border border-gray-800">
                    <div className="flex items-center justify-between bg-[#2d2d30] px-4 py-2 border-b border-gray-700">
                      <span className="text-gray-300 text-sm">example.py</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-gray-400 hover:text-white hover:bg-gray-700 h-6 px-2"
                        onClick={() => copyToClipboard(generateCodeExample("python"))}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <pre className="p-4 overflow-x-auto">
                      <code className="text-sm text-gray-300 font-mono">
                        {generateCodeExample("python")}
                      </code>
                    </pre>
                  </div>
                </TabsContent>

                <TabsContent value="curl">
                  <div className="bg-[#1e1e1e] rounded-lg overflow-hidden border border-gray-800">
                    <div className="flex items-center justify-between bg-[#2d2d30] px-4 py-2 border-b border-gray-700">
                      <span className="text-gray-300 text-sm">example.sh</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-gray-400 hover:text-white hover:bg-gray-700 h-6 px-2"
                        onClick={() => copyToClipboard(generateCodeExample("curl"))}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <pre className="p-4 overflow-x-auto">
                      <code className="text-sm text-gray-300 font-mono">
                        {generateCodeExample("curl")}
                      </code>
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl">API Workflow</CardTitle>
              <CardDescription className="text-sm">Step-by-step process to get streaming links</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg">
                <h4 className="font-semibold mb-3 text-sm flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-blue-500" />
                  Complete Workflow
                </h4>
                <div className="space-y-3 text-xs sm:text-sm">
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="text-xs shrink-0">1</Badge>
                    <div>
                      <strong>Search:</strong> Use <code>/api/zinkmovies?search=avengers</code> to find movies/TV shows
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="text-xs shrink-0">2</Badge>
                    <div>
                      <strong>Details:</strong> Use <code>/api/zinkmovies/details?url=postUrl</code> to get player URL and JioStar links
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="text-xs shrink-0">3</Badge>
                    <div>
                      <strong>Episodes:</strong> Use <code>/api/zinkmovies/jio?url=jioStarUrl</code> to extract episode download links
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="text-xs shrink-0">4</Badge>
                    <div>
                      <strong>Mirrors:</strong> Use <code>/api/zinkmovies/mirror?url=videoSaverUrl</code> to extract HubCloud links
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <h4 className="font-semibold mb-2 text-sm">Response Examples</h4>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>• Search returns movie titles, images, and detail page URLs</li>
                    <li>• Details returns player URL, download links, and JioStar episode links</li>
                    <li>• JioStar endpoint returns structured episode data with sizes</li>
                    <li>• Mirror endpoint returns HubCloud direct download links</li>
                  </ul>
                </div>
                
                <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                  <h4 className="font-semibold mb-2 text-sm">Content Support</h4>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>• Movies and TV shows in multiple languages</li>
                    <li>• Episode-wise download links for TV series</li>
                    <li>• Multiple quality options (480p, 720p, 1080p)</li>
                    <li>• Direct streaming links and downloadable content</li>
                    <li>• Multi-language audio support</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
