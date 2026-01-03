// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authMiddleware = require('./authMiddleware');

const app = express();
app.use(cors());
app.use(express.json());

// data dummy: setiap item punya owner (username dari token JWT) yang berhak akses
const items = [
    { id: 1, name: 'Item A', owner: 'mhsA' },
    { id: 2, name: 'Item B', owner: 'mhsB' },
];

// check service
app.get('/', (req, res) => {
    res.send('Server Data Service OK 🚀 (protected routes: /data)');
});

// GET /data (terlindungi)
app.get('/data', authMiddleware, (req, res) => {
    const username = req.user?.username;
    const filtered = items.filter((i) => i.owner === username);

    res.json({
        message: 'Halo ${username}, berikut data yang bisa kamu akses',
        data: filtered,
    });
});

// POST /data (terlindungi)
app.post('/data', authMiddleware, (req, res) => {
    const username = req.user?.username;
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ message: 'nama wajib diisi' });
    }

    const id = items.length ? items[items.length - 1].id + 1 : 1;
    const newItem = { id, name, owner: username };
    items.push(newItem);

    res.status(201).json({
        message: `Halo ${username}, item baru berhasil dibuat`,
        item: newItem,
    });
});

// 🔥 HARUS DI LUAR ENDPOINT
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Data Service listening on http://localhost:${PORT}`);
});
