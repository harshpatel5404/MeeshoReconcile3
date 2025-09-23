import { db } from '../db.js';
import { users } from '../../shared/schema.js';
import { eq, sql } from 'drizzle-orm';
import { createHash } from 'node:crypto';

export interface UsageInfo {
  currentUsage: number;
  monthlyQuota: number;
  remainingUsage: number;
  canProcess: boolean;
  resetDate: Date;
}

export class UsageTracker {
  /**
   * Check if user can process a file (has remaining quota)
   */
  static async canUserProcess(userId: string): Promise<UsageInfo> {
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (!user.length) {
      throw new Error('User not found');
    }

    const userRecord = user[0];
    const now = new Date();
    const lastReset = new Date(userRecord.lastUsageReset!);
    
    // Check if we need to reset monthly usage (if it's a new month)
    const needsReset = this.shouldResetUsage(lastReset, now);
    
    let currentUsage = userRecord.currentMonthUsage || 0;
    let resetDate = lastReset;
    
    if (needsReset) {
      // Reset usage for new month
      await db
        .update(users)
        .set({
          currentMonthUsage: 0,
          lastUsageReset: now,
        })
        .where(eq(users.id, userId));
      
      currentUsage = 0;
      resetDate = now;
    }

    const monthlyQuota = userRecord.monthlyQuota || 10;
    const remainingUsage = Math.max(0, monthlyQuota - currentUsage);
    const canProcess = remainingUsage > 0;

    // Calculate next reset date (beginning of next month)
    const nextReset = new Date(resetDate.getFullYear(), resetDate.getMonth() + 1, 1);

    return {
      currentUsage,
      monthlyQuota,
      remainingUsage,
      canProcess,
      resetDate: nextReset,
    };
  }

  /**
   * Record a file processing operation for the user (atomic)
   */
  static async recordUsage(userId: string): Promise<UsageInfo> {
    const now = new Date();
    
    // Atomic check and increment with monthly reset if needed
    const result = await db
      .update(users)
      .set({
        currentMonthUsage: sql`CASE 
          WHEN EXTRACT(month FROM ${users.lastUsageReset}::timestamp) != EXTRACT(month FROM ${now}::timestamp) 
            OR EXTRACT(year FROM ${users.lastUsageReset}::timestamp) != EXTRACT(year FROM ${now}::timestamp)
          THEN 1 
          ELSE ${users.currentMonthUsage} + 1 
        END`,
        lastUsageReset: sql`CASE 
          WHEN EXTRACT(month FROM ${users.lastUsageReset}::timestamp) != EXTRACT(month FROM ${now}::timestamp) 
            OR EXTRACT(year FROM ${users.lastUsageReset}::timestamp) != EXTRACT(year FROM ${now}::timestamp)
          THEN ${now}
          ELSE ${users.lastUsageReset}
        END`
      })
      .where(sql`${users.id} = ${userId} AND (
        CASE 
          WHEN EXTRACT(month FROM ${users.lastUsageReset}::timestamp) != EXTRACT(month FROM ${now}::timestamp) 
            OR EXTRACT(year FROM ${users.lastUsageReset}::timestamp) != EXTRACT(year FROM ${now}::timestamp)
          THEN 1 
          ELSE ${users.currentMonthUsage} + 1 
        END
      ) <= ${users.monthlyQuota}`)
      .returning();

    if (result.length === 0) {
      // Usage limit exceeded or user not found
      const usageInfo = await this.getUsageInfo(userId);
      throw new Error(`Monthly quota exceeded. You have processed ${usageInfo.currentUsage}/${usageInfo.monthlyQuota} files this month. Quota resets on ${usageInfo.resetDate.toDateString()}.`);
    }

    const updatedUser = result[0];
    const nextReset = new Date(updatedUser.lastUsageReset!.getFullYear(), updatedUser.lastUsageReset!.getMonth() + 1, 1);

    return {
      currentUsage: updatedUser.currentMonthUsage || 0,
      monthlyQuota: updatedUser.monthlyQuota || 10,
      remainingUsage: (updatedUser.monthlyQuota || 10) - (updatedUser.currentMonthUsage || 0),
      canProcess: (updatedUser.currentMonthUsage || 0) < (updatedUser.monthlyQuota || 10),
      resetDate: nextReset,
    };
  }

  /**
   * Get current usage info without modifying it
   */
  static async getUsageInfo(userId: string): Promise<UsageInfo> {
    return this.canUserProcess(userId);
  }

  /**
   * Check if usage should be reset based on dates
   */
  private static shouldResetUsage(lastReset: Date, now: Date): boolean {
    // Reset if it's a different month or year
    return (
      lastReset.getMonth() !== now.getMonth() ||
      lastReset.getFullYear() !== now.getFullYear()
    );
  }

  /**
   * Generate a deterministic unique global SKU for a product
   */
  static generateGlobalSku(userId: string, originalSku: string): string {
    // Normalize the SKU for consistency
    const normalizedSku = originalSku.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Create a deterministic hash from userId and normalized SKU
    const input = `${userId}:${normalizedSku}`;
    const hash = createHash('sha256').update(input).digest('hex');
    
    // Take first 16 characters for readability while maintaining uniqueness
    const hashPrefix = hash.substring(0, 16).toUpperCase();
    
    return `GLB-${hashPrefix}`;
  }

  /**
   * Admin function to reset user's monthly quota (for testing or special cases)
   */
  static async resetUserQuota(userId: string): Promise<void> {
    await db
      .update(users)
      .set({
        currentMonthUsage: 0,
        lastUsageReset: new Date(),
      })
      .where(eq(users.id, userId));
  }

  /**
   * Admin function to set custom quota for a user
   */
  static async setUserQuota(userId: string, newQuota: number): Promise<void> {
    await db
      .update(users)
      .set({
        monthlyQuota: newQuota,
      })
      .where(eq(users.id, userId));
  }
}