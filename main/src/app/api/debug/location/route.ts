import { NextRequest } from "next/server";
import { extractIPFromRequest, getUserLocation, formatLocationForDisplay } from "@/lib/utils/geolocationUtils";

export async function GET(req: NextRequest) {
  try {
    const userIP = extractIPFromRequest(req);
    const locationData = await getUserLocation(userIP);
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      userIP,
      hasIP: !!userIP,
      ipType: typeof userIP,
      ipLength: userIP?.length || 0,
      locationData,
      displayString: !('error' in locationData) ? formatLocationForDisplay(locationData) : 'Error',
      environment: process.env.NODE_ENV,
      hasToken: !!process.env.IPINFO_TOKEN,
      tokenLength: process.env.IPINFO_TOKEN?.length || 0
    };
    
    return Response.json(debugInfo, { status: 200 });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to get location', 
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
