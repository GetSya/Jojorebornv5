import fs from 'fs'

let handler = async (m, { conn, args }) => {
    const uangPath = './json/uang.json'
    let dataUang = JSON.parse(fs.readFileSync(uangPath, 'utf-8'))
    let jid = m.sender.split('@')[0] + '@s.whatsapp.net'
    let userMoney = dataUang[jid] || 0

    let taruhan = args[0] ? parseInt(args[0]) : 100
    if (isNaN(taruhan) || taruhan < 100) throw '❌ Minimal taruhan adalah Rp100'
    if (userMoney < taruhan) throw '❌ Uang kamu tidak cukup untuk taruhan ini!'

    const emojis = ["🍎", "🍐", "🍋", "🍌", "🍒"]
    let a = emojis[Math.floor(Math.random() * emojis.length)]
    let b = emojis[Math.floor(Math.random() * emojis.length)]
    let c = emojis[Math.floor(Math.random() * emojis.length)]

    let menang = false
    let hadiah = 0

    if (a === b && b === c) {
        menang = true
        hadiah = taruhan * 10 // Jackpot 3 sama
    } else if (a === b || b === c || a === c) {
        menang = true
        hadiah = Math.ceil(taruhan * 1.5) // 2 sama
    }

    if (menang) {
        dataUang[jid] += hadiah
        m.reply(`[ 🎰 | SLOT ]\n────────\n${a} : ${b} : ${c}\n────────\n🎉 MENANG! Kamu dapat *Rp${hadiah.toLocaleString('id-ID')}*`)
    } else {
        dataUang[jid] -= taruhan
        m.reply(`[ 🎰 | SLOT ]\n────────\n${a} : ${b} : ${c}\n────────\n💀 KALAH! Saldo terpotong *Rp${taruhan.toLocaleString('id-ID')}*`)
    }

    fs.writeFileSync(uangPath, JSON.stringify(dataUang, null, 2))
}

handler.help = ['slot [jumlah]']
handler.tags = ['game']
handler.command = /^(slot)$/i

export default handler