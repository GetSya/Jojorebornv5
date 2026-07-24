import fs from 'fs'
import path from 'path'

let handler = async (m, { conn, args }) => {
    const uangPath = path.join(process.cwd(), 'json', 'uang.json')
    
    // Tentukan jumlah gaji (Default Rp15.000 jika owner tidak memasukkan angka)
    let jumlahGaji = args[0] && !isNaN(args[0]) ? parseInt(args[0]) : 15000

    if (!fs.existsSync(uangPath)) throw '❌ Database uang tidak ditemukan!'

    try {
        let dataUang = JSON.parse(fs.readFileSync(uangPath, 'utf-8'))
        let userList = Object.keys(dataUang)
        let totalUser = userList.length

        if (totalUser === 0) throw '❌ Tidak ada user terdaftar di database uang.'

        // Proses pembagian gaji ke semua user
        for (let jid of userList) {
            dataUang[jid] = (dataUang[jid] || 0) + jumlahGaji
        }

        // Simpan kembali ke file
        fs.writeFileSync(uangPath, JSON.stringify(dataUang, null, 2))

        m.reply(`✅ *SUBSIDI PEMERINTAH BERHASIL*\n\n💰 *Jumlah* : Rp${jumlahGaji.toLocaleString('id-ID')}\n👥 *Penerima* : ${totalUser} User\n\nDana telah disalurkan ke seluruh rakyat!`)

    } catch (e) {
        console.error(e)
        throw '❌ Terjadi kesalahan saat membagikan gaji.'
    }
}

handler.help = ['bagigaji [jumlah]']
handler.tags = ['owner']
handler.command = /^(bagigaji|gajian)$/i
handler.owner = true // Hanya kamu (Arasya) sebagai owner yang bisa eksekusi

export default handler