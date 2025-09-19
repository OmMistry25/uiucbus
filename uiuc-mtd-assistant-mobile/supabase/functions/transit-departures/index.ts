import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const CUMTD_API_BASE = "https://developer.cumtd.com/api/v2.2/json"
const CUMTD_API_KEY = Deno.env.get("CUMTD_API_KEY")

interface DepartureResponse {
  departures: Array<{
    stop_id: string
    stop_name: string
    route_id: string
    route_name: string
    direction: string
    destination: string
    scheduled_time: string
    expected_time: string
    delay: number
    vehicle_id?: string
  }>
}

interface NormalizedDeparture {
  stopId: string
  stopName: string
  routeId: string
  routeName: string
  direction: string
  destination: string
  scheduledTime: string
  expectedTime: string
  delayMinutes: number
  vehicleId?: string
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
    let stopId = url.searchParams.get('stop_id')
    
    // If not in query params, try request body
    if (!stopId && req.method === 'POST') {
      try {
        const body = await req.json()
        stopId = body.stop_id
      } catch (e) {
        // Ignore JSON parse errors
      }
    }
    
    if (!stopId) {
      return new Response(
        JSON.stringify({ error: "stop_id parameter is required" }),
        { 
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      )
    }

    console.log(`🚌 Fetching departures for stop: ${stopId}`)

    // Call CUMTD API
    const cumtdUrl = `${CUMTD_API_BASE}/getdeparturesbystop?key=${CUMTD_API_KEY}&stop_id=${stopId}&pt=60`
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

    const data: DepartureResponse = await response.json()
    console.log(`✅ Retrieved ${data.departures?.length || 0} departures`)

    // Normalize the response
    const normalizedDepartures: NormalizedDeparture[] = (data.departures || []).map(dep => ({
      stopId: dep.stop_id,
      stopName: dep.stop_name,
      routeId: dep.route_id,
      routeName: dep.route_name,
      direction: dep.direction,
      destination: dep.destination,
      scheduledTime: dep.scheduled_time,
      expectedTime: dep.expected_time,
      delayMinutes: dep.delay,
      vehicleId: dep.vehicle_id
    }))

    return new Response(
      JSON.stringify({ 
        success: true,
        departures: normalizedDepartures,
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
    console.error("Error fetching departures:", error)
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
