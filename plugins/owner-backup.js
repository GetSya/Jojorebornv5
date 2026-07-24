import fs from 'fs'
import path from 'path'
import AdmZip from 'adm-zip'

let handler = async (m, { conn }) => {
    m.reply('⏳ *Sedang memproses backup...*\nMohon tunggu sebentar, proses ini tergantung ukuran folder bot kamu.')

    const zip = new AdmZip()
    const folderName = path.basename(process.cwd()) // Mengambil nama folder bot
    const zipName = `Backup_${folderName}_${new Date().getTime()}.zip`
    const rootPath = process.cwd()

    // Daftar file/folder yang akan DIABAIKAN agar zip tidak terlalu berat
    const ignoreList = [
        'node_modules',
        'package-lock.json',
        '.git',
        '.npm',
        zipName // Jangan backup dirinya sendiri
    ]

    try {
        const files = fs.readdirSync(rootPath)

        for (const file of files) {
            if (ignoreList.includes(file)) continue

            const filePath = path.join(rootPath, file)
            const stats = fs.statSync(filePath)

            if (stats.isDirectory()) {
                zip.addLocalFolder(filePath, file)
            } else {
                zip.addLocalFile(filePath)
            }
        }

        // Generate Zip ke Buffer
        const buffer = zip.toBuffer()
        
        // Kirim File Zip
        await conn.sendMessage(m.chat, {
            document: buffer,
            mimetype: 'application/zip',
            fileName: zipName,
            caption: `✅ *Backup Berhasil!*\n\n📅 Waktu: ${new Date().toLocaleString('id-ID')}\n📦 Folder: ${folderName}\n📂 File: Tanpa node_modules`
        }, { quoted: m })

    } catch (e) {
        console.error(e)
        m.reply(`❌ *Gagal melakukan backup:*\n${e.message}`)
    }
}

handler.help = ['backup']
handler.tags = ['owner']
handler.command = /^(backup)$/i
handler.owner = true // Hanya Arasya yang bisa pakai

export default handler