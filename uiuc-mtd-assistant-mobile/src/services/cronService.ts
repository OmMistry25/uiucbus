import { supabase } from './supabase';

export interface CronJobResult {
  message: string;
  processed: number;
  notifications: number;
  timestamp: string;
  error?: string;
}

export class CronService {
  /**
   * Manually trigger the schedule-notify cron job for testing
   */
  static async triggerScheduleNotify(): Promise<CronJobResult> {
    try {
      console.log('🕐 Manually triggering schedule-notify cron job...');
      
      const { data, error } = await supabase.functions.invoke('schedule-notify', {
        body: {}
      });

      if (error) {
        console.error('❌ Cron job failed:', error);
        return {
          message: 'Cron job failed',
          processed: 0,
          notifications: 0,
          timestamp: new Date().toISOString(),
          error: error.message
        };
      }

      console.log('✅ Cron job completed:', data);
      return data as CronJobResult;

    } catch (error) {
      console.error('💥 Error triggering cron job:', error);
      return {
        message: 'Error triggering cron job',
        processed: 0,
        notifications: 0,
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Get the status of recent notifications
   */
  static async getNotificationStatus(): Promise<{
    pending: number;
    sent: number;
    failed: number;
    total: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('status')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

      if (error) {
        console.error('❌ Error fetching notification status:', error);
        return { pending: 0, sent: 0, failed: 0, total: 0 };
      }

      const statusCounts = data.reduce((acc, notification) => {
        acc[notification.status] = (acc[notification.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        pending: statusCounts.pending || 0,
        sent: statusCounts.sent || 0,
        failed: statusCounts.failed || 0,
        total: data.length
      };

    } catch (error) {
      console.error('💥 Error getting notification status:', error);
      return { pending: 0, sent: 0, failed: 0, total: 0 };
    }
  }

  /**
   * Get recent trip plans for debugging
   */
  static async getRecentTripPlans(limit: number = 10): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('trip_plans')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Error fetching trip plans:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('💥 Error getting trip plans:', error);
      return [];
    }
  }
}
