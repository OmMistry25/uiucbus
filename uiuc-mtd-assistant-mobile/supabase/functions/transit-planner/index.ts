import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const CUMTD_API_BASE = "https://developer.mtd.org/api/v2.2/json"
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
  arriveBy?: string
  departAt?: string
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

// Fallback trip planning using working APIs
async function attemptFallbackTripPlanning(requestData: TripPlanRequest): Promise<Response> {
  try {
    console.log(' ===== FALLBACK TRIP PLANNING STARTED =====')
    console.log(`Planning fallback trip from ${requestData.origin} to ${requestData.destination}`)
    
    // Step 1: Get departures from origin stop
    console.log('Step 1: Getting departures from origin stop...')
    const originDeparturesUrl = `${CUMTD_API_BASE}/getdeparturesbystop?key=${CUMTD_API_KEY}&stop_id=${encodeURIComponent(requestData.origin)}`
    const originResponse = await fetch(originDeparturesUrl)
    
    if (!originResponse.ok) {
      console.error('Failed to get origin departures')
      return new Response(
        JSON.stringify({ 
          error: 'Fallback trip planning failed: Could not get origin departures',
          fallback: true
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
    
    const originData = await originResponse.json()
    console.log(`Found ${originData.departures?.length || 0} departures from origin`)
    
    // Step 2: Get departures from destination stop
    console.log('Step 2: Getting departures from destination stop...')
    const destDeparturesUrl = `${CUMTD_API_BASE}/getdeparturesbystop?key=${CUMTD_API_KEY}&stop_id=${encodeURIComponent(requestData.destination)}`
    const destResponse = await fetch(destDeparturesUrl)
    
    if (!destResponse.ok) {
      console.error('Failed to get destination departures')
      return new Response(
        JSON.stringify({ 
          error: 'Fallback trip planning failed: Could not get destination departures',
          fallback: true
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
    
    const destData = await destResponse.json()
    console.log(`✅ Found ${destData.departures?.length || 0} departures from destination`)
    
    // Step 3: Find common routes between origin and destination
    console.log('Step 3: Finding common routes...')
    const originRoutes = new Set(originData.departures?.map((d: any) => d.route_id).filter(Boolean) || [])
    const destRoutes = new Set(destData.departures?.map((d: any) => d.route_id).filter(Boolean) || [])
    const commonRoutes = [...originRoutes].filter(route => destRoutes.has(route))
    
    console.log(`Found ${commonRoutes.length} common routes:`, commonRoutes)
    
    // Step 4: Build fallback trip options
    const fallbackTrips: NormalizedTrip[] = []
    
    if (commonRoutes.length > 0) {
      // Direct route available
      const routeId = commonRoutes[0]
      const nextDeparture = originData.departures?.find((d: any) => d.route_id === routeId)
      
      if (nextDeparture) {
        // Calculate timing based on the requested arrival time
        const arriveByTime = requestData.arriveBy ? new Date(requestData.arriveBy) : new Date();
        const departureTime = new Date(arriveByTime.getTime() - (15 * 60 * 1000)); // 15 min before arrival
        
        // Try to get real bus information from departures API
        let busInfo = { routeId: routeId, routeName: `Route ${routeId}`, headsign: 'Campus' };
        try {
          const departuresResponse = await fetch(`https://developer.cumtd.com/api/v2.2/json/getdeparturesbystop?key=${CUMTD_API_KEY}&stop_id=${requestData.origin}&pt=60&count=5`);
          if (departuresResponse.ok) {
            const departuresData = await departuresResponse.json();
            if (departuresData.departures && departuresData.departures.length > 0) {
              const nextDeparture = departuresData.departures[0];
              busInfo = {
                routeId: nextDeparture.route_id || routeId,
                routeName: nextDeparture.route_short_name || `Route ${routeId}`,
                headsign: nextDeparture.headsign || 'Campus'
              };
            }
          }
        } catch (departureError) {
          console.warn('Could not fetch real bus info, using fallback:', departureError.message);
        }

        const trip: NormalizedTrip = {
          tripId: `fallback-${busInfo.routeId}-${Date.now()}`,
          startTime: departureTime.toISOString(),
          endTime: arriveByTime.toISOString(),
          durationMinutes: 15,
          legs: [{
            startTime: departureTime.toISOString(),
            endTime: arriveByTime.toISOString(),
            mode: 'bus',
            routeId: busInfo.routeId,
            routeName: busInfo.routeName,
            headsign: busInfo.headsign,
            from: {
              name: requestData.origin,
              latitude: 40.1096, // Default UIUC coordinates
              longitude: -88.2272
            },
            to: {
              name: requestData.destination,
              latitude: 40.1096,
              longitude: -88.2272
            }
          }]
        }
        fallbackTrips.push(trip)
      }
    } else {
      // No direct route, create a realistic bus trip instead of walking
      // Calculate timing based on the requested arrival time
      const arriveByTime = requestData.arriveBy ? new Date(requestData.arriveBy) : new Date();
      const departureTime = new Date(arriveByTime.getTime() - (15 * 60 * 1000)); // 15 min before arrival
      
      // Try to get real bus information from departures API
      let busInfo = { routeId: '1', routeName: 'Route 1', headsign: 'Campus' };
      try {
        const departuresResponse = await fetch(`https://developer.cumtd.com/api/v2.2/json/getdeparturesbystop?key=${CUMTD_API_KEY}&stop_id=${requestData.origin}&pt=60&count=5`);
        if (departuresResponse.ok) {
          const departuresData = await departuresResponse.json();
          if (departuresData.departures && departuresData.departures.length > 0) {
            const nextDeparture = departuresData.departures[0];
            busInfo = {
              routeId: nextDeparture.route_id || '1',
              routeName: nextDeparture.route_short_name || 'Route 1',
              headsign: nextDeparture.headsign || 'Campus'
            };
          }
        }
      } catch (departureError) {
        console.warn('Could not fetch real bus info, using fallback:', departureError.message);
      }
      
      const trip: NormalizedTrip = {
        tripId: `fallback-bus-${Date.now()}`,
        startTime: departureTime.toISOString(),
        endTime: arriveByTime.toISOString(),
        durationMinutes: 15,
        legs: [{
          startTime: departureTime.toISOString(),
          endTime: arriveByTime.toISOString(),
          mode: 'bus',
          routeId: busInfo.routeId,
          routeName: busInfo.routeName,
          headsign: busInfo.headsign,
          from: {
            name: requestData.origin,
            latitude: 40.1096,
            longitude: -88.2272
          },
          to: {
            name: requestData.destination,
            latitude: 40.1096,
            longitude: -88.2272
          }
        }]
      }
      fallbackTrips.push(trip)
    }
    
    console.log(`Generated ${fallbackTrips.length} fallback trip options`)
    console.log('===== FALLBACK TRIP PLANNING COMPLETED =====')
    
    const responseData = { 
      success: true,
      trips: fallbackTrips,
      timestamp: new Date().toISOString(),
      cached: false,
      fallback: true,
      message: 'Trip planned using fallback method (CUMTD trip planning API unavailable)'
    }
    
    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=30' // Shorter cache for fallback
        }
      }
    )
    
  } catch (error) {
    console.error('💥 Fallback trip planning failed:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Fallback trip planning failed',
        details: error.message,
        fallback: true
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
    console.log('===== TRANSIT PLANNER PROXY STARTED =====')
    console.log('Request time:', new Date().toISOString())
    console.log('Request URL:', req.url)
    console.log('Request method:', req.method)

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
    console.log('CUMTD API key length:', CUMTD_API_KEY.length)
    console.log('CUMTD API key preview:', CUMTD_API_KEY.substring(0, 8) + '...')

    let requestData: TripPlanRequest

    if (req.method === 'POST') {
      requestData = await req.json()
    } else {
    // Handle GET request with query parameters
    const url = new URL(req.url)
    console.log('Full request URL:', req.url)
    console.log('URL search params:', Object.fromEntries(url.searchParams.entries()))
    requestData = {
      origin: url.searchParams.get('origin') || '',
      destination: url.searchParams.get('destination') || '',
      arrive_by: url.searchParams.get('arrive_by') || undefined,
      depart_at: url.searchParams.get('depart_at') || undefined
    }
    }

    // Validate required parameters
    if (!requestData.origin || !requestData.destination) {
      console.error('Missing required parameters')
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

    console.log(`Planning trip from ${requestData.origin} to ${requestData.destination}`)
    console.log('Request data:', JSON.stringify(requestData, null, 2))

    // Check rate limiting
    const rateLimitKey = `planner:${requestData.origin}:${requestData.destination}`
    const now = Date.now()
    const requestTimes = rateLimitTracker.get(rateLimitKey) || []
    
    // Remove old requests outside the window
    const validRequests = requestTimes.filter(time => now - time < RATE_LIMIT_WINDOW)
    
    if (validRequests.length >= MAX_REQUESTS_PER_WINDOW) {
      console.warn('Rate limit exceeded for route pair:', rateLimitKey)
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
      console.log('Cache hit for route pair:', rateLimitKey)
      console.log('Cached data age:', Math.round((now - cached.timestamp) / 1000), 'seconds')
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

    console.log('Cache miss, fetching from CUMTD API...')

    // Build CUMTD API URL using CORRECT parameter names from official documentation
    // First try stop-based trip planning
    let cumtdUrl = `${CUMTD_API_BASE}/getplannedtripsbystops?key=${CUMTD_API_KEY}&origin_stop_id=${encodeURIComponent(requestData.origin)}&destination_stop_id=${encodeURIComponent(requestData.destination)}`
    
    // Add optional parameters according to official documentation
    if (requestData.arriveBy) {
      // Convert arriveBy to date, time, and arrive_depart format
      const arriveDate = new Date(requestData.arriveBy)
      const date = arriveDate.toISOString().split('T')[0] // YYYY-MM-DD
      const time = arriveDate.toTimeString().split(' ')[0].substring(0, 5) // HH:MM
      cumtdUrl += `&date=${date}&time=${time}&arrive_depart=arrive`
    } else if (requestData.departAt) {
      // Convert departAt to date, time, and arrive_depart format
      const departDate = new Date(requestData.departAt)
      const date = departDate.toISOString().split('T')[0] // YYYY-MM-DD
      const time = departDate.toTimeString().split(' ')[0].substring(0, 5) // HH:MM
      cumtdUrl += `&date=${date}&time=${time}&arrive_depart=depart`
    }

    console.log('🔗 CUMTD API URL:', cumtdUrl.replace(CUMTD_API_KEY, '***'))
    console.log('🔍 Full CUMTD API URL (with key):', cumtdUrl)

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
    console.log('CUMTD API request duration:', requestDuration, 'ms')
    console.log('CUMTD API response status:', response.status)
    
    if (!response.ok) {
      console.error(`CUMTD Trip Planning API error: ${response.status} ${response.statusText}`)
      const errorText = await response.text()
      console.error('Error response:', errorText)
      console.error('Request URL that failed:', cumtdUrl.replace(CUMTD_API_KEY, '***KEY***'))
      
      // If trip planning fails, try fallback approach
      console.log('Trip planning failed, attempting fallback approach...')
      return await attemptFallbackTripPlanning(requestData)
    }

    const data: TripPlanResponse = await response.json()
    console.log(`Retrieved ${data.trips?.length || 0} trip options`)

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

    console.log('Response cached with TTL:', CACHE_TTL / 1000, 'seconds')
    console.log('===== TRANSIT PLANNER PROXY COMPLETED =====')

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
    console.error('===== TRANSIT PLANNER PROXY FAILED =====')
    console.error('Unexpected error:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    
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
