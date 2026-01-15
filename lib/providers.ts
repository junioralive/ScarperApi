/**
 * Provider configuration for global search
 */
export interface Provider {
  name: string;
  endpoint: string;
}

/**
 * Available providers with their search endpoints
 */
export const PROVIDERS: Provider[] = [
  { name: "4kHDHub", endpoint: "/api/4khdhub/search" },
  { name: "HDHub4u", endpoint: "/api/hdhub4u/search" },
  { name: "Movies4u", endpoint: "/api/movies4u/search" },
  { name: "Drive", endpoint: "/api/drive/search" },
  { name: "Vega", endpoint: "/api/vega/search" },
  { name: "ZeeFliz", endpoint: "/api/zeefliz/search" },
  { name: "ZinkMovies", endpoint: "/api/zinkmovies/search" },
  { name: "DesireMovies", endpoint: "/api/desiremovies/search" },
];
