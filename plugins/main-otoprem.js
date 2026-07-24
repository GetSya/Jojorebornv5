import axios from 'axios';
import { delay } from 'baileys';

let handler = async (m, { conn, text, command, usedPrefix }) => {
    let nomor = m.sender.split('@')[0].split(':')[0]
    let who = nomor + '@s.whatsapp.net'
    
    // 1. Tentukan Harga Dasar
    let hargaDasar = 2000; 
    
    // 2. HITUNG MANUAL BIAYA ADMIN (0.7% + Rp340)
    // Kita tambahkan ini agar nominal yang muncul di QRIS bukan 2000 pas
    let pajakPersen = 0.007 * hargaDasar; // 0.7%
    let biayaFlat = 340;
    let totalInput = Math.ceil(hargaDasar + pajakPersen + biayaFlat); // Hasil: ~2354

    if (!global.db.data.users[who]) {
        global.db.data.users[who] = {
            name: await conn.getName(who) || 'Unknown',
            limit: 10,
            exp: 0,
            level: 0,
            register: false,
            premium: false,
            premiumTime: 0
        }
    }
    
    let user = global.db.data.users[who]

    if (!global.pakasir || !pakasir.slug || !pakasir.apikey) {
        return m.reply('❌ Konfigurasi `pakasir.slug` atau `pakasir.apikey` belum diisi.');
    }

    try {
        // Kita kirim 'totalInput' ke API agar QRIS yang terbuat nominalnya sudah + pajak
        const cqris = await createQris(pakasir.slug, pakasir.apikey, totalInput);
        
        const expiredAt = new Date(cqris.expired_at);
        expiredAt.setHours(expiredAt.getHours() - 1);
        expiredAt.setMinutes(expiredAt.getMinutes() + (global.pakasir.expired || 1));
        
        const expiredTime = expiredAt.toLocaleTimeString('id-ID', {
            hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta'
        });

        // Nominal final yang harus dibayar user
        const totalFinal = cqris.total_payment 

        const sQris = await conn.sendMessage(
            m.chat,
            {
                image: { url: `https://api.qrserver.com/v1/create-qr-code/?size=750x750&data=${encodeURIComponent(cqris.payment_number)}&qzone=4&format=gif&bgcolor=576A8F&color=FFF8DE` },
                caption:
                    `💳 *QRIS PREMIUM ${global.namebot || 'BOT'}*\n\n` +
                    `✨ *Benefit:* Premium 30 Hari\n` +
                    `🕓 *Expired:* ${expiredTime} WIB\n` +
                    `💰 *TOTAL TAGIHAN:* Rp${totalFinal.toLocaleString('id-ID')}\n` +
                    `📦 *Order ID:* #${cqris.order_id}\n\n` +
                    `*PENTING:* Silakan bayar sesuai nominal di atas agar otomatis terdeteksi.`
            },
            { quoted: m }
        );

        let status = '';
        while (status !== 'completed') {
            if (new Date() >= expiredAt) {
                await conn.sendMessage(m.chat, { delete: sQris.key });
                return m.reply('⚠️ QRIS Expired.');
            }

            // Gunakan totalInput saat cek status agar sesuai dengan nominal yang discan
            const res = await checkStatus(pakasir.slug, pakasir.apikey, cqris.order_id, totalInput);
            
            if (res && res.status === 'completed') {
                status = 'completed';
                
                let hari = 30
                let ms = 86400000 * hari
                let now = Date.now()

                if (user.premiumTime && user.premiumTime > now) {
                    user.premiumTime += ms
                } else {
                    user.premiumTime = now + ms
                }
                user.premium = true

                let tanggalBerakhir = new Date(user.premiumTime).toLocaleDateString('id-ID', { 
                    day: 'numeric', month: 'long', year: 'numeric' 
                })

                await conn.sendMessage(m.chat, { delete: sQris.key });
                
                await conn.sendMessage(m.chat, { 
                    text: `✅ *PEMBAYARAN BERHASIL*\n\n👤 *User:* @${who.split('@')[0]}\n⭐ *Status:* Premium Aktif\n📅 *Berakhir:* ${tanggalBerakhir}`,
                    mentions: [who]
                }, { quoted: m })
                break;
            }
            await delay(5000);
        }

    } catch (e) {
        console.error(e);
        m.reply(`❌ Error: ${e.message}`);
    }
};

handler.help = ['buyprem'];
handler.tags = ['main'];
handler.command = /^(buyprem)$/i;
export default handler;

async function createQris(project, apikey, amount) {
    const res = await axios.post('https://app.pakasir.com/api/transactioncreate/qris', {
        project,
        order_id: 'PREM-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
        amount,
        api_key: apikey,
    });
    return res.data.payment;
}

async function checkStatus(project, apikey, orderId, amount) {
    try {
        const res = await axios.get(`https://app.pakasir.com/api/transactiondetail?project=${project}&amount=${amount}&order_id=${orderId}&api_key=${apikey}`);
        return res.data.transaction;
    } catch (e) { return null; }
}