# SEKOLAHKU — Product Requirements Document (PRD)

> **Sistem Manajemen Sekolah Terpadu** — Satu Platform. Tujuh Peran. Sekolah Modern.
> Versi 1.0 · Juni 2026 · React 19 + FastAPI + MongoDB

---

## 1. Ringkasan Eksekutif

**SEKOLAHKU** adalah aplikasi web manajemen sekolah terpadu yang menggabungkan seluruh
operasional harian sekolah — mulai dari absensi, akademik, keuangan kelas, kegiatan OSIS,
Penerimaan Peserta Didik Baru (PPDB), hingga komunikasi guru–orang tua — dalam satu
dashboard yang elegan dan responsif berbahasa Indonesia.

Aplikasi ini menghadirkan fitur unggulan: **Kartu Pelajar digital ukuran KTP dengan QR Code
permanen** yang bisa langsung dicetak, serta **Absensi berbasis scan QR + foto bukti** untuk
mencegah "titip absen".

**Nilai inti:** menyatukan proses yang biasanya tersebar di banyak buku, grup chat, dan
spreadsheet menjadi satu sumber kebenaran (single source of truth) yang aman dan real-time.

---

## 2. Latar Belakang & Masalah

Sekolah pada umumnya masih menghadapi:

- **Absensi manual** yang rawan kecurangan dan sulit direkap.
- **Data siswa tersebar** di banyak file Excel yang tidak sinkron.
- **Komunikasi guru–orang tua** terputus, hanya via grup pesan yang tidak terstruktur.
- **Proses PPDB manual** dengan berkas fisik dan seleksi yang lambat.
- **Kegiatan OSIS & keuangan kelas** dikelola tanpa transparansi.
- **Pelaporan** (presensi, nilai, kas) memakan waktu karena dibuat ulang setiap saat.

**SEKOLAHKU** menyelesaikan seluruh titik nyeri ini dalam satu sistem berbasis peran (RBAC).

---

## 3. Arsitektur Teknis

| Lapisan | Teknologi |
|---------|-----------|
| **Frontend** | React 19, React Router 7, Tailwind CSS, shadcn/ui, lucide-react, recharts, qrcode.react, html5-qrcode, sonner |
| **Backend** | FastAPI (Python), Motor (async MongoDB driver) |
| **Database** | MongoDB |
| **Autentikasi** | JWT + bcrypt, sesi httpOnly cookie, RBAC 8 peran |
| **Object Storage** | Emergent Object Storage (foto & berkas) |
| **Email** | Emergent Email (reset password, rapor, notifikasi) |
| **Video Call** | Jitsi Meet (room unik per siswa, tanpa API key) |
| **Ekspor** | openpyxl (Excel bertema), fpdf2 (rapor PDF batch/ZIP) |

**Prinsip:** semua endpoint backend diawali `/api`, kredensial via environment variables,
foto/berkas disimpan di object storage (bukan base64).

---

## 4. Persona Pengguna & Peran (RBAC)

| # | Peran | Hak Akses Utama |
|---|-------|-----------------|
| 1 | **Super Admin** | Akses penuh + Kelola Akun (buat/edit/hapus user, auto QR & kartu) |
| 2 | **Kepala Sekolah** | Monitoring, dashboard analitik, review feedback |
| 3 | **Staff TU** | Operasi presensi, inventaris, persetujuan peminjaman |
| 4 | **Guru** | Tugas, quiz, presensi, rapor, schoolgram, chat wali |
| 5 | **Siswa** | Scan absen, kumpul tugas, quiz, vote OSIS, pinjam alat, kas, feedback |
| 6 | **Ketua OSIS** | Pengumuman, dana sosial, pemilu OSIS, schoolgram |
| 7 | **Ketua Kelas** | Uang kas kelas, pengumuman kelas, schoolgram |
| 8 | **Orang Tua** | Lihat rapor anak, chat & video call wali kelas, kalender |

---

## 5. Fitur — Sudah Terimplementasi

### 5.1 Identitas & Kartu Pelajar
- Manajemen akun massal oleh Super Admin (create/edit/delete).
- **Kartu Pelajar digital ukuran KTP** (85,6 × 53,98 mm), gradient sky-blue, foto + QR permanen.
- **Cetak Kartu Massal**: 8 kartu per lembar A4 (`/print-cards?kelas=X`).

### 5.2 Absensi (Presensi)
- **Scan QR** via webcam + input manual.
- Status: hadir / izin / sakit / alpa dengan penghitung real-time.
- **Foto bukti otomatis** di-snapshot & diunggah saat scan (anti-titip absen).
- Ekspor Excel bertema.

### 5.3 Akademik
- **Tugas**: guru membuat, siswa mengumpulkan, guru menilai.
- **Mini-Quiz** pilihan ganda dengan penilaian otomatis.
- **Rapor Digital**: guru/kepsek kirim; siswa & orang tua lihat; email HTML ke orang tua.
- **Ekspor Rapor PDF Batch** per kelas (bundle ZIP).

### 5.4 Kegiatan & Sosial
- **Schoolgram**: feed foto (object storage), like, komentar, terkontrol peran.
- **Pemilu OSIS**: kandidat per posisi (ketua/wakil/anggota), 1 suara per posisi.
- **Dana Sosial** (OSIS) & **Uang Kas** per kelas.
- **Papan Pengumuman** & **Leaderboard Prestasi** (terrajin, akademik teratas).
- **Feedback/Kritik & Saran** dengan opsi anonim.

### 5.5 Inventaris
- Hub Inventaris & Peminjaman dengan alur persetujuan staf TU.

### 5.6 Komunikasi
- **Chat Wali–Orang Tua**: thread per siswa, polling 10 detik, badge belum dibaca.
- **Video Call** via Jitsi Meet (room unik per siswa).
- **Notifikasi real-time** (bell, polling 15 detik) untuk persetujuan, penilaian, pengumuman.
- **Kalender Sekolah**: 4 tipe event (event/ujian/libur/rapat) + notifikasi otomatis.

### 5.7 PPDB Online
- `/ppdb` (publik): form pendaftaran + upload berkas, auto nomor pendaftaran.
- `/admin-ppdb`: dashboard pendaftar, filter, approve/reject satu klik.
- **Auto-Seleksi** berdasarkan threshold NEM & kuota (sortir NEM tertinggi → LOLOS/TIDAK).

### 5.8 Laporan & Analitik
- **Dashboard Analitik Kepsek**: tren presensi 7 hari, distribusi nilai quiz, ranking kelas aktif.
- **Ekspor Excel bertema SEKOLAHKU** untuk presensi, kas, inventaris, user, dana sosial, PPDB.

### 5.9 Keamanan & Sesi
- JWT + bcrypt, httpOnly cookie, seeding admin otomatis.
- **Reset Password** via email (rate limit 5×/15 menit, token hash, kedaluwarsa 1 jam).

---

## 6. Roadmap / Backlog

**P1 (berikutnya)**
- Integrasi presensi & penggajian guru.
- Dukungan multi-sekolah (multi-tenant).
- Notifikasi real-time berbasis WebSocket/SSE (menggantikan polling).

**P2 (masa depan)**
- Aplikasi mobile (PWA/native).
- Integrasi pembayaran SPP online.
- Modul e-learning / materi & video pelajaran.
- Dashboard prediktif (deteksi dini siswa berisiko).

---

## 7. Metrik Keberhasilan (KPI)

- Waktu rekap presensi turun > 80% vs manual.
- ≥ 90% orang tua aktif menerima rapor & notifikasi digital.
- Proses seleksi PPDB dari hari → menit (auto-seleksi).
- 100% kartu pelajar tercetak dengan QR yang valid & dapat discan.

---

## 8. Kredensial Uji

Lihat `/app/memory/test_credentials.md`.
Super Admin: `cassandramarsada@gmail.com` / `Admin@Sekolah2026`
(+ akun demo: kepsek, staff TU, guru, siswa, ketua OSIS, ketua kelas).

---

*Dokumen ini dihasilkan dari kode sumber aplikasi SEKOLAHKU (repo: Website-Sekolah).*
