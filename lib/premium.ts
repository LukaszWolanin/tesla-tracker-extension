import { storage } from 'wxt/utils/storage';

const PREMIUM_KEY = 'local:premiumStatus';

export interface PremiumStatus {
  active: boolean;
  purchaseDate?: string;
  expiresAt?: string; // null = lifetime
  tier: 'free' | 'pass'; // 'pass' = one-time Delivery Pass
}

const FREE_STATUS: PremiumStatus = { active: false, tier: 'free' };

export async function getPremiumStatus(): Promise<PremiumStatus> {
  const stored = await storage.getItem<PremiumStatus>(PREMIUM_KEY);
  if (!stored) return FREE_STATUS;

  // Check expiry if set
  if (stored.expiresAt && new Date(stored.expiresAt) < new Date()) {
    return FREE_STATUS;
  }

  return stored;
}

export async function setPremiumStatus(status: PremiumStatus): Promise<void> {
  await storage.setItem(PREMIUM_KEY, status);
}

export async function isPremium(): Promise<boolean> {
  const status = await getPremiumStatus();
  return status.active;
}

// ── Feature Gates ──

export interface FeatureLimits {
  minPollIntervalMinutes: number;
  maxOrders: number;
  canExport: boolean;
  canViewPostDelivery: boolean;
  canViewMilestones: boolean;
  pollIntervalLabel: string;
}

export const FREE_LIMITS: FeatureLimits = {
  minPollIntervalMinutes: 10,
  maxOrders: 1,
  canExport: false,
  canViewPostDelivery: false,
  canViewMilestones: true,
  pollIntervalLabel: 'co 10 min',
};

export const PREMIUM_LIMITS: FeatureLimits = {
  minPollIntervalMinutes: 1,
  maxOrders: 10,
  canExport: true,
  canViewPostDelivery: true,
  canViewMilestones: true,
  pollIntervalLabel: 'co 1 min',
};

export async function getFeatureLimits(): Promise<FeatureLimits> {
  return (await isPremium()) ? PREMIUM_LIMITS : FREE_LIMITS;
}
