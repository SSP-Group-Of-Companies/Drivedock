/**
 * Geolocation Utilities
 * 
 * Industry-standard IP-based geolocation service for capturing user location
 * during onboarding completion without requiring user permission.
 */

export interface GeolocationData {
  country: string;
  region: string; // State/Province
  city?: string;
  timezone?: string;
  ip?: string;
}

export interface GeolocationError {
  error: string;
  message: string;
}

/**
 * Get user location from IP address using IPinfo.io service
 * This is the most accurate and reliable IP geolocation service
 * 
 * @param ipAddress - The user's IP address
 * @returns Promise<GeolocationData | GeolocationError>
 */
export async function getLocationFromIP(ipAddress: string): Promise<GeolocationData | GeolocationError> {
  try {
    // Use IPinfo.io - industry standard, most accurate
    // Free tier: 50,000 requests/month
    const token = process.env.IPINFO_TOKEN;
    
    const response = await fetch(`https://ipinfo.io/${ipAddress}/json?token=${token}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'DriveDock/1.0'
      },
      // Cache for 1 hour to reduce API calls
      next: { revalidate: 3600 }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`IPinfo API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // IPinfo returns: { ip, city, region, country, loc, timezone, ... }
    return {
      country: data.country || 'Unknown',
      region: data.region || 'Unknown', // State/Province
      city: data.city,
      timezone: data.timezone,
      ip: data.ip
    };
  } catch (error) {
    return {
      error: 'GEOLOCATION_FAILED',
      message: error instanceof Error ? error.message : 'Failed to get location'
    };
  }
}

/**
 * Fallback geolocation service using ipapi.co
 * Used if primary service fails
 */
export async function getLocationFromIPFallback(ipAddress: string): Promise<GeolocationData | GeolocationError> {
  try {
    const response = await fetch(`https://ipapi.co/${ipAddress}/json/`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'DriveDock/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`ipapi.co API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      country: data.country_name || 'Unknown',
      region: data.region || 'Unknown',
      city: data.city,
      timezone: data.timezone,
      ip: data.ip
    };
  } catch (error) {
    console.error('Fallback geolocation error:', error);
    return {
      error: 'GEOLOCATION_FALLBACK_FAILED',
      message: error instanceof Error ? error.message : 'Failed to get location from fallback service'
    };
  }
}

/**
 * Get user location with fallback strategy
 * Tries primary service first, then fallback if needed
 */
export async function getUserLocation(ipAddress: string): Promise<GeolocationData | GeolocationError> {
  // Try primary service first
  const primaryResult = await getLocationFromIP(ipAddress);
  
  // If primary succeeds, return it
  if (!('error' in primaryResult)) {
    return primaryResult;
  }
  
  // If primary fails, try fallback
  const fallbackResult = await getLocationFromIPFallback(ipAddress);
  
  // If fallback also fails, return a default location
  if ('error' in fallbackResult) {
    return {
      country: 'Unknown',
      region: 'Unknown',
      ip: ipAddress
    };
  }
  
  return fallbackResult;
}

/**
 * Format location for display
 * Returns "State/Province, Country" format
 */
export function formatLocationForDisplay(geoData: GeolocationData): string {
  if (geoData.region === 'Unknown' && geoData.country === 'Unknown') {
    return 'Location Unknown';
  }
  
  // Convert country codes to full country names for better display
  const countryMap: Record<string, string> = {
    'CA': 'Canada',
    'US': 'United States',
    'MX': 'Mexico',
    'GB': 'United Kingdom',
    'AU': 'Australia',
    'DE': 'Germany',
    'FR': 'France',
    'IT': 'Italy',
    'ES': 'Spain',
    'JP': 'Japan',
    'CN': 'China',
    'IN': 'India',
    'BR': 'Brazil',
    'RU': 'Russia'
  };
  
  const countryName = countryMap[geoData.country] || geoData.country;
  
  return `${geoData.region}, ${countryName}`;
}

/**
 * Extract IP address from NextRequest
 * Handles various proxy scenarios (Cloudflare, AWS, etc.)
 */
export function extractIPFromRequest(req: Request): string {
  // Check various headers for IP address (in order of preference)
  const headers = [
    'x-vercel-forwarded-for', // Vercel
    'cf-connecting-ip',       // Cloudflare
    'x-forwarded-for',        // Standard proxy header
    'x-real-ip',             // Nginx
    'x-client-ip',           // Apache
    'x-forwarded',           // General
    'forwarded-for',         // General
    'forwarded'              // RFC 7239
  ];
  
  for (const header of headers) {
    const value = req.headers.get(header);
    if (value) {
      // x-forwarded-for can contain multiple IPs, take the first one
      const ip = value.split(',')[0].trim();
      if (isValidIP(ip)) {
        return ip;
      }
    }
  }
  
  // Fallback to connection remote address (if available)
  return '127.0.0.1'; // Default fallback
}

/**
 * Basic IP address validation
 */
function isValidIP(ip: string): boolean {
  // IPv4 regex
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  
  // IPv6 regex (simplified)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}
