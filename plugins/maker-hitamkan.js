import fs from "fs"
import axios from "axios"
import FormData from "form-data"
import fetch from "node-fetch"

// Fungsi upload menggunakan Uguu.se dengan memanfaatkan buffer langsung
async function uploadUguu(buffer, filename) {
  try {
    const form = new FormData()
    // Mengubah buffer menjadi readable stream semu agar bisa diterima oleh API Uguu
    form.append("files[]", buffer, { filename: filename })

    const { data } = await axios({
      url: "https://uguu.se/upload.php",
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36",
        ...form.getHeaders()
      },
      data: form
    })

    // Uguu mengembalikan data berupa objek yang berisi array 'files'
    return data?.files?.[0]?.url || null
  } catch (error) {
    console.error("Upload Uguu Error:", error)
    return null
  }
}

let handler = async (m, { conn, command, usedPrefix }) => {
  try {
    await m.react("✨")

    let q = m.quoted ? m.quoted : m
    let mime = q.mimetype || q.msg?.mimetype || ""

    if (!mime.startsWith("image/")) {
      let list = handler.help.map(v => `.${v}`).join("\n")
      return m.reply(
`✨ *AI IMAGE CONVERTER*

Reply gambar dengan caption salah satu command berikut:

${list}`
      )
    }

    let buffer = await q.download()
    if (!buffer) return m.reply("❌ Gagal mengambil gambar")

    let ext = mime.split("/")[1] || "jpg"
    let filename = `faa_${Date.now()}.${ext}`

    // Menggunakan fungsi upload yang baru
    let imageUrl = await uploadUguu(buffer, filename)
    if (!imageUrl) return m.reply("❌ Upload ke Uguu.se gagal")

    let apiUrl = `https://api-faa.my.id/faa/${command}?url=${encodeURIComponent(imageUrl)}`
    let res = await fetch(apiUrl)
    if (!res.ok) return m.reply("❌ API error")

    let result = Buffer.from(await res.arrayBuffer())
    await conn.sendFile(m.chat, result, `${command}.jpg`, "", m)
  } catch (e) {
    console.error(e)
    m.reply("❌ Terjadi kesalahan!")
  }
}

handler.help = [
  'tobotak','tochibi','tofunk',
  'tofigura','tofigurav2','tofigurav3','toghibli','tohijab',
  'tojapanese','tojepang','tokacamata','tokamboja','tolego',
  'toliquor','tomaid','tomirror','tomoai','tomonyet',
  'topacar','topeci','topiramida','toputih','toreal',
  'toroblox','toroh','totato','totua','toviking',
  'tozombie','tounderground','hitamkan'
]

handler.tags = ['maker']
handler.command = /^(tobotak|tochibi|tofunk|tofigura|tofigurav2|tofigurav3|toghibli|tohijab|tojapanese|tojepang|tokacamata|tokamboja|tolego|toliquor|tomaid|tomirror|tomoai|tomonyet|topacar|topeci|topiramida|toputih|toreal|toroblox|toroh|totato|totua|toviking|tozombie|tounderground|hitamkan)$/i
handler.limit = true

export default handler