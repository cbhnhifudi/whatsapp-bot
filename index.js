const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
    authStrategy: new LocalAuth()
});

const groupA = '120363410564271304@g.us';
const groupB = '120363409461987818@g.us';

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('סרוק את קוד ה-QR בעזרת הוואטסאפ בטלפון שלך:');
});

client.on('ready', () => {
    console.log('החיבור הצליח! הבוט מחובר ומוכן לעבודה 🤖');
});

client.on('message', async (msg) => {
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
                } catch (e) {
                    // התעלמות שקטה משגיאת שליפת ציטוט
                }
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