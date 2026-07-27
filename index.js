const express = require('express');
const { Client, RemoteAuth } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const QRCode = require('qrcode');
const mongoose = require('mongoose');
const { MongoStore } = require('wwebjs-mongo');

// יצירת שרת Express בשביל Render
const app = express();
const PORT = process.env.PORT || 10000;

// משתנה זמני לשמירת תמונת הברקוד
let latestQrImage = '';

app.get('/', (req, res) => {
    res.send('WhatsApp Bot is running successfully! 🚀<br>לצפייה בברקוד היכנס ל-<a href="/qr">/qr</a>');
});

// נתיב חדש שבו מוצג הברקוד כתמונה אמיתית
app.get('/qr', (req, res) => {
    if (latestQrImage) {
        res.send(`
            <div style="text-align: center; margin-top: 50px; font-family: Arial;">
                <h2>סרוק את הברקוד הבא כדי לחבר את הבוט:</h2>
                <img src="${latestQrImage}" alt="WhatsApp QR Code" style="width: 300px; height: 300px; border: 2px solid #ccc; padding: 10px; border-radius: 10px;" />
                <p>העמוד מתרענן אוטומטית או רענן אותו אם הברקוד פג תוקף.</p>
            </div>
        `);
    } else {
        res.send(`
            <div style="text-align: center; margin-top: 50px; font-family: Arial;">
                <h2>עדיין אין ברקוד זמין, או שהבוט כבר מחובר!</h2>
                <p>אם הבוט כבר מחובר, אין צורך לסרוק דבר.</p>
            </div>
        `);
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// הגדרת שני הצ'אטים שביניהם הבוט מקשר
const CHAT_1 = '1234567890@c.us'; // החלף במזהה הצ'אט הראשון
const CHAT_2 = '9876543210@c.us'; // החלף במזהה הצ'אט השני

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
                        '--single-process',
                        '--disable-gpu',
                        '--disable-features=IsolateOrigins,site-per-process',
                        '--disable-site-isolation-trials'
                    ],
                }
            });

            client.on('qr', async (qr) => {
                console.log('QR RECEIVED - גש לכתובת האתר שלך בתוספת /qr כדי לסרוק!');
                qrcodeTerminal.generate(qr, { small: true });
                
                try {
                    // המרת קוד ה-QR לתמונה דיגיטלית (Data URL)
                    latestQrImage = await QRCode.toDataURL(qr);
                } catch (err) {
                    console.error('שגיאה ביצירת תמונת QR:', err);
                }
            });

            client.on('ready', () => {
                console.log('✅ הבוט מחובר ומוכן לעבודה!');
                latestQrImage = ''; // מאפסים את הברקוד כי הוא כבר התחבר
            });

            // לוגיקת העברה דו-כיוונית בין הצ'אטים
            client.on('message', async msg => {
                try {
                    if (msg.from === CHAT_1) {
                        await client.sendMessage(CHAT_2, `${msg.body}`);
                        console.log('🔄 הודעה הועברה מצ\'אט 1 לצ\'אט 2');
                    } else if (msg.from === CHAT_2) {
                        await client.sendMessage(CHAT_1, `${msg.body}`);
                        console.log('🔄 הודעה הועברה מצ\'אט 2 לצ\'אט 1');
                    }
                } catch (err) {
                    console.error('❌ שגיאה בהעברת הודעה:', err);
                }
            });

            client.initialize();
        })
        .catch(err => console.error('❌ שגיאה בחיבור ל-MongoDB:', err));
}
