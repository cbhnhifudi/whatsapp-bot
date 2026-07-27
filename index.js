const { Client, RemoteAuth } = require('whatsapp-web.js');
const express = require('express');
const mongoose = require('mongoose');
const { MongoStore } = require('wwebjs-mongo');

// 🌐 שרת HTTP עבור Render למניעת שגיאת Timeout
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('WhatsApp Bot is running with MongoDB! 🤖');
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on port ${port}`);
});

// 🍃 חיבור ל-MongoDB Atlas ושמירת סשן הוואטסאפ בענן
const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
    console.error('❌ חסר משתנה סביבה MONGO_URI');
    process.exit(1);
}

mongoose.connect(mongoUri).then(() => {
    console.log('✅ מחובר בהצלחה ל-MongoDB');

    const store = new MongoStore({ mongoose: mongoose });
    const client = new Client({
        authStrategy: new RemoteAuth({
            store: store,
            backupSyncIntervalMs: 300000 // גיבוי נתוני התחברות לענן כל 5 דקות
        })
    });

    const groupA = '120363410564271304@g.us';
    const groupB = '120363409461987818@g.us';

    client.on('qr', (qr) => {
        console.log('🔗 פתח את הקישור הבא בדפדפן כדי לסרוק את הברקוד:');
        console.log(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`);
    });

    client.on('ready', () => {
        console.log('החיבור הצליח! הבוט מחובר ומוכן לעבודה 🤖');
    });

    client.on('message', async (msg) => {
        console.log('📥 התקבלה הודעה מזהה:', msg.from);

        if (msg.fromMe) return;

        if (msg.from === groupA || msg.from === groupB) {
            try {
                const contact = await msg.getContact();
                const phoneNumber = contact.id.user || contact.number;
                
                let replyText = '';
                if (msg.hasQuotedMsg) {
                    try {
                        const quotedMsg = await msg.getQuotedMessage();
                        if (quotedMsg && quotedMsg.body) {
                            replyText = `💬 מגיב ל: "${quotedMsg.body}"\n`;
                        }
                    } catch (e) {}
                }

                const messageToSend = `הודעה מאת: @${phoneNumber}\n${replyText}\n${msg.body}`;
                const targetGroup = msg.from === groupA ? groupB : groupA;

                await client.sendMessage(targetGroup, messageToSend, {
                    mentions: [contact.id._serialized]
                });

                console.log('🚀 הודעה הועברה בהצלחה כולל תיוג ותגובה');
            } catch (err) {
                console.error('❌ שגיאה בטיפול בהודעה:', err.message);
            }
        }
    });

    client.initialize();
}).catch(err => {
    console.error('❌ שגיאה בחיבור ל-MongoDB:', err);
});
