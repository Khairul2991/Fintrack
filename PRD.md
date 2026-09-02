# FinTrack — Product Requirements Document (PRD)

**Document Version:** 1.0  
**Status:** Draft / MVP Specification  
**Product:** FinTrack  
**Platform:** Responsive Web Application  
**Primary Stack:** React + JavaScript + Vite + Express.js + Prisma + SQLite  
**UI Stack:** Tailwind CSS + DaisyUI  
**Visualization:** Recharts  
**Architecture:** React Frontend → Express REST API → Prisma → SQLite

---

## 1. Product Overview

FinTrack adalah aplikasi web untuk membantu pengguna mengelola keuangan pribadi secara sederhana. Pengguna dapat mencatat pemasukan dan pengeluaran, mengelompokkan transaksi berdasarkan kategori, memantau saldo, membuat budget bulanan, dan melihat laporan keuangan melalui dashboard serta visualisasi data.

FinTrack dibuat sebagai aplikasi **single-user personal finance management**. Seluruh transaksi dimasukkan secara manual oleh pengguna dan disimpan pada database SQLite lokal.

Produk ini sengaja memiliki ruang lingkup menengah. Tujuannya bukan menjadi aplikasi perbankan atau financial platform yang kompleks, tetapi menjadi aplikasi portfolio yang menunjukkan kemampuan pengembangan full-stack modern, khususnya React, REST API, relational database, CRUD, data processing, filtering, dan data visualization.

---

## 2. Problem Statement

Pengguna sering mencatat pemasukan dan pengeluaran secara terpisah atau hanya mengandalkan ingatan. Hal tersebut menyulitkan pengguna untuk mengetahui:

- Berapa total pemasukan dalam suatu periode.
- Berapa total pengeluaran.
- Berapa saldo yang tersisa.
- Kategori apa yang paling banyak menghabiskan uang.
- Apakah pengeluaran bulan ini meningkat atau menurun.
- Apakah pengeluaran suatu kategori sudah melebihi budget.

FinTrack menyelesaikan masalah tersebut dengan menyediakan satu tempat untuk mencatat dan menganalisis data keuangan pribadi secara sederhana.

---

## 3. Product Goals

### 3.1 Primary Goals

FinTrack harus memungkinkan pengguna untuk:

1. Melihat ringkasan kondisi keuangan.
2. Mencatat pemasukan dan pengeluaran.
3. Mengelola kategori transaksi.
4. Mencari dan memfilter transaksi.
5. Membuat dan mengelola budget bulanan.
6. Melihat laporan keuangan.
7. Memahami pola pengeluaran melalui chart dan insight sederhana.

### 3.2 Technical Goals

Project harus menunjukkan:

- React component architecture.
- JavaScript modern.
- React Router.
- Responsive UI.
- REST API.
- Express.js.
- Prisma ORM.
- SQLite relational database.
- CRUD operations.
- Data aggregation.
- Form validation.
- Error handling.
- Search, filtering, sorting, dan pagination.
- Data visualization.
- Clean separation antara frontend dan backend.

### 3.3 Non-Goals

Versi MVP tidak mencakup:

- Bank integration.
- Payment gateway.
- Automatic bank transaction import.
- Investment tracking.
- Cryptocurrency tracking.
- AI financial advisor.
- Multi-user system.
- Complex authentication.
- OAuth.
- JWT authentication.
- Real-time WebSocket.
- Microservices.
- Redis.
- Cloud database.

---

# 4. Target Users

Target pengguna adalah individu yang ingin mengelola keuangan pribadi secara sederhana.

Contoh:

- Mahasiswa.
- Karyawan.
- Freelancer.
- Pengguna umum.

MVP tidak membutuhkan sistem account atau authentication. Aplikasi dianggap digunakan oleh satu pengguna pada satu instalasi.

---

# 5. Product Scope

FinTrack MVP terdiri dari:

1. Dashboard.
2. Transactions.
3. Categories.
4. Reports.
5. Budgets.
6. Settings sederhana.

Prioritas utama:

**P0 — Must Have**
- Dashboard.
- Transaction CRUD.
- Category CRUD.
- Budget CRUD.
- Search.
- Filtering.
- Sorting.
- Pagination.
- Reports.
- Financial calculations.
- Responsive layout.
- Loading/error/empty states.

**P1 — Should Have**
- Spending insights.
- Toast notifications.
- Dark mode.
- Currency setting.

**P2 — Future**
- Authentication.
- Multi-user.
- Cloud database.
- Bank integration.
- Advanced analytics.

---

# 6. User Stories

## 6.1 Dashboard

Sebagai pengguna, saya ingin melihat total pemasukan, pengeluaran, dan saldo sehingga saya dapat memahami kondisi keuangan saya dengan cepat.

Sebagai pengguna, saya ingin melihat grafik pemasukan dan pengeluaran berdasarkan bulan sehingga saya dapat mengetahui perubahan kondisi keuangan.

Sebagai pengguna, saya ingin melihat kategori pengeluaran terbesar sehingga saya dapat mengetahui ke mana uang saya paling banyak digunakan.

Sebagai pengguna, saya ingin melihat transaksi terbaru sehingga saya dapat memantau aktivitas keuangan terakhir.

---

## 6.2 Transactions

Sebagai pengguna, saya ingin menambahkan transaksi sehingga catatan keuangan saya tersimpan.

Sebagai pengguna, saya ingin mengedit transaksi jika terdapat kesalahan.

Sebagai pengguna, saya ingin menghapus transaksi yang tidak diperlukan.

Sebagai pengguna, saya ingin mencari transaksi berdasarkan deskripsi.

Sebagai pengguna, saya ingin memfilter transaksi berdasarkan tipe, kategori, dan tanggal.

Sebagai pengguna, saya ingin mengurutkan transaksi berdasarkan tanggal atau jumlah.

---

## 6.3 Categories

Sebagai pengguna, saya ingin membuat kategori sendiri sehingga transaksi dapat dikelompokkan sesuai kebutuhan.

Sebagai pengguna, saya ingin mengubah kategori.

Sebagai pengguna, saya ingin menghapus kategori yang tidak digunakan.

Sebagai pengguna, saya ingin sistem mencegah penghapusan kategori yang masih digunakan oleh transaksi atau budget agar data tetap konsisten.

---

## 6.4 Budgets

Sebagai pengguna, saya ingin membuat budget bulanan berdasarkan kategori.

Sebagai pengguna, saya ingin melihat jumlah uang yang telah digunakan dibandingkan budget.

Sebagai pengguna, saya ingin mendapatkan peringatan ketika pengeluaran melebihi budget.

---

## 6.5 Reports

Sebagai pengguna, saya ingin melihat pengeluaran berdasarkan kategori.

Sebagai pengguna, saya ingin membandingkan pemasukan dan pengeluaran antarbulan.

Sebagai pengguna, saya ingin mengetahui kategori dengan pengeluaran terbesar.

---

# 7. Functional Requirements

## FR-001 Dashboard Summary

Sistem harus menampilkan:

- Total Balance.
- Total Income.
- Total Expense.

Formula:

```text
Balance = Total Income - Total Expense
```

Nilai harus berasal dari database dan tidak boleh hardcoded.

---

## FR-002 Recent Transactions

Dashboard harus menampilkan transaksi terbaru berdasarkan tanggal atau waktu pembuatan.

Informasi minimal:

- Description.
- Category.
- Type.
- Amount.
- Date.

---

## FR-003 Income vs Expense Chart

Dashboard harus menampilkan grafik pemasukan dan pengeluaran berdasarkan bulan.

Data harus berasal dari transaksi yang tersimpan.

Chart harus responsive.

---

## FR-004 Expense by Category

Dashboard dan Reports harus dapat menampilkan total pengeluaran berdasarkan kategori.

Contoh:

```text
Food          Rp1.250.000
Transport       Rp750.000
Bills           Rp500.000
Shopping        Rp300.000
```

---

## FR-005 Transaction Creation

Pengguna dapat membuat transaksi baru.

Field wajib:

- Description.
- Amount.
- Type.
- Category.
- Date.

Field opsional:

- Note.

---

## FR-006 Transaction Update

Pengguna dapat mengubah transaksi yang sudah tersimpan.

---

## FR-007 Transaction Delete

Pengguna dapat menghapus transaksi setelah melalui confirmation dialog.

---

## FR-008 Transaction Search

Pengguna dapat mencari transaksi berdasarkan description.

Search bersifat case-insensitive.

---

## FR-009 Transaction Filtering

Pengguna dapat memfilter transaksi berdasarkan:

- Type.
- Category.
- Start date.
- End date.

Filter dapat digunakan secara bersamaan.

---

## FR-010 Transaction Sorting

Pengguna dapat mengurutkan transaksi berdasarkan:

- Newest.
- Oldest.
- Highest amount.
- Lowest amount.

---

## FR-011 Transaction Pagination

Daftar transaksi menggunakan pagination ketika jumlah data cukup banyak.

Default dapat menggunakan 10 atau 20 item per halaman.

---

## FR-012 Category Management

Pengguna dapat:

- Melihat kategori.
- Membuat kategori.
- Mengedit kategori.
- Menghapus kategori.

Kategori tidak boleh memiliki nama duplikat yang tidak diperlukan.

---

## FR-013 Category Protection

Kategori yang masih digunakan oleh transaksi atau budget tidak boleh dihapus secara diam-diam.

Sistem harus memberikan pesan yang jelas kepada pengguna.

Contoh:

> This category cannot be deleted because it is currently in use.

---

## FR-014 Budget Creation

Pengguna dapat membuat budget untuk:

- Category.
- Month.
- Year.
- Amount.

---

## FR-015 Budget Uniqueness

Sistem harus mencegah lebih dari satu budget untuk kombinasi:

```text
category + month + year
```

---

## FR-016 Budget Progress

Sistem menghitung:

```text
Progress = Spent / Budget × 100
```

Sistem menampilkan:

- Budget.
- Spent.
- Remaining.
- Progress.
- Status.

---

## FR-017 Budget Status

Status minimal:

- On Track.
- Near Limit.
- Over Budget.

Threshold untuk "Near Limit" dapat ditetapkan sekitar 80% atau dibuat sebagai konstanta konfigurasi.

---

## FR-018 Reports

Reports harus menyediakan:

- Monthly income.
- Monthly expense.
- Expense by category.
- Monthly comparison.
- Highest spending category.

---

## FR-019 Spending Insight

Sistem menghasilkan insight berbasis rule sederhana.

Contoh:

Jika pengeluaran bulan berjalan lebih tinggi:

> Your expenses increased compared to last month.

Jika lebih rendah:

> Your expenses decreased compared to last month.

Jika kategori tertentu merupakan pengeluaran terbesar:

> Food is your highest spending category this month.

Jika budget terlampaui:

> You have exceeded your Food budget.

Insight tidak menggunakan AI dan tidak memberikan nasihat keuangan profesional.

---

# 8. Data Model

## 8.1 Category

```text
Category
---------
id
name
icon
color
createdAt
```

Relationship:

```text
Category 1 ──── * Transaction
Category 1 ──── * Budget
```

---

## 8.2 Transaction

```text
Transaction
-----------
id
description
amount
type
categoryId
date
note
createdAt
```

`type` memiliki dua nilai:

```text
INCOME
EXPENSE
```

`amount` harus bernilai positif.

---

## 8.3 Budget

```text
Budget
------
id
categoryId
month
year
amount
createdAt
```

`month` memiliki nilai 1–12.

`amount` harus positif.

---

# 9. Database Requirements

Database menggunakan SQLite.

ORM menggunakan Prisma.

Prisma harus digunakan untuk:

- Schema definition.
- Migrations.
- Queries.
- Relations.
- Database access.

Database harus memiliki foreign key antara:

```text
Transaction.categoryId → Category.id
Budget.categoryId → Category.id
```

Tambahkan index yang relevan jika dibutuhkan untuk query transaksi, kategori, dan tanggal.

---

# 10. Default Seed Data

Database harus memiliki seed categories:

- Food.
- Transport.
- Shopping.
- Entertainment.
- Bills.
- Health.
- Education.
- Salary.
- Freelance.
- Other.

Seed harus idempotent atau aman untuk dijalankan lebih dari sekali tanpa membuat duplikasi kategori.

---

# 11. REST API Requirements

Base URL:

```text
/api
```

## Transactions

```http
GET    /api/transactions
GET    /api/transactions/:id
POST   /api/transactions
PUT    /api/transactions/:id
DELETE /api/transactions/:id
```

## Categories

```http
GET    /api/categories
POST   /api/categories
PUT    /api/categories/:id
DELETE /api/categories/:id
```

## Budgets

```http
GET    /api/budgets
POST   /api/budgets
PUT    /api/budgets/:id
DELETE /api/budgets/:id
```

## Dashboard

```http
GET /api/dashboard/summary
```

## Reports

```http
GET /api/reports/monthly
GET /api/reports/categories
```

## Health

```http
GET /api/health
```

---

# 12. API Response Format

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

List response dapat menggunakan metadata:

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

---

# 13. HTTP Status Codes

Gunakan status code secara konsisten.

```text
200 OK
201 Created
400 Bad Request
404 Not Found
409 Conflict
500 Internal Server Error
```

Gunakan `409 Conflict` untuk kondisi seperti:

- Duplicate category.
- Duplicate budget.

---

# 14. Transaction API Query Parameters

`GET /api/transactions` dapat mendukung:

```text
search
type
categoryId
startDate
endDate
sortBy
sortOrder
page
limit
```

Contoh:

```text
/api/transactions?type=EXPENSE&categoryId=1&page=1&limit=10
```

Filter harus dapat dikombinasikan.

---

# 15. Validation Requirements

Frontend dan backend harus melakukan validation.

Transaction:

- Description tidak boleh kosong.
- Amount harus > 0.
- Type harus valid.
- Category harus ada.
- Date harus valid.

Category:

- Name wajib.
- Name harus memiliki panjang yang masuk akal.
- Duplicate name harus ditolak.

Budget:

- Category wajib.
- Month 1–12.
- Year valid.
- Amount > 0.
- Kombinasi category/month/year harus unik.

Backend validation wajib dilakukan walaupun frontend sudah melakukan validation.

---

# 16. Frontend Requirements

Frontend menggunakan:

- React.
- JavaScript.
- Vite.
- React Router.
- Tailwind CSS.
- DaisyUI.
- Recharts.

Tidak menggunakan TypeScript untuk MVP.

---

# 17. Application Routes

```text
/
    Dashboard

/transactions
    Transactions

/categories
    Categories

/reports
    Reports

/budgets
    Budgets

/settings
    Settings
```

Route yang tidak ditemukan harus menampilkan halaman 404 sederhana.

---

# 18. Application Layout

Desktop layout:

```text
┌─────────────────────────────────────────────┐
│ Sidebar        │ Main Content               │
│                │                            │
│ FinTrack       │ Page Header                │
│                │                            │
│ Dashboard      │ Content                    │
│ Transactions   │                            │
│ Categories     │                            │
│ Reports        │                            │
│ Budgets        │                            │
│ Settings       │                            │
└─────────────────────────────────────────────┘
```

Mobile layout harus menggunakan:

- Hamburger menu, atau
- Mobile navigation.

---

# 19. Dashboard UI Requirements

Dashboard harus memiliki:

### Summary Cards

- Total Balance.
- Total Income.
- Total Expense.

### Charts

- Income vs Expense.
- Expense by Category.

### Recent Transactions

Menampilkan transaksi terbaru.

### Spending Insight

Menampilkan insight sederhana berdasarkan data.

---

# 20. Transactions UI Requirements

Transactions page harus memiliki:

- Page title.
- Add Transaction button.
- Search field.
- Type filter.
- Category filter.
- Date filter.
- Sort control.
- Transaction table.
- Pagination.

Table:

```text
Date
Description
Category
Type
Amount
Actions
```

Actions:

- Edit.
- Delete.

---

# 21. Transaction Form

Form fields:

```text
Description
Amount
Type
Category
Date
Note
```

Form harus memiliki:

- Validation.
- Loading state saat submit.
- Error feedback.
- Success notification.
- Cancel action.

---

# 22. Categories UI Requirements

Categories page dapat menggunakan card layout atau table.

Setiap kategori menampilkan:

- Icon.
- Name.
- Color.
- Optional transaction count.

Actions:

- Edit.
- Delete.

---

# 23. Reports UI Requirements

Reports page harus memiliki:

1. Monthly Income vs Expense chart.
2. Expense by Category chart.
3. Monthly comparison.
4. Highest spending category.

Jika tidak terdapat data, tampilkan empty state.

---

# 24. Budgets UI Requirements

Budgets page harus menampilkan:

```text
Category
Budget
Spent
Remaining
Progress
Status
Actions
```

Progress bar harus merepresentasikan penggunaan budget.

Jika lebih dari 100%, visual progress tidak boleh merusak layout. Nilai dapat dibatasi secara visual pada 100%, sementara status tetap menunjukkan "Over Budget".

---

# 25. Settings UI Requirements

Settings MVP bersifat sederhana.

Pengguna dapat mengatur:

- Currency.
- Theme jika dark mode tersedia.

Default currency:

```text
IDR
```

UI-only preferences dapat disimpan di localStorage.

---

# 26. Currency Formatting

Aplikasi harus menyediakan utility terpusat untuk format currency.

Default:

```text
IDR
```

Contoh:

```text
35000
→ Rp35.000

1250000
→ Rp1.250.000

8500000
→ Rp8.500.000
```

Jangan mengulang logic currency formatting pada banyak component.

---

# 27. Date Formatting

Aplikasi harus memiliki utility date formatting terpusat.

Tanggal harus ditampilkan secara konsisten.

Backend dan frontend harus menggunakan format tanggal yang jelas dan konsisten.

Hindari parsing tanggal menggunakan format yang ambigu.

---

# 28. API Service Architecture

Frontend harus memiliki centralized API service.

Contoh:

```text
services/
    api.js
    transactionApi.js
    categoryApi.js
    budgetApi.js
    dashboardApi.js
    reportApi.js
```

Raw HTTP request tidak boleh tersebar tanpa alasan ke seluruh component.

---

# 29. Component Architecture

Reusable components yang direkomendasikan:

```text
SummaryCard
ChartCard
TransactionTable
TransactionForm
TransactionFilters
CategoryCard
BudgetProgress
EmptyState
LoadingSkeleton
ConfirmDialog
```

Component hanya perlu dibuat jika memiliki tanggung jawab yang jelas atau digunakan kembali.

Hindari membuat satu component raksasa yang mengandung seluruh aplikasi.

---

# 30. Backend Architecture

Backend harus memisahkan:

```text
routes
controllers
services
middleware
utils
```

Routes menentukan endpoint.

Controllers menangani HTTP request/response.

Services menangani business logic.

Prisma digunakan untuk database access.

Error middleware menangani error secara terpusat.

`server.js` tidak boleh berisi seluruh business logic.

---

# 31. Loading States

Setiap halaman yang mengambil data dari API harus memiliki loading state.

Contoh:

- Dashboard skeleton.
- Table loading.
- Button loading saat submit.

---

# 32. Empty States

Jika tidak ada data:

Transactions:

> No transactions yet.

Categories:

> No categories available.

Budgets:

> No budgets created yet.

Reports:

> No data available for this period.

Empty state sebaiknya menyediakan action yang relevan jika memungkinkan.

---

# 33. Error States

Jika API gagal, tampilkan pesan yang mudah dipahami.

Contoh:

> Unable to load transactions. Please try again.

Jangan menampilkan stack trace atau detail internal backend kepada pengguna.

---

# 34. Notifications

Gunakan toast notification untuk operasi:

- Create.
- Update.
- Delete.

Contoh:

> Transaction added successfully.

> Transaction updated successfully.

> Transaction deleted successfully.

Error:

> Failed to save transaction.

---

# 35. Responsive Design Requirements

FinTrack harus dapat digunakan pada:

- Desktop.
- Tablet.
- Mobile.

Desktop:

- Sidebar permanen.
- Multi-column dashboard.
- Full-width content.

Tablet:

- Sidebar dapat diperkecil atau dikolaps.

Mobile:

- Sidebar berubah menjadi menu mobile.
- Cards dapat ditumpuk.
- Table tidak boleh menyebabkan halaman overflow secara tidak terkendali.
- Chart harus responsive.
- Form harus nyaman digunakan.

---

# 36. Accessibility

UI harus memperhatikan accessibility dasar.

Minimal:

- Form memiliki label.
- Button memiliki nama yang jelas.
- Interactive elements dapat digunakan dengan keyboard.
- Contrast teks cukup baik.
- Modal memiliki struktur yang jelas.
- Jangan menggunakan warna sebagai satu-satunya indikator status.

---

# 37. Security Requirements

Meskipun aplikasi single-user lokal:

- Backend wajib memvalidasi input.
- Gunakan Prisma untuk query database.
- Jangan menyimpan secret di source code.
- Gunakan `.env` jika diperlukan.
- `.env` harus masuk `.gitignore`.
- Sediakan `.env.example`.

Tidak perlu authentication untuk MVP.

---

# 38. Business Rules

## Balance

```text
Balance = Income - Expense
```

## Expense

Hanya transaksi dengan:

```text
type = EXPENSE
```

yang masuk ke perhitungan pengeluaran.

## Income

Hanya transaksi dengan:

```text
type = INCOME
```

yang masuk ke perhitungan pemasukan.

## Budget Spending

Budget kategori hanya menghitung transaksi:

```text
type = EXPENSE
```

yang:

- memiliki category yang sama;
- berada pada bulan dan tahun budget.

## Budget Remaining

```text
Remaining = Budget - Spent
```

Nilai dapat menjadi negatif ketika budget terlampaui.

## Budget Progress

```text
Progress = Spent / Budget × 100
```

Visual progress dapat dibatasi pada 100%.

---

# 39. Spending Insight Rules

Insight harus deterministic.

### Rule 1 — Increased Spending

Jika:

```text
currentMonthExpense > previousMonthExpense
```

tampilkan insight bahwa pengeluaran meningkat.

### Rule 2 — Decreased Spending

Jika:

```text
currentMonthExpense < previousMonthExpense
```

tampilkan insight bahwa pengeluaran menurun.

### Rule 3 — Highest Category

Cari kategori dengan total expense terbesar.

### Rule 4 — Budget Exceeded

Jika:

```text
spent > budget
```

tampilkan warning.

Jika tidak terdapat data pembanding, jangan membuat insight yang menyesatkan.

---

# 40. Error Handling Requirements

Backend menggunakan centralized error handler.

Frontend harus menangani:

- Validation error.
- Not found.
- Conflict.
- Server error.
- Network error.

Response error harus konsisten.

---

# 41. Performance Requirements

MVP tidak membutuhkan optimasi tingkat lanjut.

Namun:

- Gunakan pagination untuk transaction list.
- Hindari request API yang tidak diperlukan.
- Jangan mengambil seluruh database jika hanya membutuhkan summary.
- Gunakan query aggregation pada backend untuk perhitungan laporan.
- Gunakan index database jika memang dibutuhkan.

Target utama adalah correctness dan maintainability, bukan premature optimization.

---

# 42. Testing Requirements

Minimal lakukan pengujian terhadap:

### Transaction

- Create.
- Read.
- Update.
- Delete.
- Search.
- Filter.
- Sort.
- Pagination.
- Invalid input.
- Missing category.
- Nonexistent transaction.

### Category

- Create.
- Read.
- Update.
- Delete.
- Duplicate name.
- Delete while in use.

### Budget

- Create.
- Update.
- Delete.
- Duplicate budget.
- Invalid month.
- Invalid amount.
- Budget progress.
- Over budget.

### Dashboard

- Income calculation.
- Expense calculation.
- Balance calculation.
- Recent transactions.

### Reports

- Monthly aggregation.
- Category aggregation.
- Month comparison.

---

# 43. Project Structure

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
│   ├── database/
│   └── package.json
│
├── AGENTS.md
├── README.md
└── .gitignore
```

Structure dapat disesuaikan jika terdapat alasan teknis yang jelas.

---

# 44. Technical Constraints

- Gunakan JavaScript, bukan TypeScript.
- Gunakan React + Vite.
- Gunakan Express.js.
- Gunakan Prisma.
- Gunakan SQLite.
- Gunakan Tailwind CSS + DaisyUI.
- Gunakan Recharts untuk visualization.
- Jangan menggunakan database cloud pada MVP.
- Jangan menggunakan authentication pada MVP.
- Jangan menambahkan dependency tanpa kebutuhan yang jelas.
- Jangan membuat architecture terlalu kompleks.

---

# 45. UX Principles

FinTrack harus:

- Simple.
- Clear.
- Fast to understand.
- Consistent.
- Responsive.
- Professional.

Pengguna harus dapat memahami kondisi keuangan dari dashboard tanpa perlu membuka banyak halaman.

Operasi penting seperti menambahkan transaksi harus membutuhkan langkah sesedikit mungkin.

Operasi destructive harus meminta konfirmasi.

Error harus dijelaskan menggunakan bahasa yang mudah dipahami.

---

# 46. MVP Acceptance Criteria

MVP dinyatakan selesai jika seluruh kondisi berikut terpenuhi:

### Application

- React frontend dapat dijalankan.
- Express backend dapat dijalankan.
- SQLite database dapat digunakan.
- Prisma migration berhasil.
- Seed berhasil.

### Transactions

- User dapat create transaction.
- User dapat read transaction.
- User dapat update transaction.
- User dapat delete transaction.
- Search berfungsi.
- Filter berfungsi.
- Sorting berfungsi.
- Pagination berfungsi.

### Categories

- CRUD berfungsi.
- Duplicate category ditolak.
- Category yang digunakan tidak dapat dihapus secara merusak data.

### Budgets

- CRUD berfungsi.
- Duplicate budget dicegah.
- Spending dihitung dengan benar.
- Progress dihitung dengan benar.
- Over Budget ditampilkan.

### Dashboard

- Balance benar.
- Income benar.
- Expense benar.
- Recent transactions benar.
- Charts menggunakan data aktual.

### Reports

- Monthly report benar.
- Category report benar.
- Comparison benar.

### UX

- Loading states tersedia.
- Empty states tersedia.
- Error states tersedia.
- Toast notifications tersedia.
- Responsive layout berfungsi.

### Quality

- Tidak ada major console errors.
- Tidak ada broken routes.
- Tidak ada hardcoded financial summary.
- Tidak ada dummy data sebagai source utama setelah integration selesai.
- README tersedia.
- Project dapat dijalankan developer lain mengikuti README.

---

# 47. Future Improvements

Fitur berikut tidak termasuk MVP, tetapi dapat menjadi roadmap berikutnya:

1. Authentication.
2. Multi-user.
3. PostgreSQL.
4. Cloud deployment.
5. Bank integration.
6. Recurring transactions.
7. Export CSV/Excel.
8. PDF financial report.
9. Advanced analytics.
10. Financial goals.
11. Multiple accounts/wallets.
12. Recurring budgets.
13. Notifications.
14. PWA/offline support.
15. AI-assisted financial insights.

Future features tidak boleh mempengaruhi scope MVP.

---

# 48. Portfolio Positioning

FinTrack harus dapat digunakan sebagai portfolio project untuk menunjukkan kemampuan full-stack development.

Project description:

> FinTrack is a responsive personal finance management web application built with React, Node.js, Express, Prisma, and SQLite. It enables users to manage income and expenses, organize transactions by category, create monthly budgets, visualize financial data, and analyze spending patterns through an interactive dashboard and reports.

Skill yang ditunjukkan:

- React.
- JavaScript.
- REST API.
- Node.js.
- Express.js.
- Prisma.
- SQLite.
- CRUD.
- Relational database.
- Data aggregation.
- Data visualization.
- Responsive UI.
- Form validation.
- Error handling.
- Search/filter/sort/pagination.

---

# 49. Definition of Done

Sebuah fitur dianggap selesai jika:

1. Requirement fitur telah diimplementasikan.
2. Backend endpoint tersedia jika diperlukan.
3. Database operation berjalan dengan benar.
4. Frontend dapat menggunakan endpoint tersebut.
5. Validation tersedia.
6. Loading state tersedia jika diperlukan.
7. Error state tersedia.
8. Empty state tersedia jika relevan.
9. UI responsive.
10. Tidak ada console error yang terkait.
11. Fitur telah diuji menggunakan data nyata dari SQLite.
12. Dokumentasi diperbarui jika diperlukan.

---

# 50. Recommended Development Sequence

Implementasi harus dilakukan secara bertahap.

## Phase 1 — Foundation

- Repository setup.
- AGENTS.md.
- Frontend initialization.
- Backend initialization.
- Basic routing.
- Basic Express server.

## Phase 2 — Database

- Prisma setup.
- SQLite setup.
- Schema.
- Migration.
- Seed.

## Phase 3 — Backend

- Error handling.
- Health endpoint.
- Transaction API.
- Category API.
- Budget API.
- Dashboard API.
- Report API.

## Phase 4 — Frontend Foundation

- Layout.
- Sidebar.
- Navigation.
- Responsive structure.
- Shared UI components.

## Phase 5 — Transactions

- Transaction list.
- Create form.
- Edit form.
- Delete confirmation.
- Search.
- Filter.
- Sort.
- Pagination.

## Phase 6 — Categories

- Category list.
- Create.
- Edit.
- Delete.
- Category protection.

## Phase 7 — Dashboard

- Summary cards.
- Recent transactions.
- Income/expense chart.
- Category chart.
- Spending insights.

## Phase 8 — Reports

- Monthly reports.
- Category reports.
- Month comparison.
- Highest spending category.

## Phase 9 — Budgets

- Budget CRUD.
- Spending calculation.
- Progress.
- Status.
- Over-budget warning.

## Phase 10 — Polish

- Validation.
- Toast.
- Loading.
- Empty states.
- Error states.
- Responsive improvements.
- Accessibility.
- Optional dark mode.

## Phase 11 — Testing

- API testing.
- Business logic testing.
- UI testing.
- Edge cases.
- Build verification.

## Phase 12 — Documentation

- README.
- Installation instructions.
- Architecture.
- Database schema.
- API documentation.
- Screenshots.
- Future roadmap.

---

# 51. Final Product Vision

FinTrack harus terasa seperti aplikasi personal finance modern yang benar-benar dapat digunakan, bukan sekadar kumpulan CRUD pages.

Ketika pengguna membuka aplikasi, mereka harus langsung mendapatkan gambaran kondisi keuangan melalui dashboard.

Ketika pengguna ingin mencatat aktivitas keuangan, prosesnya harus cepat melalui transaction form.

Ketika pengguna ingin mencari data, search, filtering, sorting, dan pagination harus tersedia.

Ketika pengguna ingin memahami pola pengeluaran, reports dan charts harus memberikan informasi yang jelas.

Ketika pengguna ingin mengontrol pengeluaran, budgets dan spending insights harus membantu mereka melihat apakah pengeluaran masih berada dalam batas yang ditentukan.

Namun seluruh pengalaman tersebut harus tetap dibangun dengan arsitektur yang sederhana, mudah dipahami, dan sesuai untuk project portfolio satu developer.

Prioritas utama:

**Correctness → Maintainability → Usability → Visual Quality → Additional Features**

Jangan menambah kompleksitas jika tidak memberikan nilai yang jelas terhadap tujuan produk.
