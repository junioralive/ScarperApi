import {
  getBaseUrl,
  getProvider,
  getAllProviderKeys,
  getAllProviders,
  hasProvider,
} from "./baseurl";

// Example usage
async function examples() {
  // Get base URL for a specific provider
  const movieModUrl = await getBaseUrl("Moviesmod");
  console.log("Moviesmod URL:", movieModUrl);
  // Output: https://moviesmod.build/

  // Get full provider info
  const hdHubProvider = await getProvider("hdhub");
  console.log("Provider:", hdHubProvider);
  // Output: { name: 'hdhub4u', url: 'https://new1.hdhub4u.fo/' }

  // Check if a provider exists
  const exists = await hasProvider("Vega");
  console.log("Vega exists:", exists);
  // Output: true

  // Get all available provider keys
  const keys = await getAllProviderKeys();
  console.log("Available providers:", keys);
  // Output: ['Moviesmod', 'Topmovies', 'UhdMovies', ...]

  // Get all providers
  const allProviders = await getAllProviders();
  console.log("Total providers:", Object.keys(allProviders).length);

  // Handle errors for non-existent providers
  try {
    await getBaseUrl("NonExistent");
  } catch (error) {
    console.error(error);
    // Output: Error: Provider key "NonExistent" not found...
  }
}

// Run examples
examples();
