import { Canvas, loadImage } from 'skia-canvas'
import PhoneNumber from 'awesome-phonenumber'
import moment from 'moment-timezone'
import fs from 'fs'

let handler = async (m, { conn }) => {
    let who = m.mentionedJid?.[0] || m.quoted?.sender || m.sender
    if (!(who in global.db.data.users))
        return m.reply('User tidak ada di database.')

    let user = global.db.data.users[who]
    
    // --- Data Processing ---
    let rawName = user.registered ? user.name : await conn.getName(who)
    let name = (rawName || 'USER').toUpperCase()
    
    // Memperbaiki pemanggilan PhoneNumber
    let number = new PhoneNumber('+' + who.split('@')[0]).getNumber('international')
    
    let isPrems = user.premiumTime > 0
    let statusHutang = 'Lunas ✅'
    
    // Logika Hutang & Waktu
    let now = Date.now()
    if (user.hutang > 0) {
        let deadline = (user.hutangTime || 0) + (3 * 24 * 60 * 60 * 1000)
        let sisa = deadline - now
        statusHutang = sisa > 0 ? `${Math.floor(sisa / 86400000)}h ${Math.floor((sisa % 86400000) / 3600000)}j lagi` : 'TELAT ⚠️'
    }

    let saldoStr = `Rp ${(user.money || 0).toLocaleString('id-ID')}`
    let ppUrl = await conn.profilePictureUrl(who, 'image').catch(_ => 'https://static.vecteezy.com/system/resources/previews/005/005/788/non_2x/user-icon-in-trendy-flat-style-isolated-on-grey-background-user-symbol-for-your-web-site-design-logo-app-ui-illustration-eps10-free-vector.jpg')

    // --- Data Level & Exp ---
    let level = user.level || 0
    let exp = user.exp || 0
    let expNeeded = user.expNeeded || Math.floor(100 * Math.pow(1.5, level))
    let expPercent = Math.min((exp / expNeeded) * 100, 100)
    let progressWidth = 250
    let progressFill = (expPercent / 100) * progressWidth

    // --- Render Canvas ---
    try {
        const canvas = new Canvas(800, 450)
        const ctx = canvas.getContext('2d')

        // Load images dengan fallback
        const [background, avatar] = await Promise.all([
            loadImage('./media/bg.png').catch(() => null),
            loadImage(ppUrl).catch(() => loadImage('https://static.vecteezy.com/system/resources/previews/005/005/788/non_2x/user-icon-in-trendy-flat-style-isolated-on-grey-background-user-symbol-for-your-web-site-design-logo-app-ui-illustration-eps10-free-vector.jpg'))
        ])

        // 1. Background + Gradient Overlay
        if (background) {
            ctx.drawImage(background, 0, 0, canvas.width, canvas.height)
        } else {
            ctx.fillStyle = '#1a1a2e'
            ctx.fillRect(0, 0, canvas.width, canvas.height)
        }

        const gradient = ctx.createLinearGradient(40, 40, 760, 410)
        gradient.addColorStop(0, 'rgba(20, 20, 30, 0.9)')
        gradient.addColorStop(1, 'rgba(40, 40, 60, 0.95)')
        ctx.fillStyle = gradient
        
        // Menggunakan ctx.roundRect native skia-canvas
        ctx.beginPath()
        ctx.roundRect(40, 40, 720, 370, 30)
        ctx.fill()

        // 2. Avatar dengan clipping lingkaran
        ctx.save()
        ctx.beginPath()
        ctx.arc(180, 225, 115, 0, Math.PI * 2)
        ctx.clip()
        ctx.drawImage(avatar, 65, 110, 230, 230)
        ctx.restore()

        // 3. Border gradient pada avatar
        ctx.save()
        ctx.shadowColor = isPrems ? '#FFD700' : '#ffffff'
        ctx.shadowBlur = 20
        const gradientStroke = ctx.createLinearGradient(65, 110, 295, 340)
        gradientStroke.addColorStop(0, isPrems ? '#FFD700' : '#ffffff')
        gradientStroke.addColorStop(1, isPrems ? '#FFA500' : '#cccccc')
        ctx.strokeStyle = gradientStroke
        ctx.lineWidth = 8
        ctx.beginPath()
        ctx.arc(180, 225, 115, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()

        // 4. Typography
        ctx.font = 'bold 22px Sans'
        ctx.fillStyle = isPrems ? '#FFD700' : '#aaa'
        ctx.fillText(isPrems ? '★ PREMIUM' : '⚫ FREE', 330, 110)

        ctx.font = 'bold 48px Sans'
        ctx.fillStyle = '#ffffff'
        let displayName = name.length > 16 ? name.slice(0, 14) + '...' : name
        ctx.fillText(displayName, 330, 170)

        // Garis dekoratif
        ctx.strokeStyle = isPrems ? 'rgba(255,215,0,0.5)' : 'rgba(255,255,255,0.3)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(330, 190)
        ctx.lineTo(720, 190)
        ctx.stroke()

        // Info kontak & role
        ctx.font = '20px Sans'
        ctx.fillStyle = '#ddd'
        ctx.fillText('📞 ' + number, 330, 225)
        ctx.fillText('🎖️ ' + (user.role || 'Beginner'), 330, 260)

        // Saldo
        ctx.font = 'bold 18px Sans'
        ctx.fillStyle = isPrems ? '#FFD700' : '#ffffff'
        ctx.fillText('💰 BALANCE', 330, 305)
        ctx.font = 'bold 44px Sans'
        ctx.fillStyle = '#ffffff'
        ctx.fillText(saldoStr, 330, 355)

        // Progress bar level
        let levelX = 500
        let levelY = 390
        ctx.font = 'bold 18px Sans'
        ctx.fillStyle = '#aaa'
        ctx.fillText(`LEVEL ${level}`, levelX, levelY - 20)
        
        // Background progress
        ctx.fillStyle = 'rgba(255,255,255,0.2)'
        ctx.beginPath()
        ctx.roundRect(levelX, levelY + 5, progressWidth, 15, 7)
        ctx.fill()
        
        // Fill progress
        ctx.fillStyle = isPrems ? '#FFD700' : '#4caf50'
        ctx.beginPath()
        ctx.roundRect(levelX, levelY + 5, progressFill, 15, 7)
        ctx.fill()

        // Info hutang
        ctx.font = '16px Sans'
        ctx.fillStyle = '#aaa'
        ctx.fillText(`Hutang: Rp${(user.hutang || 0).toLocaleString('id-ID')}`, 70, 380)
        ctx.fillStyle = user.hutang > 0 ? (statusHutang.includes('TELAT') ? '#ff5555' : '#ffaa00') : '#aaa'
        ctx.fillText(`⏳ ${statusHutang}`, 70, 405)

        // Ambil buffer gambar
        const buffer = await canvas.toBuffer('png')

        let text = `
🕰️ *USER PROFILE*

👤 *Identitas*
• Nama : *${name}*
• Umur : *${user.registered ? user.age : '-'}*

📊 *Statistik RPG*
• Role : *${user.role || 'Beginner'}*
• Level : *${level} (${exp}/${expNeeded} exp)*
• Premium : *${isPrems ? 'Aktif' : 'Tidak'}*

💰 *Ekonomi*
• Saldo : *${saldoStr}*
• Hutang : *Rp${(user.hutang || 0).toLocaleString('id-ID')}*
• Tempo : *${statusHutang}* ⏳

📅 ${moment().tz('Asia/Jakarta').format('dddd, DD MMMM YYYY')}
⏰ ${moment().tz('Asia/Jakarta').format('HH:mm:ss')}
`.trim()

        await conn.sendMessage(m.chat, { image: buffer, caption: text, mentions: [who] }, { quoted: m })

    } catch (e) {
        console.error(e)
        m.reply('❌ Gagal merender profile. Pastikan sistem mendukung skia-canvas.')
    }
}

handler.help = ['profile', 'me']
handler.tags = ['info']
handler.command = /^(profile|profil|me|my)$/i

export default handler