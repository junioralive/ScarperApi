"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Play, Code2, Home, Search, Film, Download, Cloud, Link2, Clapperboard } from "lucide-react";
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

const movies4UApiCategories: ApiCategory[] = [
  {
    name: "Get Movies",
    icon: <Home className="h-4 w-4" />,
    color: "bg-blue-500",
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/movies4u",
        description: "Get all movies and TV series with pagination from Movies4U",
        params: [
          { name: "page", type: "number", required: false, description: "Page number for pagination (default: 1)" }
        ]
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
        endpoint: "/api/movies4u",
        description: "Search movies and TV series by title on Movies4U",
        params: [
          { name: "search", type: "string", required: true, description: "Search query (movie/series title)" }
        ]
      }
    ]
  },
  {
    name: "Stream Details",
    icon: <Film className="h-4 w-4" />,
    color: "bg-purple-500",
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/movies4u",
        description: "Get detailed movie/series information with download links organized by seasons and quality",
        params: [
          { name: "stream", type: "string", required: true, description: "Full movie URL from movies4u.mov (e.g., https://movies4u.mov/loki-season-1-2-dual-audio/)" }
        ]
      }
    ]
  },
  {
    name: "Linkz Extractor",
    icon: <Link2 className="h-4 w-4" />,
    color: "bg-orange-500",
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/movies4u/linkz",
        description: "Extract HubCloud download links from linkz.mom URLs (filters out GDFlix and G-Drive)",
        params: [
          { name: "url", type: "string", required: true, description: "Linkz.mom URL (e.g., https://linkz.mom/number/37499)" }
        ]
      }
    ]
  }
];

interface Movies4UDocsProps {
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

export default function Movies4UDocs({ apiKey, onApiKeyChange }: Movies4UDocsProps) {
  const [selectedCategory, setSelectedCategory] = useState(movies4UApiCategories[0]);
  const [selectedEndpoint, setSelectedEndpoint] = useState(movies4UApiCategories[0].endpoints[0]);
  const [testParams, setTestParams] = useState<Record<string, string>>({});
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handleCategoryChange = (categoryName: string) => {
    const category = movies4UApiCategories.find(cat => cat.name === categoryName);
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
    const baseUrl = "https://totu.me";

    switch (language) {
      case "javascript":
        if (selectedCategory.name === "Get Movies") {
          return `// Get movies and series from Movies4U
const response = await fetch("${baseUrl}/api/movies4u", {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.data.items); // Array of movies and series

// Movies4U features:
// - High-quality releases (4K, HEVC, x265)
// - Multi-language support (Hindi, English, Tamil, etc.)
// - TV series with multiple seasons
// - Various formats (BluRay, WEB-DL, etc.)

// With pagination
const page2 = await fetch("${baseUrl}/api/movies4u?page=2", {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});`;
        } else if (selectedCategory.name === "Search Movies") {
          return `// Search movies and series on Movies4U
const searchQuery = "loki";
const response = await fetch(\`${baseUrl}/api/movies4u?search=\${encodeURIComponent(searchQuery)}\`, {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.data.items); // Search results

// Access movie details
data.data.items.forEach(item => {
  console.log(\`Title: \${item.title}\`);
  console.log(\`URL: \${item.url}\`);
  console.log(\`Image: \${item.image}\`);
  console.log(\`Video Label: \${item.videoLabel}\`);
  console.log(\`Has Video Icon: \${item.hasVideoIcon}\`);
});`;
        } else if (selectedCategory.name === "Stream Details") {
          return `// Get detailed movie/series information with seasons
const movieUrl = "https://movies4u.mov/loki-season-1-2-dual-audio-hindi-english-dnsp-web-series-web-dl/";
const response = await fetch(\`${baseUrl}/api/movies4u?stream=\${encodeURIComponent(movieUrl)}\`, {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.data);

// Access organized content by seasons
const content = data.data;
console.log("Title:", content.title);
console.log("Poster URL:", content.posterUrl);
console.log("Seasons:", content.seasons.length);

// Browse through seasons and quality options
content.seasons.forEach(season => {
  console.log(\`\${season.name}:\`);
  season.qualityOptions.forEach(quality => {
    console.log(\`  - \${quality.quality} \${quality.format} (\${quality.size}) - \${quality.language}\`);
    console.log(\`    Links: \${quality.links.length}\`);
  });
});`;
        } else if (selectedCategory.name === "Linkz Extractor") {
          return `// Extract HubCloud links from linkz.mom (filters out other providers)
const linkzUrl = "https://linkz.mom/number/37499";
const response = await fetch(\`${baseUrl}/api/movies4u/linkz?url=\${encodeURIComponent(linkzUrl)}\`, {
  headers: {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data.data);

// Access HubCloud links by quality
data.data.downloads.forEach(qualityOption => {
  console.log(\`Quality: \${qualityOption.quality} (\${qualityOption.size})\`);
  qualityOption.providers.forEach(provider => {
    console.log(\`  - \${provider.name}: \${provider.url}\`);
    console.log(\`    Type: \${provider.type}\`);
  });
});

// Note: This endpoint only returns HubCloud links
// GDFlix and G-Drive links are filtered out`;
        }

      case "python":
        if (selectedCategory.name === "Get Movies") {
          return `# Get movies and series from Movies4U
import requests

url = "${baseUrl}/api/movies4u"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data["data"]["items"])  # Array of movies and series

# With pagination
page_2_response = requests.get(f"{url}?page=2", headers=headers)`;
        } else if (selectedCategory.name === "Search Movies") {
          return `# Search movies and series on Movies4U
import requests
from urllib.parse import quote

search_query = "loki"
url = f"${baseUrl}/api/movies4u?search={quote(search_query)}"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data["data"]["items"])  # Search results`;
        } else if (selectedCategory.name === "Stream Details") {
          return `# Get detailed movie/series information with seasons
import requests
from urllib.parse import quote

movie_url = "https://movies4u.mov/loki-season-1-2-dual-audio-hindi-english-dnsp-web-series-web-dl/"
url = f"${baseUrl}/api/movies4u?stream={quote(movie_url)}"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
content = data["data"]

print("Title:", content["title"])
print("Seasons:", len(content["seasons"]))

# Browse through seasons and quality options
for season in content["seasons"]:
    print(f"{season['name']}:")
    for quality in season["qualityOptions"]:
        print(f"  - {quality['quality']} {quality['format']} ({quality['size']}) - {quality['language']}")
        print(f"    Links: {len(quality['links'])}")`;
        } else if (selectedCategory.name === "Linkz Extractor") {
          return `# Extract HubCloud links from linkz.mom
import requests
from urllib.parse import quote

linkz_url = "https://linkz.mom/number/37499"
url = f"${baseUrl}/api/movies4u/linkz?url={quote(linkz_url)}"
headers = {
    "x-api-key": "YOUR_API_KEY",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()

# Access HubCloud links by quality
for quality_option in data["data"]["downloads"]:
    print(f"Quality: {quality_option['quality']} ({quality_option['size']})")
    for provider in quality_option["providers"]:
        print(f"  - {provider['name']}: {provider['url']}")
        print(f"    Type: {provider['type']}")`;
        }

      case "curl":
        if (selectedCategory.name === "Get Movies") {
          return `# Get movies and series from Movies4U
curl -X GET \\
  "${baseUrl}/api/movies4u" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"

# With pagination
curl -X GET \\
  "${baseUrl}/api/movies4u?page=2" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        } else if (selectedCategory.name === "Search Movies") {
          return `# Search movies and series on Movies4U
curl -X GET \\
  "${baseUrl}/api/movies4u?search=loki" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        } else if (selectedCategory.name === "Stream Details") {
          return `# Get detailed movie/series information with seasons
curl -X GET \\
  "${baseUrl}/api/movies4u?stream=https%3A//movies4u.mov/loki-season-1-2-dual-audio/" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;
        } else if (selectedCategory.name === "Linkz Extractor") {
          return `# Extract HubCloud links from linkz.mom
curl -X GET \\
  "${baseUrl}/api/movies4u/linkz?url=https%3A//linkz.mom/number/37499" \\
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
        "id": "loki-season-1-2-dual-audio",
        "title": "Loki Season 1-2 (2021-2023) Dual Audio [Hindi-English] DSNP Web Series WEB-DL",
        "url": "https://movies4u.mov/loki-season-1-2-dual-audio-hindi-english-dnsp-web-series-web-dl/",
        "image": "https://movies4u.mov/wp-content/uploads/2023/10/loki-poster.jpg",
        "videoLabel": "Series",
        "hasVideoIcon": true,
        "altText": "Loki Season 1-2 Dual Audio Series"
      },
      {
        "id": "spider-man-no-way-home-2021",
        "title": "Spider-Man: No Way Home (2021) Hindi Dubbed Movie [Dual Audio] BluRay",
        "url": "https://movies4u.mov/spider-man-no-way-home-2021-hindi-dubbed/",
        "image": "https://movies4u.mov/wp-content/uploads/2022/01/spider-man-nwh.jpg",
        "videoLabel": "Movie",
        "hasVideoIcon": true,
        "altText": "Spider-Man No Way Home Hindi Dubbed"
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
    "items": [
      {
        "id": "loki-season-1-2-dual-audio",
        "title": "Loki Season 1-2 (2021-2023) Dual Audio [Hindi-English] DSNP Web Series WEB-DL",
        "url": "https://movies4u.mov/loki-season-1-2-dual-audio-hindi-english-dnsp-web-series-web-dl/",
        "image": "https://movies4u.mov/wp-content/uploads/2023/10/loki-poster.jpg",
        "videoLabel": "Series",
        "hasVideoIcon": true,
        "altText": "Loki Season 1-2 Dual Audio Series"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "hasNextPage": false
    }
  },
  "remainingRequests": 94
}`;

      case "Stream Details":
        return `{
  "success": true,
  "data": {
    "title": "Loki Season 1-2 (2021-2023) Dual Audio [Hindi-English] DSNP Web Series WEB-DL",
    "url": "https://movies4u.mov/loki-season-1-2-dual-audio-hindi-english-dnsp-web-series-web-dl/",
    "posterUrl": "https://movies4u.mov/wp-content/uploads/2023/10/loki-poster.jpg",
    "seasons": [
      {
        "name": "Season 2",
        "qualityOptions": [
          {
            "quality": "480p",
            "format": "WEB-DL x264",
            "size": "160MB/E",
            "language": "{Hindi + English}",
            "links": [
              {
                "type": "episodes",
                "url": "https://linkz.mom/number/10572",
                "label": "Download Links"
              }
            ]
          },
          {
            "quality": "720p",
            "format": "HEVC x265",
            "size": "280MB/E",
            "language": "{Hindi + English}",
            "links": [
              {
                "type": "episodes",
                "url": "https://linkz.mom/number/10615",
                "label": "Download Links"
              }
            ]
          },
          {
            "quality": "1080p",
            "format": "WEB-DL x264",
            "size": "1.5GB/E",
            "language": "{Hindi + English}",
            "links": [
              {
                "type": "episodes",
                "url": "https://linkz.mom/number/10576",
                "label": "Download Links"
              }
            ]
          },
          {
            "quality": "2160p 4K",
            "format": "UHD HEVC",
            "size": "4.5GB/E",
            "language": "{Hindi + English}",
            "links": [
              {
                "type": "episodes",
                "url": "https://linkz.mom/number/10578",
                "label": "Download Links"
              }
            ]
          }
        ]
      },
      {
        "name": "Season 1",
        "qualityOptions": [
          {
            "quality": "480p",
            "format": "WEB-DL",
            "size": "160MB/E",
            "language": "{Hindi-English}",
            "links": [
              {
                "type": "episodes",
                "url": "https://linkz.mom/number/5706",
                "label": "Download Links"
              }
            ]
          },
          {
            "quality": "720p",
            "format": "WEB-DL",
            "size": "450MB/E",
            "language": "{Hindi-English}",
            "links": [
              {
                "type": "episodes",
                "url": "https://linkz.mom/number/5708",
                "label": "Download Links"
              }
            ]
          },
          {
            "quality": "1080p",
            "format": "WEB-DL",
            "size": "600MB/E",
            "language": "{Hindi-English}",
            "links": [
              {
                "type": "episodes",
                "url": "https://linkz.mom/number/5710",
                "label": "Download Links"
              }
            ]
          }
        ]
      },
      {
        "name": "Special",
        "qualityOptions": [
          {
            "quality": "1080p",
            "format": "DSNP WEB-DL x265 HEVC",
            "size": "10GB",
            "language": "[Org Hindi DDP 5 1 ~ 192Kbps + English DDP 5 1 Atmos]",
            "links": [
              {
                "type": "episodes",
                "url": "https://linkz.mom/number/5712",
                "label": "Download Links"
              }
            ]
          }
        ]
      }
    ]
  },
  "remainingRequests": 93,
  "seasonCount": 3,
  "qualityOptionCount": 7,
  "linkCount": 7
}`;

      case "Linkz Extractor":
        return `{
  "success": true,
  "data": {
    "title": "Movie Download Links",
    "url": "https://linkz.mom/number/37499",
    "downloads": [
      {
        "quality": "480p",
        "size": "450MB",
        "providers": [
          {
            "name": "Hub-Cloud [DD]",
            "url": "https://hubcloud.one/drive/xtcxf7k1bbxnafs",
            "type": "Hub-Cloud"
          }
        ]
      },
      {
        "quality": "720p",
        "size": "1.4GB",
        "providers": [
          {
            "name": "Hub-Cloud [DD]",
            "url": "https://hubcloud.one/drive/lednrro9xzdx1z1",
            "type": "Hub-Cloud"
          }
        ]
      },
      {
        "quality": "1080p",
        "size": "3GB",
        "providers": [
          {
            "name": "Hub-Cloud [DD]",
            "url": "https://hubcloud.one/drive/li8spuekfp8ukls",
            "type": "Hub-Cloud"
          }
        ]
      },
      {
        "quality": "1080p HQ",
        "size": "8.7GB",
        "providers": [
          {
            "name": "Hub-Cloud [DD]",
            "url": "https://hubcloud.one/drive/nbnr6nxvcg3ndho",
            "type": "Hub-Cloud"
          }
        ]
      }
    ]
  },
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
              <Clapperboard className="h-5 w-5 text-blue-500" />
              Movies4U API Testing
            </CardTitle>
            <CardDescription className="text-sm">
              Enter your API key to test the Movies4U endpoints. Get your API key from the{" "}
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

        {/* ...existing code for testing interface... */}

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
                    {movies4UApiCategories.map((category) => (
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
        {/* ...existing code for documentation examples... */}
        
        <Card>
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
              <Clapperboard className="h-5 w-5 text-blue-500" />
              Movies4U API Examples
            </CardTitle>
            <CardDescription className="text-sm">
              Code examples for integrating with our Movies4U API
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
                    {movies4UApiCategories.map((category) => (
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
                      <span className="text-gray-300 text-sm ml-2 truncate">movies4u.js</span>
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
                      <span className="text-gray-300 text-sm ml-2 truncate">movies4u.py</span>
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
            <CardDescription className="text-sm">Expected response structures for Movies4U endpoints</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs defaultValue="movies" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="movies" className="text-xs sm:text-sm">Movies List</TabsTrigger>
                <TabsTrigger value="search" className="text-xs sm:text-sm">Search Results</TabsTrigger>
                <TabsTrigger value="stream" className="text-xs sm:text-sm">Stream Details</TabsTrigger>
                <TabsTrigger value="linkz" className="text-xs sm:text-sm">Linkz Extractor</TabsTrigger>
              </TabsList>

              <TabsContent value="movies">
                <ColorizedJSON data={getResponseExample("Get Movies")} title="movies-list" />
              </TabsContent>

              <TabsContent value="search">
                <ColorizedJSON data={getResponseExample("Search Movies")} title="search-results" />
              </TabsContent>

              <TabsContent value="stream">
                <ColorizedJSON data={getResponseExample("Stream Details")} title="stream-details" />
              </TabsContent>

              <TabsContent value="linkz">
                <ColorizedJSON data={getResponseExample("Linkz Extractor")} title="linkz-extractor" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl">API Workflow</CardTitle>
            <CardDescription className="text-sm">Complete workflow for accessing movie content through Movies4U</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 sm:p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2 text-sm sm:text-base">Step-by-Step Process</h4>
              <ol className="text-xs sm:text-sm space-y-2">
                <li><strong>1. Browse/Search:</strong> Use <code>/api/movies4u</code> to get movie lists or search for specific titles</li>
                <li><strong>2. Get Stream Details:</strong> Use <code>/api/movies4u?stream={`{url}`}</code> with movie URL to get organized seasons and quality options</li>
                <li><strong>3. Extract Download Links:</strong> Use <code>/api/movies4u/linkz?url={`{linkz_url}`}</code> to get HubCloud links from linkz.mom URLs</li>
                <li><strong>4. Get Direct Links:</strong> Use <code>/api/hubcloud?url={`{hubcloud_url}`}</code> with HubCloud URLs to get direct streaming/download links</li>
              </ol>
              <div className="mt-3 p-2 sm:p-3 bg-blue-100 dark:bg-blue-900/20 rounded-md">
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  <strong>Movies4U Advantage:</strong> Provides high-quality releases with multiple seasons organized by quality options. TV series are structured with proper season separation and quality variants.
                </p>
              </div>
              <div className="mt-3 p-2 sm:p-3 bg-orange-100 dark:bg-orange-900/20 rounded-md">
                <p className="text-xs text-orange-800 dark:text-orange-200">
                  <strong>Linkz Filtering:</strong> The linkz endpoint specifically filters out GDFlix and G-Drive links, returning only HubCloud links for better reliability and direct access.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
