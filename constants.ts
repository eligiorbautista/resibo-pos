import { ModifierGroup, Modifier } from "./types";
import logoWhite from "./assets/logos/main-white-text.png";
import logoBlack from "./assets/logos/main-black-text.png";
import restaurantLogo from "./assets/logos/restaurant-logo.png";

// ============================================
// BRANDING CONFIGURATION
// ============================================
// Centralized branding constants - update these to rebrand the system
export const BRANDING = {
  // Restaurant/Business Name
  SYSTEM_NAME: "RESIBO",

  // Application Title (for browser tab, etc.)
  APP_TITLE: "RESIBO | Management Hub",

  // Logo paths
  LOGO_WHITE: logoWhite, // For dark backgrounds
  LOGO_BLACK: logoBlack, // For light backgrounds
  RESTAURANT_LOGO: restaurantLogo,

  // Membership Card Prefix (for generating membership card numbers)
  MEMBERSHIP_CARD_PREFIX: "MEM",

  // Logo Alt Text
  LOGO_ALT_TEXT: "RESIBO Logo",
} as const;

export const TAX_RATE = 0.12; // 12% VAT
export const SERVICE_CHARGE_RATE = 0.1; // 10% Service Charge
export const PWD_DISCOUNT_RATE = 0.2; // 20% discount for PWD
export const SENIOR_CITIZEN_DISCOUNT_RATE = 0.2; // 20% discount for Senior Citizen

// ID Format Patterns (Philippines)
// PWD ID: Usually starts with "PWD-" followed by numbers, or just numbers
// Senior Citizen ID: Usually starts with "SC-" or "SR-" followed by numbers, or just numbers
export const PWD_ID_PATTERN = /^(PWD-)?\d{6,12}$/i; // Optional "PWD-" prefix, then 6-12 digits
export const SENIOR_CITIZEN_ID_PATTERN = /^((SC|SR|SENIOR)-)?\d{6,12}$/i; // Optional prefix, then 6-12 digits

// Store verified discount IDs (in a real system, this would be in a database)
export const VERIFIED_DISCOUNT_IDS: Array<{
  cardNumber: string;
  discountType: "PWD" | "SENIOR_CITIZEN";
  verifiedAt: Date;
  verifiedBy: string;
}> = [];

export const CATEGORIES = [
  "All",
  "Beverages",
  "Bakery",
  "Rice Meals",
  "Pasta",
  "Merchandise",
];

export const RESTAURANT_NAME = "ISABEL'S KITCHEN";

// ============================================
// BIR COMPLIANCE CONFIGURATION
// ============================================
// Update these values with your actual BIR registration details
export const BIR_CONFIG = {
  // Tax Identification Number (TIN) - Update with your business TIN
  TIN: "000-000-000-000", // Format: XXX-XXX-XXX-XXX

  // Business Address (for receipts and BIR reporting)
  BUSINESS_ADDRESS: "Lucena City, Quezon, Philippines",

  // Permit to Use (PTU) Status
  // Set to true once BIR issues PTU, false until then
  HAS_PTU: false,

  // PTU Number (if issued)
  PTU_NUMBER: null as string | null,

  // PTU Issue Date (if issued)
  PTU_ISSUE_DATE: null as Date | null,
} as const;
