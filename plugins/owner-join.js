const handler = async (m, { conn, text, args, usedPrefix, command }) => {
    // 1. Validasi input: Apakah ada link yang diberikan?
    let link = args[0] || (m.quoted && m.quoted.text);
    if (!link) return m.reply(`Kirim perintah ${usedPrefix + command} <link grup>\n\nContoh: ${usedPrefix + command} https://chat.whatsapp.com/xxxxxx`);

    // 2. Regex untuk mengambil kode invite dari link
    let [ , code] = link.match(/chat.whatsapp.com\/([0-9A-Za-z]{20,24})/i) || [];
    if (!code) return m.reply('Link tidak valid! Pastikan link adalah tautan undangan grup WhatsApp.');

    m.reply('Mohon tunggu, sedang mencoba bergabung ke grup...');

    try {
        // 3. Eksekusi perintah bergabung
        let res = await conn.groupAcceptInvite(code);
        
        // Memberi tahu jika berhasil
        m.reply(`Berhasil bergabung ke grup: ${res}`);
    } catch (e) {
        // Penanganan error (misal: link sudah expired atau bot di-kick sebelumnya)
        console.error(e);
        m.reply('Gagal bergabung. Mungkin link sudah kadaluwarsa atau bot telah di-kick dari grup tersebut.');
    }
};

handler.help = ['join <link>'];
handler.tags = ['owner'];
handler.command = /^(join)$/i;
handler.premium = true; // Sangat disarankan set true untuk keamanan bot

export default handler;