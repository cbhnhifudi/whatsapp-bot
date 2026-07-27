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

// הגדרת שני הצ'אטים שביניהם הבוט מקשר (שמים כאן את המזהים שלהם)
const CHAT_1 = '1234567890@c.us'; // החלף במזהה של הצ'אט הראשון
const CHAT_2 = '9876543210@c.us'; // החלף במזהה של הצ'אט השני

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

            // לוגיקת העברה דו-כיוונית בין הצ'אטים
            client.on('message', async msg => {
                try {
                    // אם ההודעה הגיעה מצ'אט 1 -> שלח לצ'אט 2
                    if (msg.from === CHAT_1) {
                        await client.sendMessage(CHAT_2, `${msg.body}`);
                        console.log('🔄 הודעה הועברה מצ\'אט 1 לצ\'אט 2');
                    }
                    // אם ההודעה הגיעה מצ'אט 2 -> שלח לצ'אט 1
                    else if (msg.from === CHAT_2) {
                        await client.sendMessage(CHAT_1, `${msg.body}`);
                        console.log('🔄 הודעה הועברה מצ\'אט 2 לצ\'אט 1');
                    }
                } catch (err) {
                    console.error('❌ שגיאה בהעברת הודעה:', err);
                }
                client.on('ready', async () => {
    console.log('✅ הבוט מחובר ומוכן לעבודה!');
    
    // שליפת כל הצ'אטים והדפסת המזהים שלהם ללוגים
    const chats = await client.getChats();
    console.log('--- רשימת צ\'אטים זמינים ---');
    chats.forEach(chat => {
        console.log(`שם: ${chat.name} | מזהה (ID): ${chat.id._serialized}`);
    });
    console.log('---------------------------');
});
            });

            client.initialize();
        })
        .catch(err => console.error('❌ שגיאה בחיבור ל-MongoDB:', err));
}
