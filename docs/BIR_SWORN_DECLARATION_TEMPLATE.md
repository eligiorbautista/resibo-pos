SWORN DECLARATION  
(For POS Software Accreditation)

I, **[FULL NAME OF DEVELOPER/OWNER]**, of legal age, [CIVIL STATUS], and a resident of **[ADDRESS]**, after having been duly sworn in accordance with law, hereby depose and state that:

1. I am the **[OWNER / DEVELOPER / AUTHORIZED REPRESENTATIVE]** of the Point‑of‑Sale (POS) system known as **“[SYSTEM NAME]”** (the “System”), intended for use by business establishments in the Philippines for recording sales transactions.

2. The System has been designed and implemented to comply with the technical requirements of the Bureau of Internal Revenue (BIR), including but not limited to:

   2.1 **Non‑resettable Accumulating Grand Total**  
   The System maintains a non‑resettable grand total of sales stored in the database table `SystemCounter.grandTotal`, which is incremented automatically with every completed sale transaction and cannot be reset or reduced through any user interface or configuration screen.

   2.2 **Sequential Numbering of Invoices**  
   The System automatically assigns a unique, continuous, and sequential invoice number to every sale transaction using the `SystemCounter.lastInvoiceNumber` and `Transaction.officialInvoiceNumber` fields. There is no function available to insert, delete, or modify invoice numbers outside of normal transaction processing.

   2.3 **Tamper‑Proofing / No Training or No‑Sale Mode**  
   The System does not contain any “Training Mode”, “No‑Sale” function, or similar feature that would allow users to process transactions without recording them in the official transaction database. All sales-related operations pass through the `Transaction` table and are subject to audit.

   2.4 **Audit Trail**  
   The System records an audit trail of critical activities in the `AuditLog` table, including logins, creation of transactions, voids, refunds, Z‑reading generation, eSales exports, and E‑Invoice status updates, with corresponding user, timestamp, IP address, and other relevant details.

   2.5 **Z‑Reading and eSales Reporting**  
   The System can generate end‑of‑day Z‑Reading summaries stored in the `DailyZReading` table and can produce monthly sales reports in `.csv` or `.txt` format for submission to the BIR eSales portal via the `/api/reports/esales-export` function.

   2.6 **E‑Invoicing Readiness (EIS)**  
   The System queues JSON‑formatted E‑Invoice data in the `EInvoicePayload` table for each transaction, with status tracking (PENDING, SENT, FAILED), to allow transmission to the BIR Electronic Invoicing System (EIS) within the prescribed period.

3. The System’s printed receipts show the Taxpayer Identification Number (TIN), registered business name, business address, official invoice number, VAT / VAT‑Exempt breakdown, and, prior to issuance of the Permit to Use (PTU), the disclaimer **“THIS IS NOT AN OFFICIAL RECEIPT”**.

4. The System is capable of retaining and retrieving transaction data, including audit logs and Z‑Readings, for at least ten (10) years, subject to the backup and disaster recovery procedures implemented by the taxpayer and/or hosting provider.

5. I undertake to promptly notify the BIR in writing of any material changes to the System which may affect its compliance with BIR regulations and to submit such changes for evaluation and approval when required.

6. I affirm that the foregoing statements are true and correct to the best of my knowledge and belief, and that any false declaration shall subject me to the penalties provided by law.

IN WITNESS WHEREOF, I have hereunto set my hand this ___ day of __________ 20___ at __________, Philippines.


_______________________________  
[NAME OF DEVELOPER/OWNER]  
[Title / Position]  
[SYSTEM NAME]


SUBSCRIBED AND SWORN to before me this ___ day of __________ 20___ at __________, Philippines, affiant exhibiting to me his/her competent evidence of identity: **[ID TYPE AND NUMBER]**.


