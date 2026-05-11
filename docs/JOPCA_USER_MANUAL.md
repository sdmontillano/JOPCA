# JOPCA Daily Cash Position System

## User Manual — Complete Guide

*Version 1.0*

---

# Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started: Registration and Login](#2-getting-started-registration-and-login)
3. [The Dashboard](#3-the-dashboard)
4. [Navigation](#4-navigation)
5. [Bank Accounts](#5-bank-accounts)
6. [Transactions](#6-transactions)
7. [Post-Dated Checks (PDC)](#7-post-dated-checks-pdc)
8. [Petty Cash Fund (PCF)](#8-petty-cash-fund-pcf)
9. [Cash Collections](#9-cash-collections)
10. [Cash Summary](#10-cash-summary)
11. [Bank Reconciliation and Analysis](#11-bank-reconciliation-and-analysis)
12. [Monthly Report](#12-monthly-report)
13. [PDF Reports](#13-pdf-reports)
14. [Settings](#14-settings)
15. [Admin Panel](#15-admin-panel)
16. [Troubleshooting](#16-troubleshooting)

---

## 1. Introduction

### 1.1 What is JOPCA?

JOPCA (Daily Cash Position Report System) is a financial management application designed to track and manage a company's daily cash position. It provides real-time visibility into:

- Cash in Bank balances across multiple bank accounts
- Petty Cash Funds (PCF) across multiple locations
- Post-Dated Checks (PDC) throughout their lifecycle
- Cash collections and deposits
- Bank reconciliation and analysis
- Daily, monthly, and custom PDF reports

### 1.2 System Overview

The system consists of two user tiers:

**Basic User** — Can view dashboards, add transactions, manage PDCs and PCFs, record collections, generate reports, and export data.

**Admin User** — Has full CRUD (Create, Read, Update, Delete) access to all system entities including users, transactions, banks, PDCs, PCFs, collections, and audit logs.

### 1.3 Core Concepts

| Term | Definition |
|------|------------|
| Cash in Bank | Money held in bank accounts |
| Cash on Hand | Petty cash held physically at office locations |
| PDC | Post-Dated Check — a check dated for future maturity |
| PCF | Petty Cash Fund — cash fund for small expenses |
| Collections | Cash received from customers or other sources |
| DCPR | Daily Cash Position Report |
| Bank Reconciliation | Process of matching bank records vs DCPR records |

### 1.4 System Requirements

- **Desktop**: Windows application (standalone installer)
- **Browser**: Google Chrome, Mozilla Firefox, Microsoft Edge (latest versions)
- **Backend**: Django REST API server running on a local or remote network

---

## 2. Getting Started: Registration and Login

### 2.1 Accessing the System

**Desktop App**: Launch JOPCA from the Start Menu or desktop shortcut.

**Web Browser**: Navigate to the server address where the backend is hosted (e.g., `http://localhost:8000`).

### 2.2 Registration (First-Time User)

If your system administrator has enabled registration, you can create your own account:

1. On the login screen, locate the registration form below the login fields.
2. Enter the following information:
   - **Username** — Choose a unique username (e.g., `juan.delacruz`)
   - **Password** — Enter a password (minimum 8 characters for security)
   - **Confirm Password** — Re-enter the same password
   - **Email** — Your email address
   - **Is Admin** — Check this box only if you are a system administrator
3. Click the **Register** button.
4. You will be automatically logged in and redirected to the Dashboard.

**Important**: Registration may be disabled by the administrator. If you cannot register, contact your system administrator to create an account for you.

### 2.3 Login

1. On the login screen, enter your **Username** and **Password**.
2. Click the **Login** button (or press Enter).
3. Upon successful login, you will be redirected to the main Dashboard.

**Password Visibility**: Click the eye icon next to the password field to toggle password visibility.

### 2.4 Session Timeout

For security, your session will automatically expire after **60 minutes of inactivity**. You will be redirected to the login screen. Simply log in again to continue working. Any unsaved data will be lost, so save your work regularly.

### 2.5 Logout

1. Click on your avatar or user icon in the top-right corner of the screen.
2. Select **Logout** from the dropdown menu.
3. You will be redirected to the login screen.

### 2.6 Changing Your Password

1. Click on your avatar or user icon in the top-right corner.
2. Select **Change Password** from the dropdown menu.
3. Enter your **Current Password**.
4. Enter your **New Password** (minimum 8 characters).
5. Re-enter your **New Password** in the confirmation field.
6. Click **Save**.
7. On success, you will be redirected to the Dashboard.

---

## 3. The Dashboard

The Dashboard is the main landing page after login. It provides a real-time snapshot of the company's financial position for the selected date.

### 3.1 Date Selection

At the top of the Dashboard, you will find:

- **Date Picker** — Click to select a specific date. The dashboard will display data for the selected date.
- **Previous Day Button** (left arrow) — Quickly navigate to the previous day.
- **Next Day Button** (right arrow) — Quickly navigate to the next day.
- **Today Button** — Return to the current date.
- **Monthly Toggle** — Switch between daily view and monthly view. When monthly view is active, the dashboard shows aggregated data for the entire month.

### 3.2 KPI Cards

Six Key Performance Indicator (KPI) cards are displayed at the top of the Dashboard:

| KPI | Description |
|-----|-------------|
| **Collections** | Total cash collected for the selected date |
| **Undeposited Cash** | Total cash collected but not yet deposited to a bank account |
| **Cash in Bank** | Total current balance across all bank accounts |
| **PCF Balance** | Total current balance across all Petty Cash Funds |
| **PDC This Month** | Total value of Post-Dated Checks maturing this month |
| **PDC Total** | Total value of all outstanding PDCs |

Each KPI card displays:
- The current value in Philippine Pesos (PHP)
- A colored indicator (green for positive, red for negative where applicable)

### 3.3 Alerts Notification

- A bell icon in the top-right corner displays the number of active alerts.
- Click the bell icon to open the **Alerts Modal**, which shows:
  - **PCF Low Balance Alerts** — Petty Cash Funds that have fallen below their minimum balance threshold.
  - **PDC Maturity Alerts** — Post-Dated Checks that are maturing soon or have matured.
- Click on any alert item to navigate directly to the relevant page.

### 3.4 Unreplenished PCF Alert Banner

A prominent banner at the top of the Dashboard warns if any Petty Cash Fund has unreplenished amounts. This banner will show:

- The total unreplenished amount.
- A reminder to replenish the fund.

### 3.5 Cash on Hand (PCF Table)

This section displays all Petty Cash Funds grouped by location:

- **Main Office**
- **Quarry**
- **Tagoloan**
- **Midsayap**
- **Valencia**

For each PCF, the following information is displayed:

- **Name** — The name of the PCF fund
- **Beginning Balance** — The balance at the start of the selected date
- **Disbursements** — Amounts paid out
- **Replenishments** — Amounts added to replenish the fund
- **Ending Balance** — The balance after all transactions
- **Unreplenished Amount** — Total unreplenished disbursements

Each PCF row can be expanded (click the arrow) to show individual transactions for that fund.

### 3.6 Collections History

This section shows the 7-day rolling view of cash collections:

- **Undeposited** — Collections not yet deposited to bank (shown in orange)
- **Deposited** — Collections already deposited (shown in green)
- **Total** — Combined sum

Each collection entry shows:
- Amount in PHP
- Description (if provided)
- Status (Undeposited / Deposited)
- Date

### 3.7 Cash in Bank Table

This is the central table on the Dashboard, showing the status of all bank accounts:

Columns:

| Column | Description |
|--------|-------------|
| PARTICULARS | Bank account name |
| Account # | Bank account number |
| Beginning | Opening balance for the selected date |
| Collections | Cash collections deposited to this account |
| Local Deposits | Inter-bank or local deposits |
| Disbursements | Payments made from this account |
| Fund Transfer | Outgoing transfers to other accounts |
| Fund Receipt | Incoming transfers from other accounts |
| Adjustment (+) | Positive adjustments (additions) |
| Adjustment (-) | Negative adjustments (deductions) |
| Returned | Returned checks associated with this account |
| Ending | Closing balance after all transactions |

The **GRAND TOTAL** row at the bottom shows the sum of all columns across all accounts.

**Formula**: Ending = Beginning + Deposits + Fund Receipt + Adjustment (+) - Disbursements - Fund Transfer - Adjustment (-) - Returned

### 3.8 Cash in Bank 2-Day History

Click **Show History** to toggle a comparison table showing:

- **Yesterday** column — Data for the day before the selected date
- **Previous Day** column — Data for two days before the selected date

This helps in comparing cash position across consecutive days.

### 3.9 Go to Admin Button

If you have admin privileges, a **Go to Admin** button is available. Click it to access the Admin Panel. Non-admin users will see a notification that admin access is restricted.

### 3.10 Quick Add (Floating Action Button)

A circular button with a plus (+) icon is fixed at the bottom-right corner of the screen. Click it to open a quick-add menu with the following options:

- **Add Transaction** — Opens the Add Transaction form
- **Add Bank Account** — Opens the Add Bank Account form
- **Add PDC** — Opens the Create PDC form
- **Add PCF** — Opens the Add PCF form
- **Generate PDF Report** — Opens the PDF generation dialog
- **Settings** — Opens settings (Electron desktop app only)

---

## 4. Navigation

### 4.1 Top Navigation Bar

The top navigation bar provides access to the main features of the system:

| Menu Item | Icon | Page | Description |
|-----------|------|------|-------------|
| Dashboard | Home icon | `/dashboard` | Main dashboard landing page |
| Banks | Bank icon | `/banks` | List of all bank accounts |
| Cash Summary | Wallet icon | `/cash-summary` | Daily cash summary with export |
| Collect Cash | Wallet icon | `/collect-cash` | Record and deposit cash collections |
| Analysis | Chart icon | `/analysis` | Bank reconciliation and analysis |
| Transactions | Receipt icon | `/transactions` | Transaction history and management |
| Monthly | Bar chart icon | `/monthly-report` | Consolidated monthly report |
| PDC | Receipt icon | `/pdc` | Post-Dated Check management |
| Settings | Gear icon | `/settings` | User preferences and configuration |

The currently active page is highlighted in the navigation bar.

### 4.2 User Menu

Click your avatar or user icon in the top-right corner to open:

- **Settings** — Open user settings
- **Change Password** — Change your login password
- **Logout** — Log out of the system

### 4.3 Keyboard Shortcuts

- **Enter** — Submit forms (login, add transaction, etc.)
- **Escape** — Close modals and dialogs

### 4.4 Breadcrumbs

Some pages have breadcrumb navigation showing your current location within the system (e.g., "Home > Banks > BDO - 722").

---

## 5. Bank Accounts

### 5.1 Viewing All Banks

1. Click **Banks** in the top navigation bar.
2. A list of all bank accounts is displayed showing:
   - **Name** — The bank account name (e.g., "BDO - 722")
   - **Account Number** — The bank account number
   - **Balance** — The current balance in PHP
3. Click on any bank account row to view its detailed page.

### 5.2 Adding a Bank Account

**From the Banks page:**
1. Click the Quick Add FAB (floating plus button) at the bottom-right.
2. Select **Add Bank Account**.

**From the Dashboard:**
1. Click the Quick Add FAB.
2. Select **Add Bank Account**.

**The Add Bank Account form:**
- **Name** — Enter the bank name (e.g., "BDO - 722")
- **Account Number** — Enter the unique account number
- **Area** — Select the area from the dropdown (Main Office, Tagoloan, Midsayap, Valencia Parts)
- **Opening Balance** — Enter the initial balance when this account was opened
- **Start Date** — Select the date when transactions should start being counted for this account

Click **Save** to create the account.

### 5.3 Bank Account Detail Page

Click on a bank account from the Banks list to view its detail page, which shows:

- **Account Information**: Name, account number, area, current balance
- **Transaction History**: A filterable, paginated table of all transactions for this account
- **Filter Options**: Filter by transaction type (deposit, disbursement, fund transfer, etc.) and date range

From this page you can also:
- Click the Quick Add FAB to add a new transaction for this account
- Export transaction data

---

## 6. Transactions

### 6.1 Transaction Types

The system supports the following transaction types:

| Type | Description | Effect on Bank Balance |
|------|-------------|------------------------|
| Deposit | Cash or check deposited to the bank | Increases |
| Collection | Cash received (tracking only) | No direct effect |
| Disbursement | Payment made from the bank | Decreases |
| Fund Transfer | Transfer between bank accounts | Neutral (out - in) |
| Fund Transfer In | Incoming transfer from another account | Increases |
| Fund Transfer Out | Outgoing transfer to another account | Decreases |
| Returned Check | A deposited check that bounced | Decreases |
| Bank Charges | Bank service fees | Decreases |
| Adjustment (+) | Positive adjustment | Increases |
| Adjustment (-) | Negative adjustment | Decreases |
| Local Deposits | Tracking-only deposit | No direct effect |

### 6.2 Adding a Transaction

**From the Dashboard:**
1. Click the Quick Add FAB (floating plus button).
2. Select **Add Transaction**.

**From the Transactions page:**
1. Click the Quick Add FAB.
2. Select **Add Transaction**.

**From a Bank Detail page:**
1. Navigate to the specific bank account.
2. Click the Quick Add FAB.

**The Add Transaction form:**

- **Bank Account** — Select the bank account from the dropdown
- **Transaction Type** — Select the type from the dropdown (see Section 6.1)
- **Amount** — Enter the amount in PHP
- **Description** — Enter a brief description of the transaction
- **Date** — Select the transaction date (defaults to today)
- **Check Number** — (Optional) Enter a check number if applicable
- **Reference** — (Optional) Enter a reference number

Additional fields for specific transaction types:

- **From Bank / To Bank** — For fund transfers, select the source and destination accounts
- **PDC Status** — If this transaction is related to a PDC

Click **Save** to record the transaction.

### 6.3 Viewing All Transactions

1. Click **Transactions** in the top navigation bar.
2. The Transactions page displays:
   - A searchable, filterable, paginated table of all transactions
   - Color-coded rows based on transaction type (green for inflows, red for outflows)
   - Each row shows: Date, Type, Description, Amount, Bank Account, Added By, Created At

3. **Filter Options**:
   - **By Type** — Filter to show only specific transaction types
   - **By Bank** — Filter to show only transactions for a specific bank
   - **By Date Range** — Filter by start and end dates
   - **Search** — Free text search across descriptions

### 6.4 PCF Transactions Tab

On the Transactions page, a secondary tab shows **PCF Transactions** (Petty Cash Fund transactions) separately from bank transactions.

### 6.5 Exporting Transactions

On the Transactions page, click the **Export** button to download the current transaction list as a CSV file.

---

## 7. Post-Dated Checks (PDC)

### 7.1 PDC Lifecycle

A Post-Dated Check goes through the following stages:

```
OUTSTANDING → MATURED → DEPOSITED
                         → RETURNED
```

1. **Outstanding** — The check has been created and recorded but has not yet reached its maturity date.
2. **Matured** — The check's maturity date has passed. It is now eligible for deposit.
3. **Deposited** — The check has been deposited to a bank account.
4. **Returned** — The check was returned/bounced (e.g., insufficient funds).

### 7.2 Viewing All PDCs

1. Click **PDC** in the top navigation bar.
2. The PDC page displays a table of all PDCs with:
   - Customer Name
   - Check Number
   - Amount
   - Maturity Date
   - Status (color-coded chip)
   - Deposit Bank (if deposited)
   - Returned Date / Reason (if returned)
3. **Filter Options**:
   - By Status (Outstanding, Matured, Deposited, Returned)
   - By Date Range (maturity date range)

### 7.3 Creating a New PDC

1. Go to the **PDC** page.
2. Click the Quick Add FAB or the **Add PDC** button.
3. Fill in the PDC Creation form:
   - **Customer Name** — Name of the check issuer
   - **Check Number** — The check number
   - **Maturity Date** — The date the check matures
   - **Amount** — The check amount in PHP
   - **Deposit Bank** — (Optional) Select the intended deposit bank
   - **Notes** — (Optional) Additional notes
4. Click **Save**.

### 7.4 Marking a PDC as Matured

When a PDC reaches its maturity date:

1. Go to the **PDC** page.
2. Find the PDC in the list.
3. Click the **Mark as Matured** button (appears for Outstanding PDCs past their maturity date).
4. Confirm the action.

### 7.5 Depositing a PDC

After a PDC has matured, it can be deposited to a bank account:

1. Go to the **PDC** page.
2. Find the matured PDC and click the **Deposit** button.
3. The Deposit PDC dialog will open:
   - **Bank Account** — Select the target bank account for deposit
   - **Deposit Date** — Select the deposit date
4. Click **Deposit**.

**System Behavior**: Depositing a PDC automatically creates:
- A `deposit` transaction for the bank account
- A `collection` transaction record for tracking

### 7.6 Returning a PDC

If a deposited check bounces or is returned unpaid:

1. Go to the **PDC** page.
2. Find the PDC and click the **Return** button.
3. The Return PDC dialog will open:
   - **Return Date** — Select the date the check was returned
   - **Return Reason** — Enter the reason (e.g., "Insufficient funds", "Account closed")
4. Click **Submit**.

**System Behavior**: Returning a PDC automatically:
- Updates the PDC status to "Returned"
- Creates a `returned_check` transaction for the bank account for reconciliation tracking
- Records the return date and reason

### 7.7 PDC Detail View

Click on a specific PDC row to view its detail page showing:

- Full check information
- Current status
- Partitioned summary: Matured, This Month, Next Month, 2+ Months
- Action buttons (Deposit / Return) depending on current status

---

## 8. Petty Cash Fund (PCF)

### 8.1 What is a PCF?

Petty Cash Funds are small cash reserves kept at various office locations to cover minor expenses. Each PCF is tracked independently with its own balance and transaction history.

### 8.2 PCF Page Overview

1. Click the **PCF** icon on the Dashboard (or navigate if linked in navigation).
2. The PCF page has three tabs:

**Tab 1: PCF Table**
Shows all PCFs grouped by location:

| Location | Description |
|----------|-------------|
| Main Office | Primary office location |
| Quarry | Quarry site location |
| Tagoloan | Tagoloan branch |
| Midsayap | Midsayap branch |
| Valencia | Valencia branch |

For each PCF:
- **Name** — Fund name
- **Current Balance** — Available balance
- **Unreplenished Amount** — Total unreplenished disbursements
- **Disbursements (Today)** — Today's total disbursements
- Expand each PCF to view its individual transaction history

**Tab 2: PCF Reports**
Generate daily, weekly, or monthly PCF reports with export to Excel or PDF.

**Tab 3: Cash Count**
Record physical cash counts for audit purposes.

### 8.3 Adding a PCF Transaction

1. From the PCF page, click the Quick Add FAB or the Add button.
2. The Add PCF form has two tabs:

**Tab A: Add Transaction to Existing PCF**
- **PCF** — Select the Petty Cash Fund from the dropdown
- **Type** — Select **Disbursement** (money going out) or **Replenishment** (money coming in)
- **Amount** — Enter the amount
- **Description** — Explain the purpose
- **Date** — Select the date

**Tab B: Create New PCF Fund**
- **Name** — Enter a name for the fund
- **Location** — Select the location
- **Opening Balance** — Initial fund balance
- **Note** — (Optional) Additional notes
- **Start Date** — When the fund becomes active
- **Minimum Balance Threshold** — Set a threshold for low-balance alerts

### 8.4 Recording a Cash Count

1. Go to the **PCF** page > **Cash Count** tab.
2. Click the **Record Count** button.
3. Select the **PCF** to count.
4. Enter the **Actual Count** (physical cash on hand).
5. The system automatically calculates the **Variance** (Actual - System Balance).
6. Add any **Notes** about discrepancies.
7. Click **Save**.

### 8.5 PCF Reports

1. Go to the **PCF** page > **PCF Reports** tab.
2. Select the report type: Daily, Weekly, or Monthly.
3. Select the date or date range.
4. Click **Generate** to view the report.
5. Click **Export to Excel** or **Export to PDF** to download.

---

## 9. Cash Collections

### 9.1 Recording a Collection

1. Click **Collect Cash** in the top navigation bar.
2. Click **Record Collection**.
3. Fill in the form:
   - **Amount** — The cash amount received
   - **Description** — (Optional) Source or purpose of the collection
   - **Date** — The date of collection
   - **Collection Type** — Select the type if applicable
4. Click **Save**.

The collection will be recorded with a status of **Undeposited**.

### 9.2 Depositing a Collection

When you deposit collected cash to a bank account:

1. Go to **Collect Cash** page.
2. Find the undeposited collection in the list.
3. Click the **Deposit** button for that collection.
4. Select the **Bank Account** to deposit into.
5. Optionally modify the **Deposit Date**.
6. Click **Deposit**.

The collection status changes to **Deposited**, and a deposit transaction is created for the selected bank account.

### 9.3 Collections History

The Collections page shows:

- **Undeposited Collections** — Listed with orange status indicator
- **Deposited Collections** — Listed with green status indicator
- **Summary** — Total undeposited, total deposited, and grand total

Each collection entry shows:
- Amount
- Description
- Date
- Status (Undeposited / Deposited)
- Bank Account (if deposited)

---

## 10. Cash Summary

### 10.1 Viewing the Cash Summary

1. Click **Cash Summary** in the top navigation bar.
2. Select a **Date** using the date picker.
3. The page displays a comprehensive daily cash summary:

**Section A: Cash in Bank**
- Table of all bank accounts with beginning balance, deposits, disbursements, adjustments, and ending balance

**Section B: Cash on Hand (PCF)**
- Table of all Petty Cash Funds with beginning balance, disbursements, replenishments, and current balance

**Section C: Collections Summary**
- Total collections for the selected date
- Undeposited collections
- Deposit status breakdown

**Section D: Totals**
- Grand total cash position (Cash in Bank + Cash on Hand)
- Breakdown by category

### 10.2 Exporting the Cash Summary

- **Export to PDF** — Click the Export PDF button to generate a downloadable PDF report of the cash summary.
- **Export to Excel** — Click the Export Excel button to download as a spreadsheet.

---

## 11. Bank Reconciliation and Analysis

### 11.1 What is Bank Reconciliation?

Bank reconciliation is the process of matching the bank's recorded balance (Per Bank Statement) against the company's recorded balance (Per DCPR) and accounting for differences such as outstanding checks, deposits in transit, returned checks, bank charges, and unbooked transfers.

### 11.2 Accessing the Analysis Page

1. Click **Analysis** in the top navigation bar.
2. Select a **Date** using the date picker.
3. The page displays a bank reconciliation table.

### 11.3 The Reconciliation Table

For each bank account, the following fields are shown:

| Field | Description |
|-------|-------------|
| Bank Name | The bank account name |
| Per Bank (Manual Entry) | Balance as per bank statement (user-entered) |
| Outstanding Checks | Checks issued but not yet cleared by the bank |
| Deposit in Transit | Deposits recorded but not yet reflected by the bank |
| Returned Checks | Checks that were returned unpaid |
| Bank Charges | Fees charged by the bank |
| Unbooked Fund Transfers | Transfers not yet recorded by the bank |
| Per DCPR (Auto) | Balance as per company records (auto-computed) |
| Reconciled Balance | Computed: Per Bank + Deposits in Transit - Outstanding Checks - Returned Checks - Bank Charges + Unbooked Transfers |
| Difference | Variance between Per DCPR and Reconciled Balance |

### 11.4 Editing Reconciliation Data

1. Click the **Edit** button or click directly on a value field.
2. Modify the values as needed.
3. Click **Save** to store the reconciliation data.

A color indicator shows whether the account is **Balanced** (green, difference = 0) or **Unbalanced** (red, difference ≠ 0).

### 11.5 Saving and Exporting

- **Save** — Click the Save button to persist the reconciliation data to the database.
- **Export to PDF** — Download the reconciliation as a PDF report.
- **Export to Excel** — Download as a spreadsheet.

---

## 12. Monthly Report

### 12.1 Accessing the Monthly Report

1. Click **Monthly** in the top navigation bar.
2. Select a **Month** using the month picker (format: YYYY-MM).

### 12.2 Report Sections

The Monthly Report is organized into three collapsible sections:

**Section 1: Cash in Bank**
- All bank transactions for the selected month, grouped by bank account
- Each bank shows:
  - Bank name and account number
  - Location
  - Beginning balance
  - Collections
  - Local deposits
  - Adjustment (+) and Adjustment (-)
  - Total inflows and outflows
  - Net change
  - Ending balance
  - Transaction count
- Expandable to show daily transaction breakdown

**Section 2: Cash on Hand (PCF)**
- All PCF transactions for the selected month
- Grouped by PCF fund
- Shows disbursements, replenishments, and balance changes

**Section 3: Summary**
- Monthly totals including:
  - Total bank inflows and outflows
  - Bank net change
  - Monthly collections
  - Monthly deposits
  - Undeposited total
  - PCF transaction count, total disbursements, total replenishments
  - PDC count and total amount

### 12.3 Generating the Monthly PDF Report

1. Select the desired month.
2. Click **Generate PDF**.
3. The system will generate a comprehensive multi-page PDF report (see Section 13 for details).
4. The PDF will be downloaded automatically.

---

## 13. PDF Reports

### 13.1 Types of PDF Reports

The system can generate the following PDF reports:

| Report | Source | Content |
|--------|--------|---------|
| Daily Cash Position Report | Dashboard / PDF button | Full daily report with all sections |
| Monthly Cash Position Report | Monthly Report page | Monthly consolidated report |
| Cash Summary | Cash Summary page | Selected date cash summary |
| Bank Reconciliation | Analysis page | Reconciliation per bank |
| PCF Reports | PCF > Reports tab | PCF-specific reports |

### 13.2 Generating a Daily PDF Report

1. From the Dashboard, click the **Generate PDF** button.
2. The PDF Report dialog opens.
3. Select the **Date** for the report.
4. Click **Generate**.
5. The report will be generated and downloaded automatically.

### 13.3 Understanding the Daily PDF Report

The Daily PDF Report contains multiple pages:

**Page 1: Header**
- Company logo
- Report title: "DAILY CASH POSITION REPORT"
- Office name and date

**Page 1: Cash in Bank by Bank**
- Table with columns: AREA, BANK NAME, ACCT#, MAIN OFFICE, PARTS, TOTAL
- Shows each bank account grouped by area
- Grand Total row at the bottom

**Page 1: Payables**
- Summary of payable accounts

**Page 1: Net Balance**
- Summary of net balance calculations

**Page 2: Detailed Breakdown**
- Collections section with individual collection items
- Disbursements section with individual disbursement items
- PCF Transactions section
- Adjustments section
- Bank Charges section

**Page 3: PCF Summary**
- Beginning Balance for each PCF
- Disbursements and Replenishments
- Ending Balance
- Unreplenished amounts

**Page 4: Analysis (Landscape)**
- Cash Position Summary with 6-column table
- PAYABLES table
- NET BALANCE table
- Grand Total summary

**Page 5: Signatures**
- "Prepared by" section
- "Noted by" section
- "Approved by" section

### 13.4 Generating a Monthly PDF Report

1. Go to **Monthly** in the navigation bar.
2. Select the month.
3. Click **Generate PDF**.
4. The report will be generated and downloaded.

### 13.5 Understanding the Monthly PDF Report

The Monthly PDF Report includes:

- **Header**: Company name, "MONTHLY REPORT", month and year
- **Summary Pages**: Consolidated totals for the month including collections, disbursements, PCF transactions, adjustments, and bank charges
- **Bank Balance Summary**: Per-account breakdown with beginning balance, month's transactions, and ending balance
- **Bank Analysis**: Bank reconciliation for the end of the month
- **PDC Summary**: PDC transactions for the month
- **Signatures**: Prepared by, Noted by, Approved by

---

## 14. Settings

### 14.1 Accessing Settings

1. Click **Settings** in the top navigation bar.
2. Alternatively, click your avatar > **Settings** from the user menu.

### 14.2 Dark Mode

- Toggle **Dark Mode** to switch between light and dark color schemes.
- The entire interface adapts to the selected mode.

### 14.3 Color Scheme

Choose from multiple color scheme options:

- Default (Blue/White)
- Additional color options as configured by the system

Click **Save** to apply the selected color scheme.

### 14.4 Backend Connection (Electron Desktop Only)

If using the Electron desktop application:

1. Open Settings.
2. In the Connection section, configure:
   - **Local Mode** — Connect to a backend running on the same machine (default: `http://localhost:8000`)
   - **Remote URL** — Enter a custom backend URL for remote server connection
3. Click **Save** to apply.

---

## 15. Admin Panel

### 15.1 Accessing the Admin Panel

**Prerequisite**: You must have admin privileges (`is_staff` and `is_superuser` set to true).

1. Log in with an admin account.
2. On the Dashboard, click **Go to Admin**.
3. You will be redirected to the Admin Panel home page.

### 15.2 Admin Panel Layout

The Admin Panel has a dark sidebar on the left with navigation items:

| Menu Item | Description |
|-----------|-------------|
| Home | Admin dashboard with statistics and charts |
| Transactions | Full CRUD for all bank transactions |
| Cash Collection | CRUD for collection records |
| Banks | Full CRUD for bank accounts |
| PDC | CRUD for Post-Dated Checks |
| PCF | CRUD for Petty Cash Funds |
| Users | CRUD for system users |
| Audit Logs | Read-only view of system audit trail |
| Back to Dashboard | Return to the main user dashboard |

### 15.3 Admin Home

The Admin Home page displays:
- **Total Users** — Number of registered users
- **Total Transactions** — Total transaction count
- **Total Bank Accounts** — Number of bank accounts
- **Total PCFs** — Number of active Petty Cash Funds
- **Total PDCs** — Number of Post-Dated Checks
- **Total Collections** — Number of collection records

### 15.4 Managing Users

1. Go to **Admin > Users**.
2. The users table shows: Username, Email, Staff Status, Superuser Status, Last Login, Date Joined.
3. **Creating a User**:
   - Click **Add User**.
   - Enter **Username**, **Email**, **Password**.
   - Toggle **Staff Status** and **Superuser Status** as needed.
   - Click **Save**.
4. **Editing a User**: Click the edit icon next to a user to modify their details.
5. **Deleting a User**: Click the delete icon and confirm.

**Note**: Staff status grants access to the admin panel. Superuser status grants full permissions.

### 15.5 Managing Transactions (Admin)

1. Go to **Admin > Transactions**.
2. The transactions table shows all transactions with full details.
3. **Creating a Transaction**: Click **Add Transaction** and fill in all fields.
4. **Editing a Transaction**: Click the edit icon to modify any transaction field.
5. **Deleting a Transaction**: Click the delete icon and confirm.

### 15.6 Managing Banks (Admin)

1. Go to **Admin > Banks**.
2. View, add, edit, or delete bank accounts.
3. Deleting a bank account will also remove its associated transactions.

### 15.7 Managing PDCs (Admin)

1. Go to **Admin > PDC**.
2. View, add, edit, or delete Post-Dated Checks.
3. Bulk operations for status changes.

### 15.8 Managing PCFs (Admin)

1. Go to **Admin > PCF**.
2. View, add, edit, or delete Petty Cash Funds.
3. Manage PCF transactions and balance adjustments.

### 15.9 Managing Collections (Admin)

1. Go to **Admin > Cash Collection**.
2. View, add, edit, or delete collection records.
3. Adjust collection status (Undeposited / Deposited).

### 15.10 Audit Logs

1. Go to **Admin > Audit Logs**.
2. View a read-only, searchable list of all system actions:
   - Login and logout events
   - Transaction creation, updates, and deletions
   - PDC deposits and returns
   - PCF transactions
   - User management actions
   - File exports
3. Each log entry shows: Timestamp, User, Action, Entity, Description, and IP Address.

---

## 16. Troubleshooting

### 16.1 Login Issues

**Problem**: Cannot log in.
**Solutions**:
- Verify your username and password are correct (check for typos and Caps Lock)
- Check if your account has been created or enabled by an administrator
- Try password reset via the administrator
- Ensure the backend server is running

**Problem**: Session expired.
**Solution**: Simply log in again. Sessions expire after 60 minutes of inactivity for security.

### 16.2 Data Not Appearing

**Problem**: Dashboard shows no data or zero values.
**Solutions**:
- Verify the selected date is correct
- Check that the backend server is running and accessible
- Refresh the page
- Check the browser console (F12) for API errors

**Problem**: Transactions not showing in Cash in Bank table.
**Solutions**:
- Verify the transaction was saved successfully (look for success message)
- Check the transaction date matches the selected date on the Dashboard
- Verify the correct bank account was selected

### 16.3 PDC Issues

**Problem**: Cannot mark a PDC as matured.
**Solution**: The PDC must have a maturity date that has already passed.

**Problem**: Cannot deposit a PDC.
**Solution**: The PDC must be in "Matured" status. Mark it as matured first.

**Problem**: Cannot return a PDC.
**Solution**: The PDC must not already be in "Returned" status.

### 16.4 PDF Generation Issues

**Problem**: PDF report fails to generate.
**Solutions**:
- Ensure there is data for the selected date/month
- Check the browser allows pop-ups and file downloads
- Restart the application and try again

**Problem**: PDF report shows missing or incorrect data.
**Solutions**:
- Verify the date selection is correct
- Check that all transactions for the period have been entered

### 16.5 Connection Issues (Desktop App)

**Problem**: The desktop app cannot connect to the backend.
**Solutions**:
1. Go to **Settings**.
2. Verify the backend URL is correct:
   - In Local Mode: The URL should point to the running Django server (default: `http://localhost:8000`)
   - In Remote Mode: Verify the remote server address and port
3. Ensure the backend server is running.
4. Check network connectivity and firewall settings.

### 16.6 Admin Access Issues

**Problem**: The "Go to Admin" button is not visible.
**Solution**: You need both Staff Status and Superuser Status. Contact your system administrator to grant these permissions.

**Problem**: Admin page shows "Access Denied" or redirects.
**Solution**: Your account may not have the required privileges. Contact the system administrator.

### 16.7 Browser-Specific Issues

**Chrome/Edge**:
- If the application does not load, clear the browser cache (Settings > Privacy > Clear Browsing Data)
- Ensure cookies are enabled for the site

**Firefox**:
- If PDF reports do not download, check your download settings and ensure pop-ups are not blocked

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| Bank Balance | The current balance recorded by the bank |
| DCPR | Daily Cash Position Report — the main report generated by the system |
| Disbursement | A payment made from a bank account or PCF |
| Fund Transfer | Movement of money between bank accounts |
| KPI | Key Performance Indicator — summary metrics shown on the dashboard |
| Matured | A PDC whose maturity date has passed |
| Outstanding | A PDC that has not yet reached its maturity date |
| PCF | Petty Cash Fund — a small cash reserve for minor expenses |
| PDC | Post-Dated Check — a check with a future date |
| Replenishment | Adding money back to a PCF after it has been used |
| Undeposited | Cash collected but not yet deposited to a bank account |

## Appendix B: Transaction Type Reference

| Type Value in System | Display Color | Balance Effect |
|---------------------|---------------|----------------|
| deposit | Green | + (Increase) |
| collection | Green | Tracking only |
| disbursement | Red | - (Decrease) |
| fund_transfer | Neutral | Neutral |
| fund_transfer_in | Green | + (Increase) |
| fund_transfer_out | Red | - (Decrease) |
| returned_check | Red | - (Decrease) |
| bank_charges | Red | - (Decrease) |
| adjustment_in | Green | + (Increase) |
| adjustment_out | Red | - (Decrease) |
| local_deposit | Neutral | Tracking only |

## Appendix C: Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Enter | Submit current form |
| Escape | Close modal/dialog |
| Click date field | Open date picker |

---

*End of User Manual*

*JOPCA Daily Cash Position System — Version 1.0*

*Document generated May 2026*
