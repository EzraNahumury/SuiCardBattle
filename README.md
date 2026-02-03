# SignalClash

SignalClash adalah game card battle on-chain di jaringan Sui. Pemain bisa membuat battle dengan dua kartu (coin) beserta power-nya, lalu pemain lain join, memilih kiri/kanan, bayar entry fee, dan hasilnya ditentukan di on-chain. Hasil battle (menang/kalah) direveal setelah transaksi selesai.

Repositori ini terdiri dari:
- `battle_sc` -> smart contract Move di Sui.
- `battle_fe` -> frontend Next.js (React + Tailwind) untuk interaksi wallet dan UI game.

---

## Fitur Utama
- Create battle dengan 2 kartu (name + power) dan entry fee.
- Join battle, pilih sisi kiri/kanan, bayar fee, dan reveal hasil.
- Random swap di on-chain untuk menyembunyikan posisi kartu.
- Battle list real-time dari event on-chain (BattleCreated).
- Battle selesai tetap ada di list, tetapi tombol Join menjadi disabled.

---

## Arsitektur Singkat

### Smart Contract (`battle_sc`)
Contract utama ada di `battle_sc/sources/battle_sc.move` dan berisi:
- `HeroCoin` -> data kartu (name, power).
- `Battle` -> object on-chain yang menyimpan:
  - dua kartu (Left dan Right),
  - entry fee,
  - vault balance (SUI),
  - status `is_open`.
- Event:
  - `BattleCreated` (battle_id, creator, entry_fee).
  - `BattleResult` (battle_id, winner, won_amount, player_choice, is_swapped, winning_coin_name).

Flow on-chain:
1. `create_battle`:
   - Creator bayar `entry_fee`.
   - Battle dibuat dan disimpan sebagai shared object.
   - Emit `BattleCreated`.
2. `join_battle`:
   - Player bayar `entry_fee`.
   - Contract random swap posisi kartu (is_swapped).
   - Power dibandingkan berdasarkan pilihan player (kiri/kanan).
   - Winner menerima total pool.
   - Battle ditutup (`is_open = false`) dan emit `BattleResult`.

Catatan: battle saat ini hanya bisa dimainkan sekali (setelah join, battle ditutup).

### Frontend (`battle_fe`)
Frontend dibangun dengan Next.js (App Router) + React + Tailwind:
- Wallet & transaksi: `@mysten/dapp-kit`.
- Query data: `@tanstack/react-query`.
- Data battle diambil dari event `BattleCreated` dan `multiGetObjects`.
- UI battle:
  - kartu tertutup saat awal,
  - animasi swap saat memilih,
  - reveal setelah transaksi sukses.

Komponen utama:
- `components/BattleList.tsx` -> daftar battle (open di atas, finished di bawah).
- `components/CreateBattle.tsx` -> form create battle.
- `components/BattleGame.tsx` -> flow join + reveal.
- `components/Navbar.tsx` -> wallet + SUI balance.

---

## Struktur Folder
```
SignalClash/
  battle_fe/      # Frontend Next.js
  battle_sc/      # Sui Move contract
```

---

## Setup & Running

### Prerequisites
- Node.js 18+ dan npm.
- Sui CLI (`sui`) untuk build/publish contract.
- Wallet Sui di browser (Sui Wallet / Suiet / dll).

### 1) Smart Contract
Masuk ke folder contract:
```
cd battle_sc
```

Build:
```
sui move build
```

Publish ke jaringan (contoh testnet):
```
sui client publish --gas-budget 100000000
```

Setelah publish, update `PACKAGE_ID` di frontend:
```
battle_fe/lib/constants.ts
```

### 2) Frontend
Masuk ke folder frontend:
```
cd battle_fe
```

Install dan jalankan:
```
npm install
npm run dev
```

Frontend jalan di `http://localhost:3000`.

---

## Konfigurasi Penting
File `battle_fe/lib/constants.ts`:
- `PACKAGE_ID` -> hasil publish contract.
- `MODULE_NAME` -> default `battle_sc`.
- `NETWORK` -> default `testnet`.

Jika ganti network (misalnya devnet / mainnet), pastikan:
- publish contract ke network yang sama,
- update `NETWORK` di constants,
- wallet juga di network yang sama.

---

## Catatan UX
- Battle open akan muncul di bagian atas.
- Battle finished tetap ditampilkan di bawah sebagai history.
- Join battle hanya bisa sekali (object langsung ditutup).

---

## Lisensi
Belum ditentukan.

