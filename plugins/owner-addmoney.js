import { format } from 'util'

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let who
    
    // 1. Tentukan Target
    if (m.quoted) {
        who = m.quoted.sender
    } else if (m.mentionedJid && m.mentionedJid[0]) {
        who = m.mentionedJid[0]
    } else if (args[0]) {
        let number = args[0].replace(/[@\s+-]/g, '')
        if (number.length >= 9 && !isNaN(number)) {
            who = number + '@s.whatsapp.net'
        }
    }

    if (!who) throw `Silakan tag user, reply pesan, atau masukkan nomor target!\n\nContoh:\n${usedPrefix + command} @user 50000`

    // 2. Tentukan Jumlah Uang
    let lastArg = args[args.length - 1]
    if (!lastArg || isNaN(lastArg)) throw `Masukkan jumlah uang di akhir perintah!`
    
    let jumlah = parseInt(lastArg)
    if (jumlah < 1) throw `Jumlah tidak valid!`

    // 3. Pastikan User Ada di Database
    if (!global.db.data.users[who]) {
        global.db.data.users[who] = {
            exp: 0,
            limit: 10,
            money: 0,
            registered: false,
            name: await conn.getName(who),
            level: 0,
            role: 'Newbie'
        }
    }

    let user = global.db.data.users[who]
    user.money += jumlah

    // 4. Susun Pesan Notifikasi
    let caption = `
🏛️ *NOTIFIKASI BANK PUSAT*
──────────────────
Pesan resmi untuk: @${who.split('@')[0]}

Dana Bantuan Langsung (DBL) telah cair!
Pemerintah telah mengirimkan:
💰 *Rp${jumlah.toLocaleString('id-ID')}*

*Keterangan:* Dana Hibah Owner
*Status:* Berhasil dikirim ke saldo Anda.

_Gunakan uang ini dengan bijak untuk kebutuhan bot Anda._
──────────────────`.trim()

    // 5. KIRIM KE-1: Ke lokasi perintah (Grup/Chat Owner)
    await conn.reply(m.chat, caption, null, { 
        mentions: [who],
        contextInfo: {
            externalAdReply: {
                title: 'TRANSAKSI BERHASIL',
                body: `Berhasil mengirim Rp${jumlah.toLocaleString('id-ID')}`,
                showAdAttribution: true,
                sourceUrl: 'https://chat.whatsapp.com/Famd1qzPzScBX4TSual41k',
                thumbnailUrl: 'https://telegra.ph/file/0c1737f02d4f82875b161.jpg' 
            }
        }
    })

    // 6. KIRIM KE-2: Langsung ke Private Chat (PC) Target
    // Cek agar tidak mengirim double jika kamu memberikan hibah lewat PC target langsung
    if (m.chat !== who) {
        let pcCaption = `👋 *Halo Kak @${who.split('@')[0]}*\n\nKamu baru saja mendapatkan kiriman *Dana Hibah* dari Owner sebesar:\n💵 *Rp${jumlah.toLocaleString('id-ID')}*\n\nSilakan cek saldo kamu dengan mengetik *.balance* di grup.`
        
        try {
            await conn.reply(who, pcCaption, null, { mentions: [who] })
        } catch (e) {
            console.error('Gagal mengirim notifikasi PC:', e)
            m.reply('⚠️ Saldo berhasil ditambah, namun gagal mengirim notifikasi ke Private Chat target (mungkin nomor tidak aktif/bot di-block).')
        }
    }
}

handler.help = ['hibah @user <jumlah>']
handler.tags = ['owner']
handler.command = /^(hibah|addmoney|give)$/i
handler.owner = true 

export default handler