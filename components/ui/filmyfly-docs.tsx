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
import { Copy, Play, Key, Code2, ExternalLink, Home, Search, Film, Video, FileVideo, Download } from "lucide-react";
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
    name: "Search Movies",
    icon: <Search className="h-4 w-4" />,
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/filmyfly",
        description: "Search movies or get homepage content",
        params: [
          { name: "search", type: "string", required: false, description: "Search query for movies (optional, if not provided returns homepage content)" }
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
        endpoint: "/api/filmyfly/details",
        description: "Get movie download links from detail page",
        params: [
          { name: "url", type: "string", required: true, description: "FilmyFly movie detail page URL" }
        ]
      }
    ]
  },
  {
    name: "Extract Links",
    icon: <Download className="h-4 w-4" />,
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/filmyfly/extract",
        description: "Extract download links from FileDL pages",
        params: [
          { name: "url", type: "string", required: true, description: "FileDL page URL (filesdl.site domain)" }
        ]
      }
    ]
  }
];

interface FilmyFlyDocsProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

export default function FilmyFlyDocs({ apiKey, onApiKeyChange }: FilmyFlyDocsProps) {
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
    let url = selectedEndpoint.endpoint;
    
    const queryParams = params.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join("&");
    if (queryParams) {
      url += "?" + queryParams;
    }

    const baseUrl = "https://totu.me";

    switch (language) {
      case "javascript":
        if (selectedCategory.name === "Search Movies") {
          return `// Search movies or get homepage content
const searchQuery = "${testParams.search || 'avengers'}";
const response = await fetch("${baseUrl}/api/filmyfly${testParams.search ? '?search=' + encodeURIComponent(testParams.search) : ''}", {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.data.items); // Array of movies`;
        } else if (selectedCategory.name === "Movie Details") {
          return `// Get movie download links
const movieUrl = "${testParams.url || 'https://filmyfly.men/page-download/3567/Avengers-Endgame-2019.html'}";
const response = await fetch("${baseUrl}/api/filmyfly/details?url=" + encodeURIComponent(movieUrl), {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.data.downloadLinks); // Download links with quality info`;
        } else {
          return `// Extract download links from FileDL
const filedlUrl = "${testParams.url || 'https://new2.filesdl.site/cloud/AAityJMIiTZPEIM'}";
const response = await fetch("${baseUrl}/api/filmyfly/extract?url=" + encodeURIComponent(filedlUrl), {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.data.links); // Direct download links`;
        }

      case "python":
        if (selectedCategory.name === "Search Movies") {
          return `# Search movies or get homepage content
import requests

search_query = "${testParams.search || 'avengers'}"
url = "${baseUrl}/api/filmyfly"
params = ${testParams.search ? '{"search": search_query}' : '{}'}
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, params=params, headers=headers)
data = response.json()
print(data["data"]["items"])  # Array of movies`;
        } else if (selectedCategory.name === "Movie Details") {
          return `# Get movie download links
import requests
from urllib.parse import quote

movie_url = "${testParams.url || 'https://filmyfly.men/page-download/3567/Avengers-Endgame-2019.html'}"
url = f"${baseUrl}/api/filmyfly/details?url={quote(movie_url)}"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data["data"]["downloadLinks"])  # Download links with quality info`;
        } else {
          return `# Extract download links from FileDL
import requests
from urllib.parse import quote

filedl_url = "${testParams.url || 'https://new2.filesdl.site/cloud/AAityJMIiTZPEIM'}"
url = f"${baseUrl}/api/filmyfly/extract?url={quote(filedl_url)}"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data["data"]["links"])  # Direct download links`;
        }

      case "curl":
        if (selectedCategory.name === "Search Movies") {
          return `# Search movies or get homepage content
curl -X GET \\
  "${baseUrl}/api/filmyfly${testParams.search ? '?search=' + encodeURIComponent(testParams.search) : ''}" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"}`;
        } else if (selectedCategory.name === "Movie Details") {
          return `# Get movie download links
curl -X GET \\
  "${baseUrl}/api/filmyfly/details?url=${encodeURIComponent(testParams.url || 'https://filmyfly.men/page-download/3567/Avengers-Endgame-2019.html')}" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"}`;
        } else {
          return `# Extract download links from FileDL
curl -X GET \\
  "${baseUrl}/api/filmyfly/extract?url=${encodeURIComponent(testParams.url || 'https://new2.filesdl.site/cloud/AAityJMIiTZPEIM')}" \\
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
          <h1 className="text-2xl sm:text-3xl font-bold truncate">FilmyFly API Documentation</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Test and explore our FilmyFly API endpoints
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0">
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <Label className="text-xs text-muted-foreground">Select API Type</Label>
            <Select value={selectedCategory.name} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-full sm:w-40 text-sm">
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
                Enter your API key to test the FilmyFly endpoints.
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
                  <Select value={selectedEndpoint.endpoint} onValueChange={handleEndpointChange}>
                    <SelectTrigger className="text-sm w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedCategory.endpoints.map((endpoint) => (
                        <SelectItem key={endpoint.endpoint} value={endpoint.endpoint} className="text-sm">
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="default" className="text-xs shrink-0">
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
              Code examples for integrating with our FilmyFly API
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
                          <Badge variant="default" className="text-xs shrink-0">
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
                    <span className="text-gray-300 text-sm">example.js</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-gray-400 hover:text-white h-6 px-2"
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
                      className="text-gray-400 hover:text-white h-6 px-2"
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
                    <span className="text-gray-300 text-sm">terminal</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-gray-400 hover:text-white h-6 px-2"
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
      </TabsContent>
      </Tabs>
    </div>
  );
}