interface Provider {
  name: string;
  url: string;
}

interface ProvidersData {
  [key: string]: Provider;
}

let cachedProviders: ProvidersData | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Cookie caching
let cachedCookies: string | null = null;
let lastCookieFetchTime = 0;
const COOKIE_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

/**
 * Fetches provider data from the remote JSON API
 * Uses caching to avoid frequent API calls
 */
export async function fetchProviders(): Promise<ProvidersData> {
  const now = Date.now();

  // Return cached data if it's still fresh
  if (cachedProviders && (now - lastFetchTime) < CACHE_DURATION) {
    return cachedProviders;
  }

  try {
    console.log('Fetching providers data from remote API...');

    const response = await fetch('https://anshu78780.github.io/json/providers.json', {
      cache: 'no-cache',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ScraperAPI/1.0)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch providers: ${response.status}`);
    }

    const data: ProvidersData = await response.json();

    // Update cache
    cachedProviders = data;
    lastFetchTime = now;

    console.log('Successfully fetched providers data');
    return data;

  } catch (error) {
    console.error('Error fetching providers:', error);

    // Return cached data if available, even if stale
    if (cachedProviders) {
      console.log('Using stale cached providers data due to fetch error');
      return cachedProviders;
    }

    throw new Error('Failed to fetch providers and no cached data available');
  }
}

/**
 * Gets the URL for a specific provider by key
 */
export async function getProviderUrl(providerKey: string): Promise<string | null> {
  try {
    const providers = await fetchProviders();
    const provider = providers[providerKey];

    if (!provider) {
      console.warn(`Provider '${providerKey}' not found in providers data`);
      return null;
    }

    return provider.url;
  } catch (error) {
    console.error(`Error getting URL for provider '${providerKey}':`, error);
    return null;
  }
}

/**
 * Gets the 4kHDHub provider URL specifically
 */
export async function get4kHDHubUrl(): Promise<string> {
  const url = await getProviderUrl('4kHDHub');

  if (!url) {
    throw new Error('4kHDHub provider URL not found');
  }

  return url;
}


export async function getDesireMoviesUrl(): Promise<string> {
  const url = await getProviderUrl('DesiReMovies');

  if (!url) {
    throw new Error('DesireMovies provider URL not found');
  }

  return url;
}


export async function getFilmyFlyUrl(): Promise<string> {
  const url = await getProviderUrl('filmyfly');

  if (!url) {
    throw new Error('FilmyFly provider URL not found');
  }

  return url;
}

/**
 * Gets the Cinemalux provider URL specifically
 */
export async function getCinemaluxUrl(): Promise<string> {
  const url = await getProviderUrl('cinemaLuxe');

  if (!url) {
    throw new Error('Cinemalux provider URL not found');
  }

  return url;
}

/**
 * Gets the HDHub4u provider URL specifically
 */
export async function getHDHub4uUrl(): Promise<string> {
  const url = await getProviderUrl('hdhub');

  if (!url) {
    throw new Error('HDHub4u provider URL not found');
  }

  return url;
}

/**
 * Gets the KMMovies provider URL specifically
 */
export async function getKMMoviesUrl(): Promise<string> {
  const url = await getProviderUrl('KMMovies');

  if (!url) {
    throw new Error('KMMovies provider URL not found');
  }

  return url;
}

/**
 * Gets the Movies4U provider URL specifically
 */
export async function getMovies4UUrl(): Promise<string> {
  const url = await getProviderUrl('movies4u');

  if (!url) {
    throw new Error('Movies4U provider URL not found');
  }

  return url;
}

/**
 * Gets the TopMovies provider URL specifically
 */
export async function getTopMoviesUrl(): Promise<string> {
  const url = await getProviderUrl('Topmovies');

  if (!url) {
    throw new Error('TopMovies provider URL not found');
  }

  return url;
}

/**
 * Gets the UHDMovies provider URL specifically
 */
export async function getUHDMoviesUrl(): Promise<string> {
  const url = await getProviderUrl('UhdMovies');

  if (!url) {
    throw new Error('UHDMovies provider URL not found');
  }

  return url;
}

/**
 * Gets the ZinkMovies provider URL specifically
 */
export async function getZinkMoviesUrl(): Promise<string> {
  const url = await getProviderUrl('zinkmovies');

  if (!url) {
    throw new Error('ZinkMovies provider URL not found');
  }

  return url;
}

/**
 * Gets the MoviesDrive provider URL specifically
 */
export async function getMoviesDriveUrl(): Promise<string> {
  const url = await getProviderUrl('drive');

  if (!url) {
    throw new Error('MoviesDrive provider URL not found');
  }

  return url;
}

/**
 * Gets the NetMirror provider URL specifically
 */
export async function getNetMirrorUrl(): Promise<string> {
  const url = await getProviderUrl('nfMirror');

  if (!url) {
    throw new Error('NetMirror provider URL not found');
  }

  return url + '/';
}

/**
 * Fetches cookies from the remote JSON API
 * Uses caching to avoid frequent API calls
 */
export async function fetchNetMirrorCookies(): Promise<string> {
  const now = Date.now();

  // Return cached cookies if they're still fresh
  if (cachedCookies && (now - lastCookieFetchTime) < COOKIE_CACHE_DURATION) {
    return cachedCookies;
  }

  try {
    console.log('Fetching NetMirror cookies from remote API...');

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

    // Update cache
    cachedCookies = cookies;
    lastCookieFetchTime = now;

    console.log('Successfully fetched NetMirror cookies');
    return cookies;

  } catch (error) {
    console.error('Error fetching NetMirror cookies:', error);

    // Return cached cookies if available, even if stale
    if (cachedCookies) {
      console.log('Using stale cached cookies due to fetch error');
      return cachedCookies;
    }

    // Fallback to hardcoded cookies if API fails
    console.log('Using fallback hardcoded cookies');
    return 'user_token=0b9f0991e238ee73b1ce39dbf5639c27; t_hash=292ed39d9c14c36b83340195ee7bc308%3A%3A1760117145%3A%3Ani; t_hash_t=7af930bb22d0c8ef8fec9ebc90ece211%3A%3A3f19f3cec2d186660a059a8edd549d20%3A%3A1760263892%3A%3Ani;';
  }
}

/**
 * Validates if a URL belongs to the 4kHDHub domain
 */
export async function validate4kHDHubUrl(url: string): Promise<boolean> {
  try {
    const baseUrl = await get4kHDHubUrl();
    const baseDomain = new URL(baseUrl).hostname;
    const urlDomain = new URL(url).hostname;

    return urlDomain === baseDomain;
  } catch (error) {
    console.error('Error validating 4kHDHub URL:', error);
    return false;
  }
}

/**
 * Validates if a URL belongs to the DesireMovies domain
 */
export async function validateDesireMoviesUrl(url: string): Promise<boolean> {
  try {
    const baseUrl = await getDesireMoviesUrl();
    const baseDomain = new URL(baseUrl).hostname;
    const urlDomain = new URL(url).hostname;

    return urlDomain === baseDomain;
  } catch (error) {
    console.error('Error validating DesireMovies URL:', error);
    return false;
  }
}

/**
 * Validates if a URL belongs to the FilmyFly domain
 */
export async function validateFilmyFlyUrl(url: string): Promise<boolean> {
  try {
    const baseUrl = await getFilmyFlyUrl();
    const baseDomain = new URL(baseUrl).hostname;
    const urlDomain = new URL(url).hostname;

    return urlDomain === baseDomain;
  } catch (error) {
    console.error('Error validating FilmyFly URL:', error);
    return false;
  }
}

/**
 * Validates if a URL belongs to the Cinemalux domain
 */
export async function validateCinemaluxUrl(url: string): Promise<boolean> {
  try {
    const baseUrl = await getCinemaluxUrl();
    const baseDomain = new URL(baseUrl).hostname;
    const urlDomain = new URL(url).hostname;

    return urlDomain === baseDomain;
  } catch (error) {
    console.error('Error validating Cinemalux URL:', error);
    return false;
  }
}

/**
 * Validates if a URL belongs to the HDHub4u domain
 */
export async function validateHDHub4uUrl(url: string): Promise<boolean> {
  try {
    const baseUrl = await getHDHub4uUrl();
    const baseDomain = new URL(baseUrl).hostname;
    const urlDomain = new URL(url).hostname;

    return urlDomain === baseDomain;
  } catch (error) {
    console.error('Error validating HDHub4u URL:', error);
    return false;
  }
}

/**
 * Validates if a URL belongs to the KMMovies domain
 */
export async function validateKMMoviesUrl(url: string): Promise<boolean> {
  try {
    const baseUrl = await getKMMoviesUrl();
    const baseDomain = new URL(baseUrl).hostname;
    const urlDomain = new URL(url).hostname;

    return urlDomain === baseDomain;
  } catch (error) {
    console.error('Error validating KMMovies URL:', error);
    return false;
  }
}

/**
 * Validates if a URL belongs to the Movies4U domain
 */
export async function validateMovies4UUrl(url: string): Promise<boolean> {
  try {
    const baseUrl = await getMovies4UUrl();
    const baseDomain = new URL(baseUrl).hostname;
    const urlDomain = new URL(url).hostname;

    return urlDomain === baseDomain;
  } catch (error) {
    console.error('Error validating Movies4U URL:', error);
    return false;
  }
}

/**
 * Validates if a URL belongs to the TopMovies domain
 */
export async function validateTopMoviesUrl(url: string): Promise<boolean> {
  try {
    const baseUrl = await getTopMoviesUrl();
    const baseDomain = new URL(baseUrl).hostname;
    const urlDomain = new URL(url).hostname;

    return urlDomain === baseDomain;
  } catch (error) {
    console.error('Error validating TopMovies URL:', error);
    return false;
  }
}

/**
 * Validates if a URL belongs to the UHDMovies domain
 */
export async function validateUHDMoviesUrl(url: string): Promise<boolean> {
  try {
    const baseUrl = await getUHDMoviesUrl();
    const baseDomain = new URL(baseUrl).hostname;
    const urlDomain = new URL(url).hostname;

    return urlDomain === baseDomain;
  } catch (error) {
    console.error('Error validating UHDMovies URL:', error);
    return false;
  }
}

/**
 * Validates if a URL belongs to the ZinkMovies domain
 */
export async function validateZinkMoviesUrl(url: string): Promise<boolean> {
  try {
    const baseUrl = await getZinkMoviesUrl();
    const baseDomain = new URL(baseUrl).hostname;
    const urlDomain = new URL(url).hostname;

    return urlDomain === baseDomain;
  } catch (error) {
    console.error('Error validating ZinkMovies URL:', error);
    return false;
  }
}

/**
 * Validates if a URL belongs to the MoviesDrive domain
 */
export async function validateMoviesDriveUrl(url: string): Promise<boolean> {
  try {
    const baseUrl = await getMoviesDriveUrl();
    const baseDomain = new URL(baseUrl).hostname;
    const urlDomain = new URL(url).hostname;

    return urlDomain === baseDomain;
  } catch (error) {
    console.error('Error validating MoviesDrive URL:', error);
    return false;
  }
}

/**
 * Validates if a URL belongs to the NetMirror domain
 */
export async function validateNetMirrorUrl(url: string): Promise<boolean> {
  try {
    const baseUrl = await getNetMirrorUrl();
    const baseDomain = new URL(baseUrl).hostname;
    const urlDomain = new URL(url).hostname;

    return urlDomain === baseDomain;
  } catch (error) {
    console.error('Error validating NetMirror URL:', error);
    return false;
  }
}