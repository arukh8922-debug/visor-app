/**
 * Zod Validation Schemas for API Routes
 */

import { z } from 'zod';

// ===========================================
// COMMON SCHEMAS
// ===========================================

// Ethereum address validation
export const addressSchema = z.string().regex(
  /^0x[a-fA-F0-9]{40}$/,
  'Invalid Ethereum address format'
);

// Transaction hash validation
export const txHashSchema = z.string().regex(
  /^0x[a-fA-F0-9]{64}$/,
  'Invalid transaction hash format'
);

// ===========================================
// USER API SCHEMAS
// ===========================================

export const registerUserSchema = z.object({
  wallet_address: addressSchema,
  fid: z.number().int().positive().optional(),
  referrer: addressSchema.optional(),
});

export const getUserParamsSchema = z.object({
  address: addressSchema,
});

// ===========================================
// REFERRAL API SCHEMAS
// ===========================================

export const processReferralSchema = z.object({
  referrer_address: addressSchema,
  referred_address: addressSchema,
});

export const getReferralParamsSchema = z.object({
  address: addressSchema,
});

// ===========================================
// POINTS API SCHEMAS
// ===========================================

export const addPointsSchema = z.object({
  wallet_address: addressSchema,
  amount: z.number().int().positive().max(1000000),
  reason: z.enum(['nft_mint', 'referral', 'daily_checkin', 'streak_bonus']),
  tx_hash: txHashSchema.optional(),
});

// ===========================================
// WHITELIST API SCHEMAS
// ===========================================

export const getWhitelistParamsSchema = z.object({
  address: addressSchema,
});

// ===========================================
// NFT API SCHEMAS
// ===========================================

export const mintCallbackSchema = z.object({
  wallet_address: addressSchema,
  tx_hash: txHashSchema,
  amount: z.number().int().positive().max(100),
});

// ===========================================
// CHECKIN API SCHEMAS
// ===========================================

export const checkinSchema = z.object({
  wallet_address: addressSchema,
  tx_hash: txHashSchema,
  platform: z.enum(['fc_mobile', 'fc_desktop', 'base_app', 'browser']),
});

// ===========================================
// LEADERBOARD API SCHEMAS
// ===========================================

export const leaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// ===========================================
// HELPER FUNCTIONS
// ===========================================

export type ValidationResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Safely parse and validate data with Zod schema
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  try {
    const result = schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    }
    // Get first error message
    const errorMessage = result.error.issues[0]?.message || 'Validation failed';
    return { success: false, error: errorMessage };
  } catch {
    return { success: false, error: 'Validation failed' };
  }
}

/**
 * Validate request body
 */
export async function validateBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json();
    return validateData(schema, body);
  } catch {
    return { success: false, error: 'Invalid JSON body' };
  }
}

/**
 * Validate URL params
 */
export function validateParams<T>(
  params: Record<string, string>,
  schema: z.ZodSchema<T>
): ValidationResult<T> {
  return validateData(schema, params);
}

/**
 * Validate query string
 */
export function validateQuery<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): ValidationResult<T> {
  const query = Object.fromEntries(searchParams.entries());
  return validateData(schema, query);
}
