// 1. Import library
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

// 2. Inisialisasi Express
const app = express();
app.use(cors());
app.use(express.json()); // agar bisa baca body JSON dari request

// 3. Simulasi data user (seolah-olah dari database)
const users = [
    { username: 'mhsA', password: '123456' },
    { username: 'mhsB', password: '654321' },
];

// 4. Endpoint GET / (hanya untuk check server)
app.get('/', (req, res) => {
    res.send('Server Auth Service OK 🚀');
});

// 5. Endpoint POST /login
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // cek input ada atau tidak
    if (!username || !password) {
        return res
            .status(400)
            .json({ message: 'Username dan password wajib diisi' });
    }

    // cek user di "database"
    const user = users.find(
        (u) => u.username === username && u.password === password
    );

    if (!user) {
        return res
            .status(401)
            .json({ message: 'Login gagal, Username atau password salah' });
    }

    // buat payload JWT (isi token)
    const payload = { username: user.username };

    const token = jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // kirim token ke client
    res.json({ message: 'Login berhasil', token });
});

// 6. Jalankan server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Auth Service berjalan di http://localhost:${PORT}`);
});
