# Keuangan Warga

Aplikasi pengelolaan keuangan warga (Kas RT) yang dibangun dengan React, Tailwind CSS, dan Firebase.

## Fitur Utama

- **Dashboard Real-time**: Pantau saldo, pemasukan, dan pengeluaran secara instan.
- **Manajemen Warga**: Pendataan warga serta status iuran bulanan.
- **Transaksi & Kategori**: Pencatatan transaksi pendapatan dan belanja dengan kategori yang dapat disesuaikan.
- **Dana Iuran RT**: Ruang khusus untuk mengelola dana iuran RT yang dipisahkan dari kas umum.
- **Laporan Laba Rugi**: Laporan keuangan yang mendalam untuk periode tertentu.
- **Manajemen Event**: Perencanaan dan pelaporan budget kegiatan warga.

## Teknologi

- **Frontend**: React 18, Vite, Tailwind CSS.
- **Database & Auth**: Firebase Firestore & Firebase Auth.
- **Animasi**: Framer Motion.
- **Ikon**: Lucide React.
- **Laporan**: jsPDF & autoTable.

## Persiapan Deploy (Firebase)

Aplikasi ini menggunakan Firebase. Pastikan Anda telah mengonfigurasi Firebase di project Anda:

1. Buat project baru di [Firebase Console](https://console.firebase.google.com/).
2. Aktifkan **Cloud Firestore** dan **Firebase Authentication** (Google Sign-In).
3. Salin konfigurasi Firebase Web App ke file `src/firebase-applet-config.json`.
4. Deploy security rules yang tersedia di `firestore.rules`.

## Pengembangan Lokal

```bash
# Install dependensi
npm install

# Jalankan server development
npm run dev
```

## Lisensi

MIT
