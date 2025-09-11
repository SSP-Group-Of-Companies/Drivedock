/**
 * Geolocation Utilities
 *
 * GPS-based location services for capturing user location
 * during onboarding completion with user permission.
 */

export interface GeolocationData {
  country: string; // Full country name (e.g., "Canada", "United States")
  region: string; // State/Province (e.g., "Ontario", "California")
  city?: string; // City name (e.g., "Milton", "Los Angeles")
  timezone?: string;
  latitude: number; // GPS latitude
  longitude: number; // GPS longitude
}

export interface GeolocationError {
  error: string;
  message: string;
}

/**
 * Converts country code to full country name using built-in Intl API
 * This is the most reliable and comprehensive approach
 */

function getCountryName(countryCode: string): string {
  try {
    // Use Intl.DisplayNames for proper country name conversion
    const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
    return displayNames.of(countryCode.toUpperCase()) || countryCode;
  } catch {
    // Fallback to the code if Intl API fails
    return countryCode;
  }
}

/**
 * Get location data from GPS coordinates using reverse geocoding
 * Uses OpenStreetMap Nominatim API (free, no API key required)
 *
 * @param latitude - GPS latitude
 * @param longitude - GPS longitude
 * @returns Promise<GeolocationData | GeolocationError>
 */
export async function getLocationFromCoordinates(
  latitude: number,
  longitude: number
): Promise<GeolocationData | GeolocationError> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": "DriveDock/1.0",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Reverse geocoding API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data || !data.address) {
      throw new Error("No address data found");
    }

    const address = data.address;

    return {
      country: getCountryName(address.country_code || "Unknown"),
      region: address.state || address.province || address.region || "Unknown",
      city: address.city || address.town || address.village || address.hamlet,
      timezone: data.timezone,
      latitude,
      longitude,
    };
  } catch (error) {
    return {
      error: "REVERSE_GEOCODING_FAILED",
      message:
        error instanceof Error
          ? error.message
          : "Failed to get location from coordinates",
    };
  }
}
