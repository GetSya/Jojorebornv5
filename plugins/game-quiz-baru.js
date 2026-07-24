import fs from 'fs'
import path from 'path'

const quizPath = path.join(process.cwd(), 'json', 'quiz.json')
const uangPath = path.join(process.cwd(), 'json', 'uang.json')

let handler = async (m, { conn, usedPrefix, command }) => {
    conn.kuis = conn.kuis ? conn.kuis : {}
    let id = m.chat

    // Jika sudah ada kuis yang berlangsung di grup tersebut
    if (id in conn.kuis) {
        return conn.reply(m.chat, `Masih ada kuis yang belum terjawab di chat ini!`, conn.kuis[id][0])
    }

    // Membaca file quiz.json
    if (!fs.existsSync(quizPath)) throw '❌ File json/quiz.json tidak ditemukan!'
    let src = JSON.parse(fs.readFileSync(quizPath, 'utf-8'))
    
    // Ambil pertanyaan secara acak
    let json = src[Math.floor(Math.random() * src.length)]
    
    let caption = `*🎮 GAME KUIS TEBAK KATA 🎮*\n\n`
    caption += `📝 *Pertanyaan:* ${json.pertanyaan}\n\n`
    caption += `🎁 *Hadiah:* Rp200\n`
    caption += `⏱️ *Waktu:* 60 detik\n\n`
    caption += `Balas pesan ini untuk menjawab!`

    conn.kuis[id] = [
        await conn.reply(m.chat, caption, m),
        json,
        setTimeout(() => {
            if (conn.kuis[id]) {
                conn.reply(m.chat, `⏱️ Waktu habis!\nJawabannya adalah: *${json.jawaban_benar[0]}*`, conn.kuis[id][0])
                delete conn.kuis[id]
            }
        }, 60000) // Waktu menjawab 60 detik
    ]
}

handler.before = async function (m, { conn }) {
    let id = m.chat
    if (!conn.kuis || !conn.kuis[id]) return 
    let [msg, json, timeout] = conn.kuis[id]

    // Cek apakah pesan yang dikirim adalah balasan untuk kuis
    if (m.quoted && m.quoted.id === msg.id) {
        let jawabanUser = m.text.toLowerCase().trim()
        let benar = json.jawaban_benar.map(v => v.toLowerCase()).includes(jawabanUser)

        if (benar) {
            // Berikan Hadiah Uang Rp200
            let reward = 30000
            let jid = m.sender.split('@')[0].split(':')[0] + '@s.whatsapp.net'
            
            if (fs.existsSync(uangPath)) {
                let dataUang = JSON.parse(fs.readFileSync(uangPath, 'utf-8'))
                dataUang[jid] = (dataUang[jid] || 0) + reward
                fs.writeFileSync(uangPath, JSON.stringify(dataUang, null, 2))
            }

            conn.reply(m.chat, `✅ *BENAR!*\n\nSelamat @${m.sender.split('@')[0]}, kamu mendapatkan *Rp${reward}*!`, m, {
                mentions: [m.sender]
            })
            
            clearTimeout(timeout)
            delete conn.kuis[id]
        } else {
            // Jika salah, bot tidak perlu merespon agar tidak spam, atau bisa beri reaksi
            m.react('❌')
        }
    }
}

handler.help = ['sambungkata']
handler.tags = ['game']
handler.command = /^(sambungkata|tebak|pertanyaan)$/i

export default handler