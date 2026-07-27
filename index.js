const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const mongoose = require('mongoose');

// יצירת שרת Express בשביל Render
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.send('WhatsApp Bot is running successfully! 🚀');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// חיבור למסד הנתונים MongoDB
if (process.env.MONGO_URI) {
    mongoose.connect(process.env.MONGO_URI)
        .then(() => console.log('✅ מחובר בהצלחה ל-MongoDB'))
        .catch(err => console.error('❌ שגיאה בחיבור ל-MongoDB:', err));
}

// הגדרת הבוט של וואטסאפ יחד עם דגלי Puppeteer מותאמים ל-Render
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ],
    }
});

// הצגת הברקוד בלוגים כשהבוט מוכן לסריקה
client.on('qr', (qr) => {
    console.log('QR RECEIVED, please scan:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ הבוט מחובר ומוכן לעבודה!');
});

// דוגמה לתגובה להודעה
client.on('message', async msg => {
    if (msg.body === '!ping') {
        msg.reply('pong');
    }
});

// הפעלת הלקוח
client.initialize();
