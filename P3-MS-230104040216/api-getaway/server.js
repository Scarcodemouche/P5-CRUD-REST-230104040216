// server.js (API gateway)
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const axios = require('axios');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
app.use(cors());
app.use(express.json());

// logger (FIX template literal)
app.use((req, _res, next) => {
    console.log(`[GW] ${req.method} ${req.url}`);
    next();
});

const keepAliveAgent = new http.Agent({ keepAlive: true });

// targets
const AUTH_URL    = process.env.AUTH_URL    || 'http://localhost:4001';
const PRODUCT_URL = process.env.PRODUCT_URL || 'http://localhost:5001';
const ORDER_URL   = process.env.ORDER_URL   || 'http://localhost:5002';
const NOTIF_URL   = process.env.NOTIF_URL   || 'http://localhost:5003';

// axios instances (FIX validateStatus)
const axiosAuth = axios.create({
    baseURL: AUTH_URL,
    timeout: 12000,
    httpAgent: keepAliveAgent,
    validateStatus: () => true
});

const axiosProd = axios.create({
    baseURL: PRODUCT_URL,
    timeout: 15000,
    httpAgent: keepAliveAgent,
    validateStatus: () => true
});

const axiosOrder = axios.create({
    baseURL: ORDER_URL,
    timeout: 15000,
    httpAgent: keepAliveAgent,
    validateStatus: () => true
});

const axiosNotif = axios.create({
    baseURL: NOTIF_URL,
    timeout: 15000,
    httpAgent: keepAliveAgent,
    validateStatus: () => true
});

// health
app.get('/', (_req, res) => res.send('API Gateway OK (MS1–MS7)'));

// ================= AUTH =================
app.post('/auth/login', async (req, res) => {
    try {
        const r = await axiosAuth.post('/login', req.body, {
            headers: { 'Content-Type': 'application/json' }
        });
        return res.status(r.status).json(r.data);
    } catch (e) {
        return res.status(502).json({
            message: 'Login via gateway gagal',
            error: e.message
        });
    }
});

app.get('/auth/verify', async (req, res) => {
    try {
        const auth = req.headers.authorization || '';
        const r = await axiosAuth.get('/verify', {
            headers: { authorization: auth }
        });
        return res.status(r.status).json(r.data);
    } catch (e) {
        return res.status(502).json({
            message: 'Verify via gateway gagal',
            error: e.message
        });
    }
});

// ================= AUTH VERIFY MIDDLEWARE =================
async function authVerify(req, res, next) {
    const auth = req.headers.authorization || '';
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
            const user = r.data?.user || r.data || {};
            req.user = user;

            if (user.id) {
                req.headers['x-user-id'] = String(user.id);
            }
            if (user.username) {
                req.headers['x-user-username'] = String(user.username);
            }
            if (user.role) {
                req.headers['x-user-role'] = String(user.role);
            }

            return next();
        }

        return res.status(401).json({
            message: 'Token tidak valid',
            detail: r.data
        });
    } catch (e) {
        return res.status(401).json({
            message: 'Auth verify gagal',
            error: e.message
        });
    }
}

// ================= HELPER PROXY =================
function buildProxyOptions({ target, pathRewrite }) {
    return {
        target,
        changeOrigin: true,
        xfwd: true,
        agent: keepAliveAgent,
        pathRewrite,
        proxyTimeout: 100000,
        timeout: 12000,
        onProxyReq(proxyReq, req) {
            if (
                req.body &&
                typeof req.body === 'object' &&
                ['POST', 'PUT', 'PATCH'].includes(req.method)
            ) {
                const body = JSON.stringify(req.body);
                proxyReq.setHeader('Content-Type', 'application/json');
                proxyReq.setHeader('Content-Length', Buffer.byteLength(body));
                proxyReq.write(body);
            }
        },
        onError(err, _req, res) {
            console.error('[GW Proxy Error]', err.message);
            if (!res.headersSent) {
                res.status(502).json({
                    message: 'Upstream error',
                    error: err.message
                });
            }
        }
    };
}

// ================= PRODUCTS (MS5) =================
app.post('/api/products', authVerify, async (req, res) => {
    try {
        const r = await axiosProd.post('/products', req.body, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: req.headers.authorization || ''
            }
        });
        return res.status(r.status).json(r.data);
    } catch (e) {
        return res.status(502).json({
            message: 'Create product via gateway gagal',
            error: e.message
        });
    }
});

app.use(
    '/api/products',
    authVerify,
    createProxyMiddleware(
        buildProxyOptions({
            target: PRODUCT_URL,
            pathRewrite: { '^/api': '' }
        })
    )
);

// ================= ORDERS (MS6) =================
app.post('/api/orders', authVerify, async (req, res) => {
    try {
        const r = await axiosOrder.post('/orders', req.body, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: req.headers.authorization || '',
                'x-user-id': req.headers['x-user-id'] || '',
                'x-user-username': req.headers['x-user-username'] || '',
                'x-user-role': req.headers['x-user-role'] || ''
            }
        });
        return res.status(r.status).json(r.data);
    } catch (e) {
        return res.status(502).json({
            message: 'Create order via gateway gagal',
            error: e.message
        });
    }
});

app.use(
    '/api/orders',
    authVerify,
    createProxyMiddleware(
        buildProxyOptions({
            target: ORDER_URL,
            pathRewrite: { '^/api': '' }
        })
    )
);

// ================= NOTIFICATIONS (MS7) =================
app.post('/api/notifications/notify', authVerify, async (req, res) => {
    try {
        const r = await axiosNotif.post('/notify', req.body, {
            headers: {
                'Content-Type': 'application/json',
                Authorization: req.headers.authorization || '',
                'x-user-id': req.headers['x-user-id'] || '',
                'x-user-username': req.headers['x-user-username'] || '',
                'x-user-role': req.headers['x-user-role'] || ''
            }
        });
        return res.status(r.status).json(r.data);
    } catch (e) {
        return res.status(502).json({
            message: 'Gateway -> Notification gagal',
            error: e.message
        });
    }
});

app.get('/api/notifications', authVerify, async (req, res) => {
    try {
        const r = await axiosNotif.get('/notifications', {
            headers: {
                Authorization: req.headers.authorization || '',
                'x-user-id': req.headers['x-user-id'] || '',
                'x-user-username': req.headers['x-user-username'] || '',
                'x-user-role': req.headers['x-user-role'] || ''
            }
        });
        return res.status(r.status).json(r.data);
    } catch (e) {
        return res.status(502).json({
            message: 'Gateway -> Notification(GET) gagal',
            error: e.message
        });
    }
});

app.use(
    '/api/notifications',
    authVerify,
    createProxyMiddleware({
        target: NOTIF_URL,
        changeOrigin: true,
        xfwd: true,
        pathRewrite: { '^/api/notifications': '/notifications' },
        onError(err, _req, res) {
            console.error('[GW Notifications Proxy Error]', err.message);
            res.status(502).json({
                message: 'Gateway -> Notification error',
                error: err.message
            });
        }
    })
);

// ================= START =================
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 API Gateway jalan di http://localhost:${PORT}`);
});
