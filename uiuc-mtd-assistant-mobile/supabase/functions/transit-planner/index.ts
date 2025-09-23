import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const CUMTD_API_BASE = "https://developer.cumtd.com/api/v2.2/json"
const CUMTD_API_KEY = Deno.env.get("CUMTD_API_KEY")

// Cache configuration
const CACHE_TTL = 75 * 1000 // 75 seconds in milliseconds (longer for trip plans)
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute in milliseconds
const MAX_REQUESTS_PER_WINDOW = 1 // Max 1 request per minute per route pair

// In-memory cache (in production, consider using Redis or Supabase KV)
const cache = new Map<string, { data: any; timestamp: number }>()
const rateLimitTracker = new Map<string, number[]>()

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
    console.log('🗺️ ===== TRANSIT PLANNER PROXY STARTED =====')
    console.log('⏰ Request time:', new Date().toISOString())
    console.log('🌐 Request URL:', req.url)
    console.log('📡 Request method:', req.method)

    // Validate API key
    if (!CUMTD_API_KEY) {
      console.error("❌ CUMTD_API_KEY not configured")
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
      console.error('❌ Missing required parameters')
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

    // Check rate limiting
    const rateLimitKey = `planner:${requestData.origin}:${requestData.destination}`
    const now = Date.now()
    const requestTimes = rateLimitTracker.get(rateLimitKey) || []
    
    // Remove old requests outside the window
    const validRequests = requestTimes.filter(time => now - time < RATE_LIMIT_WINDOW)
    
    if (validRequests.length >= MAX_REQUESTS_PER_WINDOW) {
      console.warn('⚠️ Rate limit exceeded for route pair:', rateLimitKey)
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Maximum 1 request per minute per route pair.',
          retryAfter: Math.ceil((validRequests[0] + RATE_LIMIT_WINDOW - now) / 1000)
        }),
        { 
          status: 429,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      )
    }

    // Check cache first
    const cacheKey = `planner:${requestData.origin}:${requestData.destination}:${requestData.arrive_by || requestData.depart_at || 'now'}`
    const cached = cache.get(cacheKey)
    
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      console.log('✅ Cache hit for route pair:', rateLimitKey)
      console.log('📊 Cached data age:', Math.round((now - cached.timestamp) / 1000), 'seconds')
      return new Response(
        JSON.stringify({ 
          ...cached.data, 
          cached: true,
          cacheAge: Math.round((now - cached.timestamp) / 1000)
        }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=75'
          }
        }
      )
    }

    console.log('🔄 Cache miss, fetching from CUMTD API...')

    // Build CUMTD API URL
    let cumtdUrl = `${CUMTD_API_BASE}/getplannedtripsbystops?key=${CUMTD_API_KEY}&origin=${encodeURIComponent(requestData.origin)}&destination=${encodeURIComponent(requestData.destination)}`
    
    if (requestData.arrive_by) {
      cumtdUrl += `&arrive_by=${encodeURIComponent(requestData.arrive_by)}`
    } else if (requestData.depart_at) {
      cumtdUrl += `&depart_at=${encodeURIComponent(requestData.depart_at)}`
    }

    console.log('🔗 CUMTD API URL:', cumtdUrl.replace(CUMTD_API_KEY, '***'))

    // Call CUMTD API
    console.log('📡 Making request to CUMTD API...')
    const startTime = Date.now()
    
    const response = await fetch(cumtdUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'UIUC-MTD-Assistant/1.0'
      }
    })

    const requestDuration = Date.now() - startTime
    console.log('⏱️ CUMTD API request duration:', requestDuration, 'ms')
    console.log('📡 CUMTD API response status:', response.status)
    
    if (!response.ok) {
      console.error(`❌ CUMTD API error: ${response.status} ${response.statusText}`)
      const errorText = await response.text()
      console.error('❌ Error response:', errorText)
      
      return new Response(
        JSON.stringify({ 
          error: `CUMTD API error: ${response.status}`,
          details: errorText
        }),
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

    const responseData = { 
      success: true,
      trips: normalizedTrips,
      timestamp: new Date().toISOString(),
      cached: false,
      requestDuration: requestDuration
    }

    // Update rate limiting tracker
    validRequests.push(now)
    rateLimitTracker.set(rateLimitKey, validRequests)

    // Cache the response
    cache.set(cacheKey, {
      data: responseData,
      timestamp: now
    })

    console.log('💾 Response cached with TTL:', CACHE_TTL / 1000, 'seconds')
    console.log('🗺️ ===== TRANSIT PLANNER PROXY COMPLETED =====')

    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=75' // 75 second cache for trip plans
        }
      }
    )

  } catch (error) {
    console.error('💥 ===== TRANSIT PLANNER PROXY FAILED =====')
    console.error('🚨 Unexpected error:', error)
    console.error('📊 Error details:', JSON.stringify(error, null, 2))
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
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
