import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const CUMTD_API_BASE = "https://developer.mtd.org/api/v2.2/json"
const CUMTD_API_KEY = Deno.env.get("CUMTD_API_KEY")
const CACHE_TTL = 300000 // 5 minutes for routes (they change infrequently)
const RATE_LIMIT_WINDOW = 60000 // 1 minute

// In-memory cache and rate limiting
const cache = new Map<string, { data: any; timestamp: number }>()
const rateLimitTracker = new Map<string, number>()

serve(async (req) => {
  const startTime = Date.now()
  
  try {
    console.log('🚌 ===== TRANSIT ROUTES API CALLED =====')
    console.log('🚌 Request method:', req.method)
    console.log('🚌 Request URL:', req.url)
    
    // Validate API key
    if (!CUMTD_API_KEY) {
      console.error('❌ CUMTD_API_KEY not configured')
      return new Response(JSON.stringify({ 
        error: "CUMTD API key not configured" 
      }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      })
    }

    // Rate limiting
    const clientId = req.headers.get("x-forwarded-for") || "unknown"
    const now = Date.now()
    const lastRequest = rateLimitTracker.get(clientId) || 0
    
    if (now - lastRequest < RATE_LIMIT_WINDOW) {
      console.log('⚠️ Rate limit exceeded for client:', clientId)
      return new Response(JSON.stringify({ 
        error: "Rate limit exceeded. Please wait before making another request." 
      }), { 
        status: 429,
        headers: { "Content-Type": "application/json" }
      })
    }
    
    rateLimitTracker.set(clientId, now)

    // Check cache
    const cacheKey = "all_routes"
    const cached = cache.get(cacheKey)
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      console.log('✅ Returning cached routes data')
      return new Response(JSON.stringify({
        success: true,
        routes: cached.data,
        cached: true,
        cacheAge: Math.floor((now - cached.timestamp) / 1000)
      }), {
        headers: { "Content-Type": "application/json" }
      })
    }

    // Call CUMTD API
    console.log('🚌 Calling CUMTD getroutes API...')
    const cumtdUrl = `${CUMTD_API_BASE}/getroutes?key=${CUMTD_API_KEY}`
    console.log('🚌 CUMTD URL:', cumtdUrl)
    
    const cumtdResponse = await fetch(cumtdUrl)
    const duration = Date.now() - startTime
    
    console.log('🚌 CUMTD API response status:', cumtdResponse.status)
    console.log('🚌 CUMTD API response duration:', duration, 'ms')
    
    if (!cumtdResponse.ok) {
      const errorText = await cumtdResponse.text()
      console.error('❌ CUMTD API error:', cumtdResponse.status, errorText)
      return new Response(JSON.stringify({ 
        error: `CUMTD API error: ${cumtdResponse.status}`,
        details: errorText
      }), { 
        status: cumtdResponse.status,
        headers: { "Content-Type": "application/json" }
      })
    }

    const cumtdData = await cumtdResponse.json()
    console.log('✅ CUMTD API response received')
    console.log('📊 Routes count:', cumtdData.routes?.length || 0)
    
    // Cache the response
    cache.set(cacheKey, { data: cumtdData.routes, timestamp: now })
    
    return new Response(JSON.stringify({
      success: true,
      routes: cumtdData.routes,
      cached: false,
      cacheAge: 0
    }), {
      headers: { "Content-Type": "application/json" }
    })

  } catch (error) {
    console.error('❌ ===== TRANSIT ROUTES API ERROR =====')
    console.error('❌ Error:', error)
    console.error('❌ Error details:', JSON.stringify(error, null, 2))
    
    return new Response(JSON.stringify({ 
      error: "Internal server error",
      details: error.message 
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    })
  }
})
