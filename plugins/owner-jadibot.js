import { useMultiFileAuthState, makeCacheableSignalKeyStore } from 'ourin-baileys';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { makeWASocket } from '../lib/simple.js'; 
import { handler as messageHandler } from '../handler.js'; // Import handler utama

// Objek global untuk menyimpan sesi jadibot yang aktif agar tidak tumpang tindih
if (!global.jadibots) global.jadibots = {};

let handler = async (m, { conn, usedPrefix, command }) => {
    let userJid = m.sender;
    let senderId = userJid.split('@')[0];
    
    // Path folder session khusus jadibot
    let sessionFolder = path.join(process.cwd(), 'data', 'jadibot', senderId);

    // Cek apakah user sudah login sebelumnya
    if (global.jadibots[senderId]) {
        return m.reply('❌ Nomor kamu sudah terhubung sebagai Jadibot!');
    }

    // Buat direktori jika belum ada
    if (!fs.existsSync(sessionFolder)) {
        fs.mkdirSync(sessionFolder, { recursive: true });
    }

    m.reply('⏳ Sedang menyiapkan sesi Jadibot, mohon tunggu sebentar untuk mendapatkan QR Code...');

    // Load auth state dari folder user
    const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);

    // Buat socket baru untuk user
    const sock = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
        },
        logger: pino({ level: 'silent' }),
        browser: ['Jojo Jadibot', 'Edge', '1.0.0'],
        printQRInTerminal: false,
        generateHighQualityLinkPreview: true
    });

    // Handle update koneksi
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // Jika QR muncul, kirimkan menggunakan API custom yang diminta
        if (qr) {
            let qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=750x750&data=${encodeURIComponent(qr)}&qzone=4&format=gif&bgcolor=576A8F&color=FFF8DE`;
            
            await conn.sendMessage(m.chat, {
                image: { url: qrUrl },
                caption: `Scan QR code ini di menu *Perangkat Taut* WhatsApp kamu untuk menjadi bot.\n\n⚠️ *Catatan:* QR ini akan kadaluarsa dalam hitungan detik. Jika gagal, ketik *${usedPrefix + command}* lagi.`
            }, { quoted: m });
        }

        // Jika berhasil tersambung
        if (connection === 'open') {
            global.jadibots[senderId] = sock;
            await conn.sendMessage(m.chat, { text: '✅ Berhasil tersambung! Nomor kamu sekarang sudah aktif sebagai Jadibot dan bisa menjalankan plugin.' }, { quoted: m });
            await sock.sendMessage(userJid, { text: '🤖 Sesi Jadibot kamu telah dimulai dari device ini.' });
        }

        // Jika koneksi terputus
        if (connection === 'close') {
            let reason = lastDisconnect?.error?.output?.statusCode;
            
            // Status 401 berarti user menekan "Logout" dari HP-nya
            if (reason === 401) {
                fs.rmSync(sessionFolder, { recursive: true, force: true });
                delete global.jadibots[senderId];
                await conn.sendMessage(m.chat, { text: '❌ Sesi Jadibot kamu telah dihapus karena kamu melakukan Logout.' });
            } else {
                // Hapus dari memori jika putus karena alasan lain, nanti bisa dibuatkan sistem auto-reconnect
                delete global.jadibots[senderId];
            }
        }
    });

    // Simpan kredensial otomatis
    sock.ev.on('creds.update', saveCreds);

    // Tautkan messages.upsert jadibot ke handler utama agar bisa baca plugins
    sock.ev.on('messages.upsert', messageHandler.bind(sock));
};

handler.help = ['jadibot'];
handler.tags = ['main'];
handler.command = /^(jadibot|jb)$/i;
// handler.premium = true // Aktifkan jika jadibot mau dikhususkan untuk user premium

export default handler;