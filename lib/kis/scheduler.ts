// Background Token Refresh Scheduler
import * as cron from 'node-cron';
import { TokenManager } from './token-manager';
import type { KISEnvironment } from './types';

export class TokenRefreshScheduler {
  private scheduledTask: cron.ScheduledTask | null = null;
  private tokenManager: TokenManager;
  private checkInterval: string = '0 * * * *'; // Every hour

  constructor(environment: KISEnvironment) {
    this.tokenManager = new TokenManager(environment);
  }

  /**
   * Start background token refresh scheduler
   */
  start(): void {
    if (this.scheduledTask) {
      console.warn('Token refresh scheduler is already running');
      return;
    }

    console.log('Starting token refresh scheduler...');

    this.scheduledTask = cron.schedule(this.checkInterval, async () => {
      await this.checkAndRefreshToken();
    });

    // Run initial check
    this.checkAndRefreshToken();
  }

  /**
   * Stop background token refresh scheduler
   */
  stop(): void {
    if (this.scheduledTask) {
      console.log('Stopping token refresh scheduler...');
      this.scheduledTask.stop();
      this.scheduledTask = null;
    }
  }

  /**
   * Check if token is expiring soon and refresh if needed
   */
  private async checkAndRefreshToken(): Promise<void> {
    try {
      const isExpiring = await this.tokenManager.isTokenExpiringSoon();

      if (isExpiring) {
        console.log('Token is expiring soon, refreshing...');
        await this.tokenManager.forceRefresh();
        console.log('Token refreshed successfully');
      } else {
        console.log('Token is still valid, no refresh needed');
      }
    } catch (error) {
      console.error('Failed to check/refresh token:', error);
      // Don't throw - scheduler failures should not crash the process
    }
  }

  /**
   * Manually trigger token check
   */
  async manualCheck(): Promise<void> {
    await this.checkAndRefreshToken();
  }

  /**
   * Check if scheduler is running
   */
  isRunning(): boolean {
    return this.scheduledTask !== null;
  }
}

// Global scheduler instance
let globalScheduler: TokenRefreshScheduler | null = null;

/**
 * Get or create global scheduler instance
 */
export function getScheduler(environment: KISEnvironment): TokenRefreshScheduler {
  if (!globalScheduler) {
    globalScheduler = new TokenRefreshScheduler(environment);
  }
  return globalScheduler;
}

/**
 * Start global scheduler
 */
export function startTokenRefreshScheduler(environment: KISEnvironment): void {
  const scheduler = getScheduler(environment);
  scheduler.start();
}

/**
 * Stop global scheduler
 */
export function stopTokenRefreshScheduler(): void {
  if (globalScheduler) {
    globalScheduler.stop();
  }
}
