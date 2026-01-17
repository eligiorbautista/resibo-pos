import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: process.env.PORT || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  publicBaseUrl: process.env.PUBLIC_BASE_URL || '',
  frontendBaseUrl: process.env.FRONTEND_BASE_URL || '',
  
  // Database
  databaseUrl: process.env.DATABASE_URL || '',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-this',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-this',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  
  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  // Gemini AI (optional)
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  
  // Government API (optional)
  govApiBaseUrl: process.env.REACT_APP_GOV_API_BASE_URL || '',
  govPartnerCode: process.env.REACT_APP_GOV_PARTNER_CODE || '',
  govPartnerSecret: process.env.REACT_APP_GOV_PARTNER_SECRET || '',

  // PayMongo (optional - required only if you enable PayMongo payments)
  paymongoSecretKey: process.env.PAYMONGO_SECRET_KEY || '',
  paymongoWebhookSecret: process.env.PAYMONGO_WEBHOOK_SECRET || '',
};

// Validate required environment variables
if (!config.databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

if (config.jwtSecret === 'your-secret-key-change-this' && config.nodeEnv === 'production') {
  throw new Error('JWT_SECRET must be set in production');
}

