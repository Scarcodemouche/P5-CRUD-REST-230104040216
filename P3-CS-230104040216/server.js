// server.js - Client-Server: CRUD Mahasiswa (in-memory)
const express = require('express');
const app = express();

// --- CONFIG ---
const PORT = process.env.PORT || 3001; // default 3001 sesuai permintaan

// --- MIDDLEWARE ---
app.use(express.json()); // agar body JSON bisa dibaca

// --- DATA IN-MEMORY (UNTUK PRAKTIKUM) ---
// NOTE: data akan hilang jika server restart (ini hanya simulasi)
const mahasiswa = [
    // Contoh awal (boleh dikosongkan):
    // { nim: '2310511000', nama: 'Siti Aulia', prodi: 'Teknik Informatika', angkatan: 2023 }
];

// --- HELPER VALIDATION ---
function validateMahasiswaPayload(body, { allowPartial = false } = {}) {
    const required = ['nim', 'nama', 'prodi', 'angkatan'];

    if (!allowPartial) {
        for (const k of required) {
            if (body[k] === undefined || body[k] === null || body[k] === '') {
                return `Field '${k}' wajib diisi`;
            }
        }
    }

    if (body.angkatan !== undefined) {
        const ang = Number(body.angkatan);
        if (!Number.isInteger(ang) || ang < 1900 || ang > 3000) {
            return "Field 'angkatan' harus berupa angka masuk akal (contoh: 2023)";
        }
    }

    return null; // valid
}

// --- HEALTH CHECK ---
app.get('/', (req, res) => {
    res.send('Server Client-Server OK (Mahasiswa CRUD) 🚀');
});

// --- LIST SEMUA MAHASISWA ---
app.get('/mahasiswa', (req, res) => {
    res.json(mahasiswa);
});

// --- DETAIL MAHASISWA BERDASARKAN NIM ---
app.get('/mahasiswa/:nim', (req, res) => {
    const { nim } = req.params;
    const m = mahasiswa.find((x) => x.nim === nim);
    if (!m) return res.status(404).json({ message: 'Mahasiswa tidak ditemukan' });
    res.json(m);
});

// --- TAMBAH MAHASISWA ---
app.post('/mahasiswa', (req, res) => {
    const err = validateMahasiswaPayload(req.body, { allowPartial: false });
    if (err) return res.status(400).json({ message: err });

    const { nim, nama, prodi, angkatan } = req.body;

    // Cek duplikasi NIM
    if (mahasiswa.some((x) => x.nim === nim)) {
        return res.status(409).json({ message: 'NIM sudah terdaftar' });
    }

    const data = {
        nim: String(nim),
        nama: String(nama),
        prodi: String(prodi),
        angkatan: Number(angkatan),
    };

    mahasiswa.push(data);

    return res.status(201).json({ message: 'Mahasiswa dibuat', data });
});

// --- UPDATE DATA MAHASISWA (TIDAK MENGGANTI NIM) ---
app.put('/mahasiswa/:nim', (req, res) => {
    const { nim } = req.params;
    const idx = mahasiswa.findIndex((x) => x.nim === nim);
    if (idx === -1) return res.status(404).json({ message: 'Mahasiswa tidak ditemukan' });

    // Validasi partial: boleh hanya kirim salah satu field
    const err = validateMahasiswaPayload(req.body, { allowPartial: true });
    if (err) return res.status(400).json({ message: err });

    const { nama, prodi, angkatan } = req.body;

    if (nama !== undefined) mahasiswa[idx].nama = String(nama);
    if (prodi !== undefined) mahasiswa[idx].prodi = String(prodi);
    if (angkatan !== undefined) mahasiswa[idx].angkatan = Number(angkatan);

    return res.json({ message: 'Mahasiswa diupdate', data: mahasiswa[idx] });
});

// --- HAPUS MAHASISWA ---
app.delete('/mahasiswa/:nim', (req, res) => {
    const { nim } = req.params;
    const idx = mahasiswa.findIndex((x) => x.nim === nim);
    if (idx === -1) return res.status(404).json({ message: 'Mahasiswa tidak ditemukan' });

    const removed = mahasiswa.splice(idx, 1)[0];

    return res.json({ message: 'Mahasiswa dihapus', nim: removed.nim });
});

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`Client-Server listening on http://localhost:${PORT}`);
});
