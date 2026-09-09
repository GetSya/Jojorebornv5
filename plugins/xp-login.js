import { createHash } from 'crypto'

// Fitur LOGIN — cukup ketik /login saja.
// Mengambil data yang sudah tersimpan saat /daftar (users[m.sender]).
// Menandai user sebagai loggedIn + menampilkan kartu profil.

let handler = async function (m, { conn, usedPrefix }) {
  let user = global.db.data.users[m.sender]

  // Belum pernah /daftar → arahkan daftar dulu
  if (!user?.registered) {
    return m.reply(
      `🔐 Kamu belum terdaftar.\n\n` +
      `Daftar dulu dengan cara:\n` +
      `*${usedPrefix}daftar Nama.Umur*\n` +
      `Contoh: *${usedPrefix}daftar Arasya.17*`
    )
  }

  let pp
  try {
    pp = await conn.profilePictureUrl(m.sender, 'image')
  } catch {
    pp = 'https://i.ibb.co/2WzLyGk/profile.jpg'
  }

  let sn = createHash('md5').update(m.sender).digest('hex')
  let regDate = user.regTime
    ? new Date(user.regTime).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
    : '-'

  // Tandai sesi login
  user.loggedIn = true
  user.loginTime = Date.now()

  let textResult = `
✅ *LOGIN BERHASIL*

👤 Nama : *${user.name}*
🎂 Umur : *${user.age} Tahun*
🏷️ Role : *${user.role || '-'}*
⭐ Level : *${user.level || 0}*
🎫 Limit : *${user.premiumTime > 0 ? 'Unlimited' : (user.limit ?? 0)}*
💰 Balance : *Rp${(user.money || 0).toLocaleString('id-ID')}*
🔐 Serial : ${sn}

📌 Terdaftar sejak:
${regDate}

✨ Selamat datang kembali!
`.trim()

  let imagePayload = Buffer.isBuffer(pp)
    ? { image: pp }
    : { image: { url: pp } }

  await conn.sendMessage(m.chat, {
    ...imagePayload,
    caption: textResult
  }, { quoted: m })
}

handler.help = ['login']
handler.tags = ['xp']
handler.command = /^(login|log-in|masuk)$/i

export default handler
