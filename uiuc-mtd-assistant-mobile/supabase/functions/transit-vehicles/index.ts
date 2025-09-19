import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const CUMTD_API_BASE = "https://developer.cumtd.com/api/v2.2/json"
const CUMTD_API_KEY = Deno.env.get("CUMTD_API_KEY")

interface VehicleResponse {
  vehicles: Array<{
    vehicle_id: string
    route_id: string
    route_name: string
    direction: string
    destination: string
    lat: number
    lon: number
    heading: number
    speed: number
    last_updated: string
  }>
}

interface NormalizedVehicle {
  vehicleId: string
  routeId: string
  routeName: string
  direction: string
  destination: string
  latitude: number
  longitude: number
  heading: number
  speed: number
  lastUpdated: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      } 
    })
  }

  try {
    // Validate API key
    if (!CUMTD_API_KEY) {
      console.error("CUMTD_API_KEY not configured")
      return new Response(
        JSON.stringify({ error: "CUMTD API key not configured" }),
        { 
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      )
    }

    // Parse parameters from query string or request body
    const url = new URL(req.url)
    let routeId = url.searchParams.get('route_id')
    
    // If not in query params, try request body
    if (!routeId && req.method === 'POST') {
      try {
        const body = await req.json()
        routeId = body.route_id
      } catch (e) {
        // Ignore JSON parse errors
      }
    }
    
    if (!routeId) {
      return new Response(
        JSON.stringify({ error: "route_id parameter is required" }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      )
    }

    console.log(`🚌 Fetching vehicles for route: ${routeId}`)

    // Call CUMTD API
    const cumtdUrl = `${CUMTD_API_BASE}/getvehiclesbyroute?key=${CUMTD_API_KEY}&route_id=${routeId}`
    const response = await fetch(cumtdUrl)
    
    if (!response.ok) {
      console.error(`CUMTD API error: ${response.status} ${response.statusText}`)
      return new Response(
        JSON.stringify({ error: `CUMTD API error: ${response.status}` }),
        { 
          status: response.status,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      )
    }

    const data: VehicleResponse = await response.json()
    console.log(`✅ Retrieved ${data.vehicles?.length || 0} vehicles`)

    // Normalize the response
    const normalizedVehicles: NormalizedVehicle[] = (data.vehicles || []).map(vehicle => ({
      vehicleId: vehicle.vehicle_id,
      routeId: vehicle.route_id,
      routeName: vehicle.route_name,
      direction: vehicle.direction,
      destination: vehicle.destination,
      latitude: vehicle.lat,
      longitude: vehicle.lon,
      heading: vehicle.heading,
      speed: vehicle.speed,
      lastUpdated: vehicle.last_updated
    }))

    return new Response(
      JSON.stringify({ 
        success: true,
        vehicles: normalizedVehicles,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=60' // 60 second cache
        }
      }
    )

  } catch (error) {
    console.error("Error fetching vehicles:", error)
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    )
  }
})
