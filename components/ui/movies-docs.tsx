"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Play, Key, Code2, ExternalLink, Home, Search, Film, Video } from "lucide-react";
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

const moviesApiCategories: ApiCategory[] = [
  {
    name: "Get All Movies",
    icon: <Home className="h-4 w-4" />,
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/moviesdrive",
        description: "Get all movies with pagination",
        params: [
          { name: "page", type: "number", required: false, description: "Page number (default: 1)" }
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
        endpoint: "/api/moviesdrive",
        description: "Search movies by title using the search parameter",
        params: [
          { name: "search", type: "string", required: true, description: "Search query (movie title)" }
        ]
      }
    ]
  },
  {
    name: "Movie Details",
    icon: <Film className="h-4 w-4" />,
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/moviesdrive/episode",
        description: "Get movie details and download links",
        params: [
          { name: "url", type: "string", required: true, description: "Movie URL from posts response (e.g., https://moviesdrive.rodeo//movie-title/)" }
        ]
      }
    ]
  },
  {
    name: "MDrive Extractor",
    icon: <Video className="h-4 w-4" />,
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/mdrive",
        description: "Extract HubCloud links from mdrive.today URLs",
        params: [
          { name: "url", type: "string", required: true, description: "MDrive URL (e.g., https://mdrive.today/movie-name/)" }
        ]
      }
    ]
  },
  {
    name: "HubCloud Extractor",
    icon: <ExternalLink className="h-4 w-4" />,
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/hubcloud",
        description: "Extract direct download links from HubCloud URLs",
        params: [
          { name: "url", type: "string", required: true, description: "HubCloud URL (e.g., https://hubcloud.lol/file/...)" }
        ]
      }
    ]
  }
];

interface MoviesDocsProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

export default function MoviesDocs({ apiKey, onApiKeyChange }: MoviesDocsProps) {
  const [selectedCategory, setSelectedCategory] = useState(moviesApiCategories[0]);
  const [selectedEndpoint, setSelectedEndpoint] = useState(moviesApiCategories[0].endpoints[0]);
  const [testParams, setTestParams] = useState<Record<string, string>>({});
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handleCategoryChange = (categoryName: string) => {
    const category = moviesApiCategories.find(cat => cat.name === categoryName);
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
      
      // Add query parameters
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
    const baseUrl = "https://totu.me";

    // Generate realistic examples based on the selected category
    switch (language) {
      case "javascript":
        if (selectedCategory.name === "Get All Movies") {
          return (
            <>
              <span className="text-[#6A9955]">// Get all movies</span>{'\n'}
              <span className="text-[#569CD6]">const</span> <span className="text-[#9CDCFE]">response</span> <span className="text-[#D4D4D4]">=</span> <span className="text-[#569CD6]">await</span> <span className="text-[#DCDCAA]">fetch</span><span className="text-[#D4D4D4]">(</span><span className="text-[#CE9178]">"{baseUrl}/api/moviesdrive"</span><span className="text-[#D4D4D4]">, {`{`}</span>{'\n'}
              <span className="text-[#D4D4D4]">  headers: {`{`}</span>{'\n'}
              <span className="text-[#D4D4D4]">    </span><span className="text-[#CE9178]">"x-api-key"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#CE9178]">"YOUR_API_KEY"</span><span className="text-[#D4D4D4]">,</span>{'\n'}
              <span className="text-[#D4D4D4]">    </span><span className="text-[#CE9178]">"Content-Type"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#CE9178]">"application/json"</span>{'\n'}
              <span className="text-[#D4D4D4]">  {`}`}</span>{'\n'}
              <span className="text-[#D4D4D4]">{`}`});</span>{'\n\n'}
              <span className="text-[#569CD6]">const</span> <span className="text-[#9CDCFE]">data</span> <span className="text-[#D4D4D4]">=</span> <span className="text-[#569CD6]">await</span> <span className="text-[#9CDCFE]">response</span><span className="text-[#D4D4D4]">.</span><span className="text-[#DCDCAA]">json</span><span className="text-[#D4D4D4]">();</span>{'\n'}
              <span className="text-[#9CDCFE]">console</span><span className="text-[#D4D4D4]">.</span><span className="text-[#DCDCAA]">log</span><span className="text-[#D4D4D4]">(</span><span className="text-[#9CDCFE]">data</span><span className="text-[#D4D4D4]">.</span><span className="text-[#9CDCFE]">posts</span><span className="text-[#D4D4D4]">);</span> <span className="text-[#6A9955]">// Array of movies</span>
            </>
          );
        } else if (selectedCategory.name === "Search Movies") {
          return (
            <>
              <span className="text-[#6A9955]">// Search for movies</span>{'\n'}
              <span className="text-[#569CD6]">const</span> <span className="text-[#9CDCFE]">searchQuery</span> <span className="text-[#D4D4D4]">=</span> <span className="text-[#CE9178]">"avengers"</span><span className="text-[#D4D4D4]">;</span>{'\n'}
              <span className="text-[#569CD6]">const</span> <span className="text-[#9CDCFE]">response</span> <span className="text-[#D4D4D4]">=</span> <span className="text-[#569CD6]">await</span> <span className="text-[#DCDCAA]">fetch</span><span className="text-[#D4D4D4]">(</span><span className="text-[#CE9178]">"{baseUrl}/api/moviesdrive?search="</span> <span className="text-[#D4D4D4]">+</span> <span className="text-[#DCDCAA]">encodeURIComponent</span><span className="text-[#D4D4D4]">(</span><span className="text-[#9CDCFE]">searchQuery</span><span className="text-[#D4D4D4]">), {`{`}</span>{'\n'}
              <span className="text-[#D4D4D4]">  headers: {`{`}</span>{'\n'}
              <span className="text-[#D4D4D4]">    </span><span className="text-[#CE9178]">"x-api-key"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#CE9178]">"YOUR_API_KEY"</span><span className="text-[#D4D4D4]">,</span>{'\n'}
              <span className="text-[#D4D4D4]">    </span><span className="text-[#CE9178]">"Content-Type"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#CE9178]">"application/json"</span>{'\n'}
              <span className="text-[#D4D4D4]">  {`}`}</span>{'\n'}
              <span className="text-[#D4D4D4]">{`}`});</span>{'\n\n'}
              <span className="text-[#569CD6]">const</span> <span className="text-[#9CDCFE]">data</span> <span className="text-[#D4D4D4]">=</span> <span className="text-[#569CD6]">await</span> <span className="text-[#9CDCFE]">response</span><span className="text-[#D4D4D4]">.</span><span className="text-[#DCDCAA]">json</span><span className="text-[#D4D4D4]">();</span>{'\n'}
              <span className="text-[#9CDCFE]">console</span><span className="text-[#D4D4D4]">.</span><span className="text-[#DCDCAA]">log</span><span className="text-[#D4D4D4]">(</span><span className="text-[#9CDCFE]">data</span><span className="text-[#D4D4D4]">.</span><span className="text-[#9CDCFE]">posts</span><span className="text-[#D4D4D4]">);</span> <span className="text-[#6A9955]">// Search results</span>
            </>
          );
        } else if (selectedCategory.name === "Movie Details") {
          return (
            <>
              <span className="text-[#6A9955]">// Get movie details and download links</span>{'\n'}
              <span className="text-[#569CD6]">const</span> <span className="text-[#9CDCFE]">movieUrl</span> <span className="text-[#D4D4D4]">=</span> <span className="text-[#CE9178]">"https://moviesdrive.rodeo//avengers-endgame/"</span><span className="text-[#D4D4D4]">;</span>{'\n'}
              <span className="text-[#569CD6]">const</span> <span className="text-[#9CDCFE]">response</span> <span className="text-[#D4D4D4]">=</span> <span className="text-[#569CD6]">await</span> <span className="text-[#DCDCAA]">fetch</span><span className="text-[#D4D4D4]">(</span><span className="text-[#CE9178]">"{baseUrl}/api/moviesdrive/episode?url="</span> <span className="text-[#D4D4D4]">+</span> <span className="text-[#DCDCAA]">encodeURIComponent</span><span className="text-[#D4D4D4]">(</span><span className="text-[#9CDCFE]">movieUrl</span><span className="text-[#D4D4D4]">), {`{`}</span>{'\n'}
              <span className="text-[#D4D4D4]">  headers: {`{`}</span>{'\n'}
              <span className="text-[#D4D4D4]">    </span><span className="text-[#CE9178]">"x-api-key"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#CE9178]">"YOUR_API_KEY"</span><span className="text-[#D4D4D4]">,</span>{'\n'}
              <span className="text-[#D4D4D4]">    </span><span className="text-[#CE9178]">"Content-Type"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#CE9178]">"application/json"</span>{'\n'}
              <span className="text-[#D4D4D4]">  {`}`}</span>{'\n'}
              <span className="text-[#D4D4D4]">{`}`});</span>{'\n\n'}
              <span className="text-[#569CD6]">const</span> <span className="text-[#9CDCFE]">data</span> <span className="text-[#D4D4D4]">=</span> <span className="text-[#569CD6]">await</span> <span className="text-[#9CDCFE]">response</span><span className="text-[#D4D4D4]">.</span><span className="text-[#DCDCAA]">json</span><span className="text-[#D4D4D4]">();</span>{'\n'}
              <span className="text-[#9CDCFE]">console</span><span className="text-[#D4D4D4]">.</span><span className="text-[#DCDCAA]">log</span><span className="text-[#D4D4D4]">(</span><span className="text-[#9CDCFE]">data</span><span className="text-[#D4D4D4]">.</span><span className="text-[#9CDCFE]">data</span><span className="text-[#D4D4D4]">);</span> <span className="text-[#6A9955]">// Movie details & episodes</span>
            </>
          );
        } else if (selectedCategory.name === "MDrive Extractor") {
          return (
            <>
              <span className="text-[#6A9955]">// Extract HubCloud links from mdrive.today</span>{'\n'}
              <span className="text-[#569CD6]">const</span> <span className="text-[#9CDCFE]">mdriveUrl</span> <span className="text-[#D4D4D4]">=</span> <span className="text-[#CE9178]">"https://mdrive.today/avengers-endgame/"</span><span className="text-[#D4D4D4]">;</span>{'\n'}
              <span className="text-[#569CD6]">const</span> <span className="text-[#9CDCFE]">response</span> <span className="text-[#D4D4D4]">=</span> <span className="text-[#569CD6]">await</span> <span className="text-[#DCDCAA]">fetch</span><span className="text-[#D4D4D4]">(</span><span className="text-[#CE9178]">"{baseUrl}/api/mdrive?url="</span> <span className="text-[#D4D4D4]">+</span> <span className="text-[#DCDCAA]">encodeURIComponent</span><span className="text-[#D4D4D4]">(</span><span className="text-[#9CDCFE]">mdriveUrl</span><span className="text-[#D4D4D4]">), {`{`}</span>{'\n'}
              <span className="text-[#D4D4D4]">  headers: {`{`}</span>{'\n'}
              <span className="text-[#D4D4D4]">    </span><span className="text-[#CE9178]">"x-api-key"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#CE9178]">"YOUR_API_KEY"</span><span className="text-[#D4D4D4]">,</span>{'\n'}
              <span className="text-[#D4D4D4]">    </span><span className="text-[#CE9178]">"Content-Type"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#CE9178]">"application/json"</span>{'\n'}
              <span className="text-[#D4D4D4]">  {`}`}</span>{'\n'}
              <span className="text-[#D4D4D4]">{`}`});</span>{'\n\n'}
              <span className="text-[#569CD6]">const</span> <span className="text-[#9CDCFE]">data</span> <span className="text-[#D4D4D4]">=</span> <span className="text-[#569CD6]">await</span> <span className="text-[#9CDCFE]">response</span><span className="text-[#D4D4D4]">.</span><span className="text-[#DCDCAA]">json</span><span className="text-[#D4D4D4]">();</span>{'\n'}
              <span className="text-[#9CDCFE]">console</span><span className="text-[#D4D4D4]">.</span><span className="text-[#DCDCAA]">log</span><span className="text-[#D4D4D4]">(</span><span className="text-[#9CDCFE]">data</span><span className="text-[#D4D4D4]">.</span><span className="text-[#9CDCFE]">episodes</span><span className="text-[#D4D4D4]">);</span> <span className="text-[#6A9955]">// Episodes with HubCloud links</span>{'\n'}
              <span className="text-[#9CDCFE]">console</span><span className="text-[#D4D4D4]">.</span><span className="text-[#DCDCAA]">log</span><span className="text-[#D4D4D4]">(</span><span className="text-[#9CDCFE]">data</span><span className="text-[#D4D4D4]">.</span><span className="text-[#9CDCFE]">directLinks</span><span className="text-[#D4D4D4]">);</span> <span className="text-[#6A9955]">// Direct HubCloud links</span>
            </>
          );
        } else if (selectedCategory.name === "HubCloud Extractor") {
          return `// Extract direct download links from HubCloud
const hubcloudUrl = "https://hubcloud.lol/file/1234567890";
const response = await fetch("${baseUrl}/api/hubcloud?url=" + encodeURIComponent(hubcloudUrl), {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.links); // Direct download links`;
        }

      case "python":
        if (selectedCategory.name === "Get All Movies") {
          return `# Get all movies
import requests

url = "${baseUrl}/api/moviesdrive"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data["posts"])  # Array of movies`;
        } else if (selectedCategory.name === "Search Movies") {
          return `# Search for movies
import requests

search_query = "avengers"
url = "${baseUrl}/api/moviesdrive"
params = {"search": search_query}
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, params=params, headers=headers)
data = response.json()
print(data["posts"])  # Search results`;
        } else if (selectedCategory.name === "Movie Details") {
          return `# Get movie details and download links
import requests
from urllib.parse import quote

movie_url = "https://moviesdrive.rodeo//avengers-endgame/"
url = f"${baseUrl}/api/moviesdrive/episode?url={quote(movie_url)}"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data["data"])  # Movie details & episodes`;
        } else if (selectedCategory.name === "MDrive Extractor") {
          return `# Extract HubCloud links from mdrive.today
import requests
from urllib.parse import quote

mdrive_url = "https://mdrive.today/avengers-endgame/"
url = f"${baseUrl}/api/mdrive?url={quote(mdrive_url)}"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data["episodes"])  # Episodes with HubCloud links
print(data["directLinks"])  # Direct HubCloud links`;
        } else if (selectedCategory.name === "HubCloud Extractor") {
          return `# Extract direct download links from HubCloud
import requests
from urllib.parse import quote

hubcloud_url = "https://hubcloud.lol/file/1234567890"
url = f"${baseUrl}/api/hubcloud?url={quote(hubcloud_url)}"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data["links"])  # Direct download links`;
        }

      case "curl":
        if (selectedCategory.name === "Get All Movies") {
          return `# Get all movies
curl -X GET \\
  "${baseUrl}/api/moviesdrive" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        } else if (selectedCategory.name === "Search Movies") {
          return `# Search for movies
curl -X GET \\
  "${baseUrl}/api/moviesdrive?search=avengers" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        } else if (selectedCategory.name === "Movie Details") {
          return `# Get movie details and download links
curl -X GET \\
  "${baseUrl}/api/moviesdrive/episode?url=https%3A//moviesdrive.design/avengers-endgame/" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        } else if (selectedCategory.name === "MDrive Extractor") {
          return `# Extract HubCloud links from mdrive.today
curl -X GET \\
  "${baseUrl}/api/mdrive?url=https%3A//mdrive.today/avengers-endgame/" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        } else if (selectedCategory.name === "HubCloud Extractor") {
          return `# Extract direct download links from HubCloud
curl -X GET \\
  "${baseUrl}/api/hubcloud?url=https%3A//hubcloud.lol/file/1234567890" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        }

      default:
        return "";
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden">
      <Tabs defaultValue="test" className="space-y-4 sm:space-y-6 w-full">
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

        <TabsContent value="test" className="space-y-4 sm:space-y-6 w-full overflow-hidden">
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
                  onChange={(e) => onApiKeyChange(e.target.value)}
                  className="flex-1 text-sm"
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
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {moviesApiCategories.map((category) => (
                        <SelectItem key={category.name} value={category.name} className="text-sm">
                          <div className="flex items-center gap-2">
                            {category.icon}
                            {category.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Endpoint</Label>
                  <Select value={selectedEndpoint.endpoint} onValueChange={handleEndpointChange}>
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedCategory.endpoints.map((endpoint) => (
                        <SelectItem key={endpoint.endpoint} value={endpoint.endpoint} className="text-sm">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={endpoint.method === "GET" ? "default" : "secondary"} className="text-xs">
                                {endpoint.method}
                              </Badge>
                              <code className="text-xs break-all">{endpoint.endpoint}</code>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs sm:text-sm text-muted-foreground">{selectedEndpoint.description}</p>
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
                        {param.name}
                        <Badge variant={param.required ? "destructive" : "secondary"} className="text-xs">
                          {param.required ? "Required" : "Optional"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">({param.type})</span>
                      </Label>
                      <Input
                        id={param.name}
                        placeholder={param.description}
                        value={testParams[param.name] || ""}
                        onChange={(e) => setTestParams({ ...testParams, [param.name]: e.target.value })}
                        className="text-sm"
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
                  className="min-h-[200px] sm:min-h-[300px] font-mono text-xs sm:text-sm w-full resize-none overflow-x-auto"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs" className="space-y-4 sm:space-y-6 w-full overflow-hidden">
          <Card>
            <CardHeader className="pb-4 sm:pb-6">
              <CardTitle className="text-lg sm:text-xl">Movies API Usage Examples</CardTitle>
              <CardDescription className="text-sm">
                Code examples for integrating with our Movies API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Category</Label>
                  <Select value={selectedCategory.name} onValueChange={handleCategoryChange}>
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {moviesApiCategories.map((category) => (
                        <SelectItem key={category.name} value={category.name} className="text-sm">
                          <div className="flex items-center gap-2">
                            {category.icon}
                            {category.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Endpoint</Label>
                  <Select value={selectedEndpoint.endpoint} onValueChange={handleEndpointChange}>
                    <SelectTrigger className="text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedCategory.endpoints.map((endpoint) => (
                        <SelectItem key={endpoint.endpoint} value={endpoint.endpoint} className="text-sm">
                          <div className="flex items-center gap-2">
                            <Badge variant={endpoint.method === "GET" ? "default" : "secondary"} className="text-xs">
                              {endpoint.method}
                            </Badge>
                            <code className="text-xs break-all">{endpoint.endpoint}</code>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Tabs defaultValue="javascript" className="space-y-4 w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="javascript" className="text-xs sm:text-sm">JavaScript</TabsTrigger>
                  <TabsTrigger value="python" className="text-xs sm:text-sm">Python</TabsTrigger>
                  <TabsTrigger value="curl" className="text-xs sm:text-sm">cURL</TabsTrigger>
                </TabsList>

                <TabsContent value="javascript">
                  <div className="relative w-full overflow-hidden">
                    <div className="bg-[#1e1e1e] rounded-lg overflow-hidden border border-gray-800 w-full">
                      <div className="flex items-center justify-between bg-[#2d2d30] px-4 py-2 border-b border-gray-700">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="flex gap-1.5 shrink-0">
                            <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                            <div className="w-3 h-3 rounded-full bg-[#27ca3f]"></div>
                          </div>
                          <span className="text-gray-300 text-sm ml-2 truncate">movies.js</span>
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
                      <div className="w-full overflow-x-auto">
                        <pre className="p-4 w-full min-w-0">
                          <code className="text-sm text-gray-300 font-mono whitespace-pre break-words">
                            {generateCodeExample("javascript")}
                          </code>
                        </pre>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="python">
                  <div className="relative w-full overflow-hidden">
                    <div className="bg-[#1e1e1e] rounded-lg overflow-hidden border border-gray-800 w-full">
                      <div className="flex items-center justify-between bg-[#2d2d30] px-4 py-2 border-b border-gray-700">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="flex gap-1.5 shrink-0">
                            <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                            <div className="w-3 h-3 rounded-full bg-[#27ca3f]"></div>
                          </div>
                          <span className="text-gray-300 text-sm ml-2 truncate">movies.py</span>
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
                      <div className="w-full overflow-x-auto">
                        <pre className="p-4 w-full min-w-0">
                          <code className="text-sm text-gray-300 font-mono whitespace-pre break-words">
                            {generateCodeExample("python")}
                          </code>
                        </pre>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="curl">
                  <div className="relative w-full overflow-hidden">
                    <div className="bg-[#1e1e1e] rounded-lg overflow-hidden border border-gray-800 w-full">
                      <div className="flex items-center justify-between bg-[#2d2d30] px-4 py-2 border-b border-gray-700">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
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
                      <div className="w-full overflow-x-auto">
                        <pre className="p-4 w-full min-w-0">
                          <code className="text-sm text-gray-300 font-mono whitespace-pre break-words">
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
            <CardContent className="space-y-4 w-full overflow-hidden">
              <Tabs defaultValue="movies" className="space-y-4 w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="movies" className="text-xs sm:text-sm">Movies List</TabsTrigger>
                  <TabsTrigger value="details" className="text-xs sm:text-sm">Movie Details</TabsTrigger>
                  <TabsTrigger value="mdrive" className="text-xs sm:text-sm">MDrive</TabsTrigger>
                  <TabsTrigger value="hubcloud" className="text-xs sm:text-sm">HubCloud</TabsTrigger>
                </TabsList>

                <TabsContent value="movies">
                  <div className="relative w-full overflow-hidden">
                    <div className="bg-[#1e1e1e] rounded-lg overflow-hidden border border-gray-800 w-full">
                      <div className="flex items-center justify-between bg-[#2d2d30] px-4 py-2 border-b border-gray-700">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
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
                      
                      <div className="w-full overflow-x-auto">
                        <pre className="p-4 text-xs sm:text-sm w-full min-w-0">
                          <code className="font-mono leading-relaxed break-words">
                            <span className="text-[#D4D4D4]">{`{`}</span>{'\n'}
                            <span className="text-[#D4D4D4]">  </span><span className="text-[#9CDCFE]">"success"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#569CD6]">true</span><span className="text-[#D4D4D4]">,</span>{'\n'}
                            <span className="text-[#D4D4D4]">  </span><span className="text-[#9CDCFE]">"count"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#B5CEA8]">20</span><span className="text-[#D4D4D4]">,</span>{'\n'}
                            <span className="text-[#D4D4D4]">  </span><span className="text-[#9CDCFE]">"posts"</span><span className="text-[#D4D4D4]">: [</span>{'\n'}
                            <span className="text-[#D4D4D4]">    {`{`}</span>{'\n'}
                            <span className="text-[#D4D4D4]">      </span><span className="text-[#9CDCFE]">"imageUrl"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#CE9178]">"https://moviesdrive.rodeo//poster.jpg"</span><span className="text-[#D4D4D4]">,</span>{'\n'}
                            <span className="text-[#D4D4D4]">      </span><span className="text-[#9CDCFE]">"title"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#CE9178]">"Avengers: Endgame (2019)"</span><span className="text-[#D4D4D4]">,</span>{'\n'}
                            <span className="text-[#D4D4D4]">      </span><span className="text-[#9CDCFE]">"postUrl"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#CE9178]">"https://moviesdrive.rodeo//avengers-endgame/"</span>{'\n'}
                            <span className="text-[#D4D4D4]">    {`}`}</span>{'\n'}
                            <span className="text-[#D4D4D4]">  ],</span>{'\n'}
                            <span className="text-[#D4D4D4]">  </span><span className="text-[#9CDCFE]">"page"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#B5CEA8]">1</span><span className="text-[#D4D4D4]">,</span>{'\n'}
                            <span className="text-[#D4D4D4]">  </span><span className="text-[#9CDCFE]">"source"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#CE9178]">"page"</span>{'\n'}
                            <span className="text-[#D4D4D4]">{`}`}</span>
                          </code>
                        </pre>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="details">
                  <div className="relative w-full overflow-hidden">
                    <div className="bg-[#1e1e1e] rounded-lg overflow-hidden border border-gray-800 w-full">
                      <div className="flex items-center justify-between bg-[#2d2d30] px-4 py-2 border-b border-gray-700">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="flex gap-1.5 shrink-0">
                            <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                            <div className="w-3 h-3 rounded-full bg-[#27ca3f]"></div>
                          </div>
                          <span className="text-gray-300 text-sm ml-2 truncate">movie-details.json</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-gray-400 hover:text-white hover:bg-gray-700 h-6 px-2 shrink-0"
                          onClick={() => copyToClipboard(`{
  "success": true,
  "data": {...}
}`)}
                        >
                            
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      </div>
                      <div className="w-full overflow-x-auto">
                        <pre className="p-4 text-xs sm:text-sm w-full min-w-0">
                          <code className="font-mono leading-relaxed break-words">
                            <span className="text-[#D4D4D4]">{`{`}</span>{'\n'}
                            <span className="text-[#D4D4D4]">  </span><span className="text-[#9CDCFE]">"success"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#569CD6]">true</span><span className="text-[#D4D4D4]">,</span>{'\n'}
                            <span className="text-[#D4D4D4]">  </span><span className="text-[#9CDCFE]">"data"</span><span className="text-[#D4D4D4]">: {`{`}</span>{'\n'}
                            <span className="text-[#D4D4D4]">    </span><span className="text-[#9CDCFE]">"mainImage"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#CE9178]">"https://moviesdrive.rodeo//poster.jpg"</span><span className="text-[#D4D4D4]">,</span>{'\n'}
                            <span className="text-[#D4D4D4]">    </span><span className="text-[#9CDCFE]">"imdbRating"</span><span className="text-[#D4D4D4]">: {`{`}</span>{'\n'}
                            <span className="text-[#D4D4D4]">      </span><span className="text-[#9CDCFE]">"url"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#CE9178]">"https://imdb.com/title/tt4154796/"</span><span className="text-[#D4D4D4]">,</span>{'\n'}
                            <span className="text-[#D4D4D4]">      </span><span className="text-[#9CDCFE]">"text"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#CE9178]">"8.4/10"</span>{'\n'}
                            <span className="text-[#D4D4D4]">    {`}`},</span>{'\n'}
                            <span className="text-[#D4D4D4]">    </span><span className="text-[#9CDCFE]">"storyline"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#CE9178]">"The grave course of events..."</span><span className="text-[#D4D4D4]">,</span>{'\n'}
                            <span className="text-[#D4D4D4]">    </span><span className="text-[#9CDCFE]">"episodes"</span><span className="text-[#D4D4D4]">: [</span>{'\n'}
                            <span className="text-[#D4D4D4]">      {`{`}</span>{'\n'}
                            <span className="text-[#D4D4D4]">        </span><span className="text-[#9CDCFE]">"url"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#CE9178]">"https://mdrive.today/download/..."</span><span className="text-[#D4D4D4]">,</span>{'\n'}
                            <span className="text-[#D4D4D4]">        </span><span className="text-[#9CDCFE]">"quality"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#CE9178]">"1080p"</span><span className="text-[#D4D4D4]">,</span>{'\n'}
                            <span className="text-[#D4D4D4]">        </span><span className="text-[#9CDCFE]">"season"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#B5CEA8]">1</span>{'\n'}
                            <span className="text-[#D4D4D4]">      {`}`}</span>{'\n'}
                            <span className="text-[#D4D4D4]">    ]</span>{'\n'}
                            <span className="text-[#D4D4D4]">  {`}`}</span>{'\n'}
                            <span className="text-[#D4D4D4]">{`}`}</span>
                        </code>
                      </pre>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="mdrive">
                  <div className="relative w-full overflow-hidden">
                    <div className="bg-[#1e1e1e] rounded-lg overflow-hidden border border-gray-800 w-full">
                      <div className="flex items-center justify-between bg-[#2d2d30] px-4 py-2 border-b border-gray-700">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="flex gap-1.5 shrink-0">
                            <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                            <div className="w-3 h-3 rounded-full bg-[#27ca3f]"></div>
                          </div>
                          <span className="text-gray-300 text-sm ml-2 truncate">mdrive-response.json</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-gray-400 hover:text-white hover:bg-gray-700 h-6 px-2 shrink-0"
                          onClick={() => copyToClipboard(`{
  "success": true,
  "episodes": [...],
  "directLinks": [...]
}`)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                      <div className="w-full overflow-x-auto">
                        <pre className="p-4 text-xs sm:text-sm w-full min-w-0">
                          <code className="font-mono leading-relaxed break-words">
                            <span className="text-[#D4D4D4]">{`{`}</span>{'\n'}
                            <span className="text-[#D4D4D4]">  </span><span className="text-[#9CDCFE]">"success"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#569CD6]">true</span><span className="text-[#D4D4D4]">,</span>{'\n'}
                            <span className="text-[#D4D4D4]">  </span><span className="text-[#9CDCFE]">"episodes"</span><span className="text-[#D4D4D4]">: [</span>{'\n'}
                            <span className="text-[#D4D4D4]">    {`{`}</span>{'\n'}
                            <span className="text-[#D4D4D4]">      </span><span className="text-[#9CDCFE]">"episodeNumber"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#CE9178]">"01"</span><span className="text-[#D4D4D4]">,</span>{'\n'}
                            <span className="text-[#D4D4D4]">      </span><span className="text-[#9CDCFE]">"quality"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#CE9178]">"1080p"</span><span className="text-[#D4D4D4]">,</span>{'\n'}
                            <span className="text-[#D4D4D4]">      </span><span className="text-[#9CDCFE]">"size"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#CE9178]">"2.5GB"</span><span className="text-[#D4D4D4]">,</span>{'\n'}
                            <span className="text-[#D4D4D4]">      </span><span className="text-[#9CDCFE]">"hubCloudLinks"</span><span className="text-[#D4D4D4]">: [</span>{'\n'}
                            <span className="text-[#D4D4D4]">        {`{`}</span>{'\n'}
                            <span className="text-[#D4D4D4]">          </span><span className="text-[#9CDCFE]">"title"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#CE9178]">"HubCloud Download"</span><span className="text-[#D4D4D4]">,</span>{'\n'}
                            <span className="text-[#D4D4D4]">          </span><span className="text-[#9CDCFE]">"url"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#CE9178]">"https://hubcloud.lol/file/..."</span><span className="text-[#D4D4D4]">,</span>{'\n'}
                            <span className="text-[#D4D4D4]">          </span><span className="text-[#9CDCFE]">"id"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#CE9178]">"hubcloud-1"</span>{'\n'}
                            <span className="text-[#D4D4D4]">        {`}`}</span>{'\n'}
                            <span className="text-[#D4D4D4]">      ]</span>{'\n'}
                            <span className="text-[#D4D4D4]">    {`}`}</span>{'\n'}
                            <span className="text-[#D4D4D4]">  ],</span>{'\n'}
                            <span className="text-[#D4D4D4]">  </span><span className="text-[#9CDCFE]">"directLinks"</span><span className="text-[#D4D4D4]">: [</span>{'\n'}
                            <span className="text-[#D4D4D4]">    {`{`}</span>{'\n'}
                            <span className="text-[#D4D4D4]">      </span><span className="text-[#9CDCFE]">"title"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#CE9178]">"HubCloud Download"</span><span className="text-[#D4D4D4]">,</span>{'\n'}
                            <span className="text-[#D4D4D4]">      </span><span className="text-[#9CDCFE]">"url"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#CE9178]">"https://hubcloud.lol/file/..."</span><span className="text-[#D4D4D4]">,</span>{'\n'}
                            <span className="text-[#D4D4D4]">      </span><span className="text-[#9CDCFE]">"id"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#CE9178]">"HubCloud-1"</span>{'\n'}
                            <span className="text-[#D4D4D4]">    {`}`}</span>{'\n'}
                            <span className="text-[#D4D4D4]">  ],</span>{'\n'}
                            <span className="text-[#D4D4D4]">  </span><span className="text-[#9CDCFE]">"episodeCount"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#B5CEA8]">12</span><span className="text-[#D4D4D4]">,</span>{'\n'}
                            <span className="text-[#D4D4D4]">  </span><span className="text-[#9CDCFE]">"linkCount"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#B5CEA8]">5</span>{'\n'}
                            <span className="text-[#D4D4D4]">{`}`}</span>
                        </code>
                      </pre>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="hubcloud">
                  <div className="relative w-full overflow-hidden">
                    <div className="bg-[#1e1e1e] rounded-lg overflow-hidden border border-gray-800 w-full">
                      <div className="flex items-center justify-between bg-[#2d2d30] px-4 py-2 border-b border-gray-700">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="flex gap-1.5 shrink-0">
                            <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
                            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
                            <div className="w-3 h-3 rounded-full bg-[#27ca3f]"></div>
                          </div>
                          <span className="text-gray-300 text-sm ml-2 truncate">hubcloud-response.json</span>
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
                      </div>
                      <div className="w-full overflow-x-auto">
                        <pre className="p-4 text-xs sm:text-sm w-full min-w-0">
                          <code className="font-mono leading-relaxed break-words">
                            <span className="text-[#D4D4D4]">{`{`}</span>{'\n'}
                            <span className="text-[#D4D4D4]">  </span><span className="text-[#9CDCFE]">"success"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#569CD6]">true</span><span className="text-[#D4D4D4]">,</span>{'\n'}
                            <span className="text-[#D4D4D4]">  </span><span className="text-[#9CDCFE]">"links"</span><span className="text-[#D4D4D4]">: [</span>{'\n'}
                            <span className="text-[#D4D4D4]">    {`{`}</span>{'\n'}
                            <span className="text-[#D4D4D4]">      </span><span className="text-[#9CDCFE]">"quality"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#CE9178]">"1080p"</span><span className="text-[#D4D4D4]">,</span>{'\n'}
                            <span className="text-[#D4D4D4]">      </span><span className="text-[#9CDCFE]">"size"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#CE9178]">"2.5GB"</span><span className="text-[#D4D4D4]">,</span>{'\n'}
                            <span className="text-[#D4D4D4]">      </span><span className="text-[#9CDCFE]">"link"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#CE9178]">"https://direct-download-url.com/file.mp4"</span><span className="text-[#D4D4D4]">,</span>{'\n'}
                            <span className="text-[#D4D4D4]">      </span><span className="text-[#9CDCFE]">"originalLink"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#CE9178]">"https://gpdl.hubcdn.fans/..."</span><span className="text-[#D4D4D4]">,</span>{'\n'}
                            <span className="text-[#D4D4D4]">      </span><span className="text-[#9CDCFE]">"isDirect"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#569CD6]">true</span>{'\n'}
                            <span className="text-[#D4D4D4]">    {`}`},</span>{'\n'}
                            <span className="text-[#D4D4D4]">    {`{`}</span>{'\n'}
                            <span className="text-[#D4D4D4]">      </span><span className="text-[#9CDCFE]">"quality"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#CE9178]">"720p"</span><span className="text-[#D4D4D4]">,</span>{'\n'}
                            <span className="text-[#D4D4D4]">      </span><span className="text-[#9CDCFE]">"size"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#CE9178]">"1.2GB"</span><span className="text-[#D4D4D4]">,</span>{'\n'}
                            <span className="text-[#D4D4D4]">      </span><span className="text-[#9CDCFE]">"link"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#CE9178]">"https://hubcloud.lol/file/..."</span><span className="text-[#D4D4D4]">,</span>{'\n'}
                            <span className="text-[#D4D4D4]">      </span><span className="text-[#9CDCFE]">"isDirect"</span><span className="text-[#D4D4D4]">:</span> <span className="text-[#569CD6]">false</span>{'\n'}
                            <span className="text-[#D4D4D4]">    {`}`}</span>{'\n'}
                            <span className="text-[#D4D4D4]">  ]</span>{'\n'}
                            <span className="text-[#D4D4D4]">{`}`}</span>
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
              <CardTitle className="text-lg sm:text-xl">Movies API Workflow</CardTitle>
              <CardDescription className="text-sm">How to get movie details and download links</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 sm:p-4 bg-muted rounded-lg">
                <h4 className="font-semibold mb-2 text-sm sm:text-base">Step-by-Step Process</h4>
                <ol className="text-xs sm:text-sm space-y-2">
                  <li><strong>1. Get Movies:</strong> Use <code>/api/moviesdrive</code> to get movies list</li>
                  <li><strong>2. Get Movie Details:</strong> Use <code>/api/moviesdrive/episode?url={`{movie_url}`}</code> with movie URL to get details and download links</li>
                  <li><strong>3. Extract from MDrive:</strong> Use <code>/api/mdrive?url={`{mdrive_url}`}</code> to extract HubCloud links from mdrive.today URLs</li>
                  <li><strong>4. Extract Direct Links:</strong> Use <code>/api/hubcloud?url={`{hubcloud_url}`}</code> to get direct download links from HubCloud URLs</li>
                </ol>
                <div className="mt-3 p-2 sm:p-3 bg-blue-100 dark:bg-blue-900/20 rounded-md">
                  <p className="text-xs text-blue-800 dark:text-blue-200">
                    <strong>Workflow:</strong> Movies → Movie Details → MDrive Extraction → HubCloud Direct Links
                  </p>
                </div>
                <div className="mt-3 p-2 sm:p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-md">
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    <strong>Note:</strong> The MDrive extractor finds HubCloud links, and the HubCloud extractor converts them to direct download URLs when possible.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
