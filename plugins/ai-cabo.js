let handler = async(m, {conn, usedPrefix, text, command}) => {
    try {
        if (!text) return m.reply(`Gak ada teksnya jir`)
        let data = await fetch(`https://api-faa.my.id/faa/ai-realtime?text=${encodeURIComponent(text)}`);
        let jadijson = await data.json()
        if (!jadijson?.status) {
            m.reply(`Website nya error`)
        }

        mak_minta_duit = jadijson.result || `Gak dijawab dari AI`;
        gak_ada = `Alasan: ` + mak_minta_duit; + `\n\nTerima kasih`

        await conn.sendMessage(m.chat, {text: gak_ada}, {quoted: m.quoted ? m.quoted : m})
    } catch (e) {
        await conn.sendMessage(m.chat, {text: e}, {quoted: m.quoted ? m.quoted : m})
    } 

    
}
handler.help = ['aichat'];
handler.tags = ['ai'];
handler.command = /^(cek|belajar)$/i
export default handler;