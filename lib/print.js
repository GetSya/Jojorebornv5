import { WAMessageStubType } from 'baileys'
import PhoneNumber from 'awesome-phonenumber'
import chalk from 'chalk'
import { watchFile } from 'fs'

function formatBytes(bytes = 0) {
    if (!bytes || isNaN(bytes)) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

function getTime(timestamp) {
    return new Date(
        timestamp ? 1000 * (timestamp.low || timestamp) : Date.now()
    ).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
}

export default async function (m, conn = { user: {} }) {
    try {
        const name = conn.getName(m.sender)
        const sender = PhoneNumber('+' + m.sender.split('@')[0]).getNumber('international') +
            (name ? ` ~ ${name}` : '')

        const chatName = conn.getName(m.chat)
        const botNumber = PhoneNumber('+' + (conn.user?.jid || '').split('@')[0]).getNumber('international')
        const botName = conn.user?.name || 'BOT'

        const filesize =
            m.msg?.fileLength?.low ||
            m.msg?.fileLength ||
            m.msg?.vcard?.length ||
            m.msg?.axolotlSenderKeyDistributionMessage?.length ||
            m.text?.length ||
            0

        // ==== AMBIL DATA DARI GLOBAL DB ====
        let user = global.db.data.users[m.sender]
        if (!user) return // Pastikan database sudah ter-load di handler sebelum print

        // ==== LOGIKA AUTO REWARD RP20 PER COMMAND ====
        // Sekarang langsung menambah ke user.money di database global
        if (m.isCommand) {
            user.money = (user.money || 0) + 20
        }

        const time = getTime(m.messageTimestamp)
        const type = m.mtype
            ? m.mtype
                .replace(/message$/i, '')
                .replace('audio', m.msg?.ptt ? '🎙️ PTT' : '🎵 Audio')
                .replace(/^./, v => v.toUpperCase())
            : '-'

        const stub = m.messageStubType
            ? WAMessageStubType[m.messageStubType]
            : '-'

        // ==== LOG TERMINAL ====
        console.log(
            chalk.hex('#ffb6ff')('╭───────────── 🌸 𝙇𝙊𝙂 🌸 ─────────────'),
            '\n' + chalk.magentaBright('│ ✨ Senpai Bot  : ') + chalk.white(`${botNumber} ~ ${botName}`),
            '\n' + chalk.yellowBright('│ 🍌 Waktu       : ') + chalk.white(time),
            '\n' + chalk.cyanBright('│ 💬 Room Chat  : ') + chalk.white(`${chatName || m.chat}`),
            '\n' + chalk.greenBright('│ 🧑‍🎤 From       : ') + chalk.white(sender),
            '\n' + chalk.blueBright('│ 🎴 Type Msg   : ') + chalk.white(type),
            '\n' + chalk.redBright('│ 🪄 Event       : ') + chalk.white(stub),
            '\n' + chalk.magentaBright('│ 🎒 Size        : ') + chalk.white(formatBytes(filesize)),
            '\n' + chalk.yellowBright('│ ⭐ Status      : ') + chalk.white(
                `Lv.${user.level || 0} ✦ Rp${(user.money || 0).toLocaleString('id-ID')} ✦ Limit ${user.limit || 0}`
            ),
            '\n' + chalk.hex('#ffb6ff')('╰────────────────────────────────────────')
        )

        // ==== LOG PESAN TEKS ====
        if (typeof m.text === 'string' && m.text) {
            let log = m.text.replace(/\u200e+/g, '')
            if (m.mentionedJid) {
                for (let jid of m.mentionedJid) {
                    log = log.replace(
                        '@' + jid.split('@')[0],
                        chalk.cyanBright('@' + conn.getName(jid))
                    )
                }
            }

            if (m.error) console.log(chalk.redBright('💥 Error: ' + log))
            else if (m.isCommand) console.log(chalk.greenBright('⚡ Command: ' + log))
            else console.log(chalk.white('🚩 Chat: ' + log))
        }

        // ==== INFO MEDIA ====
        if (/document/i.test(m.mtype)) {
            console.log(chalk.blue('📘 File:'), m.msg.fileName || m.msg.displayName || '-')
        } else if (/contact/i.test(m.mtype)) {
            console.log(chalk.blue('👤 Kontak:'), m.msg.displayName || '-')
        } else if (/audio/i.test(m.mtype)) {
            const duration = m.msg.seconds || 0
            console.log(
                chalk.magenta(
                    `🎧 Durasi: ${String(Math.floor(duration / 60)).padStart(2, '0')}:${String(
                        duration % 60
                    ).padStart(2, '0')}`
                )
            )
        }

        console.log()

    } catch (e) {
        console.error(chalk.red('💀 Logger Crash:'), e)
    }
}

let file = global.__filename(import.meta.url)
watchFile(file, () => {
    console.log(chalk.magentaBright("✨ Senpai updated 'lib/print.js' ✨"))
})