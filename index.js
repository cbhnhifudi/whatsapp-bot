const express = require('express');
const { Client, RemoteAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const mongoose = require('mongoose');
const { MongoStore } = require('wwebjs-mongo');

// יצירת שרת Express בשביל Render
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.send('WhatsApp Bot is running successfully! 🚀');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// חיבור למסד הנתונים MongoDB ואז הפעלת הבוט
if (process.env.MONGO_URI) {
    mongoose.connect(process.env.MONGO_URI)
        .then(() => {
            console.log('✅ מחובר בהצלחה ל-MongoDB');

            const store = new MongoStore({ mongoose: mongoose });

            const client = new Client({
                authStrategy: new RemoteAuth({
                    store: store,
                    backupSyncIntervalMs: 300000
                }),
                puppeteer: {
                    headless: true,
                    // נתיב מפורש לדפדפן כרום שהותקן בשרת של Render
                    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined, 
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--no-zygote',
                        '--disable-gpu',
                        '--disable-features=IsolateOrigins,site-per-process',
                        '--disable-site-isolation-trials'
                    ],
                }
            });

            client.on('qr', (qr) => {
                console.log('QR RECEIVED, please scan:');
                qrcode.generate(qr, { small: true });
            });

            client.on('ready', () => {
                console.log('✅ הבוט מחובר ומוכן לעבודה!');
            });

            client.on('message', async msg => {
                if (msg.body === '!ping') {
                    msg.reply('pong');
                }
            });

            client.initialize();
        })
        .catch(err => console.error('❌ שגיאה בחיבור ל-MongoDB:', err));
}
