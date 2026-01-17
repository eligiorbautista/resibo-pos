import { ModifierGroup, Modifier } from "./types";
import logoWhite from "./assets/logos/main-white-text.png";
import logoBlack from "./assets/logos/main-black-text.png";

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

  // Membership Card Prefix (for generating membership card numbers)
  MEMBERSHIP_CARD_PREFIX: "MEM",

  // Logo Alt Text
  LOGO_ALT_TEXT: "RESIBO Logo",
} as const;

// ============================================

export const MODIFIER_GROUPS: ModifierGroup[] = [
  {
    id: "mg1",
    name: "Size",
    required: true,
    maxSelections: 1,
    modifiers: [
      { id: "m1", name: "Small", price: 0, category: "Size" },
      { id: "m2", name: "Medium", price: 20, category: "Size" },
      { id: "m3", name: "Large", price: 40, category: "Size" },
    ],
  },
  {
    id: "mg2",
    name: "Milk Options",
    required: false,
    maxSelections: 1,
    modifiers: [
      { id: "m4", name: "Whole Milk", price: 0, category: "Milk" },
      { id: "m5", name: "Oat Milk", price: 15, category: "Milk" },
      { id: "m6", name: "Almond Milk", price: 15, category: "Milk" },
      { id: "m7", name: "Soy Milk", price: 10, category: "Milk" },
    ],
  },
  {
    id: "mg3",
    name: "Add-ons",
    required: false,
    maxSelections: 5,
    modifiers: [
      { id: "m8", name: "Extra Shot", price: 25, category: "Add-ons" },
      { id: "m9", name: "Whipped Cream", price: 15, category: "Add-ons" },
      { id: "m10", name: "Caramel Syrup", price: 10, category: "Add-ons" },
      { id: "m11", name: "Vanilla Syrup", price: 10, category: "Add-ons" },
      { id: "m12", name: "Extra Cheese", price: 20, category: "Add-ons" },
    ],
  },
  {
    id: "mg4",
    name: "Customization",
    required: false,
    maxSelections: 10,
    modifiers: [
      { id: "m13", name: "No Onions", price: 0, category: "Customization" },
      { id: "m14", name: "No Spice", price: 0, category: "Customization" },
      { id: "m15", name: "Extra Spice", price: 0, category: "Customization" },
      { id: "m16", name: "Well Done", price: 0, category: "Customization" },
      { id: "m17", name: "Medium Rare", price: 0, category: "Customization" },
    ],
  },
];

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
  TIN: "[YOUR_TIN_HERE]", // Format: XXX-XXX-XXX-XXX

  // Business Address (for receipts and BIR reporting)
  BUSINESS_ADDRESS: "[YOUR_BUSINESS_ADDRESS_HERE]",

  // Permit to Use (PTU) Status
  // Set to true once BIR issues PTU, false until then
  HAS_PTU: false,

  // PTU Number (if issued)
  PTU_NUMBER: null as string | null,

  // PTU Issue Date (if issued)
  PTU_ISSUE_DATE: null as Date | null,
} as const;
