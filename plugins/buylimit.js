let handler = async (m, { args, conn, usedPrefix, command }) => {
    const price = 3500 // Harga per 1 limit
    let user = global.db.data.users[m.sender]
    
    if (!args[0] || isNaN(args[0])) throw `Gunakan format: *${usedPrefix + command} [jumlah]*\nContoh: *${usedPrefix + command} 10*`
    
    let count = Math.max(1, parseInt(args[1] ? args[1] : args[0]))
    let totalCost = price * count

    // Validasi Saldo (Mengambil langsung dari user.money di database global)
    if ((user.money || 0) < totalCost) {
        throw `❌ Uang kamu tidak cukup!\nTotal harga untuk *${count} limit* adalah *Rp${totalCost.toLocaleString('id-ID')}*\nSaldo kamu saat ini: *Rp${(user.money || 0).toLocaleString('id-ID')}*`
    }

    // Eksekusi: Potong uang & Tambah limit
    user.money -= totalCost
    user.limit = (user.limit || 0) + count

    conn.reply(m.chat, `✅ *PEMBELIAN BERHASIL*\n\n📦 Barang: *${count} Limit*\n💰 Total Harga: *Rp${totalCost.toLocaleString('id-ID')}*\n📊 Sisa Saldo: *Rp${user.money.toLocaleString('id-ID')}*\n✨ Sisa Limit: *${user.limit}*`, m)
}

handler.help = ['buylimit <jumlah>']
handler.tags = ['ekonomi']
handler.command = /^(buylimit|belilimit)$/i
handler.register = true // Pastikan user terdaftar agar database aman

export default handler