/**
 * Environment Variables Validation
 * Validates required env vars on app startup
 */

interface EnvConfig {
  name: string;
  required: boolean;
  isPublic: boolean;
}

const ENV_VARS: EnvConfig[] = [
  // Supabase
  { name: 'NEXT_PUBLIC_SUPABASE_URL', required: true, isPublic: true },
  { name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', required: true, isPublic: true },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', required: false, isPublic: false }, // Only needed server-side
  
  // App
  { name: 'NEXT_PUBLIC_APP_URL', required: true, isPublic: true },
  
  // Farcaster
  { name: 'NEYNAR_API_KEY', required: true, isPublic: false }, // For user profile lookup
  { name: 'NEXT_PUBLIC_CREATOR_FID_1', required: true, isPublic: true },
  { name: 'NEXT_PUBLIC_CREATOR_FID_2', required: true, isPublic: true },
  
  // NFT
  { name: 'NEXT_PUBLIC_VISOR_NFT_SYMBOL', required: true, isPublic: true },
  { name: 'NEXT_PUBLIC_VISOR_NFT_ADDRESS_MAINNET', required: true, isPublic: true },
  
  // Points
  { name: 'NEXT_PUBLIC_POINTS_PER_MINT', required: false, isPublic: true },
  { name: 'NEXT_PUBLIC_POINTS_PER_REFERRAL', required: false, isPublic: true },
  { name: 'NEXT_PUBLIC_POINTS_DAILY_CHECKIN', required: false, isPublic: true },
];

export interface ValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

/**
 * Validate all required environment variables
 */
export function validateEnv(): ValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];
  
  for (const config of ENV_VARS) {
    const value = process.env[config.name];
    
    if (config.required && !value) {
      missing.push(config.name);
    } else if (!config.required && !value) {
      warnings.push(`${config.name} is not set (optional)`);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

/**
 * Validate and throw if required env vars are missing
 * Call this in your app initialization
 */
export function assertEnv(): void {
  const result = validateEnv();
  
  if (!result.valid) {
    const errorMessage = [
      '❌ Missing required environment variables:',
      ...result.missing.map(name => `   - ${name}`),
      '',
      'Please check your .env.local file.',
      'See .env.example for required variables.',
    ].join('\n');
    
    console.error(errorMessage);
    
    // In development, throw error
    // In production, log but don't crash (some vars might be set differently)
    if (process.env.NODE_ENV === 'development') {
      throw new Error(`Missing environment variables: ${result.missing.join(', ')}`);
    }
  }
  
  // Log warnings
  if (result.warnings.length > 0) {
    console.warn('⚠️ Environment warnings:');
    result.warnings.forEach(w => console.warn(`   - ${w}`));
  }
}

/**
 * Get env var with type safety
 */
export function getEnv(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${name} is not set`);
  }
  return value || defaultValue || '';
}

/**
 * Get env var as number
 */
export function getEnvNumber(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (!value) return defaultValue;
  const num = parseInt(value, 10);
  return isNaN(num) ? defaultValue : num;
}

/**
 * Get env var as boolean
 */
export function getEnvBoolean(name: string, defaultValue: boolean): boolean {
  const value = process.env[name];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

/**
 * Check if running in development
 */
export function isDev(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if running in production
 */
export function isProd(): boolean {
  return process.env.NODE_ENV === 'production';
}
