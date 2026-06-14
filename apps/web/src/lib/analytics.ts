/**
 * LifeLedger Client Analytics Wrapper
 * Interfaces with PostHog or falls back to standard structured logging in development.
 */

export interface TrackEventProperties {
  [key: string]: any;
}

class AnalyticsService {
  private enabled = false;
  private posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY || '';
  private posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

  constructor() {
    if (typeof window !== 'undefined' && this.posthogKey) {
      this.enabled = true;
      // Asynchronously initialize PostHog
      try {
        const win = window as any;
        win.posthog = win.posthog || [];
        win.posthog.init(this.posthogKey, {
          api_host: this.posthogHost,
          loaded: (ph: any) => {
            console.log('PostHog initialized successfully.');
          },
        });
      } catch (err) {
        console.error('Failed to initialize PostHog', err);
      }
    }
  }

  identify(userId: string, properties?: TrackEventProperties) {
    if (this.enabled && typeof window !== 'undefined') {
      try {
        (window as any).posthog?.identify(userId, properties);
      } catch (err) {
        console.error('Analytics: identify failed', err);
      }
    } else {
      console.log(`[Analytics: Identify] User ${userId}`, properties);
    }
  }

  track(eventName: string, properties?: TrackEventProperties) {
    if (this.enabled && typeof window !== 'undefined') {
      try {
        (window as any).posthog?.capture(eventName, properties);
      } catch (err) {
        console.error(`Analytics: track event "${eventName}" failed`, err);
      }
    } else {
      console.log(`[Analytics: Track] "${eventName}"`, properties);
    }
  }

  page() {
    if (this.enabled && typeof window !== 'undefined') {
      try {
        (window as any).posthog?.capture('$pageview');
      } catch (err) {
        console.error('Analytics: pageview failed', err);
      }
    } else {
      console.log(`[Analytics: PageView] ${window.location.pathname}`);
    }
  }
}

export const analytics = new AnalyticsService();
