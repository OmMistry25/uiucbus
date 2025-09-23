import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// CUMTD API configuration
const CUMTD_API_BASE = 'https://developer.cumtd.com/api/v2.2/json'
const CUMTD_API_KEY = Deno.env.get('CUMTD_API_KEY')

// Cache configuration
const CACHE_TTL = 60 * 1000 // 60 seconds in milliseconds
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute in milliseconds
const MAX_REQUESTS_PER_WINDOW = 1 // Max 1 request per minute per route

// In-memory cache (in production, consider using Redis or Supabase KV)
const cache = new Map<string, { data: any; timestamp: number }>()
const rateLimitTracker = new Map<string, number[]>()

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚌 ===== TRANSIT VEHICLES PROXY STARTED =====')
    console.log('⏰ Request time:', new Date().toISOString())
    console.log('🌐 Request URL:', req.url)
    console.log('📡 Request method:', req.method)

    // Parse query parameters
    const url = new URL(req.url)
    const routeId = url.searchParams.get('route_id')
    
    if (!routeId) {
      console.error('❌ Missing route_id parameter')
      return new Response(
        JSON.stringify({ error: 'route_id parameter is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('🛣️ Requested route ID:', routeId)

    // Check rate limiting
    const rateLimitKey = `vehicles:${routeId}`
    const now = Date.now()
    const requestTimes = rateLimitTracker.get(rateLimitKey) || []
    
    // Remove old requests outside the window
    const validRequests = requestTimes.filter(time => now - time < RATE_LIMIT_WINDOW)
    
    if (validRequests.length >= MAX_REQUESTS_PER_WINDOW) {
      console.warn('⚠️ Rate limit exceeded for route:', routeId)
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Maximum 1 request per minute per route.',
          retryAfter: Math.ceil((validRequests[0] + RATE_LIMIT_WINDOW - now) / 1000)
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check cache first
    const cacheKey = `vehicles:${routeId}`
    const cached = cache.get(cacheKey)
    
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      console.log('✅ Cache hit for route:', routeId)
      console.log('📊 Cached data age:', Math.round((now - cached.timestamp) / 1000), 'seconds')
      return new Response(
        JSON.stringify({ 
          ...cached.data, 
          cached: true,
          cacheAge: Math.round((now - cached.timestamp) / 1000)
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('🔄 Cache miss, fetching from CUMTD API...')

    // Validate API key
    if (!CUMTD_API_KEY) {
      console.error('❌ CUMTD_API_KEY environment variable not set')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Build CUMTD API URL
    const cumtdUrl = `${CUMTD_API_BASE}/getvehiclesbyroute?key=${CUMTD_API_KEY}&route_id=${encodeURIComponent(routeId)}`
    console.log('🔗 CUMTD API URL:', cumtdUrl.replace(CUMTD_API_KEY, '***'))

    // Make request to CUMTD API
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
      console.error('❌ CUMTD API request failed:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('❌ Error response:', errorText)
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch vehicles from CUMTD API',
          status: response.status,
          details: errorText
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const data = await response.json()
    console.log('✅ CUMTD API response received')
    console.log('📊 Response data keys:', Object.keys(data))
    console.log('📊 Vehicles count:', data.vehicles?.length || 0)

    // Update rate limiting tracker
    validRequests.push(now)
    rateLimitTracker.set(rateLimitKey, validRequests)

    // Cache the response
    cache.set(cacheKey, {
      data: data,
      timestamp: now
    })

    console.log('💾 Response cached with TTL:', CACHE_TTL / 1000, 'seconds')
    console.log('🚌 ===== TRANSIT VEHICLES PROXY COMPLETED =====')

    // Return the response
    return new Response(
      JSON.stringify({ 
        ...data, 
        cached: false,
        requestDuration: requestDuration
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('💥 ===== TRANSIT VEHICLES PROXY FAILED =====')
    console.error('🚨 Unexpected error:', error)
    console.error('📊 Error details:', JSON.stringify(error, null, 2))
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})