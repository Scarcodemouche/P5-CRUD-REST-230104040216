//notification-service.js (Final MS7)
require ('dotenv').config();
const express = require ('express');
const cors = require ('cors');

const app = express();
app.use(cors());
app.use(express.json());

//in-memory Storage
const notifications = [];

//health check
app.get('/', (_req, res) => res.send('Notification Service OK') );

//GET/notifications
app.get('/notifications', (req, res) => {
    res.json({ data: notifications, total: notifications.length });
});
//GET/notifications/my
app.get('/notifications/my', (req, res) => {
    const user = req.headers['x-user-username'] || req.headers['x-user-id'] || unknown;
    const myNotif = notifications.filter(n => n.to == user);
    res.json({ data: myNotif, total: myNotif.length});
});

//POST/notify
app.post('/notify', (req, res) => {
    const { to, type, title, message, payload } = req.body || {};
    if (!to || !type) return res.status(400).json({
        message: 'to & type wajib'
    });
    const notif = {
        id: notifications.length + 1,
        to,
        type,
        title: title || 'New Notification',
        message: message || '',
        payload: payload || {},
        ts: new Date().toISOString(),
    };
    notifications.push(notif);
console.log(`[NOTIF] -> ${to}: ${title}`);
res.status(201).json({ message: 'Notification created', notification: notif });
});

//start server
const PORT = process.env.PORT || 5003;
app.listen(PORT, () => console.log (`Notification Service jalan di http://localhost:${PORT}`));