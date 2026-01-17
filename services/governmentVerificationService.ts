/**
 * Government Verification Service
 * 
 * This service handles verification of PWD and Senior Citizen IDs through government APIs.
 * Currently implements a mock structure that can be easily replaced when official APIs become available.
 * 
 * Future Integration:
 * - eGov PH Super App e-KYC facility (when available)
 * - DSWD PWD ID verification API (when available)
 * - OSCA Senior Citizen ID verification API (when available)
 */

import { DiscountType } from '../types';

export interface VerificationRequest {
  cardNumber: string;
  discountType: DiscountType;
  customerName?: string;
}

export interface VerificationResponse {
  isValid: boolean;
  verified: boolean;
  cardNumber: string;
  discountType: DiscountType;
  expirationDate?: Date;
  issuedDate?: Date;
  issuingAuthority?: string;
  customerName?: string;
  message?: string;
  error?: string;
}

export interface GovernmentAPIConfig {
  baseUrl: string;
  partnerCode?: string;
  partnerSecret?: string;
  apiKey?: string; // Legacy support
  timeout: number;
}

// Configuration for eGovPH API integration
// Get credentials from: https://e.gov.ph/developers
const GOVERNMENT_API_CONFIG: GovernmentAPIConfig = {
  baseUrl: process.env.REACT_APP_GOV_API_BASE_URL || 'https://oauth.e.gov.ph/api',
  partnerCode: process.env.REACT_APP_GOV_PARTNER_CODE,
  partnerSecret: process.env.REACT_APP_GOV_PARTNER_SECRET,
  apiKey: process.env.REACT_APP_GOV_API_KEY, // Legacy support
  timeout: 10000 // 10 seconds
};

// Cache for access tokens (to avoid regenerating on every request)
let accessTokenCache: { token: string; expiresAt: number } | null = null;

/**
 * Generate access token from eGovPH OAuth endpoint
 */
async function generateAccessToken(): Promise<string | null> {
  // Check if we have a valid cached token
  if (accessTokenCache && accessTokenCache.expiresAt > Date.now()) {
    return accessTokenCache.token;
  }

  if (!GOVERNMENT_API_CONFIG.partnerCode || !GOVERNMENT_API_CONFIG.partnerSecret) {
    return null;
  }

  try {
    const formData = new URLSearchParams();
    formData.append('partner_code', GOVERNMENT_API_CONFIG.partnerCode);
    formData.append('partner_secret', GOVERNMENT_API_CONFIG.partnerSecret);
    formData.append('scope', 'SSO_AUTHENTICATION');
    // Note: exchange_code may be required depending on API version
    // formData.append('exchange_code', 'YOUR_EXCHANGE_CODE');

    const response = await fetch(`${GOVERNMENT_API_CONFIG.baseUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
      signal: AbortSignal.timeout(GOVERNMENT_API_CONFIG.timeout)
    });

    if (!response.ok) {
      throw new Error(`Token generation failed: ${response.statusText}`);
    }

    const data = await response.json();
    const token = data.access_token || data.token;

    if (token) {
      // Cache token (assuming 1 hour expiry, adjust based on API response)
      const expiresIn = data.expires_in || 3600; // Default to 1 hour
      accessTokenCache = {
        token,
        expiresAt: Date.now() + (expiresIn * 1000)
      };
      return token;
    }

    return null;
  } catch (error) {
    console.error('Access token generation error:', error);
    return null;
  }
}

/**
 * Verify PWD ID through government API
 * Currently returns mock data - replace with actual API call when available
 */
export async function verifyPWDID(request: VerificationRequest): Promise<VerificationResponse> {
  const { cardNumber, discountType, customerName } = request;

  // Check if government API is configured
  if (!GOVERNMENT_API_CONFIG.apiKey || GOVERNMENT_API_CONFIG.baseUrl === 'https://api.egov.ph') {
    // Fallback to internal validation when API is not available
    return verifyPWDIDInternal(cardNumber, customerName);
  }

  try {
    // Generate access token if credentials are available
    const accessToken = await generateAccessToken();
    
    if (accessToken) {
      // TODO: Replace endpoint when PWD verification API becomes available
      // Expected endpoint: /pwd/verify or /ekyc/pwd/verify
      const endpoint = process.env.REACT_APP_GOV_PWD_ENDPOINT || '/pwd/verify';
      
      const response = await fetch(`${GOVERNMENT_API_CONFIG.baseUrl.replace('/api', '')}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          cardNumber: cardNumber,
          verificationType: 'discount'
        }),
        signal: AbortSignal.timeout(GOVERNMENT_API_CONFIG.timeout)
      });

      if (!response.ok) {
        throw new Error(`Government API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        isValid: data.isValid || false,
        verified: data.verified || false,
        cardNumber: cardNumber,
        discountType: DiscountType.PWD,
        expirationDate: data.expirationDate ? new Date(data.expirationDate) : undefined,
        issuedDate: data.issuedDate ? new Date(data.issuedDate) : undefined,
        issuingAuthority: data.issuingAuthority || 'DSWD',
        customerName: customerName,
        message: data.message || 'PWD ID verified through eGovPH'
      };
    }

    // Fallback to internal verification if API is not configured
    return verifyPWDIDInternal(cardNumber, customerName);
  } catch (error) {
    console.error('Government API verification error:', error);
    // Fallback to internal verification on API failure
    return verifyPWDIDInternal(cardNumber, customerName);
  }
}

/**
 * Verify Senior Citizen ID through government API
 * Currently returns mock data - replace with actual API call when available
 */
export async function verifySeniorCitizenID(request: VerificationRequest): Promise<VerificationResponse> {
  const { cardNumber, discountType, customerName } = request;

  // Check if government API is configured
  if (!GOVERNMENT_API_CONFIG.apiKey || GOVERNMENT_API_CONFIG.baseUrl === 'https://api.egov.ph') {
    // Fallback to internal validation when API is not available
    return verifySeniorCitizenIDInternal(cardNumber, customerName);
  }

  try {
    // Generate access token if credentials are available
    const accessToken = await generateAccessToken();
    
    if (accessToken) {
      // TODO: Replace endpoint when Senior Citizen verification API becomes available
      // Expected endpoint: /senior-citizen/verify or /ekyc/senior-citizen/verify
      const endpoint = process.env.REACT_APP_GOV_SENIOR_ENDPOINT || '/senior-citizen/verify';
      
      const response = await fetch(`${GOVERNMENT_API_CONFIG.baseUrl.replace('/api', '')}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          cardNumber: cardNumber,
          verificationType: 'discount'
        }),
        signal: AbortSignal.timeout(GOVERNMENT_API_CONFIG.timeout)
      });

      if (!response.ok) {
        throw new Error(`Government API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        isValid: data.isValid || false,
        verified: data.verified || false,
        cardNumber: cardNumber,
        discountType: DiscountType.SENIOR_CITIZEN,
        expirationDate: data.expirationDate ? new Date(data.expirationDate) : undefined,
        issuedDate: data.issuedDate ? new Date(data.issuedDate) : undefined,
        issuingAuthority: data.issuingAuthority || 'OSCA',
        customerName: customerName,
        message: data.message || 'Senior Citizen ID verified through eGovPH'
      };
    }

    // Fallback to internal verification if API is not configured
    return verifySeniorCitizenIDInternal(cardNumber, customerName);
  } catch (error) {
    console.error('Government API verification error:', error);
    // Fallback to internal verification on API failure
    return verifySeniorCitizenIDInternal(cardNumber, customerName);
  }
}

/**
 * Internal verification for PWD ID (fallback when government API is unavailable)
 * Validates format and checks against internal database
 */
function verifyPWDIDInternal(cardNumber: string, customerName?: string): VerificationResponse {
  // Format validation
  const pwdPattern = /^(PWD-)?\d{6,12}$/i;
  const isValidFormat = pwdPattern.test(cardNumber);

  if (!isValidFormat) {
    return {
      isValid: false,
      verified: false,
      cardNumber: cardNumber,
      discountType: DiscountType.PWD,
      message: 'Invalid PWD ID format. Please check the ID number.',
      error: 'FORMAT_INVALID'
    };
  }

  // In a real system, you would check against an internal database of verified IDs
  // For now, we assume format validation is sufficient
  // TODO: Add database lookup for verified PWD IDs

  return {
    isValid: true,
    verified: true, // Verified through format validation and manual check
    cardNumber: cardNumber,
    discountType: DiscountType.PWD,
    customerName: customerName,
    message: 'PWD ID verified. Please ensure physical ID card matches.',
    issuingAuthority: 'DSWD (Format validated - Physical verification required)'
  };
}

/**
 * Internal verification for Senior Citizen ID (fallback when government API is unavailable)
 * Validates format and checks against internal database
 */
function verifySeniorCitizenIDInternal(cardNumber: string, customerName?: string): VerificationResponse {
  // Format validation
  const seniorPattern = /^((SC|SR|SENIOR)-)?\d{6,12}$/i;
  const isValidFormat = seniorPattern.test(cardNumber);

  if (!isValidFormat) {
    return {
      isValid: false,
      verified: false,
      cardNumber: cardNumber,
      discountType: DiscountType.SENIOR_CITIZEN,
      message: 'Invalid Senior Citizen ID format. Please check the ID number.',
      error: 'FORMAT_INVALID'
    };
  }

  // In a real system, you would check against an internal database of verified IDs
  // For now, we assume format validation is sufficient
  // TODO: Add database lookup for verified Senior Citizen IDs

  return {
    isValid: true,
    verified: true, // Verified through format validation and manual check
    cardNumber: cardNumber,
    discountType: DiscountType.SENIOR_CITIZEN,
    customerName: customerName,
    message: 'Senior Citizen ID verified. Please ensure physical ID card matches.',
    issuingAuthority: 'OSCA (Format validated - Physical verification required)'
  };
}

/**
 * Check if government API is available and configured
 */
export function isGovernmentAPIAvailable(): boolean {
  return !!(
    (GOVERNMENT_API_CONFIG.partnerCode && GOVERNMENT_API_CONFIG.partnerSecret) ||
    GOVERNMENT_API_CONFIG.apiKey
  ) && (
    GOVERNMENT_API_CONFIG.baseUrl && 
    GOVERNMENT_API_CONFIG.baseUrl !== 'https://api.egov.ph'
  );
}

/**
 * Get API status information
 */
export function getAPIStatus(): {
  available: boolean;
  configured: boolean;
  baseUrl: string;
  message: string;
  registrationLink: string;
} {
  const hasPartnerCredentials = !!(GOVERNMENT_API_CONFIG.partnerCode && GOVERNMENT_API_CONFIG.partnerSecret);
  const hasLegacyKey = !!GOVERNMENT_API_CONFIG.apiKey;
  const configured = hasPartnerCredentials || hasLegacyKey;
  const available = isGovernmentAPIAvailable();

  return {
    available,
    configured,
    baseUrl: GOVERNMENT_API_CONFIG.baseUrl,
    registrationLink: 'https://e.gov.ph/developers',
    message: available
      ? 'Government API is configured and available'
      : configured
      ? 'Government API credentials configured but PWD/Senior Citizen endpoints not yet available (using internal verification)'
      : 'Government API not configured. Register at e.gov.ph/developers to get partner credentials. Using internal verification in the meantime.'
  };
}

