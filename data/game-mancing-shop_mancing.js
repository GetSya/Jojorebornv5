let handler = async (m, { conn, args, usedPrefix, command }) => {
    let u = global.db.data.users[m.sender]
    
    // Inisialisasi properti mancing jika belum ada
    if (u.rod === undefined) u.rod = 100
    if (u.bait === undefined) u.bait = 'None'
    if (u.bait_count === undefined) u.bait_count = 0
    if (u.location === undefined) u.location = 'Empang'

    if (command === 'buybait' || command === 'beliumpan') {
        const listBait = {
            'lumut': 150,
            'cacing': 500,
            'pelet': 1500,
            'udang': 7500,
            'daging': 20000
        }

        let type = args[0]?.toLowerCase()
        let count = Math.max(1, parseInt(args[1]) || 1)

        if (!type || !listBait[type]) {
            let txt = `🛒 *TOKO UMPAN SENPAI*\n\n`
            for (let b in listBait) txt += `🪱 *${b.toUpperCase()}* - Rp${listBait[b].toLocaleString()}/pcs\n`
            return m.reply(txt + `\n*Format:* ${usedPrefix}${command} [jenis] [jumlah]`)
        }

        let totalHarga = listBait[type] * count
        if (u.money < totalHarga) throw `❌ Duit kurang Rp${(totalHarga - u.money).toLocaleString()}`

        u.money -= totalHarga
        let namaBait = type.charAt(0).toUpperCase() + type.slice(1)
        
        if (u.bait === namaBait) u.bait_count += count
        else { u.bait = namaBait; u.bait_count = count }
        
        return m.reply(`✅ Berhasil beli *${count} ${u.bait}* seharga Rp${totalHarga.toLocaleString()}!`)
    }

    if (command === 'repair') {
        if (u.rod >= 100) throw '🛠️ Pancinganmu masih bagus!'
        let cost = (100 - u.rod) * 200
        if (u.money < cost) throw `❌ Butuh Rp${cost.toLocaleString()} untuk repair.`

        u.money -= cost
        u.rod = 100
        return m.reply(`🛠️ *REPAIR SUKSES*\nBiaya: *Rp${cost.toLocaleString()}*`)
    }
}
handler.help = ['beliumpan', 'repair']
handler.tags = ['game']
handler.command = /^(buybait|beliumpan|repair)$/i
handler.register = true
export default handler