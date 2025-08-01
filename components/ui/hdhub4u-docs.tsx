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
import { Copy, Play, Key, Code2, ExternalLink, Home, Search, Film, Video, FileVideo, Clapperboard, ArrowRight, Database, Link } from "lucide-react";
import { toast } from "sonner";

interface HDHub4uDocsProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

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
    name: "Search & Homepage",
    icon: <Search className="h-4 w-4" />,
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/hdhub4u",
        description: "Get homepage content or search HDHub4u",
        params: [
          { name: "search", type: "string", required: false, description: "Search query for movies/series" },
          { name: "page", type: "number", required: false, description: "Page number for pagination (default: 1)" }
        ]
      }
    ]
  },
  {
    name: "Content Details",
    icon: <Film className="h-4 w-4" />,
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/hdhub4u/details",
        description: "Get detailed information about a movie/series including download links",
        params: [
          { name: "url", type: "string", required: true, description: "HDHub4u post URL from search results" }
        ]
      }
    ]
  },
  {
    name: "Episode Streaming",
    icon: <Video className="h-4 w-4" />,
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/hdhub4u/stream",
        description: "Get streaming links from episode URLs",
        params: [
          { name: "url", type: "string", required: true, description: "Episode URL (techyboy4u.com link)" }
        ]
      }
    ]
  },
  {
    name: "HubDrive Extraction",
    icon: <Link className="h-4 w-4" />,
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/hdhub4u/hubdrive",
        description: "Extract HubCloud links from HubDrive Wales URLs",
        params: [
          { name: "url", type: "string", required: true, description: "HubDrive Wales URL (hubdrive.wales)" }
        ]
      }
    ]
  },
  {
    name: "HubCloud Processing",
    icon: <Database className="h-4 w-4" />,
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/hubcloud",
        description: "Get direct download links from HubCloud URLs",
        params: [
          { name: "url", type: "string", required: true, description: "HubCloud URL from HubDrive extraction" }
        ]
      }
    ]
  },
  {
    name: "TechyBoy4U Extraction",
    icon: <ExternalLink className="h-4 w-4" />,
    endpoints: [
      {
        method: "GET",
        endpoint: "/api/uhdmovies/drive",
        description: "Extract and decode TechyBoy4U encrypted streaming links",
        params: [
          { name: "url", type: "string", required: true, description: "TechyBoy4U encrypted URL (techyboy4u.com)" }
        ]
      }
    ]
  }
];

export default function HDHub4uDocs({ apiKey, onApiKeyChange }: HDHub4uDocsProps) {
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
    const baseUrl = "https://totu.me";
    
    switch (language) {
      case "javascript":
        return `// HDHub4u + TechyBoy4U Complete Extraction Workflow
// This example shows how to extract streaming links from TechyBoy4U URLs

// Step 1: Search for content on HDHub4u
async function searchHDHub4u(query) {
  const response = await fetch("${baseUrl}/api/hdhub4u?search=" + encodeURIComponent(query), {
    headers: {
      "x-api-key": "YOUR_API_KEY",
      "Content-Type": "application/json"
    }
  });
  return await response.json();
}

// Step 2: Get series/movie details from HDHub4u
async function getContentDetails(postUrl) {
  const response = await fetch("${baseUrl}/api/hdhub4u/details?url=" + encodeURIComponent(postUrl), {
    headers: {
      "x-api-key": "YOUR_API_KEY",
      "Content-Type": "application/json"
    }
  });
  return await response.json();
}

// Step 3: Extract TechyBoy4U streaming links
async function extractTechyBoyLinks(techyboyUrl) {
  const response = await fetch("${baseUrl}/api/uhdmovies/drive?url=" + encodeURIComponent(techyboyUrl), {
    headers: {
      "x-api-key": "YOUR_API_KEY",
      "Content-Type": "application/json"
    }
  });
  return await response.json();
}

// Step 4: Complete workflow example
async function getStreamingLinks(searchQuery) {
  try {
    console.log("🔍 Searching for:", searchQuery);
    
    // Search for content
    const searchResults = await searchHDHub4u(searchQuery);
    if (!searchResults.success || !searchResults.data.items.length) {
      throw new Error("No search results found");
    }
    
    console.log("📚 Found", searchResults.data.items.length, "results");
    const firstResult = searchResults.data.items[0];
    console.log("📖 Processing:", firstResult.title);
    
    // Get content details
    const details = await getContentDetails(firstResult.postUrl);
    if (!details.success) {
      throw new Error("Failed to get content details");
    }
    
    console.log("🎬 Content type:", details.data.type);
    
    if (details.data.type === "series" && details.data.episodes) {
      // Process TV series episodes
      console.log("📺 Processing", details.data.episodes.length, "episodes");
      
      const allStreamingLinks = [];
      
      for (const episode of details.data.episodes) {
        if (episode.techyboyUrl) {
          console.log("🔓 Extracting links for:", episode.episode);
          
          // Extract TechyBoy4U links
          const techyboyResult = await extractTechyBoyLinks(episode.techyboyUrl);
          
          if (techyboyResult.success) {
            allStreamingLinks.push({
              episode: episode.episode,
              episodeNumber: episode.episodeNumber,
              originalUrl: episode.techyboyUrl,
              extractedPath: techyboyResult.extractedPath,
              fullUrl: techyboyResult.fullUrl,
              streamingLinks: techyboyResult.instantDownload ? [techyboyResult.instantDownload] : [],
              resumeCloudLinks: techyboyResult.resumeCloud ? [techyboyResult.resumeCloud] : [],
              cloudResumeDownload: techyboyResult.cloudResumeDownload
            });
          }
          
          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      return {
        title: details.data.title,
        type: "series",
        episodes: allStreamingLinks
      };
      
    } else if (details.data.type === "movie_direct" && details.data.directDownloads) {
      // Process movie direct downloads
      console.log("🎬 Processing", details.data.directDownloads.length, "download links");
      
      const movieLinks = [];
      
      for (const download of details.data.directDownloads) {
        if (download.downloadUrl.includes("techyboy4u.com")) {
          console.log("🔓 Extracting movie link:", download.title);
          
          const techyboyResult = await extractTechyBoyLinks(download.downloadUrl);
          
          if (techyboyResult.success) {
            movieLinks.push({
              title: download.title,
              quality: download.quality,
              originalUrl: download.downloadUrl,
              extractedPath: techyboyResult.extractedPath,
              fullUrl: techyboyResult.fullUrl,
              instantDownload: techyboyResult.instantDownload,
              resumeCloud: techyboyResult.resumeCloud,
              cloudResumeDownload: techyboyResult.cloudResumeDownload
            });
          }
        }
      }
      
      return {
        title: details.data.title,
        type: "movie",
        downloads: movieLinks
      };
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    throw error;
  }
}

// Usage examples:

// Example 1: Extract TV series streaming links
getStreamingLinks("Loki Season 1")
  .then(result => {
    console.log("✅ Extraction complete!");
    console.log("Title:", result.title);
    console.log("Type:", result.type);
    
    if (result.type === "series") {
      result.episodes.forEach(episode => {
        console.log(\`Episode \${episode.episodeNumber}:\`);
        console.log("  Original URL:", episode.originalUrl);
        console.log("  Extracted Path:", episode.extractedPath);
        console.log("  Full URL:", episode.fullUrl);
        console.log("  Instant Download:", episode.streamingLinks[0] || "None");
        console.log("  Resume Cloud:", episode.resumeCloudLinks[0] || "None");
        console.log("  Cloud Resume Download:", episode.cloudResumeDownload || "None");
      });
    }
  })
  .catch(console.error);

// Example 2: Extract movie download links
getStreamingLinks("Avengers Endgame")
  .then(result => {
    if (result.type === "movie") {
      result.downloads.forEach(download => {
        console.log(\`\${download.title} (\${download.quality}):\`);
        console.log("  Instant Download:", download.instantDownload);
        console.log("  Resume Cloud:", download.resumeCloud);
        console.log("  Cloud Resume Download:", download.cloudResumeDownload);
      });
    }
  })
  .catch(console.error);

// Example 3: Direct TechyBoy4U URL extraction
async function directTechyBoyExtraction() {
  const techyboyUrl = "https://techyboy4u.com/?id=bUlrRTVoTUNjRGtnd2VQMzY1...";
  
  console.log("🔓 Extracting from TechyBoy4U URL...");
  
  const result = await extractTechyBoyLinks(techyboyUrl);
  
  if (result.success) {
    console.log("✅ Extraction successful!");
    console.log("Original URL:", result.fileUrl);
    console.log("Extracted Path:", result.extractedPath);
    console.log("Full URL:", result.fullUrl);
    console.log("Instant Download:", result.instantDownload);
    console.log("Resume Cloud:", result.resumeCloud);
    console.log("Cloud Resume Download:", result.cloudResumeDownload);
  } else {
    console.log("❌ Extraction failed:", result.error);
  }
}

// Example 4: Batch processing multiple episodes
async function batchProcessEpisodes(episodes) {
  const results = [];
  
  for (let i = 0; i < episodes.length; i++) {
    const episode = episodes[i];
    console.log(\`Processing episode \${i + 1}/\${episodes.length}: \${episode.episode}\`);
    
    try {
      const result = await extractTechyBoyLinks(episode.techyboyUrl);
      results.push({
        ...episode,
        extraction: result
      });
      
      // Progress indicator
      const progress = Math.round(((i + 1) / episodes.length) * 100);
      console.log(\`Progress: \${progress}%\`);
      
    } catch (error) {
      console.error(\`Failed to process \${episode.episode}:\`, error.message);
      results.push({
        ...episode,
        extraction: { success: false, error: error.message }
      });
    }
    
    // Rate limiting delay
    if (i < episodes.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  return results;
}

// Example 5: Error handling and retry logic
async function extractWithRetry(url, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(\`Attempt \${attempt}/\${maxRetries} for URL: \${url}\`);
      
      const result = await extractTechyBoyLinks(url);
      
      if (result.success) {
        console.log("✅ Success on attempt", attempt);
        return result;
      } else {
        throw new Error(result.error || "Extraction failed");
      }
      
    } catch (error) {
      console.log(\`❌ Attempt \${attempt} failed:\`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      console.log(\`⏳ Waiting \${delay}ms before retry...\`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// TechyBoy4U URL Patterns:
// 1. Standard encrypted URL: https://techyboy4u.com/?id=bUlrRTVoTUNjRGtnd2VQMzY1...
// 2. Alternative format: https://techyboy4u.com/decrypt/?token=...
// 3. Direct redirect: https://techyboy4u.com/r?key=...&id=...

// Expected Response Format:
/*
{
  "success": true,
  "fileUrl": "https://driveleech.net/file/COKBFSVUlhWIkzfHJPUf",
  "extractedPath": "/file/COKBFSVUlhWIkzfHJPUf",
  "fullUrl": "https://driveleech.net/file/COKBFSVUlhWIkzfHJPUf",
  "instantDownload": "https://video-leech.pro/?url=...",
  "resumeCloud": "https://driveleech.net/zfile/...",
  "cloudResumeDownload": "https://worker-patient-base-84eb.mejehe3114.workers.dev/..."
}
*/`;

      case "python":
        return `# HDHub4u + TechyBoy4U Complete Extraction Workflow
import requests
import time
import json
from urllib.parse import quote

class HDHub4uExtractor:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = "${baseUrl}"
        self.headers = {
            "x-api-key": api_key,
            "Content-Type": "application/json"
        }
    
    def search_content(self, query):
        """Search for content on HDHub4u"""
        url = f"{self.base_url}/api/hdhub4u?search={quote(query)}"
        response = requests.get(url, headers=self.headers)
        return response.json()
    
    def get_content_details(self, post_url):
        """Get content details from HDHub4u post URL"""
        url = f"{self.base_url}/api/hdhub4u/details?url={quote(post_url)}"
        response = requests.get(url, headers=self.headers)
        return response.json()
    
    def extract_techyboy_links(self, techyboy_url):
        """Extract streaming links from TechyBoy4U URL"""
        url = f"{self.base_url}/api/uhdmovies/drive?url={quote(techyboy_url)}"
        response = requests.get(url, headers=self.headers)
        return response.json()
    
    def get_streaming_links(self, search_query):
        """Complete workflow to get streaming links"""
        print(f"🔍 Searching for: {search_query}")
        
        // Search for content
        search_results = self.search_content(search_query);
        if (!search_results.success || !search_results.data.items.length) {
          throw new Error("No search results found");
        }
        
        console.log("📚 Found", searchResults.data.items.length, "results");
        const firstResult = searchResults.data.items[0];
        console.log("📖 Processing:", firstResult.title);
        
        // Get content details
        const details = await getContentDetails(firstResult.postUrl);
        if (!details.success) {
          throw new Error("Failed to get content details");
        }
        
        console.log("🎬 Content type:", details.data.type);
        
        if (details.data.type === "series" && details.data.episodes) {
          // Process TV series episodes
          console.log("📺 Processing", details.data.episodes.length, "episodes");
          
          const allStreamingLinks = [];
          
          for (const episode of details.data.episodes) {
            if (episode.techyboyUrl) {
              console.log("🔓 Extracting links for:", episode.episode);
              
              // Extract TechyBoy4U links
              const techyboyResult = await extractTechyBoyLinks(episode.techyboyUrl);
              
              if (techyboyResult.success) {
                allStreamingLinks.push({
                  episode: episode.episode,
                  episodeNumber: episode.episodeNumber,
                  originalUrl: episode.techyboyUrl,
                  extractedPath: techyboyResult.extractedPath,
                  fullUrl: techyboyResult.fullUrl,
                  streamingLinks: techyboyResult.instantDownload ? [techyboyResult.instantDownload] : [],
                  resumeCloudLinks: techyboyResult.resumeCloud ? [techyboyResult.resumeCloud] : [],
                  cloudResumeDownload: techyboyResult.cloudResumeDownload
                });
              }
              
              // Add delay to avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
          
          return {
            title: details.data.title,
            type: "series",
            episodes: allStreamingLinks
          };
          
        } else if (details.data.type === "movie_direct" && details.data.directDownloads) {
          // Process movie direct downloads
          console.log("🎬 Processing", details.data.directDownloads.length, "download links");
          
          const movieLinks = [];
          
          for (const download of details.data.directDownloads) {
            if (download.downloadUrl.includes("techyboy4u.com")) {
              console.log("🔓 Extracting movie link:", download.title);
              
              const techyboyResult = await extractTechyBoyLinks(download.downloadUrl);
              
              if (techyboyResult.success) {
                movieLinks.push({
                  title: download.title,
                  quality: download.quality,
                  originalUrl: download.downloadUrl,
                  extractedPath: techyboyResult.extractedPath,
                  fullUrl: techyboyResult.fullUrl,
                  instantDownload: techyboyResult.instantDownload,
                  resumeCloud: techyboyResult.resumeCloud,
                  cloudResumeDownload: techyboyResult.cloudResumeDownload
                });
              }
            }
          }
          
          return {
            title: details.data.title,
            type: "movie",
            downloads: movieLinks
          };
        }
        
      } catch (error) {
        console.error("❌ Error:", error.message);
        throw error;
      }
    }
    
    // Usage examples:
    
    // Example 1: Extract TV series streaming links
    getStreamingLinks("Loki Season 1")
      .then(result => {
        console.log("✅ Extraction complete!");
        console.log("Title:", result.title);
        console.log("Type:", result.type);
        
        if (result.type === "series") {
          result.episodes.forEach(episode => {
            console.log(\`Episode \${episode.episodeNumber}:\`);
            console.log("  Original URL:", episode.originalUrl);
            console.log("  Extracted Path:", episode.extractedPath);
            console.log("  Full URL:", episode.fullUrl);
            console.log("  Instant Download:", episode.streamingLinks[0] || "None");
            console.log("  Resume Cloud:", episode.resumeCloudLinks[0] || "None");
            console.log("  Cloud Resume Download:", episode.cloudResumeDownload || "None");
          });
        }
      })
      .catch(console.error);
    
    // Example 2: Extract movie download links
    getStreamingLinks("Avengers Endgame")
      .then(result => {
        if (result.type === "movie") {
          result.downloads.forEach(download => {
            console.log(\`\${download.title} (\${download.quality}):\`);
            console.log("  Instant Download:", download.instantDownload);
            console.log("  Resume Cloud:", download.resumeCloud);
            console.log("  Cloud Resume Download:", download.cloudResumeDownload);
          });
        }
      })
      .catch(console.error);
    
    // Example 3: Direct TechyBoy4U URL extraction
    async function directTechyBoyExtraction() {
      const techyboyUrl = "https://techyboy4u.com/?id=bUlrRTVoTUNjRGtnd2VQMzY1...";
      
      console.log("🔓 Extracting from TechyBoy4U URL...");
      
      const result = await extractTechyBoyLinks(techyboyUrl);
      
      if (result.success) {
        console.log("✅ Extraction successful!");
        console.log("Original URL:", result.fileUrl);
        console.log("Extracted Path:", result.extractedPath);
        console.log("Full URL:", result.fullUrl);
        console.log("Instant Download:", result.instantDownload);
        console.log("Resume Cloud:", result.resumeCloud);
        console.log("Cloud Resume Download:", result.cloudResumeDownload);
      } else {
        console.log("❌ Extraction failed:", result.error);
      }
    }
    
    // Example 4: Batch processing multiple episodes
    async function batchProcessEpisodes(episodes) {
      const results = [];
      
      for (let i = 0; i < episodes.length; i++) {
        const episode = episodes[i];
        console.log(\`Processing episode \${i + 1}/\${episodes.length}: \${episode.episode}\`);
        
        try {
          const result = await extractTechyBoyLinks(episode.techyboyUrl);
          results.push({
            ...episode,
            extraction: result
          });
          
          // Progress indicator
          const progress = Math.round(((i + 1) / episodes.length) * 100);
          console.log(\`Progress: \${progress}%\`);
          
        } catch (error) {
          console.error(\`Failed to process \${episode.episode}:\`, error.message);
          results.push({
            ...episode,
            extraction: { success: false, error: error.message }
          });
        }
        
        // Rate limiting delay
        if (i < episodes.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      return results;
    }
    
    // Example 5: Error handling and retry logic
    async function extractWithRetry(url, maxRetries = 3) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(\`Attempt \${attempt}/\${maxRetries} for URL: \${url}\`);
          
          const result = await extractTechyBoyLinks(url);
          
          if (result.success) {
            console.log("✅ Success on attempt", attempt);
            return result;
          } else {
            throw new Error(result.error || "Extraction failed");
          }
          
        } catch (error) {
          console.log(\`❌ Attempt \${attempt} failed:\`, error.message);
          
          if (attempt === maxRetries) {
            throw error;
          }
          
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          console.log(\`⏳ Waiting \${delay}ms before retry...\`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // TechyBoy4U URL Patterns:
    // 1. Standard encrypted URL: https://techyboy4u.com/?id=bUlrRTVoTUNjRGtnd2VQMzY1...
    // 2. Alternative format: https://techyboy4u.com/decrypt/?token=...
    // 3. Direct redirect: https://techyboy4u.com/r?key=...&id=...
    
    // Expected Response Format:
    /*
    {
      "success": true,
      "fileUrl": "https://driveleech.net/file/COKBFSVUlhWIkzfHJPUf",
      "extractedPath": "/file/COKBFSVUlhWIkzfHJPUf",
      "fullUrl": "https://driveleech.net/file/COKBFSVUlhWIkzfHJPUf",
      "instantDownload": "https://video-leech.pro/?url=...",
      "resumeCloud": "https://driveleech.net/zfile/...",
      "cloudResumeDownload": "https://worker-patient-base-84eb.mejehe3114.workers.dev/..."
    }
    */`;

      case "curl":
        return `#!/bin/bash

# HDHub4u + TechyBoy4U Complete Extraction Workflow

API_KEY="YOUR_API_KEY"
BASE_URL="${baseUrl}"

# Function to make API calls
call_api() {
    local endpoint="$1"
    local params="$2"
    
    curl -s -X GET \\
        "\${BASE_URL}\${endpoint}?\${params}" \\
        -H "x-api-key: \${API_KEY}" \\
        -H "Content-Type: application/json"
}

# Function to extract JSON value
extract_json_value() {
    local json="$1"
    local key="$2"
    echo "$json" | grep -o "\\"$key\\":\\s*\\"[^\\"]\\+"" | sed "s/\\"$key\\":\\s*\\"//g" | sed 's/"//g'
}

# Step 1: Search for content
echo "🔍 Searching for content..."
SEARCH_QUERY="Loki Season 1"
SEARCH_RESULT=$(call_api "/api/hdhub4u" "search=$(echo "$SEARCH_QUERY" | sed 's/ /%20/g')")

echo "Search Result:"
echo "$SEARCH_RESULT" | jq .

# Extract first result's post URL
POST_URL=$(echo "$SEARCH_RESULT" | jq -r '.data.items[0].postUrl')
echo "📖 Processing post URL: $POST_URL"

# Step 2: Get content details
echo "🎬 Getting content details..."
DETAILS_RESULT=$(call_api "/api/hdhub4u/details" "url=$(echo "$POST_URL" | sed 's/&/%26/g' | sed 's/:/%3A/g' | sed 's/\//%2F/g')")

echo "Details Result:"
echo "$DETAILS_RESULT" | jq .

# Extract content type
CONTENT_TYPE=$(echo "$DETAILS_RESULT" | jq -r '.data.type')
echo "📺 Content type: $CONTENT_TYPE"

# Step 3: Process based on content type
if [ "$CONTENT_TYPE" = "series" ]; then
    echo "📺 Processing TV series episodes..."
    
    # Extract first episode's TechyBoy4U URL
    TECHYBOY_URL=$(echo "$DETAILS_RESULT" | jq -r '.data.episodes[0].techyboyUrl')
    echo "🔓 Extracting from TechyBoy4U URL: $TECHYBOY_URL"
    
    # Extract TechyBoy4U streaming links
    TECHYBOY_RESULT=$(call_api "/api/uhdmovies/drive" "url=$(echo "$TECHYBOY_URL" | sed 's/&/%26/g' | sed 's/:/%3A/g' | sed 's/\//%2F/g')")
    
    echo "TechyBoy4U Extraction Result:"
    echo "$TECHYBOY_RESULT" | jq .
    
    # Extract streaming links
    INSTANT_DOWNLOAD=$(echo "$TECHYBOY_RESULT" | jq -r '.instantDownload // "None"')
    RESUME_CLOUD=$(echo "$TECHYBOY_RESULT" | jq -r '.resumeCloud // "None"')
    CLOUD_RESUME_DOWNLOAD=$(echo "$TECHYBOY_RESULT" | jq -r '.cloudResumeDownload // "None"')
    
    echo "✅ Extracted streaming links:"
    echo "  Instant Download: $INSTANT_DOWNLOAD"
    echo "  Resume Cloud: $RESUME_CLOUD"
    echo "  Cloud Resume Download: $CLOUD_RESUME_DOWNLOAD"
    
elif [ "$CONTENT_TYPE" = "movie_direct" ]; then
    echo "🎬 Processing movie direct downloads..."
    
    # Extract first download's TechyBoy4U URL
    TECHYBOY_URL=$(echo "$DETAILS_RESULT" | jq -r '.data.directDownloads[] | select(.downloadUrl | contains("techyboy4u.com")) | .downloadUrl' | head -1)
    echo "🔓 Extracting from TechyBoy4U URL: $TECHYBOY_URL"
    
    # Extract TechyBoy4U streaming links
    TECHYBOY_RESULT=$(call_api "/api/uhdmovies/drive" "url=$(echo "$TECHYBOY_URL" | sed 's/&/%26/g' | sed 's/:/%3A/g' | sed 's/\//%2F/g')")
    
    echo "TechyBoy4U Extraction Result:"
    echo "$TECHYBOY_RESULT" | jq .
    
    # Extract download links
    INSTANT_DOWNLOAD=$(echo "$TECHYBOY_RESULT" | jq -r '.instantDownload // "None"')
    RESUME_CLOUD=$(echo "$TECHYBOY_RESULT" | jq -r '.resumeCloud // "None"')
    CLOUD_RESUME_DOWNLOAD=$(echo "$TECHYBOY_RESULT" | jq -r '.cloudResumeDownload // "None"')
    
    echo "✅ Extracted download links:"
    echo "  Instant Download: $INSTANT_DOWNLOAD"
    echo "  Resume Cloud: $RESUME_CLOUD"
    echo "  Cloud Resume Download: $CLOUD_RESUME_DOWNLOAD"
else
    echo "❌ Unsupported content type: $CONTENT_TYPE"
fi

# Direct TechyBoy4U URL extraction example
echo ""
echo "🔓 Direct TechyBoy4U URL extraction example:"
DIRECT_TECHYBOY_URL="https://techyboy4u.com/?id=bUlrRTVoTUNjRGtnd2VQMzY1..."

DIRECT_RESULT=$(call_api "/api/uhdmovies/drive" "url=$(echo "$DIRECT_TECHYBOY_URL" | sed 's/&/%26/g' | sed 's/:/%3A/g' | sed 's/\//%2F/g')")

echo "Direct Extraction Result:"
echo "$DIRECT_RESULT" | jq .

# Batch processing example
echo ""
echo "📦 Batch processing example:"

# Function to process multiple TechyBoy4U URLs
process_batch() {
    local urls=("$@")
    local total=${"#urls[@]"}
    
    for i, url in enumerate(urls):
        current = i + 1
        print(f"Processing {current}/{total}: {url}")

        result = call_api("/api/uhdmovies/drive", f"url={quote(url)}")
        success = result.get("success", False)

        if success:
            print(f"✅ Success: {result.get('fullUrl')}")
        else:
            print(f"❌ Failed: {result.get('error', 'Unknown error')}")

        # Progress indicator
        progress = int((current * 100) / total)
        print(f"Progress: {progress}%")

        # Rate limiting
        if current < total:
            time.sleep(2)
}

# Example batch URLs
BATCH_URLS=(
    "https://techyboy4u.com/?id=bUlrRTVoTUNjRGtnd2VQMzY1..."
    "https://techyboy4u.com/?id=anotherEncryptedId..."
    "https://techyboy4u.com/?id=yetAnotherEncryptedId..."
)

process_batch "${"BATCH_URLS[@]"}"

# Error handling with retry example
echo ""
echo "🔄 Retry logic example:"

retry_extraction() {
    local url="$1"
    local max_retries=3
    
    for attempt in $(seq 1 $max_retries); do
        echo "Attempt $attempt/$max_retries for: $url"
        
        local result=$(call_api "/api/uhdmovies/drive" "url=$(echo "$url" | sed 's/&/%26/g' | sed 's/:/%3A/g' | sed 's/\//%2F/g')")
        local success=$(echo "$result" | jq -r '.success')
        
        if [ "$success" = "true" ]; then
            echo "✅ Success on attempt $attempt"
            echo "$result" | jq .
            return 0
        else
            echo "❌ Attempt $attempt failed: $(echo "$result" | jq -r '.error // "Unknown error"')"
            
            if [ $attempt -eq $max_retries ]; then
                echo "❌ All attempts failed"
                return 1
            fi
            
            # Exponential backoff
            local delay=$((2 ** attempt))
            echo "⏳ Waiting ${"delay"}s before retry..."
            sleep $delay
        fi
    done
}

# Test retry function
retry_extraction "https://techyboy4u.com/?id=testRetryUrl..."

echo ""
echo "📋 TechyBoy4U URL Patterns:"
echo "1. Standard encrypted URL: https://techyboy4u.com/?id=bUlrRTVoTUNjRGtnd2VQMzY1..."
echo "2. Alternative format: https://techyboy4u.com/decrypt/?token=..."
echo "3. Direct redirect: https://techyboy4u.com/r?key=...&id=..."
echo ""
echo "📊 Expected Response Format:"
echo '{
  "success": true,
  "fileUrl": "https://driveleech.net/file/COKBFSVUlhWIkzfHJPUf",
  "extractedPath": "/file/COKBFSVUlhWIkzfHJPUf",
  "fullUrl": "https://driveleech.net/file/COKBFSVUlhWIkzfHJPUf",
  "instantDownload": "https://video-leech.pro/?url=...",
  "resumeCloud": "https://driveleech.net/zfile/...",
  "cloudResumeDownload": "https://worker-patient-base-84eb.mejehe3114.workers.dev/..."
}'`;

      default:
        return "";
    }
  };

  return (
    <Tabs defaultValue="workflow" className="space-y-4 sm:space-y-6">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="workflow" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
          <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden xs:inline">Data Flow</span>
          <span className="xs:hidden">Flow</span>
        </TabsTrigger>
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

      <TabsContent value="workflow" className="space-y-4 sm:space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl">HDHub4u API Data Flow</CardTitle>
            <CardDescription>
              Complete workflow for extracting streaming and download links from HDHub4u
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Workflow Diagram */}
            <div className="relative">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Step 1 */}
                <div className="relative">
                  <Card className="border-2 border-blue-200 dark:border-blue-800">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Step 1</Badge>
                        <Search className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-sm">Search Content</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs">
                      <code className="text-xs bg-muted p-2 rounded block mb-2">/api/hdhub4u</code>
                      <p>Search for movies/series or get homepage content</p>
                    </CardContent>
                  </Card>
                  <ArrowRight className="hidden lg:block absolute -right-6 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                </div>

                {/* Step 2 */}
                <div className="relative">
                  <Card className="border-2 border-green-200 dark:border-green-800">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Step 2</Badge>
                        <Film className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-sm">Get Details</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs">
                      <code className="text-xs bg-muted p-2 rounded block mb-2">/api/hdhub4u/details</code>
                      <p>Extract episodes or download links from content page</p>
                    </CardContent>
                  </Card>
                  <ArrowRight className="hidden lg:block absolute -right-6 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                </div>

                {/* Step 3 */}
                <div className="relative">
                  <Card className="border-2 border-purple-200 dark:border-purple-800">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">Step 3</Badge>
                        <Video className="h-4 w-4" />
                      </div>
                      <CardTitle className="text-sm">Process Links</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs">
                      <p className="mb-2"><strong>For Series:</strong></p>
                      <code className="text-xs bg-muted p-2 rounded block mb-2">/api/hdhub4u/stream</code>
                      <p className="mb-2"><strong>For Movies:</strong></p>
                      <code className="text-xs bg-muted p-2 rounded block">/api/hdhub4u/hubdrive</code>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Step 4 for Movies */}
              <div className="mt-4 flex justify-center">
                <Card className="border-2 border-orange-200 dark:border-orange-800 max-w-md">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">Step 4</Badge>
                      <Database className="h-4 w-4" />
                    </div>
                    <CardTitle className="text-sm">Final Download (Movies Only)</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs">
                    <code className="text-xs bg-muted p-2 rounded block mb-2">/api/hubcloud</code>
                    <p>Extract direct download URLs from HubCloud</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Content Type Branching */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Content Type Handling</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* TV Series Flow */}
                <Card className="border-2 border-blue-200 dark:border-blue-800">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      TV Series Workflow
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">1</Badge>
                      <span>Search content: <code>/api/hdhub4u</code></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">2</Badge>
                      <span>Get episodes: <code>/api/hdhub4u/details</code></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">3</Badge>
                      <span>Extract streams: <code>/api/hdhub4u/stream</code></span>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                      <p className="text-xs text-blue-800 dark:text-blue-200">
                        <strong>Result:</strong> Direct streaming URLs (.mp4, .m3u8)
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Movies Flow */}
                <Card className="border-2 border-green-200 dark:border-green-800">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Film className="h-4 w-4" />
                      Movies Workflow
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">1</Badge>
                      <span>Search content: <code>/api/hdhub4u</code></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">2</Badge>
                      <span>Get downloads: <code>/api/hdhub4u/details</code></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">3</Badge>
                      <span>Extract HubCloud: <code>/api/hdhub4u/hubdrive</code></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">4</Badge>
                      <span>Get direct links: <code>/api/hubcloud</code></span>
                    </div>
                    <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                      <p className="text-xs text-green-800 dark:text-green-200">
                        <strong>Result:</strong> Direct download URLs (Google Drive, etc.)
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* URL Structure */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">URL Structure & Data Flow</h3>
              
              <div className="space-y-3">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">HDHub4u Post URL</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <code className="text-xs bg-muted p-2 rounded block">
                      https://hdhub4u.build/loki-season-1-episode-links/
                    </code>
                    <p className="text-xs text-muted-foreground mt-2">
                      Contains episode links (for series) or direct download links (for movies)
                    </p>
                  </CardContent>
                </Card>

                <ArrowRight className="mx-auto h-4 w-4" />

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Episode URL (Series Only)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <code className="text-xs bg-muted p-2 rounded block">
                      https://techyboy4u.com/?id=bUlrRTVoTUNjRGtnd2VQMzY1...
                    </code>
                    <p className="text-xs text-muted-foreground mt-2">
                      Encrypted URL that resolves to streaming links
                    </p>
                  </CardContent>
                </Card>

                <ArrowRight className="mx-auto h-4 w-4" />

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">HubDrive URL (Movies Only)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <code className="text-xs bg-muted p-2 rounded block">
                      https://hubdrive.wales/file/1805033758
                    </code>
                    <p className="text-xs text-muted-foreground mt-2">
                      Contains HubCloud server links
                    </p>
                  </CardContent>
                </Card>

                <ArrowRight className="mx-auto h-4 w-4" />

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">HubCloud URL (Movies Only)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <code className="text-xs bg-muted p-2 rounded block">
                      https://hubcloud.one/drive/1zwux1q8779vv7w
                    </code>
                    <p className="text-xs text-muted-foreground mt-2">
                      Resolves to direct download URLs
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="test" className="space-y-4 sm:space-y-6">
        {/* API Key Setup */}
        <Card>
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl">API Key Setup</CardTitle>
            <CardDescription className="text-sm">
              Enter your API key to test the HDHub4u endpoints
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

        {/* API Testing */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Endpoint</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={selectedCategory.name} onValueChange={handleCategoryChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {apiCategories.map((category) => (
                      <SelectItem key={category.name} value={category.name}>
                        <div className="flex items-center gap-2">
                          {category.icon}
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge>{selectedEndpoint.method}</Badge>
                  <code className="text-xs">{selectedEndpoint.endpoint}</code>
                </div>
                <p className="text-xs text-muted-foreground">{selectedEndpoint.description}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Parameters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedEndpoint.params && selectedEndpoint.params.length > 0 ? (
                selectedEndpoint.params.map((param) => (
                  <div key={param.name} className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm">
                      {param.name}
                      <Badge variant={param.required ? "destructive" : "secondary"} className="text-xs">
                        {param.required ? "Required" : "Optional"}
                      </Badge>
                    </Label>
                    <Input
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

              <Button onClick={testApi} disabled={loading} className="w-full">
                {loading ? "Testing..." : "Test API"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Response</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="API response will appear here..."
              value={response}
              readOnly
              className="min-h-[300px] font-mono text-xs resize-none"
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="docs" className="space-y-4 sm:space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg sm:text-xl">Code Examples</CardTitle>
            <CardDescription>
              Complete workflow implementation in different programming languages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="javascript" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                <TabsTrigger value="python">Python</TabsTrigger>
                <TabsTrigger value="curl">cURL</TabsTrigger>
              </TabsList>

              {["javascript", "python", "curl"].map((lang) => (
                <TabsContent key={lang} value={lang}>
                  <div className="relative">
                    <div className="bg-[#1e1e1e] rounded-lg overflow-hidden border border-gray-800">
                      <div className="flex items-center justify-between bg-[#2d2d30] px-4 py-2 border-b border-gray-700">
                        <span className="text-gray-300 text-sm">
                          {lang === "javascript" ? "workflow.js" : lang === "python" ? "workflow.py" : "workflow.sh"}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-gray-400 hover:text-white hover:bg-gray-700 h-6 px-2"
                          onClick={() => copyToClipboard(generateCodeExample(lang))}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="overflow-x-auto">
                        <pre className="p-4">
                          <code className="text-sm text-gray-300 font-mono whitespace-pre-wrap">
                            {generateCodeExample(lang)}
                          </code>
                        </pre>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
