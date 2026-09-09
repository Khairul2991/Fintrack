const SERVER_ERRORS = {
  en: null,
  id: {
    'Unable to reach the server. Is the backend running?':
      'Tidak dapat menjangkau server. Apakah backend berjalan?',
    'Something went wrong.': 'Terjadi kesalahan.',
    'Name is required.': 'Nama wajib diisi.',
    'Name must be at most 50 characters.': 'Nama maksimal 50 karakter.',
    'Color must be a hex value like #f59e0b.': 'Warna harus berupa nilai hex seperti #f59e0b.',
    'Category not found.': 'Kategori tidak ditemukan.',
    'Category type must match the transaction type.': 'Tipe kategori harus sesuai dengan tipe transaksi.',
    'System categories cannot be modified.': 'Kategori sistem tidak dapat diubah.',
    'System categories cannot be deleted.': 'Kategori sistem tidak dapat dihapus.',
    'This category cannot be deleted because it is currently in use.':
      'Kategori ini tidak dapat dihapus karena sedang digunakan.',
    'This record already exists.': 'Data ini sudah ada.',
    'An account with this name already exists.': 'Akun dengan nama ini sudah ada.',
    'The default cash account cannot be deleted.': 'Akun Tunai default tidak dapat dihapus.',
    'The default cash account cannot be changed to another type.':
      'Akun Tunai default tidak dapat diubah tipenya.',
    'Initial balance must be a positive number.': 'Saldo awal harus berupa bilangan positif.',
    'Description is required.': 'Deskripsi wajib diisi.',
    'Amount must be greater than 0.': 'Jumlah harus lebih besar dari 0.',
    'Amount must be a positive number.': 'Jumlah harus bilangan positif.',
    'Type must be INCOME or EXPENSE.': 'Tipe harus INCOME atau EXPENSE.',
    'categoryId must be an integer.': 'categoryId harus berupa bilangan bulat.',
    'Invalid date. Use YYYY-MM-DD.': 'Tanggal tidak valid. Gunakan YYYY-MM-DD.',
    'Account is required.': 'Akun wajib dipilih.',
    'Goal account must match the transaction account.': 'Akun tujuan harus sama dengan akun transaksi.',
    'This goal does not have an account. Edit the goal to set an account first.':
      'Tujuan ini belum memiliki akun. Edit tujuan untuk memilih akun terlebih dahulu.',
    'Goal not found.': 'Tujuan tidak ditemukan.',
    'Note must be at most 500 characters.': 'Catatan maksimal 500 karakter.',
    'Note must be at most 500 characters.': 'Catatan maksimal 500 karakter.',
    'Transaction not found.': 'Transaksi tidak ditemukan.',
    'Budget not found.': 'Anggaran tidak ditemukan.',
    'month must be at least 1.': 'Bulan minimal 1.',
    'month must be at most 12.': 'Bulan maksimal 12.',
    'year must be at least 2000.': 'Tahun minimal 2000.',
    'year must be at most 2100.': 'Tahun maksimal 2100.',
    'sortBy must be date or amount.': 'sortBy harus date atau amount.',
    'sortOrder must be asc or desc.': 'sortOrder harus asc atau desc.',
    'page must be at least 1.': 'Halaman minimal 1.',
    'limit must be at most 100.': 'Limit maksimal 100.',
    'Session expired. Please log in again.': 'Sesi Anda telah berakhir. Silakan masuk kembali.',
    'Unauthorized.': 'Anda tidak memiliki akses untuk melakukan tindakan ini.',
    'Forbidden.': 'Anda tidak memiliki akses untuk melakukan tindakan ini.',
    'Not found.': 'Data tidak ditemukan.',
    'Internal server error.': 'Terjadi kesalahan pada server. Silakan coba lagi.',
    'Network Error': 'Tidak dapat terhubung ke server. Silakan coba lagi.',
  },
}

export function translateError(message, lang) {
  if (lang !== 'id' || typeof message !== 'string') return message
  return SERVER_ERRORS.id[message] ?? 'Terjadi kesalahan.'
}