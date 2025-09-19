import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const CUMTD_API_BASE = "https://developer.cumtd.com/api/v2.2/json"
const CUMTD_API_KEY = Deno.env.get("CUMTD_API_KEY")

interface TripPlanRequest {
  origin: string
  destination: string
  arrive_by?: string
  depart_at?: string
}

interface TripPlanResponse {
  trips: Array<{
    trip_id: string
    start_time: string
    end_time: string
    duration: number
    legs: Array<{
      start_time: string
      end_time: string
      mode: string
      route_id?: string
      route_name?: string
      from: {
        name: string
        lat: number
        lon: number
      }
      to: {
        name: string
        lat: number
        lon: number
      }
    }>
  }>
}

interface NormalizedTrip {
  tripId: string
  startTime: string
  endTime: string
  durationMinutes: number
  legs: Array<{
    startTime: string
    endTime: string
    mode: string
    routeId?: string
    routeName?: string
    from: {
      name: string
      latitude: number
      longitude: number
    }
    to: {
      name: string
      latitude: number
      longitude: number
    }
  }>
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

    let requestData: TripPlanRequest

    if (req.method === 'POST') {
      requestData = await req.json()
    } else {
      // Handle GET request with query parameters
      const url = new URL(req.url)
      requestData = {
        origin: url.searchParams.get('origin') || '',
        destination: url.searchParams.get('destination') || '',
        arrive_by: url.searchParams.get('arrive_by') || undefined,
        depart_at: url.searchParams.get('depart_at') || undefined
      }
    }

    // Validate required parameters
    if (!requestData.origin || !requestData.destination) {
      return new Response(
        JSON.stringify({ error: "origin and destination parameters are required" }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      )
    }

    console.log(`🗺️ Planning trip from ${requestData.origin} to ${requestData.destination}`)

    // Build CUMTD API URL
    let cumtdUrl = `${CUMTD_API_BASE}/getplannedtripsbystops?key=${CUMTD_API_KEY}&origin=${encodeURIComponent(requestData.origin)}&destination=${encodeURIComponent(requestData.destination)}`
    
    if (requestData.arrive_by) {
      cumtdUrl += `&arrive_by=${encodeURIComponent(requestData.arrive_by)}`
    } else if (requestData.depart_at) {
      cumtdUrl += `&depart_at=${encodeURIComponent(requestData.depart_at)}`
    }

    // Call CUMTD API
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

    const data: TripPlanResponse = await response.json()
    console.log(`✅ Retrieved ${data.trips?.length || 0} trip options`)

    // Normalize the response
    const normalizedTrips: NormalizedTrip[] = (data.trips || []).map(trip => ({
      tripId: trip.trip_id,
      startTime: trip.start_time,
      endTime: trip.end_time,
      durationMinutes: trip.duration,
      legs: trip.legs.map(leg => ({
        startTime: leg.start_time,
        endTime: leg.end_time,
        mode: leg.mode,
        routeId: leg.route_id,
        routeName: leg.route_name,
        from: {
          name: leg.from.name,
          latitude: leg.from.lat,
          longitude: leg.from.lon
        },
        to: {
          name: leg.to.name,
          latitude: leg.to.lat,
          longitude: leg.to.lon
        }
      }))
    }))

    return new Response(
      JSON.stringify({ 
        success: true,
        trips: normalizedTrips,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=75' // 75 second cache for trip plans
        }
      }
    )

  } catch (error) {
    console.error("Error planning trip:", error)
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
