## BIR Implementation vs Manual Tasks

This file summarizes what is already implemented in the codebase and what you still need to do manually to be fully ready for BIR accreditation and client rollouts.

---

## ✅ Already Implemented & Integrated in the Codebase

### 1. Non-resettable Grand Total & Invoice Sequence

- `SystemCounter` model in Prisma schema:
  - `grandTotal` (Decimal(18,2)) – accumulating, never reset via code.
  - `lastInvoiceNumber` (Int) – last used invoice number.
- `createTransaction` (`backend/src/controllers/transaction.controller.ts`):
  - Runs in a Prisma `$transaction`.
  - Reads or creates `SystemCounter` row (id=1).
  - Calculates `nextInvoiceNumber = lastInvoiceNumber + 1`.
  - Increments `grandTotal` by the sale’s total.
  - Saves `officialInvoiceNumber: nextInvoiceNumber` on the `Transaction`.

### 2. Tamper-Proofing & Audit Trail

- No “Training Mode” or “No-Sale” flow added; all sales use the main transaction pipeline.
- `AuditLog` model captures:
  - `employeeId`, `action`, `entityType`, `entityId`, `details (JSON)`, `ipAddress`, `userAgent`, `createdAt`.
- Automatically logged actions:
  - `LOGIN_SUCCESS`
  - `CREATE_TRANSACTION`
  - `VOID_TRANSACTION`
  - `REFUND_TRANSACTION`
  - `GENERATE_Z_READING`
  - `EXPORT_ESALES`
  - `EINVOICE_SENT`
  - `EINVOICE_FAILED`
- Frontend viewer:
  - `components/features/AuditLogViewer.tsx`
  - Route `/audit-logs` (manager-only) added in `App.tsx` and `Sidebar.tsx`.

### 3. Z-Reading (End-of-Day)

- `DailyZReading` model:
  - Tracks opening/closing grand total, daily gross sales, VAT vs VAT-exempt, discounts, service charge, voids, transaction count.
- Endpoints:
  - `POST /api/reports/z-reading/generate?date=YYYY-MM-DD`
  - `GET /api/reports/z-reading/:date`
  - `GET /api/reports/z-reading`
- Implementation:
  - Computes totals from `Transaction` data by business date.
  - Excludes `VOIDED` transactions from gross sales but tracks their void amount separately.
  - Logs `GENERATE_Z_READING` in `AuditLog`.

### 4. eSales Reporting (TXT/CSV)

- Endpoint: `GET /api/reports/esales-export?month=YYYY-MM&format=csv|txt`
- For each non-voided transaction in the month, export includes:
  - Date
  - Invoice number (`officialInvoiceNumber`)
  - Subtotal
  - VAT amount
  - Service charge
  - Discount total
  - Total amount
  - Payment method
- Export action logged as `EXPORT_ESALES` in `AuditLog`.

### 5. E-Invoicing Readiness (EIS)

- `EInvoicePayload` model:
  - `transactionId` (unique)
  - `payloadJson` (EIS-ready JSON)
  - `status: 'PENDING' | 'SENT' | 'FAILED'`
  - `lastError?`
  - timestamps, `sentAt?`
- On every transaction creation:
  - A corresponding `EInvoicePayload` row is created with JSON containing ID, date, totals, VAT, discounts, payments, etc.
- Endpoints:
  - `GET /api/einvoice/pending`
  - `GET /api/einvoice/stats`
  - `GET /api/einvoice/transaction/:transactionId`
  - `POST /api/einvoice/:transactionId/sent`
  - `POST /api/einvoice/:transactionId/failed`
- Status changes logged as `EINVOICE_SENT` or `EINVOICE_FAILED` in `AuditLog`.

### 6. Receipts (Customer Copy with BIR Fields)

- `constants.ts`:
  - `BRANDING` for restaurant name and logos.
  - `BIR_CONFIG` for:
    - `TIN`
    - `BUSINESS_ADDRESS`
    - `HAS_PTU`
    - `PTU_NUMBER`
    - `PTU_ISSUE_DATE`
- `components/features/POSTerminal.tsx` → `printReceipt`:
  - Shows:
    - Restaurant name and branch (from `BRANDING` / `RESTAURANT_NAME`).
    - **TIN** from `BIR_CONFIG.TIN`.
    - Business address from `BIR_CONFIG.BUSINESS_ADDRESS` (if configured).
    - **Invoice #** from `transaction.officialInvoiceNumber` (fallback to transaction id prefix).
    - Internal `Receipt #<transaction.id>` for reference.
    - VAT breakdown:
      - VAT Sales + VAT Amount (12%) for normal transactions.
      - VAT Sales = 0, VAT-Exempt Sales = net amount, VAT Amount = 0 for PWD / Senior.
    - Discounts, service charge, tip, final total.
    - Payments with change / balance due.
  - Disclaimer / PTU banner:
    - If `HAS_PTU === false`: big yellow box with  
      “THIS IS NOT AN OFFICIAL RECEIPT – Official Receipt will be issued upon BIR PTU approval”.
    - If `HAS_PTU === true` and `PTU_NUMBER` set: green box with  
      “Official Receipt – PTU No: {PTU_NUMBER}”.

### 7. Data Loading & Frontend Integration

- `App.tsx`:
  - `loadDataFromBackend` now accepts a `userOverride` to avoid stale-state issues after login.
  - Called with the freshly created `employeeData` on login and token-restore.
  - Loads products, customers, employees, tables, transactions, and cash drawers in parallel via `apiService`.
- `services/apiService.ts`:
  - Base URL: `VITE_API_BASE_URL` with fallback `http://localhost:3001/api`.
  - Exported APIs for:
    - `authApi`, `productsApi`, `customersApi`, `employeesApi`, `tablesApi`, `transactionsApi`, `cashDrawersApi`
    - `auditLogsApi`, `reportsApi`, `eInvoiceApi`.

### 8. Internal Documentation

- `backend/BIR_COMPLIANCE_GUIDE.md` – detailed technical guide and DRP notes.
- `BIR_IMPLEMENTATION_SUMMARY.md` – high-level summary of changes.
- `BIR_READINESS_OVERVIEW.md` – your original prompt plus a full mapping to the implementation.

---

## 📝 Things You Still Need to Do Manually

### A. Run Database Migrations

Run once in the `backend` folder to create all new tables and columns:

```bash
cd backend
npm run prisma:migrate
# migration name suggestion:
bir_compliance_features
```

This ensures:

- `SystemCounter`
- `AuditLog`
- `DailyZReading`
- `EInvoicePayload`
- `Transaction.officialInvoiceNumber`

exist in your actual database.

### B. Point Frontend to the Correct Backend URL

In the project root (same level as `package.json`), create or update `.env`:

```env
VITE_API_BASE_URL=http://localhost:8000/api
```

Then restart the frontend dev server:

```bash
npm run dev
```

(If you later decide to move backend to port 3001, update this URL accordingly.)

### C. Configure BIR Details Per Deployment / Per Client

For your own instance and for each new business you onboard:

1. Edit `constants.ts`:
   ```ts
   export const BIR_CONFIG = {
     TIN: "YOUR_TIN_HERE",
     BUSINESS_ADDRESS: "Your business address here",
     HAS_PTU: false, // set to true once PTU is issued
     PTU_NUMBER: null, // e.g. "PTU-XXXX-YYYY"
     PTU_ISSUE_DATE: null, // new Date("YYYY-MM-DD") when issued
   } as const;
   ```
2. Adjust `BRANDING` and `RESTAURANT_NAME` for each client’s name and branch.

This makes receipts, reports, and E-Invoice payloads reflect the correct legal identity.

### D. Implement Actual BIR EIS Transmission (Business Choice)

The system is **ready** in terms of data and queuing, but you must decide how to send data to BIR EIS:

- **Option 1 – Manual / Semi-manual:**

  - Use `EInvoicePayload` as a queue and export JSON payloads.
  - Transmit via separate integration tool or manual upload (depending on BIR’s process).

- **Option 2 – Automated Service:**
  - Implement a worker / cron job that:
    1. Calls `/api/einvoice/pending` to get pending payloads.
    2. Sends each `payloadJson` to the official BIR EIS HTTPS endpoint using their required auth and schema.
    3. Calls `/api/einvoice/:transactionId/sent` or `/failed` based on the response.

This part depends on:

- Your EIS credentials.
- The latest BIR JSON schema and endpoint specification (which can change over time).

### E. Set Up Database Backups & Finalize the DRP

To meet BIR’s **10-year data retention** and **cloud security / DRP** requirements:

- Ensure your PostgreSQL / Neon instance:
  - Has **daily (or more frequent) automated backups**.
  - Stores backups in a separate physical/region location.
- At least once, **test a restore** into a staging environment to verify DRP.
- Write a short DRP document (you can base it on `backend/BIR_COMPLIANCE_GUIDE.md`) describing:
  - Backup frequency and retention.
  - Restore procedure.
  - Responsible person/team.
  - RPO/RTO targets (how much data you can afford to lose, and how quickly you can be back up).

### F. Prepare BIR Accreditation Documents

Using the codebase and MD files, prepare:

- **BIR Form 1900** – download and fill from the BIR website.
- **Sworn Declaration** – based on your implementation:
  - Describes non-resettable grand total, sequential numbering, audit trail, Z-reading, eSales export, and E-Invoicing readiness.
  - Must be notarized.
- **System Flowcharts**:
  - Login → Sale → Payment → Receipt → Transaction save.
  - Sale → Z-Reading → eSales export → (optional) EIS submission.
  - Login / access control → Audit logging.
- **Screenshots**:
  - Login screen.
  - POS terminal screen.
  - Printed receipt sample (with BIR fields).
  - Z-reading report view.
  - Audit log viewer.
  - eSales export UI (if applicable).
- **Sample Receipts**:
  - Printed receipts showing TIN, business name & address, invoice #, VAT vs VAT-exempt breakdown, and the correct disclaimer / PTU box.

Submit these as part of your application via the **eAccReg** portal.

### G. For Each Client (Business Owner) You Onboard

Repeat the following per client:

1. **Provision their environment**:
   - Separate DB (or tenant).
   - Their `.env` (DB URL, domain, etc.).
2. **Configure branding and BIR details**:
   - `BRANDING.SYSTEM_NAME`, logos.
   - `BIR_CONFIG` with their TIN, address, PTU status.
3. **Guide them through**:
   - Registering their instance + software via eAccReg with their RDO.
   - Obtaining and then configuring PTU details.
   - Using Z-Reading, eSales export, and (if implemented) EIS integration.

---

## Quick High-Level Checklist

- [ ] Prisma migrations run; all new tables/columns exist in DB.
- [ ] Frontend `VITE_API_BASE_URL` points to running backend (`http://localhost:8000/api`).
- [ ] `BRANDING` and `BIR_CONFIG` set for your current business.
- [ ] Grand total and invoice numbers update correctly and cannot be reset in UI.
- [ ] Audit logs show key actions and are visible only to managers.
- [ ] Z-Reading endpoints produce correct summaries.
- [ ] eSales export works for a test month and matches expectations.
- [ ] E-Invoice payloads queue correctly; you have a plan for transmission to BIR EIS.
- [ ] Receipts show TIN, business name, address, VAT breakdown, and the correct disclaimer/PTU block.
- [ ] Backup and DRP are configured and documented.
- [ ] Accreditation documents (Form 1900, Sworn Declaration, flowcharts, screenshots, sample receipts) prepared for submission.
