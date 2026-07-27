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

            // יצירת Store מבוסס MongoDB לשמירת נתוני החיבור
            const store = new MongoStore({ mongoose: mongoose });

            // הגדרת הבוט עם RemoteAuth
            const client = new Client({
                authStrategy: new RemoteAuth({
                    store: store,
                    backupSyncIntervalMs: 300000 // גיבוי סשן כל 5 דקות למונגו
                }),
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

            // אירועים של הבוט
            client.on('qr', (qr) => {
                console.log('QR RECEIVED, please scan:');
                qrcode.generate(qr, { small: true });
            });

            client.on('ready', () => {
                console.log('✅ הבוט מחובר ומוכן לעבודה!');
            });

            client.on('remote_session_saved', () => {
                console.hologram ? null : console.log('💾 הסשן נשמר בהצלחה ב-MongoDB!');
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
