# FinTrack — Product Requirements Document (PRD)

**Document Version:** 2.0
**Status:** Active Product Specification / Post-MVP Expansion
**Product:** FinTrack
**Platform:** Responsive Web Application
**Primary Stack:** React + JavaScript + Vite + Express.js + Prisma
**Database:** PostgreSQL for production
**Development Database:** SQLite may be used only where appropriate for local development/testing
**UI Stack:** Tailwind CSS + DaisyUI
**Visualization:** Recharts
**Architecture:** React Frontend → Express REST API → Authentication → Prisma → PostgreSQL

---

# 1. Product Overview

FinTrack adalah aplikasi web untuk membantu pengguna mengelola keuangan pribadi secara sederhana namun komprehensif.

Pengguna dapat:

* mencatat pemasukan dan pengeluaran;
* mengelola kategori;
* mengelola akun atau wallet;
* membuat budget;
* membuat recurring transactions;
* membuat recurring budgets;
* menetapkan financial goals;
* melihat dashboard;
* melihat laporan;
* menganalisis pola keuangan;
* melakukan export data;
* menghasilkan financial report PDF;
* menerima notifications dan reminders;
* mendapatkan AI-assisted financial insights.

FinTrack dikembangkan dari aplikasi single-user berbasis SQLite menjadi aplikasi **online-first, authenticated, multi-user, dan production-deployable**.

Seluruh data keuangan pengguna harus terisolasi berdasarkan akun pengguna yang terautentikasi.

FinTrack bukan aplikasi perbankan dan tidak melakukan sinkronisasi otomatis dengan rekening bank.

---

# 2. Product Vision

FinTrack harus terasa seperti aplikasi personal finance modern yang benar-benar dapat digunakan, bukan sekadar kumpulan halaman CRUD.

Ketika pengguna membuka aplikasi, mereka harus dapat langsung memahami:

* kondisi saldo;
* pemasukan;
* pengeluaran;
* cash flow;
* budget;
* progress tujuan finansial;
* pola pengeluaran;
* insight finansial.

Ketika pengguna ingin mencatat aktivitas keuangan, prosesnya harus cepat dan jelas.

Ketika pengguna ingin memahami kondisi finansial, dashboard, reports, analytics, dan AI insights harus memberikan informasi yang relevan berdasarkan data aktual.

Ketika aplikasi digunakan oleh banyak pengguna, setiap pengguna hanya boleh mengakses data miliknya sendiri.

Prioritas produk:

**Correctness → Security → Maintainability → Usability → Visual Quality → Additional Features**

---

# 3. Problem Statement

Pengguna sering mencatat pemasukan dan pengeluaran secara terpisah atau hanya mengandalkan ingatan.

Hal tersebut menyulitkan pengguna untuk mengetahui:

* berapa total pemasukan;
* berapa total pengeluaran;
* berapa saldo;
* kategori apa yang paling banyak menghabiskan uang;
* apakah pengeluaran meningkat atau menurun;
* apakah budget telah terlampaui;
* apakah tujuan finansial berjalan sesuai target;
* bagaimana pola keuangan mereka dalam periode tertentu.

FinTrack menyelesaikan masalah tersebut dengan menyediakan satu tempat untuk mencatat, mengelola, memvisualisasikan, dan menganalisis data keuangan pribadi.

---

# 4. Product Goals

## 4.1 Primary Goals

FinTrack harus memungkinkan pengguna untuk:

1. Membuat dan mengelola akun.
2. Login dan logout dengan aman.
3. Mengelola data keuangan pribadi.
4. Mencatat pemasukan dan pengeluaran.
5. Mengelola kategori.
6. Mengelola account/wallet.
7. Mencari dan memfilter transaksi.
8. Membuat dan mengelola budget.
9. Mengelola recurring transactions.
10. Mengelola recurring budgets.
11. Membuat financial goals.
12. Melihat dashboard.
13. Melihat laporan keuangan.
14. Melakukan advanced analytics.
15. Export data ke CSV/Excel.
16. Menghasilkan financial report PDF.
17. Melihat notifications/reminders.
18. Mendapatkan AI-assisted financial insights.
19. Menggunakan aplikasi secara online dari environment production.

---

## 4.2 Technical Goals

Project harus menunjukkan kemampuan:

* React component architecture.
* Modern JavaScript.
* React Router.
* Responsive UI.
* REST API.
* Express.js.
* Prisma ORM.
* PostgreSQL.
* Relational database.
* Authentication.
* Authorization.
* Multi-user data isolation.
* CRUD operations.
* Data aggregation.
* Form validation.
* Error handling.
* Search.
* Filtering.
* Sorting.
* Pagination.
* Data visualization.
* Export.
* PDF generation.
* AI-assisted analysis.
* Secure environment configuration.
* Production deployment.
* Clean separation antara frontend dan backend.

---

# 5. Non-Goals

FinTrack tidak mencakup:

* Bank integration.
* Automatic bank transaction import.
* Payment gateway.
* Investment portfolio management.
* Cryptocurrency tracking.
* Financial product marketplace.
* PWA.
* Offline-first functionality.
* Offline synchronization.
* Real-time WebSocket architecture.
* Microservices architecture.
* Redis sebagai requirement utama.
* Complex distributed architecture.

**Bank integration dan PWA/offline secara resmi berada di luar product scope dan bukan fitur yang direncanakan untuk implementasi.**

---

# 6. Target Users

Target pengguna adalah individu yang ingin mengelola keuangan pribadi.

Contoh:

* Mahasiswa.
* Karyawan.
* Freelancer.
* Pengguna umum.

Setiap pengguna memiliki akun FinTrack sendiri.

Data finansial antar pengguna harus terisolasi.

---

# 7. Product Scope

## P0 — Core

* Authentication.
* Multi-user.
* Authorization.
* Dashboard.
* Transactions.
* Categories.
* Accounts/Wallets.
* Budgets.
* Reports.
* Financial calculations.
* Responsive layout.
* Data isolation.
* PostgreSQL production database.

## P1 — Financial Management

* Recurring transactions.
* Recurring budgets.
* Financial goals.
* Advanced analytics.
* Notifications/reminders.
* CSV/Excel export.
* PDF financial report.

## P1 — Intelligence

* AI-assisted financial insights.
* Deterministic fallback insights.
* Financial metric analysis.

## P2 — Production

* Cloud deployment.
* Production security hardening.
* Production monitoring/health verification.
* Production end-to-end testing.

---

# 8. User Stories

## 8.1 Authentication

Sebagai pengguna, saya ingin membuat akun agar data keuangan saya tersimpan secara pribadi.

Sebagai pengguna, saya ingin login agar dapat mengakses data saya.

Sebagai pengguna, saya ingin logout agar session dapat dihentikan.

Sebagai pengguna, saya ingin login menggunakan Google agar proses authentication lebih mudah.

Sebagai pengguna, saya ingin session tetap tersedia setelah refresh selama session masih valid.

---

## 8.2 Multi-user

Sebagai pengguna, saya ingin hanya melihat data keuangan saya sendiri.

Sebagai pengguna, saya tidak ingin pengguna lain dapat melihat transaksi, budget, account, goals, atau data pribadi saya.

Sebagai sistem, setiap request yang membutuhkan data pengguna harus memverifikasi identitas dan ownership data.

---

## 8.3 Transactions

Sebagai pengguna, saya ingin menambahkan transaksi.

Sebagai pengguna, saya ingin mengedit transaksi.

Sebagai pengguna, saya ingin menghapus transaksi.

Sebagai pengguna, saya ingin mencari transaksi.

Sebagai pengguna, saya ingin memfilter transaksi.

Sebagai pengguna, saya ingin mengurutkan transaksi.

---

## 8.4 Accounts / Wallets

Sebagai pengguna, saya ingin membuat account atau wallet.

Sebagai pengguna, saya ingin melihat saldo setiap account.

Sebagai pengguna, saya ingin menghubungkan transaksi dengan account.

Sebagai pengguna, saya ingin mengelola beberapa account sekaligus.

---

## 8.5 Budgets

Sebagai pengguna, saya ingin membuat budget berdasarkan kategori dan periode.

Sebagai pengguna, saya ingin melihat progress budget.

Sebagai pengguna, saya ingin mengetahui apakah budget hampir habis atau telah terlampaui.

---

## 8.6 Recurring Transactions

Sebagai pengguna, saya ingin menentukan transaksi berulang.

Sebagai pengguna, saya ingin mengatur frekuensi transaksi berulang.

Sebagai pengguna, saya ingin melihat recurring transactions yang aktif.

---

## 8.7 Recurring Budgets

Sebagai pengguna, saya ingin membuat budget yang berulang.

Sebagai pengguna, saya ingin mengelola recurring budget.

---

## 8.8 Financial Goals

Sebagai pengguna, saya ingin membuat tujuan finansial.

Sebagai pengguna, saya ingin menentukan target amount.

Sebagai pengguna, saya ingin melihat current progress.

Sebagai pengguna, saya ingin mengetahui persentase progress menuju target.

---

## 8.9 Reports & Analytics

Sebagai pengguna, saya ingin melihat laporan pemasukan dan pengeluaran.

Sebagai pengguna, saya ingin membandingkan kondisi finansial antarbulan.

Sebagai pengguna, saya ingin melihat kategori pengeluaran terbesar.

Sebagai pengguna, saya ingin melihat pola pengeluaran melalui analytics.

---

## 8.10 AI Insights

Sebagai pengguna, saya ingin mendapatkan insight berdasarkan data keuangan saya.

Sebagai pengguna, saya ingin mengetahui perubahan pengeluaran.

Sebagai pengguna, saya ingin mengetahui savings rate.

Sebagai pengguna, saya ingin mendapatkan peringatan terkait budget dan goals.

AI tidak boleh mengubah atau mengarang angka finansial aktual.

---

# 9. Functional Requirements

## FR-001 Authentication

Sistem harus menyediakan authentication.

Minimal:

* Register.
* Login.
* Logout.
* Session management.
* Google OAuth.

Authentication provider harus menggunakan provider authentication yang sesuai untuk production.

Frontend tidak boleh menyimpan secret authentication provider.

---

## FR-002 Authorization

Setiap protected API request harus memiliki authenticated user context.

Backend harus memastikan user hanya dapat mengakses resource miliknya.

Contoh:

```text
User A → Transaction A → allowed

User A → Transaction B milik User B → denied
```

Authorization harus berlaku untuk:

* Transactions.
* Categories.
* Accounts.
* Budgets.
* Recurring transactions.
* Recurring budgets.
* Goals.
* Notifications.
* User-specific analytics.
* AI insights.

---

## FR-003 Dashboard Summary

Dashboard harus menampilkan:

* Total Balance.
* Total Income.
* Total Expense.
* Net Cash Flow.
* Account balances jika tersedia.
* Recent transactions.
* Charts.
* Spending insights.

Formula:

```text
Net Cash Flow = Total Income - Total Expense
```

Nilai harus berasal dari data pengguna yang sedang login.

---

## FR-004 Transaction Creation

Pengguna dapat membuat transaksi.

Field minimal:

* Description.
* Amount.
* Type.
* Category.
* Date.

Field tambahan:

* Account.
* Note.

`amount` harus positif.

`type`:

```text
INCOME
EXPENSE
```

---

## FR-005 Transaction Update

Pengguna dapat mengubah transaksi miliknya.

---

## FR-006 Transaction Delete

Pengguna dapat menghapus transaksi miliknya setelah confirmation dialog.

---

## FR-007 Transaction Search

Pengguna dapat mencari transaksi berdasarkan description.

Search bersifat case-insensitive.

---

## FR-008 Transaction Filtering

Filter:

* Type.
* Category.
* Account.
* Start date.
* End date.

Filter dapat digunakan secara bersamaan.

---

## FR-009 Transaction Sorting

Sorting:

* Newest.
* Oldest.
* Highest amount.
* Lowest amount.

---

## FR-010 Transaction Pagination

Transaction list menggunakan pagination ketika jumlah data cukup banyak.

---

## FR-011 Category Management

Pengguna dapat:

* melihat kategori;
* membuat kategori;
* mengedit kategori;
* menghapus kategori.

Kategori sistem dapat memiliki registry localization.

Kategori custom pengguna tidak harus diterjemahkan secara otomatis.

---

## FR-012 Category Protection

Kategori yang masih digunakan oleh transaction atau budget tidak boleh dihapus secara merusak data.

Sistem harus memberikan pesan yang jelas.

---

## FR-013 Account / Wallet Management

Pengguna dapat:

* membuat account;
* mengedit account;
* menghapus account jika tidak melanggar data integrity;
* melihat saldo;
* menghubungkan transaksi dengan account.

Saldo account harus dihitung secara konsisten berdasarkan business rules.

---

## FR-014 Budget Management

Pengguna dapat membuat budget berdasarkan:

* Category.
* Month.
* Year.
* Amount.

---

## FR-015 Budget Uniqueness

Tidak boleh terdapat lebih dari satu budget untuk kombinasi:

```text
user + category + month + year
```

---

## FR-016 Budget Progress

```text
Progress = Spent / Budget × 100
```

Sistem menampilkan:

* Budget.
* Spent.
* Remaining.
* Progress.
* Status.

---

## FR-017 Budget Status

Minimal:

* On Track.
* Near Limit.
* Over Budget.

Threshold Near Limit dapat ditentukan sebagai constant.

---

## FR-018 Recurring Transactions

Sistem harus dapat menyimpan recurring transaction dengan informasi:

* Description.
* Amount.
* Type.
* Category.
* Account jika tersedia.
* Frequency.
* Start date.
* End date atau active status.

Recurring transaction tidak boleh menyebabkan duplicate execution yang tidak disengaja.

---

## FR-019 Recurring Budgets

Sistem harus dapat menyimpan recurring budget berdasarkan:

* Category.
* Amount.
* Frequency.
* Start date.
* Active status.

---

## FR-020 Financial Goals

Goal minimal memiliki:

* Name.
* Target amount.
* Current amount.
* Target date jika digunakan.
* Status.

Formula:

```text
Goal Progress = Current Amount / Target Amount × 100
```

Jika target amount adalah zero, sistem tidak boleh menghasilkan NaN atau Infinity.

---

## FR-021 Reports

Reports harus menyediakan:

* Monthly income.
* Monthly expense.
* Net cash flow.
* Expense by category.
* Monthly comparison.
* Highest spending category.

---

## FR-022 Advanced Analytics

Analytics dapat menyediakan:

* Income trend.
* Expense trend.
* Net cash flow.
* Savings rate.
* Category concentration.
* Budget utilization.
* Transaction frequency.
* Largest transactions.
* Period comparisons.

---

## FR-023 Export

Pengguna dapat melakukan export data yang menjadi hak aksesnya.

Minimal:

* CSV.
* Excel.

Export tidak boleh menyertakan data pengguna lain.

---

## FR-024 PDF Financial Report

Sistem dapat menghasilkan financial report PDF.

Report harus menggunakan data aktual dari user yang sedang login.

---

## FR-025 Notifications

Sistem menyediakan notifications/reminders untuk kondisi yang relevan.

Contoh:

* Budget warning.
* Budget exceeded.
* Goal reminder.
* Recurring transaction reminder.

Pengguna dapat:

* melihat notifications;
* menandai notification sebagai read;
* menandai seluruh notification sebagai read.

---

## FR-026 AI Financial Insights

Sistem dapat menghasilkan AI-assisted financial insights.

AI context harus menggunakan aggregated dan sanitized financial data.

AI tidak boleh menerima data yang tidak diperlukan.

AI tidak boleh mengubah factual financial metrics.

Jika AI tidak tersedia, gagal, menghasilkan invalid response, atau tidak dikonfigurasi, sistem harus menyediakan deterministic fallback jika memungkinkan.

---

# 10. AI Insights Financial Rules

## Net Cash Flow

```text
Net Cash Flow = Income - Expense
```

Contoh:

```text
Income  = 5,000,000
Expense = 2,009,000

Net Cash Flow = 2,991,000
```

---

## Savings

```text
Savings = Income - Expense
```

---

## Savings Rate

Jika income > 0:

```text
Savings Rate =
(Income - Expense) / Income × 100
```

Jika income = 0, nilai harus null atau state yang sesuai.

---

## Expense Change

Jika previous expense > 0:

```text
Expense Change =
(Current Expense - Previous Expense)
/
Previous Expense × 100
```

Jika previous expense = 0, sistem tidak boleh menghasilkan Infinity atau NaN.

---

## Category Percentage

```text
Category Share =
Category Expense / Total Expense × 100
```

---

## Budget Utilization

```text
Budget Utilization =
Actual Expense / Budget Amount × 100
```

---

## Goal Progress

```text
Goal Progress =
Current Amount / Target Amount × 100
```

Jika target = 0, progress harus ditangani secara aman.

---

## Metric Semantics

Setiap insight metric harus memiliki semantic format.

Minimal:

```text
currency
percentage
number
count
```

Frontend tidak boleh menebak bahwa semua metric adalah currency.

Contoh:

```text
59.82 → 59,82%
```

bukan:

```text
Rp 59,82
```

---

# 11. Data Model

Database production menggunakan PostgreSQL melalui Prisma.

## 11.1 User

Konsep:

```text
User
----
id
email
name
createdAt
updatedAt
```

`id` harus dapat dikaitkan dengan identity dari authentication provider.

---

## 11.2 Category

```text
Category
--------
id
userId
name
icon
color
createdAt
updatedAt
```

Relationship:

```text
User 1 ──── * Category
Category 1 ──── * Transaction
Category 1 ──── * Budget
```

System/default category dapat memiliki strategi khusus sesuai kebutuhan implementasi.

---

## 11.3 Account

```text
Account
-------
id
userId
name
type
initialBalance
createdAt
updatedAt
```

---

## 11.4 Transaction

```text
Transaction
-----------
id
userId
accountId
categoryId
description
amount
type
date
note
createdAt
updatedAt
```

Relationship:

```text
User 1 ──── * Transaction
Account 1 ──── * Transaction
Category 1 ──── * Transaction
```

---

## 11.5 Budget

```text
Budget
------
id
userId
categoryId
month
year
amount
createdAt
updatedAt
```

Unique:

```text
userId + categoryId + month + year
```

---

## 11.6 Recurring Transaction

Recurring transaction harus memiliki ownership user.

Minimal:

```text
RecurringTransaction
--------------------
id
userId
accountId
categoryId
description
amount
type
frequency
startDate
endDate
active
createdAt
updatedAt
```

---

## 11.7 Recurring Budget

```text
RecurringBudget
---------------
id
userId
categoryId
amount
frequency
startDate
active
createdAt
updatedAt
```

---

## 11.8 Financial Goal

```text
Goal
----
id
userId
name
targetAmount
currentAmount
targetDate
status
createdAt
updatedAt
```

---

## 11.9 Notification

```text
Notification
------------
id
userId
type
title
message
read
createdAt
```

---

# 12. Database Requirements

Production:

```text
PostgreSQL
+
Prisma ORM
```

Prisma digunakan untuk:

* schema definition;
* migrations;
* queries;
* relations;
* transactions;
* database access.

Database harus memiliki foreign key dan ownership relationships yang jelas.

Index harus ditambahkan berdasarkan query pattern yang benar-benar dibutuhkan.

Minimal pertimbangkan index untuk:

* userId;
* transaction date;
* categoryId;
* accountId;
* budget period;
* notification read status;
* recurring active status.

Migration harus aman dan tidak destructive tanpa alasan yang jelas.

---

# 13. Existing Data Migration

Perpindahan dari SQLite ke PostgreSQL harus dilakukan secara terkontrol.

Migration strategy harus menentukan apakah:

1. Data development lama dipertahankan dan di-assign ke development user; atau
2. Production database dimulai kosong sementara database development tetap terpisah.

Production database tidak boleh menggunakan data testing secara tidak sengaja.

Migration harus:

* preserve valid data;
* preserve relationships;
* validate ownership;
* avoid duplicate records;
* avoid destructive data loss.

---

# 14. REST API Requirements

Base URL:

```text
/api
```

## Authentication

Authentication dapat ditangani oleh external authentication provider.

Backend tetap harus memverifikasi authenticated identity sebelum protected resource diakses.

---

## Transactions

```http
GET    /api/transactions
GET    /api/transactions/:id
POST   /api/transactions
PUT    /api/transactions/:id
DELETE /api/transactions/:id
```

---

## Categories

```http
GET    /api/categories
POST   /api/categories
PUT    /api/categories/:id
DELETE /api/categories/:id
```

---

## Accounts

```http
GET    /api/accounts
GET    /api/accounts/:id
POST   /api/accounts
PUT    /api/accounts/:id
DELETE /api/accounts/:id
```

---

## Budgets

```http
GET    /api/budgets
POST   /api/budgets
PUT    /api/budgets/:id
DELETE /api/budgets/:id
```

---

## Recurring Transactions

```http
GET    /api/recurring-transactions
POST   /api/recurring-transactions
PUT    /api/recurring-transactions/:id
DELETE /api/recurring-transactions/:id
```

---

## Recurring Budgets

```http
GET    /api/recurring-budgets
POST   /api/recurring-budgets
PUT    /api/recurring-budgets/:id
DELETE /api/recurring-budgets/:id
```

---

## Goals

```http
GET    /api/goals
POST   /api/goals
PUT    /api/goals/:id
DELETE /api/goals/:id
```

---

## Dashboard

```http
GET /api/dashboard/summary
```

---

## Reports

```http
GET /api/reports/monthly
GET /api/reports/categories
```

---

## Analytics

```http
GET /api/analytics
```

---

## Export

```text
Export endpoint atau client-side export dapat digunakan sesuai kebutuhan arsitektur.
```

Export harus tetap dibatasi berdasarkan authenticated user.

---

## PDF

```http
GET /api/reports/financial-report
```

Bahasa report dapat didukung jika diperlukan.

---

## Notifications

```http
GET  /api/notifications
POST /api/notifications/generate
PUT  /api/notifications/:id/read
PUT  /api/notifications/read-all
```

---

## AI Insights

```http
GET /api/ai-insights?month=8&year=2026&lang=id
```

AI endpoint harus menggunakan data user yang sedang login.

---

## Health

```http
GET /api/health
```

Health endpoint digunakan untuk deployment dan operational verification.

---

# 15. API Response Format

Successful response:

```json
{
  "success": true,
  "data": {}
}
```

Error response:

```json
{
  "success": false,
  "message": "Unable to process request."
}
```

List response:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

Authentication/authorization errors harus menggunakan status code yang sesuai.

---

# 16. HTTP Status Codes

Gunakan secara konsisten:

```text
200 OK
201 Created
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
500 Internal Server Error
```

`401` digunakan ketika authentication tidak valid atau tidak tersedia.

`403` digunakan ketika user telah terautentikasi tetapi tidak memiliki akses terhadap resource.

`409` digunakan untuk conflict seperti:

* duplicate category;
* duplicate budget;
* conflict resource lainnya.

---

# 17. Security Requirements

Security menjadi requirement utama karena FinTrack menyimpan data finansial pribadi.

Minimal:

* Authentication wajib untuk production.
* Authorization wajib untuk seluruh protected resource.
* Setiap resource harus memiliki ownership verification.
* User A tidak boleh mengakses data User B.
* Backend wajib memvalidasi input.
* Prisma digunakan untuk database access.
* Secret tidak boleh disimpan dalam source code.
* `.env` tidak boleh masuk Git.
* `.env.example` harus tersedia.
* API key AI hanya berada di backend.
* Frontend tidak boleh menerima AI provider secret.
* Error response tidak boleh membocorkan stack trace.
* Jangan melakukan logging terhadap raw financial data yang tidak diperlukan.
* HTTPS wajib pada production.
* CORS harus dikonfigurasi untuk production origin.
* Security headers harus dipertimbangkan.
* Rate limiting dapat digunakan pada endpoint yang membutuhkan perlindungan tambahan.

---

# 18. Authentication Architecture

Authentication harus mengikuti pola:

```text
Browser
   ↓
Authentication Provider
   ↓
Authenticated Session / Token
   ↓
Express Backend
   ↓
Verify Identity
   ↓
Authenticated User Context
   ↓
Business Logic
   ↓
Prisma
   ↓
PostgreSQL
```

Backend tidak boleh mempercayai `userId` yang dikirim bebas oleh frontend sebagai bukti ownership.

Identity harus berasal dari authenticated session/token yang telah diverifikasi.

---

# 19. Multi-user Data Isolation

Semua protected resources harus mengikuti prinsip:

```text
Authenticated User
        ↓
User-owned Resource
```

Query tidak boleh hanya berdasarkan resource ID jika ownership verification dibutuhkan.

Secara konseptual:

```text
find transaction
WHERE
    id = requestedId
    AND userId = authenticatedUserId
```

Bukan hanya:

```text
find transaction
WHERE id = requestedId
```

Hal ini berlaku untuk seluruh resource.

---

# 20. Frontend Requirements

Frontend menggunakan:

* React.
* JavaScript.
* Vite.
* React Router.
* Tailwind CSS.
* DaisyUI.
* Recharts.

Tidak menggunakan TypeScript kecuali keputusan arsitektur berubah secara eksplisit.

---

# 21. Application Routes

Public routes:

```text
/login
/register
```

Protected routes:

```text
/
/transactions
/categories
/accounts
/budgets
/recurring-transactions
/recurring-budgets
/goals
/reports
/analytics
/ai-insights
/notifications
/settings
```

Jika user belum authenticated dan mencoba membuka protected route:

```text
protected route
      ↓
authentication check
      ↓
/login
```

Route yang tidak ditemukan harus menampilkan halaman 404.

---

# 22. Application Layout

Desktop:

```text
┌─────────────────────────────────────────────┐
│ Sidebar       │ Main Content                │
│               │                             │
│ FinTrack      │ Page Header                 │
│               │                             │
│ Dashboard     │ Content                     │
│ Transactions  │                             │
│ Accounts      │                             │
│ Categories    │                             │
│ Budgets       │                             │
│ Goals         │                             │
│ Reports       │                             │
│ Analytics     │                             │
│ AI Insights   │                             │
│ Notifications │                             │
│ Settings      │                             │
└─────────────────────────────────────────────┘
```

Mobile:

* hamburger menu;
* collapsible navigation;
* stacked cards;
* responsive charts;
* usable forms;
* no uncontrolled horizontal overflow.

---

# 23. Settings

Pengguna dapat mengatur:

* Currency.
* Theme.
* Language.

Default:

```text
Currency: IDR
Language: English
```

Bahasa minimal:

* English.
* Indonesian.

User-specific settings harus terisolasi berdasarkan user.

UI-only preferences dapat menggunakan localStorage jika sesuai.

---

# 24. Localization

Aplikasi harus mempertahankan parity antara English dan Indonesian.

Localization harus mencakup:

* navigation;
* page titles;
* forms;
* errors;
* empty states;
* notifications;
* insight titles;
* insight explanations;
* metric labels;
* authentication UI.

Tidak boleh terdapat missing localization key pada production UI.

---

# 25. Currency Formatting

Aplikasi harus memiliki utility currency terpusat.

Contoh:

```text
2009000
→ Rp2.009.000
```

Financial values harus mempertahankan numeric value di API.

Frontend bertanggung jawab terhadap display formatting.

---

# 26. Financial Metric Formatting

Metric harus memiliki semantic format.

```text
currency
percentage
number
count
```

Contoh:

```text
Income:
Rp5.000.000

Net Cash Flow:
Rp2.991.000

Savings Rate:
59,82%

Category Concentration:
49,78%

Goal Progress:
10%
```

Percentage tidak boleh diformat sebagai currency.

---

# 27. Date Formatting

Aplikasi harus memiliki utility date formatting terpusat.

Backend dan frontend harus menggunakan format yang jelas dan konsisten.

Timezone handling harus dilakukan secara eksplisit.

Hindari parsing tanggal menggunakan format ambigu.

---

# 28. API Service Architecture

Frontend harus memiliki centralized API service.

Contoh:

```text
services/
    api.js
    transactionApi.js
    categoryApi.js
    accountApi.js
    budgetApi.js
    recurringTransactionApi.js
    recurringBudgetApi.js
    goalApi.js
    dashboardApi.js
    reportApi.js
    analyticsApi.js
    notificationApi.js
    aiInsightsApi.js
```

Raw HTTP request tidak boleh tersebar tanpa alasan ke seluruh component.

---

# 29. Backend Architecture

Backend harus memisahkan:

```text
routes
controllers
services
middleware
utils
```

Routes:

* menentukan endpoint.

Controllers:

* menangani HTTP request/response.

Middleware:

* authentication;
* authorization;
* validation;
* error handling.

Services:

* business logic.

Prisma:

* database access.

`server.js` tidak boleh berisi seluruh business logic.

---

# 30. Loading States

Setiap halaman yang mengambil data dari API harus memiliki loading state.

Minimal:

* Dashboard skeleton.
* Table loading.
* Form submit loading.
* AI Insights loading.
* Report loading.

---

# 31. Empty States

Jika tidak terdapat data, gunakan empty state yang jelas.

Contoh:

```text
No transactions yet.
No budgets created yet.
No goals created yet.
No notifications.
No data available for this period.
```

Empty state sebaiknya memiliki action relevan jika memungkinkan.

---

# 32. Error States

API failure harus menampilkan pesan yang mudah dipahami.

Contoh:

```text
Unable to load transactions. Please try again.
```

Jangan menampilkan:

* stack trace;
* database error;
* secret;
* internal implementation detail.

Retry harus tersedia jika sesuai.

---

# 33. Notifications

Toast notification digunakan untuk operasi penting:

* Create.
* Update.
* Delete.
* Authentication actions.
* Export.
* Error.

Contoh:

```text
Transaction added successfully.
Budget updated successfully.
Goal created successfully.
```

---

# 34. Responsive Design

FinTrack harus dapat digunakan pada:

* Desktop.
* Tablet.
* Mobile.

Desktop:

* sidebar permanen;
* multi-column dashboard.

Tablet:

* sidebar dapat dikolaps.

Mobile:

* mobile navigation;
* cards stacked;
* responsive charts;
* table tidak menyebabkan uncontrolled overflow;
* forms nyaman digunakan.

---

# 35. Accessibility

Minimal:

* form memiliki label;
* button memiliki accessible name;
* keyboard navigation;
* sufficient contrast;
* modal structure jelas;
* focus state;
* warna bukan satu-satunya indikator status;
* semantic HTML jika memungkinkan.

---

# 36. Business Rules

## Balance

```text
Balance = Income - Expense
```

## Net Cash Flow

```text
Net Cash Flow = Income - Expense
```

## Expense

Hanya:

```text
type = EXPENSE
```

yang masuk expense calculation.

## Income

Hanya:

```text
type = INCOME
```

yang masuk income calculation.

## Budget Spending

Budget hanya menghitung expense:

* category sama;
* bulan sama;
* tahun sama;
* user sama.

## Budget Remaining

```text
Remaining = Budget - Spent
```

Nilai dapat negatif.

## Budget Progress

```text
Progress = Spent / Budget × 100
```

Visual dapat dibatasi 100%.

## Goal Progress

```text
Progress = Current Amount / Target Amount × 100
```

Zero target harus ditangani secara aman.

---

# 37. Spending Insight Rules

Deterministic insight tetap digunakan sebagai fallback dan sebagai sumber insight non-AI.

Minimal:

### Increased Spending

Jika current expense > previous expense.

### Decreased Spending

Jika current expense < previous expense.

### Highest Category

Kategori dengan expense terbesar.

### Budget Exceeded

Jika spent > budget.

### Savings

Jika savings rate rendah atau tinggi sesuai threshold yang ditentukan.

### Category Concentration

Jika sebagian besar expense terkonsentrasi pada kategori tertentu.

### Goal Progress

Jika progress goal rendah atau membutuhkan perhatian.

Tidak boleh membuat insight yang menyesatkan jika data pembanding tidak tersedia.

---

# 38. AI Insights Architecture

AI Insights menggunakan hybrid architecture:

```text
Financial Data
      ↓
Backend deterministic calculations
      ↓
Sanitized compact context
      ↓
Optional AI provider
      ↓
Structured AI interpretation
      ↓
Validation
      ↓
Frontend
```

Backend tetap menjadi sumber kebenaran untuk angka finansial.

AI hanya menginterpretasikan data.

AI tidak boleh:

* mengubah income;
* mengubah expense;
* mengubah net cash flow;
* mengubah savings rate;
* mengarang transaction;
* mengarang budget;
* mengarang goal;
* memberikan angka finansial yang bertentangan dengan backend.

Jika AI tidak tersedia, deterministic fallback digunakan jika memungkinkan.

---

# 39. Performance Requirements

Prioritas:

**Correctness → Maintainability → Performance**

Namun:

* gunakan pagination;
* hindari request yang tidak diperlukan;
* gunakan aggregation query;
* jangan mengambil seluruh database jika hanya membutuhkan summary;
* gunakan index yang sesuai;
* hindari duplicate AI request;
* gunakan sensible caching/refresh;
* jangan melakukan expensive calculation di frontend jika lebih tepat dilakukan backend.

AI request harus memiliki mekanisme refresh yang jelas.

---

# 40. Deployment Requirements

FinTrack harus dapat dijalankan pada production environment.

Architecture:

```text
User Browser
      ↓ HTTPS
Production Frontend
      ↓ HTTPS
Production Backend
      ↓
Prisma
      ↓
PostgreSQL
```

Authentication provider terintegrasi dengan production frontend/backend.

Production harus menggunakan environment variables.

Tidak boleh ada:

* hardcoded secret;
* API key di frontend;
* development database sebagai production database;
* localhost dependency.

---

# 41. Environment Configuration

Minimal:

```text
.env
.env.example
```

Environment variable dapat mencakup:

```text
DATABASE_URL
AUTH_PROVIDER_URL
AUTH_PROVIDER_PUBLIC_KEY
AI_PROVIDER
AI_API_KEY
AI_MODEL
FRONTEND_URL
```

Nama variable final mengikuti provider dan implementasi aktual.

Secret hanya berada pada environment yang aman.

---

# 42. Deployment Health

Backend menyediakan:

```http
GET /api/health
```

Production deployment harus dapat diverifikasi dengan:

* frontend HTTP availability;
* backend health;
* database connection;
* authentication;
* API access;
* protected resource access.

---

# 43. Testing Requirements

Testing harus mencakup:

## Authentication

* Register.
* Login.
* Logout.
* Invalid credentials.
* Session persistence.
* Expired session.
* Invalid token.
* Google OAuth flow.

## Authorization

* User A can access User A data.
* User A cannot access User B data.
* User A cannot update User B data.
* User A cannot delete User B data.
* Unauthenticated request is denied.

## Transactions

* Create.
* Read.
* Update.
* Delete.
* Search.
* Filter.
* Sort.
* Pagination.
* Invalid input.
* Missing category.
* Missing account.
* Nonexistent transaction.
* Cross-user access.

## Categories

* CRUD.
* Duplicate.
* Delete while in use.
* Cross-user access.

## Accounts

* CRUD.
* Balance.
* Transaction relationship.
* Cross-user access.

## Budgets

* CRUD.
* Duplicate.
* Invalid month.
* Invalid amount.
* Progress.
* Over budget.
* Cross-user access.

## Recurring

* CRUD.
* Frequency.
* Active/inactive.
* Ownership.

## Goals

* CRUD.
* Progress.
* Zero target.
* Ownership.

## Dashboard

* Income.
* Expense.
* Balance.
* Net cash flow.
* Recent transactions.
* User isolation.

## Reports

* Monthly aggregation.
* Category aggregation.
* Month comparison.
* User isolation.

## Analytics

* Savings rate.
* Category concentration.
* Budget utilization.
* Transaction frequency.
* User isolation.

## AI Insights

* Correct net cash flow.
* Correct savings rate.
* Correct percentage.
* Correct currency.
* Zero denominators.
* AI unavailable.
* AI failure.
* Invalid AI response.
* AI cannot override factual metrics.
* User isolation.

## Export

* Correct user data.
* No other user data.
* CSV.
* Excel.

## PDF

* Correct user data.
* Correct financial totals.

## Notifications

* List.
* Generate.
* Read.
* Read all.
* User isolation.

---

# 44. Project Structure

Recommended:

```text
Fintrack/
│
├── Frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── constants/
│   │   ├── l10n/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
├── Backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   │
│   ├── prisma/
│   │   └── schema.prisma
│   │
│   └── package.json
│
├── docs/
├── AGENTS.md
├── PRD.md
├── README.md
└── .gitignore
```

Structure dapat disesuaikan jika terdapat alasan teknis yang jelas.

---

# 45. Technical Constraints

* Gunakan JavaScript.
* Gunakan React + Vite.
* Gunakan Express.js.
* Gunakan Prisma.
* PostgreSQL menjadi production database.
* SQLite tidak digunakan sebagai production multi-user database.
* Gunakan Tailwind CSS + DaisyUI.
* Gunakan Recharts.
* Authentication wajib untuk production.
* Authorization wajib untuk protected resource.
* Jangan membuat authentication cryptography sendiri jika provider authentication yang sesuai tersedia.
* Jangan menambahkan dependency tanpa kebutuhan yang jelas.
* Jangan membuat microservices tanpa alasan kuat.
* Jangan menggunakan PWA/offline architecture.
* Jangan mengimplementasikan bank integration.
* AI API key harus server-side.
* Database migration harus non-destructive kecuali memang diperlukan dan direncanakan.
* Existing functionality Phase 1–13 tidak boleh diregress.

---

# 46. UX Principles

FinTrack harus:

* Simple.
* Clear.
* Fast to understand.
* Consistent.
* Responsive.
* Professional.
* Secure.
* Trustworthy.

Pengguna harus dapat memahami kondisi finansial tanpa membuka terlalu banyak halaman.

Operasi penting harus membutuhkan langkah sesedikit mungkin.

Operasi destructive harus meminta konfirmasi.

Error harus dijelaskan menggunakan bahasa yang mudah dipahami.

Financial values harus ditampilkan secara jelas dan tidak ambigu.

---

# 47. Production Acceptance Criteria

FinTrack dianggap production-ready jika:

## Authentication

* Register berfungsi.
* Login berfungsi.
* Logout berfungsi.
* Session berfungsi.
* Google authentication berfungsi jika provider telah dikonfigurasi.

## Multi-user

* User A hanya melihat data User A.
* User B hanya melihat data User B.
* Cross-user access ditolak.
* Semua protected endpoint memiliki authorization.

## Database

* PostgreSQL production berjalan.
* Prisma migration berhasil.
* Database connection stabil.
* Tidak ada destructive migration yang tidak direncanakan.

## Core Features

* Transactions berfungsi.
* Categories berfungsi.
* Accounts berfungsi.
* Budgets berfungsi.
* Goals berfungsi.
* Recurring features berfungsi.
* Reports berfungsi.
* Analytics berfungsi.
* Notifications berfungsi.
* Export berfungsi.
* PDF report berfungsi.
* AI Insights berfungsi dengan fallback.

## Frontend

* Semua protected routes berfungsi.
* Responsive layout.
* Loading states.
* Empty states.
* Error states.
* Authentication states.
* No major console errors.

## Security

* HTTPS.
* Secrets aman.
* CORS benar.
* Authorization benar.
* Tidak ada cross-user data leakage.
* AI credentials tidak terekspos.

## Deployment

* Frontend production dapat diakses.
* Backend production dapat diakses.
* `/api/health` berhasil.
* Database production terhubung.
* Authentication production berhasil.
* End-to-end flow berhasil.

---

# 48. Definition of Done

Sebuah fitur dianggap selesai jika:

1. Requirement telah diimplementasikan.
2. Backend tersedia jika diperlukan.
3. Database operation berjalan benar.
4. Frontend dapat menggunakan endpoint.
5. Authentication/authorization diterapkan jika resource protected.
6. Validation tersedia.
7. Loading state tersedia jika diperlukan.
8. Error state tersedia.
9. Empty state tersedia jika relevan.
10. UI responsive.
11. Tidak ada major console error.
12. Fitur diuji menggunakan data nyata.
13. Ownership/user isolation telah diuji jika relevan.
14. Regression test lulus.
15. Dokumentasi diperbarui jika diperlukan.

---

# 49. Development Status & Sequence

Development dilakukan secara bertahap.

## Phase 1 — Foundation — COMPLETED

* Repository setup.
* AGENTS.md.
* Frontend initialization.
* Backend initialization.
* Basic routing.
* Express server.

## Phase 2 — Database — COMPLETED

* Prisma setup.
* SQLite setup.
* Initial schema.
* Migration.
* Seed.

## Phase 3 — Backend Core — COMPLETED

* Error handling.
* Health endpoint.
* Transaction API.
* Category API.
* Budget API.
* Dashboard API.
* Report API.

## Phase 4 — Frontend Foundation — COMPLETED

* Layout.
* Sidebar.
* Navigation.
* Responsive structure.
* Shared UI components.

## Phase 5 — Transactions — COMPLETED

* Transaction list.
* Create.
* Edit.
* Delete.
* Search.
* Filter.
* Sort.
* Pagination.

## Phase 6 — Categories — COMPLETED

* Category CRUD.
* Category protection.
* Duplicate handling.

## Phase 7 — Dashboard — COMPLETED

* Summary cards.
* Recent transactions.
* Income/expense chart.
* Category chart.
* Spending insights.

## Phase 8 — Reports — COMPLETED

* Monthly reports.
* Category reports.
* Month comparison.
* Highest spending category.

## Phase 9 — Budgets — COMPLETED

* Budget CRUD.
* Spending calculation.
* Progress.
* Status.
* Over-budget warning.

## Phase 10 — Frontend Polish — COMPLETED

* Validation.
* Toast.
* Loading.
* Empty states.
* Error states.
* Responsive improvements.
* Accessibility.
* Theme.
* Currency settings.

## Phase 11 — Testing — COMPLETED

* Backend testing.
* Frontend testing.
* Business logic testing.
* Edge cases.
* Build verification.
* Regression verification.

## Phase 12 — Documentation — COMPLETED

* README.
* Architecture documentation.
* Database documentation.
* API documentation.
* Project cleanup.

## Phase 13 — Post-MVP Financial Features — COMPLETED

Implemented:

* Accounts / Wallets.
* Recurring Transactions.
* Recurring Budgets.
* Financial Goals.
* Advanced Analytics.
* CSV/Excel Export.
* PDF Financial Report.
* Notifications/Reminders.

AI-Assisted Financial Insights was also implemented as part of the post-MVP expansion.

## Phase 13A — AI-Assisted Financial Insights — COMPLETED

Implemented:

* AI Insights page.
* Monthly financial context.
* Deterministic metrics.
* AI interpretation.
* Deterministic fallback.
* AI provider configuration.
* Structured insight response.
* Metric semantic formatting.
* English/Indonesian localization.
* AI error handling.
* Financial metric validation.
* Net cash flow correctness.
* Percentage/currency semantic formatting.

---

# 50. Next Development Roadmap

## Phase 14 — Authentication Foundation

Goals:

* Authentication provider integration.
* Register.
* Login.
* Logout.
* Session handling.
* Google OAuth.
* Protected routes.
* Backend authentication middleware.
* Authenticated user context.
* User profile synchronization.

Database ownership design must be finalized before implementation.

---

## Phase 15 — Multi-user & Authorization

Goals:

* User ownership.
* Authorization middleware.
* Data isolation.
* Resource ownership checks.
* Cross-user access protection.
* Update/delete authorization.
* User-specific dashboard.
* User-specific reports.
* User-specific analytics.
* User-specific AI insights.
* Security regression tests.

This phase is security-critical.

---

## Phase 16 — PostgreSQL Migration

Goals:

* PostgreSQL production schema.
* Prisma PostgreSQL configuration.
* Migration strategy.
* Existing data strategy.
* Development/production database separation.
* Index review.
* Relationship validation.
* Data integrity testing.

SQLite must not remain the production multi-user database.

---

## Phase 17 — Production Configuration

Goals:

* Production environment variables.
* Secure secrets.
* Production CORS.
* Production API URL.
* Authentication production configuration.
* AI production configuration.
* Error handling.
* Health check.
* Production logging strategy.

---

## Phase 18 — Backend Deployment

Goals:

* Deploy Express backend.
* Connect PostgreSQL.
* Configure environment variables.
* Configure HTTPS.
* Configure health check.
* Verify API.
* Verify authentication.
* Verify protected endpoints.

---

## Phase 19 — Frontend Deployment

Goals:

* Production build.
* Deploy React frontend.
* Configure production API URL.
* Configure authentication redirect URLs.
* Configure environment variables.
* Verify protected routes.
* Verify responsive production UI.

---

## Phase 20 — Security Hardening

Goals:

* Authentication audit.
* Authorization audit.
* IDOR/cross-user access testing.
* CORS audit.
* Security headers.
* Rate limiting where appropriate.
* Secret audit.
* Error leakage audit.
* Input validation audit.
* Dependency/security audit.

---

## Phase 21 — Production End-to-End Verification

Goals:

Test the complete production flow:

```text
Register
   ↓
Login
   ↓
Dashboard
   ↓
Create Account
   ↓
Create Transaction
   ↓
Create Budget
   ↓
Create Goal
   ↓
View Reports
   ↓
View Analytics
   ↓
AI Insights
   ↓
Export
   ↓
PDF Report
   ↓
Notifications
   ↓
Logout
```

Then verify isolation:

```text
User A
   ↓
Own data visible

User B
   ↓
Own data visible

User B
   ↓
User A data
   ↓
DENIED
```

Phase 21 marks the transition from development project to production-ready application.

---

# 51. Features Explicitly Removed from Roadmap

The following features are **not deferred** and should not be planned as future phases unless the product scope is intentionally changed:

## Bank Integration

Not implemented.

Reason:

FinTrack focuses on manual personal finance management rather than automatic bank synchronization.

## PWA / Offline

Not implemented.

Reason:

FinTrack is designed as an online-first application. Offline synchronization and PWA architecture are outside the product scope.

---

# 52. Portfolio Positioning

FinTrack is a production-oriented personal finance management web application built with React, Node.js, Express, Prisma, and PostgreSQL.

It demonstrates:

* React.
* JavaScript.
* REST API.
* Node.js.
* Express.js.
* Prisma.
* PostgreSQL.
* Relational database.
* Authentication.
* Authorization.
* Multi-user architecture.
* CRUD.
* Data aggregation.
* Data visualization.
* Responsive UI.
* Form validation.
* Error handling.
* Search/filter/sort/pagination.
* Financial analytics.
* Export.
* PDF generation.
* AI-assisted analysis.
* Production deployment.

Portfolio description:

> FinTrack is a responsive, multi-user personal finance management web application built with React, Node.js, Express, Prisma, and PostgreSQL. It enables users to manage accounts, income, expenses, budgets, recurring financial activities, goals, reports, analytics, notifications, and AI-assisted financial insights through a secure authenticated platform.

---

# 53. Final Product Vision

FinTrack harus berkembang dari portfolio CRUD application menjadi aplikasi personal finance yang memiliki:

```text
Authentication
      ↓
Multi-user
      ↓
Secure Data Isolation
      ↓
Financial Management
      ↓
Analytics
      ↓
AI Insights
      ↓
PostgreSQL
      ↓
Production Deployment
```

FinTrack tidak bertujuan menjadi aplikasi perbankan.

FinTrack juga tidak menggunakan offline-first architecture atau PWA.

Fokus utama adalah menyediakan pengalaman personal finance online yang:

* sederhana;
* aman;
* jelas;
* responsive;
* maintainable;
* data-driven;
* production-ready.

Prioritas utama:

**Correctness → Security → Maintainability → Usability → Visual Quality → Additional Features**
