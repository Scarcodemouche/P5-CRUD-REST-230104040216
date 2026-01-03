// order-service.js (MS6 FIX)
// pola keamanan: trust gateway via x-user-id, fallback ke auth/verify
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const axios = require('axios');
const { randomUUID } = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// konfigurasi
const PORT = process.env.PORT || 5002;
const AUTH_URL = process.env.AUTH_URL || 'http://localhost:4001';
const PRODUCT_URL = process.env.PRODUCT_URL || 'http://localhost:5001';

const keepAliveAgent = new http.Agent({ keepAlive: true });

const axiosAuth = axios.create({
    baseURL: AUTH_URL,
    timeout: 12000,
    httpAgent: keepAliveAgent,
    validateStatus: () => true
});

const axiosProd = axios.create({
    baseURL: PRODUCT_URL,
    timeout: 12000,
    httpAgent: keepAliveAgent,
    validateStatus: () => true
});

// logger
app.use((req, _res, next) => {
    console.log(
        '[ORDER] REQ',
        req.method,
        req.url,
        'auth=',
        req.headers.authorization || '-',
        'x-user-id=',
        req.headers['x-user-id'] || '-'
    );
    next();
});

// in-memory store
const ORDERS = {};

// ================= AUTH VERIFY =================
async function authVerify(req, res, next) {
    // 1. trust gateway
    const userIdFromGateway = req.headers['x-user-id'];
    if (userIdFromGateway) {
        req.user = { id: String(userIdFromGateway), via: 'gateway' };
        return next();
    }

    // 2. fallback auth-service
    const auth = String(req.headers.authorization || '');
    if (!auth.startsWith('Bearer ')) {
        return res.status(401).json({
            message: 'Authorization Bearer <token> wajib'
        });
    }

    try {
        const r = await axiosAuth.get('/verify', {
            headers: { authorization: auth }
        });

        if (r.status >= 200 && r.status < 300) {
            req.user = r.data?.user || r.data || {
                id: 'unknown',
                via: 'auth-verify'
            };
            return next();
        }

        return res.status(401).json({
            message: 'Token tidak valid/expired (verify failed)',
            detail: r.data
        });
    } catch (e) {
        return res.status(401).json({
            message: 'Token tidak valid/expired (auth-service unreachable)',
            error: e.message
        });
    }
}

// ================= HEALTH =================
app.get('/', (_req, res) =>
    res.json({ service: 'order-service', ok: true })
);

// ================= HELPER =================
async function getProduct(productId, authHeader, userHeader) {
    try {
        const r = await axiosProd.get(
            `/products/${encodeURIComponent(productId)}`,
            {
                headers: {
                    ...(authHeader ? { authorization: authHeader } : {}),
                    ...(userHeader || {})
                }
            }
        );

        if (r.status >= 200 && r.status < 300) return r.data;
        return null;
    } catch {
        return null;
    }
}

// ================= CREATE ORDER =================
app.post('/orders', authVerify, async (req, res) => {
    const { productId, quantity, notes } = req.body || {};

    if (!productId) {
        return res.status(400).json({ message: 'productId wajib' });
    }

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
        return res.status(400).json({
            message: 'quantity wajib (angka > 0)'
        });
    }

    const product = await getProduct(
        String(productId),
        req.headers.authorization || '',
        {
            'x-user-id': req.headers['x-user-id'] || '',
            'x-user-role': req.headers['x-user-role'] || ''
        }
    );

    const price = product?.price ?? null;
    const amount = price !== null ? price * qty : null;

    const now = new Date().toISOString();
    const id = randomUUID();

    const order = {
        id,
        userId: req.user?.id || 'unknown',
        productId: String(productId),
        quantity: qty,
        notes: notes || null,
        price,
        amount,
        status: 'CREATED',
        createdAt: now,
        updatedAt: now,
        verifiedBy: req.user?.via || 'unknown'
    };

    ORDERS[id] = order;
    return res.status(201).json(order);
});

// ================= LIST =================
app.get('/orders', authVerify, (req, res) => {
    const userId = req.user?.id || 'unknown';
    const list = Object.values(ORDERS).filter(o => o.userId === userId);
    res.json({ data: list });
});

// ================= DETAIL =================
app.get('/orders/:id', authVerify, (req, res) => {
    const o = ORDERS[req.params.id];
    if (!o) return res.status(404).json({ message: 'Order tidak ditemukan' });
    if (o.userId !== req.user?.id) {
        return res.status(403).json({ message: 'Forbidden' });
    }
    res.json(o);
});

// ================= CANCEL =================
app.patch('/orders/:id/cancel', authVerify, (req, res) => {
    const o = ORDERS[req.params.id];
    if (!o) return res.status(404).json({ message: 'Order tidak ditemukan' });
    if (o.userId !== req.user?.id) {
        return res.status(403).json({ message: 'Forbidden' });
    }
    o.status = 'CANCELLED';
    o.updatedAt = new Date().toISOString();
    res.json(o);
});

// ================= ERROR =================
app.use((req, res) =>
    res.status(404).json({
        message: 'Route tidak ditemukan di order-service',
        path: req.originalUrl
    })
);

app.use((err, _req, res, _next) => {
    console.error('[ORDER] Error:', err);
    res.status(500).json({
        message: 'Kesalahan internal order-service',
        error: err.message
    });
});

// ================= START =================
app.listen(PORT, () =>
    console.log(
        `🚀 order-service listening on http://localhost:${PORT} (AUTH_URL=${AUTH_URL})`
    )
);
