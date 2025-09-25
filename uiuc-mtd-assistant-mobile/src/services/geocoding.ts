/**
 * Simple geocoding service for UIUC campus locations
 * This is a basic implementation that maps common campus building names to coordinates
 */

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  confidence: 'high' | 'medium' | 'low';
}

export class GeocodingService {
  // UIUC campus building coordinates mapping
  private static readonly CAMPUS_BUILDINGS: Record<string, GeocodingResult> = {
    // Engineering buildings
    'engineering hall': { latitude: 40.1135, longitude: -88.2244, confidence: 'high' },
    'ece building': { latitude: 40.1135, longitude: -88.2244, confidence: 'high' },
    'mechanical engineering': { latitude: 40.1135, longitude: -88.2244, confidence: 'high' },
    'civil engineering': { latitude: 40.1135, longitude: -88.2244, confidence: 'high' },
    
    // Business buildings
    'business instructional facility': { latitude: 40.1020, longitude: -88.2272, confidence: 'high' },
    'business instructional fac': { latitude: 40.1020, longitude: -88.2272, confidence: 'high' },
    'bif': { latitude: 40.1020, longitude: -88.2272, confidence: 'high' },
    'business building': { latitude: 40.1020, longitude: -88.2272, confidence: 'high' },
    
    // Education buildings
    'education building': { latitude: 40.1096, longitude: -88.2272, confidence: 'high' },
    'college of education': { latitude: 40.1096, longitude: -88.2272, confidence: 'high' },
    
    // Materials Science
    'materials science': { latitude: 40.1135, longitude: -88.2244, confidence: 'high' },
    'materials science & eng': { latitude: 40.1135, longitude: -88.2244, confidence: 'high' },
    'materials science & engineering': { latitude: 40.1135, longitude: -88.2244, confidence: 'high' },
    
    // Transportation
    'transportation building': { latitude: 40.1135, longitude: -88.2244, confidence: 'high' },
    
    // Ceramics
    'ceramics building': { latitude: 40.1135, longitude: -88.2244, confidence: 'high' },
    
    // Main Quad
    'main quad': { latitude: 40.1096, longitude: -88.2272, confidence: 'high' },
    'quad': { latitude: 40.1096, longitude: -88.2272, confidence: 'high' },
    
    // Library
    'main library': { latitude: 40.1096, longitude: -88.2272, confidence: 'high' },
    'undergraduate library': { latitude: 40.1096, longitude: -88.2272, confidence: 'high' },
    'ugl': { latitude: 40.1096, longitude: -88.2272, confidence: 'high' },
    
    // Union
    'illini union': { latitude: 40.1096, longitude: -88.2272, confidence: 'high' },
    'union': { latitude: 40.1096, longitude: -88.2272, confidence: 'high' },
    
    // Krannert Center
    'krannert center': { latitude: 40.1096, longitude: -88.2272, confidence: 'high' },
    'krannert': { latitude: 40.1096, longitude: -88.2272, confidence: 'high' },
    
    // Generic campus (lowest priority - only use as last resort)
    'campus': { latitude: 40.1096, longitude: -88.2272, confidence: 'low' },
    'uiuc': { latitude: 40.1096, longitude: -88.2272, confidence: 'low' },
    'university of illinois': { latitude: 40.1096, longitude: -88.2272, confidence: 'low' },
  };

  /**
   * Geocode a location string to coordinates using a real geocoding API
   */
  static async geocodeLocation(locationText: string): Promise<GeocodingResult | null> {
    if (!locationText) {
      return null;
    }

    console.log('🗺️ Geocoding location:', locationText);

    // First, try to extract a clean address from the location text
    const cleanAddress = this.extractAddress(locationText);
    console.log('🗺️ Extracted address:', cleanAddress);

    // Try to geocode using a real API
    try {
      const coordinates = await this.geocodeWithAPI(cleanAddress);
      if (coordinates) {
        console.log(`✅ Geocoded via API:`, coordinates);
        return coordinates;
      }
    } catch (error) {
      console.warn('⚠️ API geocoding failed:', error.message);
    }

    // Fallback to hardcoded matches only if API fails
    const normalizedLocation = locationText.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    console.log('🗺️ Normalized location:', normalizedLocation);

    // Try exact matches first, prioritizing longer/more specific matches
    const sortedBuildings = Object.entries(this.CAMPUS_BUILDINGS)
      .sort(([a], [b]) => b.length - a.length);
    
    for (const [building, coordinates] of sortedBuildings) {
      if (normalizedLocation.includes(building)) {
        console.log(`✅ Found hardcoded match for "${building}":`, coordinates);
        return { ...coordinates, confidence: 'medium' as const };
      }
    }

    // If no match found, return campus center with low confidence
    console.log('⚠️ No building match found, using campus center');
    return {
      latitude: 40.1096,
      longitude: -88.2272,
      confidence: 'low'
    };
  }

  /**
   * Extract a clean address from location text
   */
  private static extractAddress(locationText: string): string {
    // Remove common prefixes and clean up the text
    let address = locationText
      .replace(/^campus:\s*/i, '')
      .replace(/^building:\s*/i, '')
      .replace(/room:\s*\d+.*$/i, '') // Remove room numbers
      .replace(/\s+/g, ' ')
      .trim();

    // Handle specific building mappings to street addresses for better geocoding
    const buildingMappings: Record<string, string> = {
      'business instructional facility': '515 East Gregory Drive, Champaign, IL',
      'business instructional fac': '515 East Gregory Drive, Champaign, IL',
      'bif': '515 East Gregory Drive, Champaign, IL',
      'engineering hall': '1308 West Green Street, Urbana, IL',
      'ece building': '306 North Wright Street, Urbana, IL',
      'main library': '1408 West Gregory Drive, Urbana, IL',
      'illini union': '1401 West Green Street, Urbana, IL',
      'krannert center': '500 South Goodwin Avenue, Urbana, IL',
    };

    // Check for specific building mappings
    const lowerAddress = address.toLowerCase();
    for (const [building, properAddress] of Object.entries(buildingMappings)) {
      if (lowerAddress.includes(building)) {
        return properAddress;
      }
    }

    // If it looks like a building name, add "University of Illinois" for better geocoding
    if (!address.toLowerCase().includes('university') && !address.toLowerCase().includes('champaign')) {
      address = `${address}, University of Illinois, Champaign, IL`;
    }

    return address;
  }

  /**
   * Geocode using a real geocoding API (using OpenStreetMap Nominatim)
   */
  private static async geocodeWithAPI(address: string): Promise<GeocodingResult | null> {
    try {
      const encodedAddress = encodeURIComponent(address);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&countrycodes=us`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'UIUC-MTD-Assistant/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        return {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          confidence: 'high'
        };
      }

      return null;
    } catch (error) {
      console.error('Geocoding API error:', error);
      return null;
    }
  }

  /**
   * Geocode multiple locations
   */
  static async geocodeLocations(locations: string[]): Promise<Map<string, GeocodingResult>> {
    const results = new Map<string, GeocodingResult>();
    
    for (const location of locations) {
      const result = await this.geocodeLocation(location);
      if (result) {
        results.set(location, result);
      }
    }
    
    return results;
  }

  /**
   * Check if a location is on campus
   */
  static isOnCampus(latitude: number, longitude: number): boolean {
    // UIUC campus bounds (approximate)
    const campusBounds = {
      north: 40.1200,
      south: 40.1000,
      east: -88.2100,
      west: -88.2400
    };

    return latitude >= campusBounds.south && 
           latitude <= campusBounds.north && 
           longitude >= campusBounds.west && 
           longitude <= campusBounds.east;
  }
}
