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

// הגדרת מזהי הצ'אטים מתוך משתני הסביבה ב-Render
const SOURCE_CHAT_ID = process.env.SOURCE_CHAT_ID; // צ'אט שממנו מעבירים
const TARGET_CHAT_ID = process.env.TARGET_CHAT_ID; // צ'אט שאליו מעבירים

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
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--no-zygote',
                        '--single-process', // קריטי לשרתים חינמיים עם מעט זיכרון כמו Render
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

            // לוגיקת העברת הודעות
            client.on('message', async msg => {
                try {
                    // בדיקה אם ההודעה הגיעה מצ'אט המקור המוגדר
                    if (SOURCE_CHAT_ID && msg.from === SOURCE_CHAT_ID) {
                        if (TARGET_CHAT_ID) {
                            // העברת תוכן ההודעה לצ'אט היעד
                            await client.sendMessage(TARGET_CHAT_ID, `הודעה שהתקבלה:\n${msg.body}`);
                            console.log('🔄 הודעה הועברה בהצלחה!');
                        }
                    }
                } catch (err) {
                    console.error('❌ שגיאה בהעברת הודעה:', err);
                }
            });

            client.initialize();
        })
        .catch(err => console.error('❌ שגיאה בחיבור ל-MongoDB:', err));
}
