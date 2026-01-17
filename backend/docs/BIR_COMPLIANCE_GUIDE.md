# BIR Compliance Implementation Guide

This document outlines the BIR (Bureau of Internal Revenue) compliance features implemented in this POS system for accreditation and client registration in the Philippines.

## Overview

This POS system has been enhanced with BIR-required features to support:
1. **Software Accreditation** - For the software vendor (you)
2. **Client Registration** - For each business that purchases your POS

## Implemented Features

### 1. Non-Resettable Accumulating Grand Total ✅

- **Database Model**: `SystemCounter` table stores a single row with:
  - `grandTotal`: Decimal(18,2) - Accumulating total that cannot be reset
  - `lastInvoiceNumber`: Integer - Sequential invoice counter
  
- **Implementation**: 
  - Updated atomically within database transactions
  - No reset functionality exposed in the API
  - Increments with every completed transaction

- **Access**: Available via `GET /api/reports/grand-total` (read-only)

### 2. Sequential Invoice Numbering ✅

- **Database Model**: `Transaction.officialInvoiceNumber` field
- **Implementation**: 
  - Automatically assigned when transaction is created
  - Sequential, unique, and continuous
  - Displayed on receipts

### 3. Audit Trail ✅

- **Database Model**: `AuditLog` table records:
  - Employee ID (who performed the action)
  - Action type (CREATE_TRANSACTION, VOID_TRANSACTION, LOGIN_SUCCESS, etc.)
  - Entity type and ID
  - Details (JSON payload with transaction amounts, payment methods, etc.)
  - IP address and user agent
  - Timestamp

- **Logged Actions**:
  - Login attempts (successful)
  - Transaction creation
  - Transaction voiding
  - Transaction refunds
  - Z-reading generation
  - eSales exports
  - E-Invoice status changes

- **Access**: Manager-only via `/audit-logs` route in frontend

### 4. Z-Reading (End-of-Day Report) ✅

- **Database Model**: `DailyZReading` table
- **Features**:
  - Opening and closing grand total
  - Total gross sales for the day
  - VAT sales vs VAT-exempt sales breakdown
  - Total discounts, service charges, voids
  - Transaction count

- **API Endpoints**:
  - `POST /api/reports/z-reading/generate?date=YYYY-MM-DD` - Generate Z-reading
  - `GET /api/reports/z-reading/:date` - Get Z-reading by date
  - `GET /api/reports/z-reading` - List all Z-readings

### 5. E-Invoicing Readiness ✅

- **Database Model**: `EInvoicePayload` table
- **Features**:
  - Stores JSON payload for each transaction
  - Status tracking (PENDING, SENT, FAILED)
  - Ready for BIR EIS integration

- **API Endpoints**:
  - `GET /api/einvoice/pending` - Get pending invoices
  - `GET /api/einvoice/stats` - Get statistics
  - `POST /api/einvoice/:transactionId/sent` - Mark as sent
  - `POST /api/einvoice/:transactionId/failed` - Mark as failed

### 6. eSales Export ✅

- **Format**: CSV or TXT (pipe-delimited)
- **Content**: Transaction data formatted for BIR eSales portal upload
- **API Endpoint**: `GET /api/reports/esales-export?month=YYYY-MM&format=csv`

### 7. Receipt Compliance ✅

Receipts now include:
- TIN (Tax Identification Number) - Configure in `constants.ts`
- Business name and address
- Official invoice number
- VAT sales vs VAT-exempt sales breakdown
- VAT amount calculation
- "THIS IS NOT AN OFFICIAL RECEIPT" disclaimer (until PTU is issued)

## Configuration

### Update BIR Details

Edit `constants.ts`:

```typescript
export const BIR_CONFIG = {
  TIN: "123-456-789-000", // Your business TIN
  BUSINESS_ADDRESS: "123 Main St, City, Province",
  HAS_PTU: false, // Set to true once PTU is issued
  PTU_NUMBER: null, // PTU number when issued
  PTU_ISSUE_DATE: null, // PTU issue date
};
```

## Database Migration

Run the following to apply schema changes:

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate
```

When prompted, name the migration: `bir_compliance_features`

## Documentation for BIR Accreditation

### Required Documents

1. **BIR Form 1900** - Application for Authority to Use
   - Download from BIR website
   - Fill with your business details

2. **Sworn Declaration** - Template provided in `BIR_SWORN_DECLARATION.md`
   - Must be notarized
   - Attest to system integrity

3. **System Flowcharts** - See `BIR_SYSTEM_FLOWCHARTS.md`
   - Login flow
   - Sales transaction flow
   - Z-reading generation flow

4. **Screenshots** - Capture:
   - Login screen
   - POS terminal screen
   - Receipt sample
   - Z-reading report
   - Audit log viewer

5. **Sample Receipts** - Print sample receipts showing:
   - TIN
   - Business name
   - Invoice number
   - VAT breakdown
   - Disclaimer

## Data Retention

- **Requirement**: 10 years
- **Implementation**: 
  - All transaction data stored in PostgreSQL
  - Regular backups recommended
  - Cloud database (Neon) provides automatic backups
  - Consider additional backup strategy for compliance

## Disaster Recovery Plan

### Current Setup
- Database hosted on Neon (PostgreSQL cloud)
- Automatic backups via Neon
- Code versioned in Git

### Recommendations
1. **Daily Backups**: Configure automated daily database backups
2. **Off-site Storage**: Store backups in separate location
3. **Recovery Testing**: Test restore procedures quarterly
4. **Documentation**: Maintain DRP document (see `BIR_DISASTER_RECOVERY_PLAN.md`)

## EIS Integration (Future)

The system is ready for BIR EIS integration:

1. **Pending Payloads**: Check `/api/einvoice/pending`
2. **Transmit to EIS**: Implement HTTP client to POST JSON to BIR EIS endpoint
3. **Update Status**: Mark as SENT or FAILED after transmission
4. **Deadline**: Must transmit within 3 days of transaction

## Testing Checklist

- [ ] Verify grand total increments with each transaction
- [ ] Verify invoice numbers are sequential
- [ ] Generate Z-reading for test date
- [ ] Export eSales data for test month
- [ ] View audit logs as manager
- [ ] Print receipt with BIR fields
- [ ] Verify no reset functionality exists

## Support

For questions about BIR requirements, consult:
- BIR Revenue Regulations
- BIR eAccReg portal: https://eaccreg.bir.gov.ph
- BIR EIS documentation: https://eis.bir.gov.ph

