import fs from 'fs'

if (!global.anonymous) global.anonymous = {}

let handler = async (m, { conn, command, usedPrefix }) => {
    const anonPath = './json/anonymous.json'
    if (!fs.existsSync(anonPath)) fs.writeFileSync(anonPath, '{}')
    
    // Load data session anonymous
    let anonData = JSON.parse(fs.readFileSync(anonPath, 'utf-8') || '{}')
    let jid = m.sender.split('@')[0].split(':')[0] + '@s.whatsapp.net'

    // --- FITUR: START / SEARCH ---
    if (command === 'start' || command === 'search') {
        if (Object.values(anonData).find(room => room.a === jid || room.b === jid)) {
            throw `⚠️ Kamu masih berada di dalam obrolan! Ketik *${usedPrefix}stop* dulu.`
        }
        
        // Cek apakah ada orang di antrean
        let waitingUser = Object.keys(anonData).find(key => anonData[key].status === 'waiting' && key !== jid)

        if (waitingUser) {
            // Pasangkan!
            anonData[waitingUser] = { a: waitingUser, b: jid, status: 'chatting' }
            anonData[jid] = { a: waitingUser, b: jid, status: 'chatting' }
            
            fs.writeFileSync(anonPath, JSON.stringify(anonData, null, 2))
            
            await conn.reply(waitingUser, '✅ *Partner ditemukan!* Silakan mulai mengobrol.', null)
            return m.reply('✅ *Partner ditemukan!* Silakan mulai mengobrol.\n\n_Ketik *.stop* untuk mengakhiri atau *.next* untuk cari baru._')
        } else {
            // Masuk antrean
            anonData[jid] = { status: 'waiting' }
            fs.writeFileSync(anonPath, JSON.stringify(anonData, null, 2))
            return m.reply('🔍 *Mencari partner...* Mohon tunggu sampai ada seseorang yang bergabung.')
        }
    }

    // ... (kode start tetap sama)

    // --- FITUR: STOP ---
    if (command === 'stop') {
        let room = anonData[jid]
        if (!room) throw '⚠️ Kamu tidak sedang dalam obrolan anonymous.'

        if (room.status === 'chatting') {
            let partner = room.a === jid ? room.b : room.a
            delete anonData[partner]
            if (global.anonymous[partner]) delete global.anonymous[partner] // Cek dulu baru hapus
            await conn.reply(partner, '❌ *Partner telah mengakhiri obrolan.*', null)
        }
        
        if (global.anonymous[jid]) delete global.anonymous[jid]
        delete anonData[jid]
        fs.writeFileSync(anonPath, JSON.stringify(anonData, null, 2))
        return m.reply('✅ *Obrolan dihentikan.*')
    }

    // --- FITUR: NEXT ---
    if (command === 'next') {
        let room = anonData[jid]
        if (!room) throw `⚠️ Kamu belum mulai! Ketik *${usedPrefix}start*`

        // Hentikan chat lama jika ada
        if (room.status === 'chatting') {
            let partner = room.a === jid ? room.b : room.a
            delete anonData[partner]
                        // Di dalam plugin anonymous.js (saat STOP/NEXT)
            delete global.anonymous[jid]
            delete global.anonymous[partner]
            await conn.reply(partner, '❌ *Partner telah mencari obrolan baru.*', null)
        }

        delete anonData[jid]
        fs.writeFileSync(anonPath, JSON.stringify(anonData, null, 2))
        
        // Rekursif panggil start lagi
        return handler(m, { conn, command: 'start', usedPrefix })
    }
}

handler.help = ['start', 'next', 'stop']
handler.tags = ['anonymous']
handler.command = /^(start|search|next|stop)$/i
handler.private = true // Hanya bisa di Private Chat

export default handler