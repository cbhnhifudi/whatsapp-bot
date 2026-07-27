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

// נתיב שבו מוצג הברקוד כתמונה אמיתית
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
                <h2>הבוט כבר מחובר או שאין ברקוד זמין כרגע.</h2>
                <p>אם הבוט מחובר, אין צורך לסרוק דבר.</p>
            </div>
        `);
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// הגדרת שני הצ'אטים שביניהם הבוט מקשר (עדכן כאן את המזהים לאחר שתמצא אותם)
const CHAT_1 = '1234567890@c.us'; 
const CHAT_2 = '9876543210@c.us'; 

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
                    latestQrImage = await QRCode.toDataURL(qr);
                } catch (err) {
                    console.error('שגיאה ביצירת תמונת QR:', err);
                }
            });

            client.on('ready', () => {
                console.log('✅ הבוט מחובר ומוכן לעבודה!');
                latestQrImage = '';
            });

            // לוגיקת העברה דו-כיוונית והדפסת מזהי ההודעות לצורך מציאת ה-IDs
            client.on('message', async msg => {
                // שורה זו מדפיסה את ה-ID של כל הודעה שנכנסת לצורך איתור המזהים
                console.log(`📩 התקבלה הודעה מתוך צ'אט עם ID: ${msg.from}`);

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
