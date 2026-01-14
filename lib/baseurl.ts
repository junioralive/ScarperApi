/**
 * Provider configuration type
 */
interface Provider {
  name: string;
  url: string;
}

/**
 * Providers data type
 */
type ProvidersData = Record<string, Provider>;

/**
 * Cached providers data
 */
let cachedProviders: ProvidersData | null = null;

/**
 * Fetch providers data from remote JSON
 */
async function fetchProviders(): Promise<ProvidersData> {
  if (cachedProviders) {
    return cachedProviders;
  }

  try {
    const response = await fetch(
      "https://anshu78780.github.io/json/providers.json"
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch providers: ${response.statusText}`);
    }

    cachedProviders = await response.json();
    return cachedProviders as ProvidersData;
  } catch (error) {
    console.error("Error fetching providers:", error);
    throw new Error(
      `Failed to load providers: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Get the base URL for a provider by key name
 * @param key - The provider key (e.g., "Moviesmod", "drive", "hdhub")
 * @returns The provider's base URL
 * @throws Error if provider key is not found
 */
export async function getBaseUrl(key: string): Promise<string> {
  const providers = await fetchProviders();

  const provider = providers[key];

  if (!provider) {
    const availableKeys = Object.keys(providers).join(", ");
    throw new Error(
      `Provider key "${key}" not found. Available keys: ${availableKeys}`
    );
  }

  return provider.url;
}

/**
 * Get provider information by key name
 * @param key - The provider key
 * @returns The provider object with name and url
 * @throws Error if provider key is not found
 */
export async function getProvider(key: string): Promise<Provider> {
  const providers = await fetchProviders();

  const provider = providers[key];

  if (!provider) {
    const availableKeys = Object.keys(providers).join(", ");
    throw new Error(
      `Provider key "${key}" not found. Available keys: ${availableKeys}`
    );
  }

  return provider;
}

/**
 * Get all available provider keys
 * @returns Array of all provider keys
 */
export async function getAllProviderKeys(): Promise<string[]> {
  const providers = await fetchProviders();
  return Object.keys(providers);
}

/**
 * Get all providers
 * @returns All providers data
 */
export async function getAllProviders(): Promise<ProvidersData> {
  return await fetchProviders();
}

/**
 * Check if a provider key exists
 * @param key - The provider key to check
 * @returns true if the provider exists, false otherwise
 */
export async function hasProvider(key: string): Promise<boolean> {
  const providers = await fetchProviders();
  return key in providers;
}

/**
 * Clear the cached providers data (useful for testing or forcing a refresh)
 */
export function clearCache(): void {
  cachedProviders = null;
}

/**
 * Cached cookies data
 */
let cachedCookies: string | null = null;

/**
 * Fetch cookies from remote JSON
 * @returns Cookie string
 */
export async function getCookies(): Promise<string> {
  if (cachedCookies) {
    return cachedCookies;
  }

  try {
    const response = await fetch('https://anshu78780.github.io/json/cookies.json', {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ScraperAPI/1.0)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch cookies: ${response.status}`);
    }

    const data = await response.json();
    const cookies = data.cookies;

    if (!cookies) {
      throw new Error('Cookies not found in response');
    }

    cachedCookies = cookies;
    return cookies;
  } catch (error) {
    console.error('Error fetching cookies:', error);
    throw new Error(
      `Failed to load cookies: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Clear the cached cookies data
 */
export function clearCookiesCache(): void {
  cachedCookies = null;
}
