import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

interface Notification {
  id: string
  user_id: string
  trip_plan_id: string
  event_id: string
  title: string
  body: string
  type: string
  status: string
  scheduled_for: string
  sent_at: string
  created_at: string
  updated_at: string
}

interface ExpoPushMessage {
  to: string | string[]
  title?: string
  body?: string
  data?: any
  sound?: 'default' | null
  badge?: number
  channelId?: string
  categoryId?: string
  priority?: 'default' | 'normal' | 'high'
  ttl?: number
  expiration?: number
}

interface ExpoPushResponse {
  data: Array<{
    status: 'ok' | 'error'
    id?: string
    message?: string
    details?: any
  }>
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('📱 ===== FANOUT-PUSH STARTED =====')
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get pending notifications
    const { data: pendingNotifications, error: notificationsError } = await supabase
      .from('notifications')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true })
      .limit(50) // Process up to 50 notifications at a time

    if (notificationsError) {
      console.error('❌ Error fetching pending notifications:', notificationsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch pending notifications', details: notificationsError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📱 Found ${pendingNotifications?.length || 0} pending notifications`)

    if (!pendingNotifications || pendingNotifications.length === 0) {
      console.log('ℹ️ No pending notifications found')
      return new Response(
        JSON.stringify({ message: 'No pending notifications', processed: 0, sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let processedCount = 0
    let sentCount = 0
    let failedCount = 0

    // Process each notification
    for (const notification of pendingNotifications) {
      try {
        console.log(`📱 Processing notification: ${notification.id}`)
        
        // Get user's push tokens
        const { data: pushTokens, error: tokensError } = await supabase
          .from('push_tokens')
          .select('*')
          .eq('user_id', notification.user_id)

        if (tokensError) {
          console.error(`❌ Error fetching push tokens for user ${notification.user_id}:`, tokensError)
          await markNotificationFailed(supabase, notification.id, 'Failed to fetch push tokens')
          failedCount++
          continue
        }

        if (!pushTokens || pushTokens.length === 0) {
          console.log(`⚠️ No push tokens found for user ${notification.user_id}`)
          await markNotificationFailed(supabase, notification.id, 'No push tokens found')
          failedCount++
          continue
        }

        console.log(`📱 Found ${pushTokens.length} push tokens for user ${notification.user_id}`)

        // Prepare push messages
        const pushMessages: ExpoPushMessage[] = pushTokens.map(token => ({
          to: token.token,
          title: notification.title,
          body: notification.body,
          data: {
            notificationId: notification.id,
            tripPlanId: notification.trip_plan_id,
            eventId: notification.event_id,
            type: notification.type,
            userId: notification.user_id
          },
          sound: 'default',
          priority: 'high',
          ttl: 3600, // 1 hour TTL
          channelId: 'bus-notifications'
        }))

        // Send push notifications via Expo Push API
        const expoPushResponse = await sendExpoPushNotifications(pushMessages)
        
        if (expoPushResponse.success) {
          console.log(`✅ Successfully sent push notification: ${notification.id}`)
          await markNotificationSent(supabase, notification.id)
          sentCount++
        } else {
          console.error(`❌ Failed to send push notification: ${notification.id}`, expoPushResponse.error)
          await markNotificationFailed(supabase, notification.id, expoPushResponse.error)
          failedCount++
        }

        processedCount++

      } catch (error) {
        console.error(`💥 Error processing notification ${notification.id}:`, error)
        await markNotificationFailed(supabase, notification.id, error.message)
        failedCount++
        continue
      }
    }

    console.log(`✅ Processed ${processedCount} notifications: ${sentCount} sent, ${failedCount} failed`)
    console.log('📱 ===== FANOUT-PUSH COMPLETED =====')

    return new Response(
      JSON.stringify({ 
        message: 'Fanout-push completed successfully',
        processed: processedCount,
        sent: sentCount,
        failed: failedCount,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('💥 Fanout-push failed:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Fanout-push failed', 
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * Send push notifications via Expo Push API
 */
async function sendExpoPushNotifications(messages: ExpoPushMessage[]): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`📱 Sending ${messages.length} push notifications via Expo Push API`)
    
    const expoPushUrl = 'https://exp.host/--/api/v2/push/send'
    
    const response = await fetch(expoPushUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Expo Push API error: ${response.status} ${response.statusText}`, errorText)
      return { success: false, error: `Expo Push API error: ${response.status} ${errorText}` }
    }

    const result: ExpoPushResponse = await response.json()
    console.log(`📱 Expo Push API response:`, result)

    // Check if any messages failed
    const failedMessages = result.data.filter(msg => msg.status === 'error')
    if (failedMessages.length > 0) {
      console.error(`❌ ${failedMessages.length} push messages failed:`, failedMessages)
      return { success: false, error: `Some push messages failed: ${JSON.stringify(failedMessages)}` }
    }

    console.log(`✅ All ${messages.length} push notifications sent successfully`)
    return { success: true }

  } catch (error) {
    console.error('💥 Error sending Expo push notifications:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Mark notification as sent
 */
async function markNotificationSent(supabase: any, notificationId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('id', notificationId)

    if (error) {
      console.error(`❌ Error marking notification as sent:`, error)
    } else {
      console.log(`✅ Marked notification ${notificationId} as sent`)
    }
  } catch (error) {
    console.error(`💥 Error updating notification status:`, error)
  }
}

/**
 * Mark notification as failed
 */
async function markNotificationFailed(supabase: any, notificationId: string, errorMessage: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({
        status: 'failed',
        sent_at: new Date().toISOString()
      })
      .eq('id', notificationId)

    if (error) {
      console.error(`❌ Error marking notification as failed:`, error)
    } else {
      console.log(`✅ Marked notification ${notificationId} as failed: ${errorMessage}`)
    }
  } catch (error) {
    console.error(`💥 Error updating notification status:`, error)
  }
}
