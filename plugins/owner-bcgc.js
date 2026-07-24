const handler = async (m, { conn, text, command }) => {
    // 1. Ambil semua grup yang diikuti bot
    let getGroups = await conn.groupFetchAllParticipating();
    let groups = Object.entries(getGroups).slice(0).map(entry => entry[1]);
    let anu = groups.map(v => v.id);

    // 2. Cek apakah ada pesan yang di-reply atau teks setelah command
    let pesan = m.quoted ? m.quoted.text : text;
    if (!pesan) return m.reply(`Contoh: .${command} Halo semuanya!`);

    m.reply(`Sedang memproses broadcast ke ${anu.length} grup...`);

    // 3. Looping pengiriman
    for (let i of anu) {
        // Delay 2 detik agar tidak terdeteksi spam/banned
        await new Promise(resolve => setTimeout(resolve, 2000));

        if (m.quoted) {
            // Jika me-reply pesan (gambar/teks/stiker), gunakan forward
            await conn.copyNForward(i, m.getQuotedObj(), true).catch(_ => _);
        } else {
            // Jika hanya mengetik teks setelah command, kirim sebagai teks biasa
            await conn.sendMessage(i, { 
                text: pesan,
                mentions: (await conn.groupMetadata(i)).participants.map(v => v.id) // Opsional: Tag semua orang
            }).catch(_ => _);
        }
    }

    m.reply(`✅ Selesai! Broadcast terkirim ke ${anu.length} grup.`);
};

handler.help = ['bcgc <teks>'];
handler.tags = ['owner'];
handler.command = /^(bcgc|broadcastgc)$/i;
handler.owner = true;

export default handler;