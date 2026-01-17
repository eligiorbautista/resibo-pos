## Original BIR Requirements (User Prompt)

> I need to ready this pos system so that I can register this to BIR here in the philippines because I am planning to sell this in other businesses.
>
> Help me modify this system based on the following requirements:
>
> 1. Step 1: Software Accreditation (For You)  
>    Before you can sell your POS, the BIR must "white-list" it. This is done through the eAccReg (Electronic Accreditation and Registration) System.
>
> **Key Technical Requirements**  
> To pass accreditation, your web-based POS must have these features:
>
> - Non-resettable Accumulating Grand Total: A sales counter that cannot be wiped or reset to zero by the user.
> - Tamper-Proofing: No "Training Mode" or "No-Sale" functions that allow transactions to be hidden.
> - Sequential Numbering: Automatic, unique, and continuous invoice numbers.
> - Audit Trail: A log that records every action (who logged in, what was edited, and when).
> - E-Invoicing Readiness (NEW): The ability to generate and transmit JSON-formatted data to the BIR EIS within three days of a sale.
>
> **Documentation Needed**
>
> - BIR Form 1900: Application for Authority to Use.
> - Sworn Declaration: A notarized statement attesting to the system's integrity.
> - System Flowcharts & Screenshots: Showing the login screen, sales flow, and reports.
> - Sample Receipts: Must include specific fields like TIN, Business Name, VAT/Non-VAT breakdown, and the "THIS IS NOT AN OFFICIAL RECEIPT" disclaimer until the PTU is issued.
>
> 2. Step 2: Client Registration (For Your Customers)  
>    Once your software is accredited, you can sell it. However, each business that buys it must register their specific "instance" or "account" with their respective Revenue District Office (RDO).
>
> - Online Application: This is usually done via the eAccReg portal.
> - Permit to Use (PTU): After approval, the BIR issues a PTU.
> - Stickers: For web-based systems, the PTU is often a digital certificate or a printed document that must be kept at the place of business.
>
> 3. Important "Must-Knows" for 2026
>
> **Feature → Requirement**
>
> - Data Retention: You must be able to store transaction data for 10 years (per current BIR digital record-keeping rules).
> - Z-Reading: The system must generate an end-of-day "Z-Reading" report summarizing the day's sales and the new grand total.
> - eSales Reporting: Your clients are required to submit monthly sales reports to the BIR eSales portal; your system should automate this via a downloadable .txt or .csv file.
> - Cloud Security: Since your POS is web-based, you must provide a Disaster Recovery Plan (DRP) explaining how data is backed up if your servers go down.

---

## What Has Been Implemented

### 1. Non-resettable Accumulating Grand Total ✅

- **Model:** `SystemCounter` in `backend/prisma/schema.prisma`
  - Fields: `id`, `grandTotal` (Decimal(18,2)), `lastInvoiceNumber` (Int), timestamps.
- **Behavior:**
  - On every transaction creation (`createTransaction`), we run a Prisma DB transaction that:
    - Reads `SystemCounter` row (id=1), creating it if missing.
    - Increments `grandTotal` by the new sale’s total.
    - Increments `lastInvoiceNumber`.
  - There is **no API** to reset or decrease `grandTotal`. Any reset would require a DB migration/manual DBA operation (helps prove tamper-resistance).

### 2. Sequential Invoice Numbering ✅

- **Schema:**
  - `Transaction` model now has `officialInvoiceNumber Int?` + index.
- **Logic:**
  - In `transaction.controller.ts#createTransaction`, inside the Prisma `$transaction`:
    - Get `SystemCounter.lastInvoiceNumber`.
    - Set `nextInvoiceNumber = lastInvoiceNumber + 1`.
    - Update `SystemCounter.lastInvoiceNumber = nextInvoiceNumber`.
    - Store `officialInvoiceNumber: nextInvoiceNumber` on the created `Transaction`.
- **Result:**
  - Continuous, unique invoice numbers for each sale, suitable for mapping to official receipts.

### 3. Tamper-Proofing / No Hidden Transactions ✅

- **No Training Mode / No-Sale route** has been added; all sales use the same `Transaction` model and hit the database.
- **Voids / Refunds:**
  - `voidTransaction` marks the transaction as `VOIDED` but keeps it in the DB.
  - `refundTransaction` appends refund info to `notes` and logs an audit trail entry.
  - Stock adjustments, table state, etc. are all recorded and auditable.

### 4. Audit Trail ✅

- **Model:** `AuditLog` with fields:
  - `employeeId?`, `action`, `entityType?`, `entityId?`, `details Json?`, `ipAddress?`, `userAgent?`, `createdAt`.
- **Logged Actions:**
  - `LOGIN_SUCCESS` (in `auth.controller.ts`).
  - `CREATE_TRANSACTION` (inside `createTransaction` DB transaction).
  - `VOID_TRANSACTION` (in `voidTransaction`).
  - `REFUND_TRANSACTION` (in `refundTransaction`).
  - `GENERATE_Z_READING` (when Z-Reading is generated).
  - `EXPORT_ESALES` (eSales export).
  - `EINVOICE_SENT` / `EINVOICE_FAILED` (when marking E-Invoice status).
- **Frontend Audit Log Viewer:**
  - Component: `components/features/AuditLogViewer.tsx`.
  - Route: `/audit-logs` in `App.tsx` (manager-only).
  - Features:
    - Filter by date range, action, entity type.
    - Pagination.
    - Detail modal with full JSON `details`, IP, user agent, and timestamps.

### 5. Z-Reading (End-of-Day) ✅

- **Model:** `DailyZReading` with:
  - `businessDate`, `generatedById`, `openingGrandTotal`, `closingGrandTotal`, `totalGrossSales`, `totalVatSales`, `totalVatExempt`, `totalDiscounts`, `totalServiceCharge`, `totalVoidAmount`, `totalTransactions`, `notes`.
- **Endpoints:**
  - `POST /api/reports/z-reading/generate?date=YYYY-MM-DD`
  - `GET /api/reports/z-reading/:date`
  - `GET /api/reports/z-reading`
- **Logic:**
  - Summarizes all (non-voided) transactions for the business date.
  - Separates VAT vs VAT-Exempt (PWD/Senior).
  - Tracks grand total delta in `SystemCounter`.
  - Logs a `GENERATE_Z_READING` `AuditLog` entry.

### 6. eSales Reporting (TXT / CSV) ✅

- **Endpoint:** `GET /api/reports/esales-export?month=YYYY-MM&format=csv|txt`
- **Data:**
  - For each non-voided transaction in the month:
    - Date
    - Invoice number
    - Subtotal
    - VAT amount
    - Service charge
    - Discount total
    - Total amount
    - Payment method
- **Usage:**
  - Your clients can download this file and upload it to the **BIR eSales portal** each month.
- **Audit:**
  - Every export writes an `EXPORT_ESALES` entry in `AuditLog`.

### 7. E-Invoicing (BIR EIS) Readiness ✅ (Transport Layer To-Be-Plugged)

- **Model:** `EInvoicePayload` with:
  - `transactionId` (unique), `payloadJson`, `status ('PENDING'|'SENT'|'FAILED')`, `lastError?`, timestamps, `sentAt?`.
- **Creation:**
  - Each time a transaction is created, we enqueue an `EInvoicePayload` with a JSON structure representing that sale (ID, date, total, VAT, discount, payments, etc.).
- **Endpoints:**
  - `GET /api/einvoice/pending`
  - `GET /api/einvoice/stats`
  - `GET /api/einvoice/transaction/:transactionId`
  - `POST /api/einvoice/:transactionId/sent`
  - `POST /api/einvoice/:transactionId/failed`
- **Remaining Work (Per BIR EIS Spec):**
  - Implement the actual HTTPS call to BIR EIS once you have:
    - Official EIS API URL and credentials.
    - Final JSON schema from BIR.
  - After successful send, call `markEInvoiceAsSent`; on failure, call `markEInvoiceAsFailed`.
- **Status:**
  - System is **EIS-ready**: queues JSON, tracks pending/sent/failed; only the actual BIR HTTP integration is left to wire up when you get official details.

### 8. Receipts & BIR Fields ✅

- **Config:** `constants.ts`
  - `BRANDING`: `SYSTEM_NAME`, logos, etc.
  - `BIR_CONFIG`:
    - `TIN`
    - `BUSINESS_ADDRESS`
    - `HAS_PTU`
    - `PTU_NUMBER`
    - `PTU_ISSUE_DATE`
- **Receipt Template:** `components/features/POSTerminal.tsx` → `printReceipt`:
  - Includes:
    - TIN: `BIR_CONFIG.TIN`.
    - Business name: `BRANDING.SYSTEM_NAME`.
    - Business address: `BIR_CONFIG.BUSINESS_ADDRESS`.
    - Invoice # from `transaction.officialInvoiceNumber` (falling back to ID prefix).
    - Internal `Receipt #<transaction.id>` reference.
    - VAT vs VAT-exempt breakdown:
      - VAT Sales + VAT Amount if not PWD/Senior.
      - VAT Sales = 0, VAT-Exempt Sales = net amount, VAT Amount = 0 (VAT-Exempt) for PWD/Senior.
    - Discounts, service charge, tip, total, and payments with change/balance.
  - **Disclaimer Handling:**
    - If `HAS_PTU === false`:
      - Big highlighted block:  
        “**THIS IS NOT AN OFFICIAL RECEIPT** – Official Receipt will be issued upon BIR PTU approval”.
    - If `HAS_PTU === true` and `PTU_NUMBER` is set:
      - Shows “Official Receipt – PTU No: {PTU_NUMBER}”.

### 9. Data Retention & DRP ✅

- **Data Retention:**
  - All transactional / audit / reporting data persists in PostgreSQL (local or Neon).
  - With backups configured on your DB host (e.g., Neon automatic backups), you can meet the 10-year retention rule.
- **Disaster Recovery Plan:**
  - Documented in `backend/BIR_COMPLIANCE_GUIDE.md`:
    - Daily/regular backups.
    - Off-site backup storage.
    - Restore drills.
    - Using Neon’s auto-backups and/or your cloud provider to satisfy DRP expectations.

### 10. Client Registration (Per-Client Instances) ✅ (Process)

- Each client (restaurant/business) that buys your POS should:
  1. Register their instance via **eAccReg** (BIR portal).
  2. Receive their own **PTU**.
  3. Configure:
     - `.env` for DB connection and domain.
     - `constants.ts` `BRANDING` + `BIR_CONFIG` with their TIN, business name, address, PTU details.
- Your codebase is already multi-tenant–ready at the config level (per deployment), so each client can have their own branding and BIR identity.

---

## Operational Steps You Must Still Do

1. **Run Prisma Migrations (to create all new tables/columns)**  
   From `backend`:

   ```bash
   npm run prisma:migrate
   # When prompted for a name:
   bir_compliance_features
   ```

2. **Configure Frontend → Backend URL**  
   In project root (`resibo/.env`):

   ```env
   VITE_API_BASE_URL=http://localhost:8000/api
   ```

   Then restart frontend (`npm run dev`).

3. **Set Your Own BIR Details**  
   In `constants.ts`:

   ```ts
   export const BIR_CONFIG = {
     TIN: "YOUR_TIN_HERE",
     BUSINESS_ADDRESS: "Your business address here",
     HAS_PTU: false, // flip to true when PTU issued
     PTU_NUMBER: null, // set when PTU issued
     PTU_ISSUE_DATE: null, // set when PTU issued
   } as const;
   ```

4. **Decide How You’ll Integrate with BIR EIS**

   - **Manual / Semi-manual:**
     - Use `EInvoicePayload` as a queue; export JSON and send via another tool.
   - **Automatic:**
     - Build a small worker that:
       - Calls `/api/einvoice/pending`.
       - Sends `payloadJson` to the official BIR EIS endpoint.
       - Calls `/api/einvoice/:id/sent` or `/failed`.

5. **Prepare BIR Documentation**
   - Use `backend/BIR_COMPLIANCE_GUIDE.md` and `BIR_IMPLEMENTATION_SUMMARY.md` as your basis for:
     - Sworn Declaration.
     - Flowcharts (login → sale → Z-reading → exports/EIS).
     - Screenshots (login, POS screen, receipt, Z-reading, audit logs).

---

## Quick Checklist Before Applying for Accreditation

- [ ] Database migrated with `SystemCounter`, `AuditLog`, `DailyZReading`, `EInvoicePayload`, and `Transaction.officialInvoiceNumber`.
- [ ] Frontend `.env` correctly points to backend API (`VITE_API_BASE_URL`).
- [ ] `BIR_CONFIG` (TIN, address, PTU status) set for your own deployment.
- [ ] Grand total increments correctly for each sale (and cannot be reset via UI).
- [ ] Invoice numbers are sequential and appear on printed receipts.
- [ ] Audit logs show all key actions and are visible only to managers.
- [ ] Z-Reading generation and retrieval work for sample days.
- [ ] eSales export (`/api/reports/esales-export`) produces CSV/TXT for a test month.
- [ ] E-Invoice payloads are queued for each sale and visible via `/api/einvoice/pending`.
- [ ] Receipts show TIN, business name, address, VAT breakdown, and correct disclaimer/PTU block.
- [ ] Backup/DR strategy documented (DB backups, restore tests).
