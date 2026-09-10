import PhoneNumber from 'awesome-phonenumber'
import chalk from 'chalk'
import { watchFile } from 'fs'

function getTime(timestamp) {
    return new Date(
        timestamp ? 1000 * (timestamp.low || timestamp) : Date.now()
    ).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
}

export default async function (m, conn = { user: {} }) {
    try {
        const rawNumber = m.sender ? m.sender.split('@')[0] : '-'
        let nomor = rawNumber
        try {
            nomor = PhoneNumber('+' + rawNumber).getNumber('international') || rawNumber
        } catch {}

        const waktu = getTime(m.messageTimestamp)
        const pesan = (typeof m.text === 'string' && m.text ? m.text.replace(/\u200e+/g, '') : '-') || '-'

        // Auto reward Rp20 per command (fitur lama, dipertahankan)
        try {
            const user = global.db?.data?.users?.[m.sender]
            if (user && m.isCommand) user.money = (user.money || 0) + 20
        } catch {}

        // Hanya log perintah command saja
        if (!m.isCommand) return

        // ==== LOG TERMINAL SIMPLE ====
        console.log(chalk.green('[ JOJOBOT ]: ') + chalk.cyanBright(`Nomor: ${nomor} || ${waktu}`))
        console.log(chalk.white(`Pesan: ${pesan}`))

    } catch (e) {
        console.error(chalk.red('Logger Crash:'), e)
    }
}

let file = global.__filename(import.meta.url)
watchFile(file, () => {
    console.log(chalk.magentaBright("✨ Senpai updated 'lib/print.js' ✨"))
})