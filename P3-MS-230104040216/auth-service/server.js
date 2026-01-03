//auth-service/server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const users = [
{ id: 1, username: 'mhsA', password: '123456', role: 'student' },
{ id: 2, username: 'mhsB', password: '654321', role: 'student' },
];

app.get ('/', (_req, res) => res.send('Auth Service OK'));

app.post('/login', (req, res) => {
try{
    const { username, password} = req.body || {};
    if (!username || !password) return res.status(400).json({ message: 'username & password wajib '});

    const user = users.find(u => u.username == username && u.password == password);
    if(!user) return res.status(401).json({ message: 'Login gagal, username/password salah'});
    
    if(!process.env.JWT_SECRET) return res.status(500).json({ message: 'Konfigurasi JWT_SECRET belum diset di .env'}); 

    const payload = { sub: user.id, username: user.username, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {expiresIn: process.env.JWT_EXPIRES_IN || '1h'});
    
    return res.json({ message: 'login sukses', token, expiresIn: process.env.JWT_EXPIRES_IN || '1h' });

}catch (e){
    console.error('[AUTH:/login] error:', e );
    return res.status(500).json({ message: 'Gagal membuat token', error: e.message});
    
    }
});

app.get('/verify', (req, res) => {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if(!token) return res.status(401).json ({ valid: false, message: 'Token tidak ada'});
    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return res.json({ valid: true, decoded});
    }catch (err){
        return res.status(401).json({ valid: false, error: err.message})
    }
});

//start server
const PORT = process.env.PORT || 4001;
app.listen(PORT, () => console.log(`Auth service listening on http://localhost:${PORT}`));