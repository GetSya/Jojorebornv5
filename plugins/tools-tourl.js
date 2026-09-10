import axios from "axios"
import FormData from "form-data"

// Catbox (utama, permanen) -> fallback Uguu (sementara ±3 jam)
const uploadCatbox = async (buffer, filename) => {
  const fd = new FormData()
  fd.append("reqtype", "fileupload")
  fd.append("fileToUpload", buffer, { filename })

  const res = await axios.post("https://catbox.moe/user/api.php", fd, {
    headers: fd.getHeaders(),
    maxBodyLength: 200 * 1024 * 1024,
    maxContentLength: 200 * 1024 * 1024,
    timeout: 90000
  })

  const link = typeof res.data === "string" ? res.data.trim() : ""
  if (!/^https?:\/\//.test(link)) throw new Error("Catbox: " + String(link).slice(0, 100))
  return link
}

const uploadUguu = async (buffer, ext = "bin") => {
  const fd = new FormData()
  fd.append("files[]", buffer, { filename: `file.${ext}` })

  const res = await axios.post("https://uguu.se/upload.php", fd, {
    headers: fd.getHeaders(),
    maxBodyLength: 100 * 1024 * 1024,
    maxContentLength: 100 * 1024 * 1024,
    timeout: 90000
  })

  const link = res.data?.files?.[0]?.url
  if (!link) throw new Error("Uguu tidak mengembalikan URL")
  return link
}

const uploadFile = async (buffer, ext) => {
  const filename = `upload.${ext}`
  try {
    return { link: await uploadCatbox(buffer, filename), host: "catbox.moe" }
  } catch (e) {
    console.error("TOURL catbox gagal, coba uguu:", e.message)
    return { link: await uploadUguu(buffer, ext), host: "uguu.se (sementara)" }
  }
}

let handler = async (m, { conn }) => {
  try {
    let q = m.quoted ? m.quoted : m
    let mime = (q.msg || q).mimetype || ""

    if (!mime) return m.reply("Reply / kirim media lalu ketik .tourl atau .tolink")

    let buffer = await q.download()
    if (!buffer) return m.reply("Gagal download media.")

    let ext = (mime.split("/")[1] || "bin").split(";")[0]
    if (ext === "jpeg") ext = "jpg"

    let { link, host } = await uploadFile(buffer, ext)

    await conn.sendMessage(
      m.chat,
      { text: `🔗 *LINK HASIL UPLOAD*\n📦 ${mime || "file"} (${(buffer.length / 1024).toFixed(1)} KB)\n🌐 Host: ${host}\n\n${link}`, ...global.adReply },
      { quoted: m }
    )
  } catch (e) {
    console.error("TOURL ERROR:", e)
    m.reply("❌ Gagal upload ke server.\n" + e.message)
  }
}

handler.help = ["tourl", "tolink"]
handler.tags = ["tools"]
handler.command = /^(tourl|tolink)$/i
handler.limit = true

export default handler