//product service/server.js
require ('dotenv').config();

const express = require('express');
const cors = require ('cors');

const app = express();

//middleware dasar
app.use(cors());
app.use(express.json());

//(opsional) logger ringkas agar kelihatan request yang masuk
app.use ((req, _res, next) => {
    console.log('[PRODUCT] ${req.method} ${req.url}' );
    next();
});

//data in memory demo
let products = [
    {id: 1, name: 'Pulpen', price: 5000},
    {id: 2, name: 'Buku Tulis', price: 12000}
];

//health check
app.get('/', (_req, res) => res.send('Product Service OK'));

//GET list product
app.get('/products', (_req, res) =>{
    res.json(products);
});

//GET detail produk by ID
app.get('/products/:id', (req, res) => {
    const id= Number (req.params.id);
    const prod= products.find(p => p.id == id);
    if (!prod) return res.status(404).json({
        message: 'Produk tidak ditemukan'
    });
    res.json(prod);
});

//POST buat produk baru
app.post('/products', (req, res) => {
    const {name, price} = req.body || {};

    //validasi sederhana
    if (!name || price == null || Number.isNaN(Number(price))) {
        return res.status(400).json({ message: 'name & price (angka) wajib'});
    }

    const id = products.length ? products[products.length - 1].id + 1 : 1;
    const prod = { id, name, price: Number(price) };
    products.push(prod);

    //201 created
    res.status(201).json({ message: 'Produk dibuat', product: prod});
});

//start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Product Service listening on http://localhost:${PORT}`));