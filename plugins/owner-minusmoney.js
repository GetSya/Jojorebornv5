/* FILE: owner-minusmoney.js
  Fitur khusus Owner untuk mengurangi uang user
*/

let handler = async (m, { conn, text, usedPrefix, command }) => {
    // 1. Cek input
    if (!text) throw `*Format salah!*\nContoh: ${usedPrefix + command} @user 100000`
    
    let target = m.mentionedJid[0] ? m.mentionedJid[0] : (m.quoted ? m.quoted.sender : false)
    if (!target) throw `Tag atau balas pesan user yang ingin dikurangi uangnya!`

    // Ambil nominal uang dari teks (menghilangkan mention/tag)
    let amount = text.replace(/[@|\s]/g, '').replace(target.split('@')[0], '')
    if (isNaN(amount)) throw `Masukkan angka nominal uang yang valid!`
    
    let denda = parseInt(amount)
    let u = global.db.data.users[target]

    // 2. Cek apakah user ada di database
    if (!u) throw `User tidak ditemukan di database!`
    if (typeof u.money === 'undefined') u.money = 0

    // 3. Eksekusi Pengurangan
    // Jika uang user lebih kecil dari denda, uangnya jadi 0 (tidak minus ke bawah nol)
    let uangLama = u.money
    u.money -= denda
    if (u.money < 0) u.money = 0 

    // 4. Balasan
    let name = conn.getName(target)
    let caption = `💸 *PENGURANGAN SALDO (OWNER)*\n\n`
    caption += `👤 *Target:* ${name}\n`
    caption += `📉 *Jumlah:* -Rp${denda.toLocaleString()}\n`
    caption += `💰 *Saldo Akhir:* Rp${u.money.toLocaleString()}\n\n`
    caption += `_Telah diproses oleh Owner._`

    conn.reply(m.chat, caption, m, { mentions: [target] })
}

handler.help = ['minusmoney @user [jumlah]']
handler.tags = ['owner']
handler.command = /^(minusmoney|tarikuang|denda)$/i

handler.owner = true // Mengunci fitur ini hanya untuk Owner

export default handler