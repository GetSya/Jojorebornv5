let handler = async (m, { conn, args, usedPrefix, command }) => {
    let user = global.db.data.users[m.sender]
    
    // Inisialisasi properti jika belum ada
    if (user.hutang === undefined) user.hutang = 0
    if (user.hutangTime === undefined) user.hutangTime = 0

    // Cek status jatuh tempo setiap kali user memanggil command ini
    let waktuSekarang = Date.now()
    let batasWaktu = 3 * 24 * 60 * 60 * 1000 // 3 Hari dalam Milidetik
    let dendaPerHari = 2000 // Denda jika lewat jatuh tempo

    if (user.hutang > 0 && (waktuSekarang - user.hutangTime) > batasWaktu) {
        // Logika jika sudah lewat 3 hari
        let selisihWaktu = waktuSekarang - (user.hutangTime + batasWaktu)
        let jumlahHariTelat = Math.floor(selisihWaktu / (24 * 60 * 60 * 1000)) + 1
        let totalDenda = jumlahHariTelat * dendaPerHari
        
        // Tambahkan denda ke hutang (Opsional: kamu bisa langsung potong saldo)
        user.hutang += totalDenda
        user.hutangTime = waktuSekarang // Reset timer agar denda tidak menumpuk berlebihan di satu waktu
        
        m.reply(`⚠️ *PERINGATAN JATUH TEMPO!*\n\nKamu telat membayar hutang selama *${jumlahHariTelat} hari*. Hutangmu bertambah denda *Rp${totalDenda.toLocaleString()}*.\n\nSegera lunasi dengan command *${usedPrefix}bayar*`)
    }

    if (command === 'pinjam' || command === 'hutang') {
        if (!args[0] || isNaN(args[0])) throw `*Format Salah!*\nContoh: *${usedPrefix + command} 5000*`
        
        let jumlah = parseInt(args[0])
        if (jumlah < 1000) throw '❌ Minimal pinjam adalah Rp1.000'
        if (jumlah > 50000) throw '❌ Maksimal pinjam adalah Rp50.000'
        if (user.hutang > 0) throw `❌ Kamu masih punya hutang! Lunasi dulu sebelum pinjam lagi.`

        user.money = (user.money || 0) + jumlah
        user.hutang = jumlah
        user.hutangTime = Date.now() // Catat waktu peminjaman
        
        let tenggat = new Date(user.hutangTime + batasWaktu).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
        
        return m.reply(`✅ *PINJAMAN DISETUJUI*\n\n💰 Saldo: *+Rp${jumlah.toLocaleString()}*\n📅 Jatuh Tempo: *${tenggat}* (3 Hari)\n\n_Jika lewat batas waktu, denda Rp2.000 per hari._`)
    }

    if (command === 'bayar' || command === 'sahur') {
        if (user.hutang <= 0) throw '🛠️ Kamu tidak memiliki hutang.'
        
        let bayar = args[0] ? parseInt(args[0]) : user.hutang
        if (isNaN(bayar)) throw '❌ Masukkan jumlah uang.'
        
        if (bayar > (user.money || 0)) throw `❌ Uang tidak cukup.`
        if (bayar > user.hutang) bayar = user.hutang 

        user.money -= bayar
        user.hutang -= bayar

        if (user.hutang <= 0) {
            user.hutangTime = 0 // Reset waktu jika sudah lunas
            return m.reply(`✅ *LUNAS!* Terima kasih sudah membayar tepat waktu.`)
        }

        return m.reply(`✅ *PEMBAYARAN BERHASIL*\n\n💵 Bayar: *Rp${bayar.toLocaleString()}*\n📉 Sisa Hutang: *Rp${user.hutang.toLocaleString()}*`)
    }
}

handler.help = ['pinjam', 'bayar']
handler.tags = ['ekonomi']
handler.command = /^(pinjam|hutang|bayar|sahur)$/i
handler.register = true

export default handler