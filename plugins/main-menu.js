import { Canvas, loadImage } from 'skia-canvas'
import fetch from 'node-fetch'
import moment from 'moment-timezone'
import sharp from 'sharp'
import * as levelling from '../lib/levelling.js'
import fs from 'fs'

moment.locale('id')

const cooldown = new Map()

function formatTag(tag) {
return tag
 .replace(/[-_]/g, ' ')
 .replace(/\b\w/g, c => c.toUpperCase())
}

function ucapan() {
const jam = moment.tz('Asia/Jakarta').hour()
if (jam >= 4 && jam < 11) return 'Selamat Pagi'
if (jam >= 11 && jam < 15) return 'Selamat Siang'
if (jam >= 15 && jam < 18) return 'Selamat Sore'
return 'Selamat Malam'
}

const defaultMenu = {
before: `
╭─❒ 「 ✦ *%me* ✦ 」
│ ⋆˚ ${ucapan()} ˚⋆
│ ✦ *%name*
│
│ ✦ Uptime : %uptime
│ ✦ Limit  : %limit
│ ✦ Role   : %role
│ ✦ Level  : %level
│ ✦ XP     : %exp / %maxexp
│ ✦ Next   : %xp4levelup
│ ✦ Total  : %totalexp
│
│ ─── ⋆⋅☆⋅⋆ ───
│ 🄿 = Premium
│ 🄻 = Limit
╰──────────────
✦ Gabung grup:
https://chat.whatsapp.com/Famd1qzPzScBX4TSual41k
%readmore
`.trim(),

header: '╭─❒ 「 ✦ *%category* ✦ 」',
body: '│ ✧ %cmd',
footer: '╰──────────────\n',

after: `
── ⋆⋅☆⋅⋆ ──
*JOJO REBORN*
Simple • Fast • Powerful
`
}

let handler = async (m, { conn, usedPrefix, command, text }) => {
try {
 let user = global.db.data.users[m.sender]

 let name = `@${m.sender.split('@')[0]}`
 let rawName = user.registered ? user.name : await conn.getName(m.sender)
 let displayName = rawName.toUpperCase()
 let botname = conn.user?.name || "JojoBOT"
 let limit = user.premiumTime > 0 ? 'Unlimited' : `${user.limit ?? 10}`

 let exp = user.exp || 0
 let level = user.level || 0
 let role = user.role || 'Beginner'
 let totalexp = user.totalexp || exp
 let isPrems = user.premiumTime > 0

 let { max } = levelling.xpRange(level, global.multiplier || 1)
 let maxexp = max
 let xp4levelup = `${Math.max(max - exp, 0)} XP`

 let uptime = clockString(process.uptime() * 1000)

 // --- DAFTAR KATEGORI (dipakai list menu & menu teks) ---
 let categories = {}
 for (let plugin of Object.values(global.plugins || {}).filter(p => !p.disabled)) {
  let helps = Array.isArray(plugin.help) ? plugin.help : plugin.help ? [plugin.help] : []
  let tags = Array.isArray(plugin.tags) ? plugin.tags : plugin.tags ? [plugin.tags] : []

  for (let tag of tags) {
   if (!tag) continue
   if (!categories[tag]) categories[tag] = []
   categories[tag].push({
   helps,
   limit: !!plugin.limit,
   premium: !!plugin.premium,
   prefix: !!plugin.customPrefix
   })
  }
 }

 // --- BARE MENU (.menu saja): kirim LIST MESSAGE native ---
 // Row yang di-tap kembali sebagai m.text berisi id-nya (mis. ".menu ai"),
 // sehingga otomatis memicu command menu kategori di bawah.
  if (!text?.trim()) {
   let tagList = Object.keys(categories).sort()
   let rows = [
    { title: '✦ Semua Menu', description: `${usedPrefix}menu all`, id: `${usedPrefix}menu all` },
    ...tagList.map(t => ({ title: `❒ ${formatTag(t)}`, description: `${usedPrefix}menu ${t}`, id: `${usedPrefix}menu ${t}` }))
   ]
   // WhatsApp membatasi maksimal 10 row per section
   let sections = []
   for (let i = 0; i < rows.length; i += 10) {
    sections.push({ title: i === 0 ? '✦ MAIN MENU' : `❒ Menu ${i / 10 + 1}`, rows: rows.slice(i, i + 10) })
   }

   let _botName = global.botName || global.namebot || botname
   let _pushname = m.pushName || rawName
   let _tgl = moment.tz('Asia/Jakarta').format('dddd, DD MMMM YYYY')
   let _jam = moment.tz('Asia/Jakarta').format('HH:mm:ss') + ' WIB'

   let listBody =
    `⋆⋅☆⋅⋆ *${_botName}* ⋆⋅☆⋅⋆\n` +
    `│\n` +
    `│ ✦ Hallo *${_pushname}* ✦\n` +
    `│ ${ucapan()}\n` +
    `│\n` +
    `│ Aku adalah *${_botName}*\n` +
    `│ Silahkan pilih list menu\n` +
    `│ untuk melihat daftar menu.\n` +
    `│\n` +
    `│ ─── ⋆⋅☆⋅⋆ ───\n` +
    `│ ✧ Harap login terlebih dahulu\n` +
    `│ ✧ sebelum memulai bot JOJO\n` +
    `│ ✧ untuk mendapatkan limit & balance!\n` +
    `│\n` +
    `╰──────────────\n` +
    `「 ${_tgl} 」\n` +
    `「 ${_jam} 」`

   await conn.sendButtons(m.chat, listBody, [
    { type: 'list', title: '✦ Pilih Menu', sections }
   ], { footer: 'JOJO REBORN • Simple • Fast • Powerful', quoted: m })
   return
  }

 // --- PROSES GAMBAR CANVAS ---
 const canvas = new Canvas(800, 450)
 const ctx = canvas.getContext('2d')

 // Fungsi RoundRect Lokal untuk menghindari ReferenceError
 const drawRoundRect = (ctx, x, y, w, h, r) => {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
 };

 const ppUrl = await conn.profilePictureUrl(m.sender, 'image').catch(_ => 'https://static.vecteezy.com/system/resources/previews/005/005/788/non_2x/user-icon-in-trendy-flat-style-isolated-on-grey-background-user-symbol-for-your-web-site-design-logo-app-ui-illustration-eps10-free-vector.jpg')
 
 const [background, avatar] = await Promise.all([
  loadImage('./media/bg.png').catch(() => null),
  loadImage(ppUrl)
 ])

 if (background) ctx.drawImage(background, 0, 0, 800, 450)
 else { ctx.fillStyle = '#1e293b'; ctx.fillRect(0, 0, 800, 450) }

 ctx.fillStyle = 'rgba(10, 10, 20, 0.85)'
 drawRoundRect(ctx, 40, 40, 720, 370, 35)
 ctx.fill()

 ctx.save()
 ctx.shadowColor = isPrems ? '#FFD700' : '#00FFFF'
 ctx.shadowBlur = 20
 ctx.beginPath(); ctx.arc(180, 225, 110, 0, Math.PI * 2); ctx.clip()
 ctx.drawImage(avatar, 70, 115, 220, 220)
 ctx.restore()
 ctx.strokeStyle = isPrems ? '#FFD700' : '#ffffff'
 ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(180, 225, 110, 0, Math.PI * 2); ctx.stroke()

 ctx.fillStyle = isPrems ? '#FFD700' : '#00FFFF'
 ctx.font = 'bold 22px Sans'
 ctx.fillText(isPrems ? '✦ PREMIUM MEMBER' : '✧ FREE USER', 330, 110)

 ctx.fillStyle = '#ffffff'
 ctx.font = '900 50px Sans'
 ctx.fillText(displayName.slice(0, 15), 330, 170)

 ctx.font = '24px Sans'; ctx.fillStyle = '#cccccc'
 ctx.fillText(`LEVEL: ${level} | ROLE: ${role}`, 330, 230)
 ctx.fillText(`UPTIME: ${uptime}`, 330, 275)

 const barWidth = 350, barX = 330, barY = 340
 ctx.fillStyle = 'rgba(255,255,255,0.1)'
 drawRoundRect(ctx, barX, barY, barWidth, 12, 6)
 ctx.fill()
 const progress = Math.min((exp / max) * barWidth, barWidth)
 ctx.fillStyle = isPrems ? '#FFD700' : '#00FFFF'
 drawRoundRect(ctx, barX, barY, progress, 12, 6)
 ctx.fill()

 const thumbBuffer = await canvas.toBuffer('png')
 // --- AKHIR PROSES GAMBAR ---

  // categories sudah dibangun di atas (dipakai juga oleh list menu)

 const readMore = String.fromCharCode(8206).repeat(4001)

 let replace = {
 name,
 limit,
 me: botname,
 role,
 level,
 exp,
 maxexp,
 xp4levelup,
 totalexp,
 uptime,
 readmore: readMore,
 p: usedPrefix
 }

 let menuType = text?.toLowerCase().trim()
 let menuText = []
 let { before, header, body, footer, after } = defaultMenu

 if (!menuType) {
 let list = Object.keys(categories).sort().map(t => `│ • \`${usedPrefix + command} ${t}\``).join('\n')

menuText = [
 before.replace(/%(\w+)/g, (_, k) => replace[k] || _),
 "╭━━━・ 「 *MAIN MENU* 」 ・━━━╮",
 "│",
 `│ ✧ \`${usedPrefix + command} all\``,
 "│ ━━━━━━━━━━━━━━━━━━",
 list,
 "│",
 "│ ⋆ ˚ ｡ ⋆ ⋆ ˚ ｡ ⋆",
 `│ ⋆ ➠ \`${usedPrefix + command} <category>\``,
 `│ ⋆ ➠ Ex: \`${usedPrefix + command} sticker\``,
 "╰━━━・ ⋆ ˚ ｡ ⋆ ⋆ ˚ ｡ ⋆ ・━━━╯\n",
 after
]
 } else if (menuType === 'all') {
 menuText.push(before.replace(/%(\w+)/g, (_, k) => replace[k] || _))

 for (let tag of Object.keys(categories).sort()) {
  menuText.push(header.replace('%category', formatTag(tag)))

  for (let item of categories[tag]) {
  for (let cmd of item.helps) {
   let premium = item.premium ? ' (🄿)' : ''
   let lim = item.limit ? ' (🄻)' : ''
   let prefix = item.prefix ? '' : usedPrefix
   menuText.push(body.replace('%cmd', `${prefix}${cmd}${premium}${lim}`))
  }
  }
  menuText.push(footer)
 }

 menuText.push(after)
 } else if (categories[menuType]) {
 menuText.push(before.replace(/%(\w+)/g, (_, k) => replace[k] || _))
 menuText.push(header.replace('%category', formatTag(menuType)))

 for (let item of categories[menuType]) {
  for (let cmd of item.helps) {
  let premium = item.premium ? ' (🄿)' : ''
  let lim = item.limit ? ' (🄻)' : ''
  let prefix = item.prefix ? '' : usedPrefix
  menuText.push(body.replace('%cmd', `${prefix}${cmd}${premium}${lim}`))
  }
 }

 menuText.push(footer)
 menuText.push(after)
 } else {
 menuText = [
  `Menu *${text}* tidak ditemukan.`,
  `Ketik *${usedPrefix + command}* untuk melihat daftar menu.`
 ]
 }

  let finalText = menuText.join('\n').replace(/%(\w+)/g, (_, k) => replace[k] || _)

  // --- KARTU THUMBNAIL BESAR (externalAdReply): gambar masuk
  //     thumbnail preview, pesan yang terkirim cuma TEKS ->
  //     tidak numpuk di storage (seperti contoh screenshot) ---
  let totalCmds = Object.values(categories).reduce(
  (n, items) => n + items.reduce((a, it) => a + (it.helps?.length || 0), 0), 0
  )

  // --- FAKE QUOTED (orderMessage): gambar masuk thumbnail quote,
  //     pesan yang terkirim cuma TEKS -> tidak numpuk di storage ---
  let thumbSmall = null
  try {
  thumbSmall = await sharp(thumbBuffer).resize({ width: 300 }).jpeg({ quality: 70 }).toBuffer()
  } catch {
  thumbSmall = thumbBuffer
  }

  let botJid = conn.user?.jid || conn.user?.id || m.sender
  let _menuName = global.botName || global.namebot || botname

  const ftroliQuoted = {
  key: {
   fromMe: false,
   participant: '0@s.whatsapp.net',
   remoteJid: 'status@broadcast',
  },
  message: {
   orderMessage: {
   orderId: String(Date.now()),
   thumbnail: thumbSmall,
   itemCount: totalCmds,
   status: 'INQUIRY',
   surface: 'CATALOG',
   message: `★ ${_menuName}`,
   orderTitle: `❒ ${totalCmds} Commands`,
   sellerJid: botJid,
   token: 'jojo-menu-v1',
   totalAmount1000: totalCmds * 1000,
   totalCurrencyCode: 'IDR',
   },
  },
  }

  await conn.sendMessage(m.chat, {
  text: finalText,
  mentions: [m.sender]
  }, { quoted: ftroliQuoted })

 let last = cooldown.get(m.sender) || 0
 if (Date.now() - last < 60_000) {
 cooldown.set(m.sender, Date.now())
 await conn.sendFile(
  m.chat,
  'https://files.catbox.moe/4jo6p7.mp3',
  'menu.mp3',
  null,
  m,
  true,
  { type: 'audioMessage', ptt: true }
 )
 }

} catch (e) {
 console.error(e)
 m.reply("Menu error, coba lagi nanti.")
}
}

handler.command = /^(menu|hep)$/i
handler.tags = ['main']
handler.help = ['menu', 'help']

export default handler

function clockString(ms) {
let h = Math.floor(ms / 3600000)
let m = Math.floor(ms / 60000) % 60
let s = Math.floor(ms / 1000) % 60
return [h, m, s].map(v => String(v).padStart(2, '0')).join(':')
}