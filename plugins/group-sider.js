// Code By Xnuvers007 Logic - Sider Version
let handler = async (m, { conn, text, groupMetadata }) => {
    await conn.sendMessage(m.chat, { react: { text: '🔍', key: m.key } })
    
    let participants = groupMetadata.participants
    let now = new Date() * 1
    // Batas waktu: 24 jam (Ganti 24 jadi 1 jika ingin tes per 1 jam)
    let satuHari = 24 * 60 * 60 * 1000 
    
    let sider = []
    let unknown = 0 // Untuk menghitung member yang belum tercatat di DB sama sekali

    for (let mem of participants) {
        // Abaikan Bot & Nomor Official WhatsApp
        if (mem.id === conn.user.jid || mem.id.startsWith('0@')) continue
        
        let user = global.db.data.users[mem.id]
        
        // Cek apakah user ada di DB dan punya data chat
        if (!user || !user.lastChat) {
            sider.push(mem.id)
            unknown++
        } else if ((now - user.lastChat) > satuHari) {
            sider.push(mem.id)
        }
    }

    if (sider.length === 0) return m.reply('✅ *Grup ini aktif!* Tidak ada sider terdeteksi.')

    let teks = `◇───── *SIDER DETECTOR* ─────◇\n`
    teks += `乂 *Pesan:* ${text ? text : 'kosong'}\n`
    teks += `乂 *Total Member:* ${participants.length}\n`
    teks += `乂 *Terdeteksi Sider:* ${sider.length}\n\n`
    
    for (let id of sider) {
        teks += `• @${id.split('@')[0]}\n`
    }
    
    teks += `\n*Catatan:* ${unknown > 0 ? `Terdapat ${unknown} member yang belum pernah chat sejak fitur ini dipasang.` : 'Mereka tidak chat dalam 24 jam terakhir.'}`

    conn.sendMessage(m.chat, {
        text: teks,
        mentions: sider
    }, { quoted: m })
}

handler.help = ['sider']
handler.tags = ['group']
handler.command = /^(sider|ghost)$/i
handler.admin = true
handler.group = true

export default handler