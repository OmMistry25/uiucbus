import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UserSettings {
  id: string
  user_id: string
  home_point: any
  notify_lead_minutes: number
  quiet_hours_start: string
  quiet_hours_end: string
  timezone: string
  created_at: string
  updated_at: string
}

interface CalendarEvent {
  id: string
  user_id: string
  title: string
  start_time: string
  end_time: string
  location_text: string
  destination_point: any
  created_at: string
  updated_at: string
}

interface TripPlan {
  id: string
  user_id: string
  event_id: string
  origin: string
  destination: string
  planned_trip: any
  departure_time: string
  arrival_time: string
  created_at: string
  updated_at: string
}

interface PushToken {
  id: string
  user_id: string
  token: string
  platform: string
  device_id: string
  created_at: string
  updated_at: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🕐 ===== CRON SCHEDULE-NOTIFY STARTED =====')
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get current time and look ahead window (30-60 minutes)
    const now = new Date()
    const lookAheadStart = new Date(now.getTime() + 30 * 60 * 1000) // 30 min from now
    const lookAheadEnd = new Date(now.getTime() + 60 * 60 * 1000)   // 60 min from now
    
    console.log(`🕐 Current time: ${now.toISOString()}`)
    console.log(`🕐 Looking ahead: ${lookAheadStart.toISOString()} to ${lookAheadEnd.toISOString()}`)

    // Get all users with notification settings
    const { data: users, error: usersError } = await supabase
      .from('user_settings')
      .select('*')
      .not('notify_lead_minutes', 'is', null)

    if (usersError) {
      console.error('❌ Error fetching users:', usersError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch users', details: usersError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`👥 Found ${users?.length || 0} users with notification settings`)

    if (!users || users.length === 0) {
      console.log('ℹ️ No users found, exiting')
      return new Response(
        JSON.stringify({ message: 'No users found', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let processedCount = 0
    let notificationCount = 0

    // Process each user
    for (const userSettings of users) {
      try {
        console.log(`👤 Processing user: ${userSettings.user_id}`)
        
        // Check if we're in quiet hours
        if (isInQuietHours(now, userSettings.quiet_hours_start, userSettings.quiet_hours_end)) {
          console.log(`😴 User ${userSettings.user_id} is in quiet hours, skipping`)
          continue
        }

        // Get user's upcoming events in the look-ahead window
        const { data: events, error: eventsError } = await supabase
          .from('events')
          .select('*')
          .eq('user_id', userSettings.user_id)
          .gte('start_time', lookAheadStart.toISOString())
          .lte('start_time', lookAheadEnd.toISOString())
          .order('start_time', { ascending: true })

        if (eventsError) {
          console.error(`❌ Error fetching events for user ${userSettings.user_id}:`, eventsError)
          continue
        }

        if (!events || events.length === 0) {
          console.log(`📅 No events found for user ${userSettings.user_id} in look-ahead window`)
          continue
        }

        console.log(`📅 Found ${events.length} events for user ${userSettings.user_id}`)

        // Process the next event
        const nextEvent = events[0]
        console.log(`🎯 Processing next event: ${nextEvent.title} at ${nextEvent.start_time}`)

        // Check if we already have a recent trip plan for this event
        const { data: existingPlan, error: planError } = await supabase
          .from('trip_plans')
          .select('*')
          .eq('user_id', userSettings.user_id)
          .eq('event_id', nextEvent.id)
          .gte('created_at', new Date(now.getTime() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (planError && planError.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error(`❌ Error fetching existing plan for user ${userSettings.user_id}:`, planError)
          continue
        }

        // If no recent plan exists, create a new one
        if (!existingPlan) {
          console.log(`🆕 No recent plan found, creating new trip plan for event ${nextEvent.id}`)
          
          const newPlan = await createTripPlan(supabase, userSettings, nextEvent)
          if (newPlan) {
            console.log(`✅ Created new trip plan: ${newPlan.id}`)
            
            // Check if we should send a notification
            const shouldNotify = await shouldSendNotification(supabase, userSettings, newPlan, nextEvent)
            if (shouldNotify) {
              await enqueueNotification(supabase, userSettings.user_id, newPlan, nextEvent)
              notificationCount++
            }
          }
        } else {
          console.log(`🔄 Existing plan found: ${existingPlan.id}, checking for updates`)
          
          // Check if the existing plan needs updating (e.g., due to delays)
          const updatedPlan = await updateTripPlanIfNeeded(supabase, userSettings, nextEvent, existingPlan)
          if (updatedPlan && updatedPlan !== existingPlan) {
            console.log(`🔄 Plan updated: ${updatedPlan.id}`)
            
            // Check if we should send a notification about the update
            const shouldNotify = await shouldSendNotification(supabase, userSettings, updatedPlan, nextEvent)
            if (shouldNotify) {
              await enqueueNotification(supabase, userSettings.user_id, updatedPlan, nextEvent)
              notificationCount++
            }
          }
        }

        processedCount++

      } catch (error) {
        console.error(`💥 Error processing user ${userSettings.user_id}:`, error)
        continue
      }
    }

    console.log(`✅ Processed ${processedCount} users, sent ${notificationCount} notifications`)
    console.log('🕐 ===== CRON SCHEDULE-NOTIFY COMPLETED =====')

    return new Response(
      JSON.stringify({ 
        message: 'Cron job completed successfully',
        processed: processedCount,
        notifications: notificationCount,
        timestamp: now.toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('💥 Cron job failed:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Cron job failed', 
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * Check if current time is within quiet hours
 */
function isInQuietHours(now: Date, startTime: string, endTime: string): boolean {
  const currentTime = now.toTimeString().substring(0, 5) // HH:MM format
  
  // Handle quiet hours that cross midnight (e.g., 22:00 to 08:00)
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime <= endTime
  } else {
    return currentTime >= startTime && currentTime <= endTime
  }
}

/**
 * Create a new trip plan for an event
 */
async function createTripPlan(supabase: any, userSettings: UserSettings, event: CalendarEvent): Promise<TripPlan | null> {
  try {
    console.log(`🗺️ Creating trip plan for event: ${event.title}`)
    
    // Call the transit planner Edge Function
    const transitPlannerUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/transit-planner`
    const transitPlannerResponse = await fetch(transitPlannerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      },
      body: JSON.stringify({
        origin: userSettings.home_point ? 
          `${userSettings.home_point.coordinates[1]},${userSettings.home_point.coordinates[0]}` : 
          '40.1096,-88.2272', // Default UIUC coordinates
        destination: event.destination_point ? 
          `${event.destination_point.coordinates[1]},${event.destination_point.coordinates[0]}` : 
          '40.1096,-88.2272',
        arrive_by: event.start_time
      })
    })

    if (!transitPlannerResponse.ok) {
      console.error(`❌ Transit planner failed: ${transitPlannerResponse.status}`)
      return null
    }

    const plannerData = await transitPlannerResponse.json()
    console.log(`✅ Transit planner response:`, plannerData)

    if (!plannerData.success || !plannerData.trips || plannerData.trips.length === 0) {
      console.log(`⚠️ No trips found for event: ${event.title}`)
      return null
    }

    const bestTrip = plannerData.trips[0]
    
    // Save the trip plan to database
    const { data: tripPlan, error: saveError } = await supabase
      .from('trip_plans')
      .insert({
        user_id: userSettings.user_id,
        event_id: event.id,
        origin: userSettings.home_point ? 
          `${userSettings.home_point.coordinates[1]},${userSettings.home_point.coordinates[0]}` : 
          '40.1096,-88.2272',
        destination: event.destination_point ? 
          `${event.destination_point.coordinates[1]},${event.destination_point.coordinates[0]}` : 
          '40.1096,-88.2272',
        planned_trip: bestTrip,
        departure_time: bestTrip.startTime,
        arrival_time: bestTrip.endTime
      })
      .select()
      .single()

    if (saveError) {
      console.error(`❌ Error saving trip plan:`, saveError)
      return null
    }

    return tripPlan

  } catch (error) {
    console.error(`💥 Error creating trip plan:`, error)
    return null
  }
}

/**
 * Update trip plan if needed (e.g., due to delays or schedule changes)
 */
async function updateTripPlanIfNeeded(supabase: any, userSettings: UserSettings, event: CalendarEvent, existingPlan: TripPlan): Promise<TripPlan | null> {
  try {
    // For now, we'll just return the existing plan
    // In the future, this could check for delays, schedule changes, etc.
    console.log(`🔄 Checking if plan needs update: ${existingPlan.id}`)
    
    // TODO: Implement delay detection logic here
    // For now, return existing plan
    return existingPlan

  } catch (error) {
    console.error(`💥 Error updating trip plan:`, error)
    return null
  }
}

/**
 * Determine if we should send a notification
 */
async function shouldSendNotification(supabase: any, userSettings: UserSettings, tripPlan: TripPlan, event: CalendarEvent): Promise<boolean> {
  try {
    const departureTime = new Date(tripPlan.departure_time)
    const now = new Date()
    const leadTime = userSettings.notify_lead_minutes * 60 * 1000 // Convert to milliseconds
    
    // Check if we're within the notification window
    const notificationTime = new Date(departureTime.getTime() - leadTime)
    const timeUntilNotification = notificationTime.getTime() - now.getTime()
    
    console.log(`🔔 Checking notification timing:`)
    console.log(`   Departure: ${departureTime.toISOString()}`)
    console.log(`   Notification time: ${notificationTime.toISOString()}`)
    console.log(`   Time until notification: ${Math.round(timeUntilNotification / 60000)} minutes`)
    
    // Send notification if we're within 2 minutes of the notification time
    const shouldNotify = timeUntilNotification <= 2 * 60 * 1000 && timeUntilNotification >= -2 * 60 * 1000
    
    if (shouldNotify) {
      console.log(`✅ Should send notification for trip plan: ${tripPlan.id}`)
    } else {
      console.log(`⏰ Not yet time for notification (${Math.round(timeUntilNotification / 60000)} min until)`)
    }
    
    return shouldNotify

  } catch (error) {
    console.error(`💥 Error checking notification timing:`, error)
    return false
  }
}

/**
 * Enqueue a notification for sending
 */
async function enqueueNotification(supabase: any, userId: string, tripPlan: TripPlan, event: CalendarEvent): Promise<void> {
  try {
    console.log(`📤 Enqueueing notification for user: ${userId}`)
    
    // Get user's push tokens
    const { data: pushTokens, error: tokensError } = await supabase
      .from('push_tokens')
      .select('*')
      .eq('user_id', userId)

    if (tokensError) {
      console.error(`❌ Error fetching push tokens:`, tokensError)
      return
    }

    if (!pushTokens || pushTokens.length === 0) {
      console.log(`⚠️ No push tokens found for user: ${userId}`)
      return
    }

    // Create notification record
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        trip_plan_id: tripPlan.id,
        event_id: event.id,
        title: `Time to leave for ${event.title}`,
        body: `Your bus departs in ${Math.round((new Date(tripPlan.departure_time).getTime() - Date.now()) / 60000)} minutes`,
        type: 'departure_reminder',
        status: 'pending',
        scheduled_for: new Date().toISOString()
      })
      .select()
      .single()

    if (notificationError) {
      console.error(`❌ Error creating notification:`, notificationError)
      return
    }

    console.log(`✅ Notification enqueued: ${notification.id}`)

    // Trigger the fanout-push function to actually send the notification
    try {
      const fanoutPushUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/fanout-push`
      const fanoutResponse = await fetch(fanoutPushUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })

      if (fanoutResponse.ok) {
        const fanoutResult = await fanoutResponse.json()
        console.log(`📱 Fanout-push triggered successfully:`, fanoutResult)
      } else {
        console.error(`❌ Fanout-push failed: ${fanoutResponse.status}`)
      }
    } catch (error) {
      console.error(`💥 Error triggering fanout-push:`, error)
    }

  } catch (error) {
    console.error(`💥 Error enqueueing notification:`, error)
  }
}
