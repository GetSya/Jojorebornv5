// =====================================================
//   ULTIMATE WEREWOLF GAME - WhatsApp Bot Handler
//   Roles: Werewolf, Seer, Doctor, Hunter, Witch, Villager
//   FIX: Night AFK timer + Vote transparency + Leaderboard
// =====================================================

import { readFileSync, writeFileSync, existsSync } from 'fs'

global.werewolf = global.werewolf || {}

// ── Delay helper ─────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
const PM_DELAY_MS    = 3000
const RETRY_DELAY_MS = 4000

// ── NIGHT TIMEOUT: detik ─────────────────────────────────────────────────────
const NIGHT_TIMEOUT_SEC = 120   // 2 menit, lalu AFK dianggap skip
// ── VOTE TIMEOUT: detik ──────────────────────────────────────────────────────
const VOTE_TIMEOUT_SEC  = 75    // 1 menit 15 detik

// ── Path leaderboard ─────────────────────────────────────────────────────────
const LEADERBOARD_PATH = './json/wwmaster.json'

// =============================================================================
//  LEADERBOARD HELPERS
// =============================================================================

/** Baca data leaderboard dari file JSON */
function readLeaderboard() {
    try {
        if (!existsSync(LEADERBOARD_PATH)) return []
        let raw = readFileSync(LEADERBOARD_PATH, 'utf8').trim()
        if (!raw) return []
        return JSON.parse(raw)
    } catch (err) {
        console.error('[WW] Gagal baca leaderboard:', err.message)
        return []
    }
}

/** Simpan data leaderboard ke file JSON */
function writeLeaderboard(data) {
    try {
        writeFileSync(LEADERBOARD_PATH, JSON.stringify(data, null, 2), 'utf8')
    } catch (err) {
        console.error('[WW] Gagal tulis leaderboard:', err.message)
    }
}

/**
 * Update leaderboard setelah game selesai.
 * @param {Array}  players  - array semua pemain dengan { jid, role, status }
 * @param {string} winner   - 'VILLAGE' | 'WEREWOLF'
 */
function updateLeaderboard(players, winner) {
    let data = readLeaderboard()

    for (let p of players) {
        let entry = data.find(e => e.jid === p.jid)
        if (!entry) {
            entry = {
                jid      : p.jid,
                name     : p.jid.split('@')[0],
                games    : 0,
                wins     : 0,
                losses   : 0,
                asWerewolf  : 0,
                asVillager  : 0,
                winAsWerewolf  : 0,
                winAsVillager  : 0,
                kills    : 0,     // diisi dari kill log jika ada (opsional)
                survived : 0,
                winRate  : '0%'
            }
            data.push(entry)
        }

        let isWerewolf = p.role === 'WEREWOLF'
        let didWin     = (isWerewolf && winner === 'WEREWOLF') ||
                         (!isWerewolf && winner === 'VILLAGE')

        entry.games++
        if (didWin) entry.wins++
        else        entry.losses++

        if (isWerewolf) {
            entry.asWerewolf++
            if (didWin) entry.winAsWerewolf++
        } else {
            entry.asVillager++
            if (didWin) entry.winAsVillager++
        }

        if (p.status === 'ALIVE') entry.survived++

        entry.winRate = entry.games > 0
            ? (((entry.wins / entry.games) * 100).toFixed(1) + '%')
            : '0%'
    }

    // Urutkan: wins terbanyak, lalu winRate tertinggi
    data.sort((a, b) => b.wins - a.wins || parseFloat(b.winRate) - parseFloat(a.winRate))
    writeLeaderboard(data)
    return data
}

/**
 * Format teks leaderboard untuk dikirim ke chat.
 * @param {number} topN   - tampilkan N teratas (default 10)
 */
function formatLeaderboard(topN = 10) {
    let data = readLeaderboard()
    if (data.length === 0) return '📋 Belum ada data leaderboard.'

    let medals = ['🥇', '🥈', '🥉']
    let lines  = data.slice(0, topN).map((e, i) => {
        let medal  = medals[i] || `${i + 1}.`
        let wr     = e.winRate
        let role   = e.asWerewolf > e.asVillager ? '🐺' : '👨‍🌾'
        return `${medal} *@${e.name}* ${role}\n    🏆 ${e.wins}W/${e.losses}L | WR: ${wr} | ${e.games} game`
    })

    return (
        `🏆 *MASTER OF WEREWOLF* 🏆\n` +
        `${'─'.repeat(28)}\n` +
        lines.join('\n') +
        `\n${'─'.repeat(28)}\n` +
        `📊 Total pemain terdaftar: *${data.length}*`
    )
}

// ── Normalisasi JID ───────────────────────────────────────────────────────────
function toUserJid(jid) {
    if (!jid) return jid
    let number = jid.replace(/@.*$/, '').replace(/[^0-9]/g, '')
    if (number.startsWith('0')) number = '62' + number.substring(1)
    if (number.length < 10) return null
    return jid.includes('@') ? jid : jid + '@s.whatsapp.net'
}

// ── Safe send PM ──────────────────────────────────────────────────────────────
async function safeSend(conn, jid, payload, retries = 3) {
    let normalizedJid = toUserJid(jid)
    for (let i = 0; i < retries; i++) {
        try {
            await conn.sendMessage(normalizedJid, payload)
            console.log(`[WW] PM BERHASIL ke ${normalizedJid}`)
            return true
        } catch (err) {
            console.error(`[WW] Gagal (${i+1}/${retries}) ke ${normalizedJid}: ${err.message}`)
            if (i < retries - 1) {
                const backoff = Math.min(2000 * Math.pow(2, i), 10000)
                await sleep(backoff)
            }
        }
    }
    console.error(`[WW] GAGAL TOTAL kirim ke ${normalizedJid} setelah ${retries}x percobaan`)
    return false
}

// ── Safe send grup ────────────────────────────────────────────────────────────
async function safeSendGroup(conn, groupJid, payload) {
    try {
        await conn.sendMessage(groupJid, payload)
        return true
    } catch (err) {
        console.error(`[WW] safeSendGroup GAGAL ke ${groupJid}:`, err?.message || err)
        return false
    }
}

// ── Cek kondisi menang ────────────────────────────────────────────────────────
function checkWinCondition(room) {
    let wAlive  = room.players.filter(p => p.role === 'WEREWOLF' && p.status === 'ALIVE').length
    let nvAlive = room.players.filter(p => p.role !== 'WEREWOLF' && p.status === 'ALIVE').length
    if (wAlive === 0) return 'VILLAGE'
    if (wAlive >= nvAlive) return 'WEREWOLF'
    return null
}

// ── Role config ───────────────────────────────────────────────────────────────
function getRoleCount(total) {
    let ww       = total <= 6 ? 1 : total <= 9 ? 2 : 3
    let doctor   = total >= 5 ? 1 : 0
    let hunter   = total >= 7 ? 1 : 0
    let witch    = total >= 9 ? 1 : 0
    let villager = Math.max(total - ww - 1 - doctor - hunter - witch, 0)
    return { WEREWOLF: ww, SEER: 1, DOCTOR: doctor, HUNTER: hunter, WITCH: witch, VILLAGER: villager }
}

function roleEmoji(role) {
    return { WEREWOLF:'🐺', SEER:'🔮', DOCTOR:'💉', HUNTER:'🏹', WITCH:'🧙', VILLAGER:'👨‍🌾' }[role] || '❓'
}

function roleDesc(role) {
    return {
        WEREWOLF : 'Kamu adalah Werewolf! Setiap malam, bunuh satu warga desa.',
        SEER     : 'Kamu adalah Penerawang! Setiap malam, cek peran satu pemain.',
        DOCTOR   : 'Kamu adalah Dokter! Setiap malam, lindungi satu pemain (tidak bisa orang sama 2 malam berturut-turut).',
        HUNTER   : 'Kamu adalah Pemburu! Jika kamu mati kapanpun, kamu bisa menembak balik 1 pemain.',
        WITCH    : 'Kamu adalah Penyihir! Punya 1x ramuan hidup & 1x racun. Gunakan dengan bijak.',
        VILLAGER : 'Kamu adalah Warga Desa. Gunakan diskusi untuk menemukan Werewolf!'
    }[role] || ''
}

// ── Build daftar pemain ───────────────────────────────────────────────────────
function buildPlayerList(players) {
    return players.map((p, i) =>
        `${i + 1}. @${p.jid.split('@')[0]}${p.status === 'DEAD' ? ' ☠️' : ''}`
    ).join('\n')
}

// =============================================================================
//  BUTTON HELPERS — native interactive message (ourin-baileys) + fallback teks
//  Tap tombol/list kembali sebagai m.text berisi id (mis. ".ww vote 3"),
//  sehingga langsung diproses alur command yang sudah ada tanpa ubah logika.
// =============================================================================

/** Pecah rows menjadi sections (maks. 10 row per section, batas WhatsApp) */
function toSections(rows, title = '☰ Daftar Pemain') {
    let sections = []
    for (let i = 0; i < rows.length; i += 10)
        sections.push({ title: i === 0 ? title : `${title} ${i / 10 + 1}`, rows: rows.slice(i, i + 10) })
    return sections
}

/**
 * Rows daftar pemain untuk aksi ber-argumen nomor (kill/terawang/protect/poison/shoot/vote).
 * Nomor = posisi di room.players (1-based), sama seperti daftar teks. TIDAK menampilkan
 * role agar tidak bocor ke pemain lain.
 */
function nightPlayerRows(room, pfx, action, excludeJids = []) {
    let rows = []
    room.players.forEach((p, i) => {
        if (p.status !== 'ALIVE') return
        if (excludeJids.includes(p.jid)) return
        let num = p.jid.split('@')[0].slice(0, 15)
        rows.push({ title: `${i + 1}. ${num}`, description: 'Ketuk untuk memilih', id: `${pfx} ${action} ${i + 1}` })
    })
    return rows
}

/** Tombol aksi malam sesuai role pemain (untuk PM). Villager = [] (tidur saja). */
function nightButtonsFor(room, player, pfx) {
    if (player.role === 'WEREWOLF') {
        let wwJids = room.players.filter(p => p.role === 'WEREWOLF').map(p => p.jid)
        let rows = nightPlayerRows(room, pfx, 'kill', [...wwJids, player.jid])
        return rows.length ? [{ type: 'list', title: '🔪 Pilih Korban', sections: toSections(rows) }] : []
    }
    if (player.role === 'SEER') {
        let rows = nightPlayerRows(room, pfx, 'terawang', [player.jid])
        return rows.length ? [{ type: 'list', title: '🔮 Terawang Siapa?', sections: toSections(rows) }] : []
    }
    if (player.role === 'DOCTOR') {
        let rows = nightPlayerRows(room, pfx, 'protect', room.nightAction.lastProtect ? [room.nightAction.lastProtect] : [])
        return rows.length ? [{ type: 'list', title: '💉 Lindungi Siapa?', sections: toSections(rows) }] : []
    }
    if (player.role === 'WITCH') {
        let btns = []
        if (room.witch.canSave && room.nightAction.kills.length > 0)
            btns.push({ title: '✨ Save Korban', id: `${pfx} save` })
        if (room.witch.canPoison) {
            let prows = nightPlayerRows(room, pfx, 'poison', [player.jid])
            if (prows.length) btns.push({ type: 'list', title: '☠️ Racuni Siapa?', sections: toSections(prows) })
        }
        btns.push({ title: '⏭️ Skip', id: `${pfx} skip` })
        return btns
    }
    return []
}

/** List vote siang hari (grup): semua pemain hidup, id = ".ww vote <nomor>". */
function voteListButtons(room, pfx) {
    let rows = nightPlayerRows(room, pfx, 'vote')
    return rows.length ? [{ type: 'list', title: '🗳️ Vote Eksekusi', sections: toSections(rows, '🗳️ Pilih Pemain') }] : []
}

/**
 * Kirim buttons, fallback otomatis ke teks (+mentions) kalau gagal.
 * Tidak pernah throw — return true/false seperti safeSend.
 */
async function sendWWButtons(conn, jid, text, buttons, opts = {}) {
    try {
        if (buttons && buttons.length > 0) {
            await conn.sendButtons(jid, text, buttons, {
                footer: opts.footer || '🐺 Ultimate Werewolf',
                ...(opts.quoted ? { quoted: opts.quoted } : {})
            })
            return true
        }
        throw new Error('no-buttons')
    } catch (e) {
        try {
            await conn.sendMessage(jid,
                { text, ...(opts.mentions ? { mentions: opts.mentions } : {}) },
                opts.quoted ? { quoted: opts.quoted } : {})
            return true
        } catch (e2) {
            console.error('[WW] sendWWButtons fallback gagal:', e2.message)
            return false
        }
    }
}

// ── Reset nightAction ─────────────────────────────────────────────────────────
function freshNightAction(prevProtect = null) {
    return { kills: [], seer: null, protect: null, save: false, poison: null, witchDone: false, lastProtect: prevProtect }
}

// =============================================================================
//  NIGHT TIMER
// =============================================================================

function startNightTimer(room, conn) {
    clearNightTimer(room)

    const WARN_SEC = 30

    room._nightWarnTimeout = setTimeout(async () => {
        if (room.state !== 'NIGHT') return
        let pending = getNightPending(room)
        if (pending.length === 0) return

        await safeSendGroup(conn, room.id, {
            text : `⚠️ *[MALAM]* Sisa *${WARN_SEC} detik!*\nMasih ada *${pending.length}* pemain yang belum beraksi.\nSegera lakukan aksimu atau akan di-skip otomatis!`
        })

        for (let p of pending) {
            await sleep(500)
            await safeSend(conn, p.jid, {
                text : `⚠️ *[PERINGATAN MALAM - Putaran ${room.round}]*\nKamu belum beraksi! Sisa *${WARN_SEC} detik*.\nSegera lakukan aksimu sekarang atau akan di-skip otomatis!`
            })
        }
    }, (NIGHT_TIMEOUT_SEC - WARN_SEC) * 1000)

    room._nightTimeout = setTimeout(async () => {
        if (room.state !== 'NIGHT') return

        let pending = getNightPending(room)
        if (pending.length === 0) return

        console.log(`[WW] Night timeout! Force-skip untuk: ${pending.map(p => p.jid).join(', ')}`)

        let wwAlive    = room.players.some(p => p.role === 'WEREWOLF' && p.status === 'ALIVE')
        let seerAlive  = room.players.some(p => p.role === 'SEER'     && p.status === 'ALIVE')
        let docAlive   = room.players.some(p => p.role === 'DOCTOR'   && p.status === 'ALIVE')
        let witchAlive = room.players.some(p => p.role === 'WITCH'    && p.status === 'ALIVE')

        if (wwAlive && room.nightAction.kills.length === 0) {
            let candidates = room.players.filter(p => p.role !== 'WEREWOLF' && p.status === 'ALIVE')
            if (candidates.length > 0) {
                let randomTarget = candidates[Math.floor(Math.random() * candidates.length)]
                room.nightAction.kills.push(randomTarget.jid)
                console.log(`[WW] WW AFK – random kill: ${randomTarget.jid}`)
            } else {
                room.nightAction.kills.push('__none__')
            }
        }
        if (seerAlive  && room.nightAction.seer === null)    room.nightAction.seer      = '__skip__'
        if (docAlive   && room.nightAction.protect === null)  room.nightAction.protect   = '__skip__'
        if (witchAlive && !room.nightAction.witchDone)        room.nightAction.witchDone = true

        await safeSendGroup(conn, room.id, {
            text : `⏰ *WAKTU MALAM HABIS!*\n*${pending.length}* pemain tidak beraksi dan di-skip otomatis.\nGame berlanjut...`
        })

        for (let p of pending) {
            await sleep(500)
            await safeSend(conn, p.jid, {
                text : `⏰ *[MALAM HABIS - Putaran ${room.round}]*\nKamu tidak beraksi tepat waktu dan di-skip otomatis.\nTunggu pengumuman pagi hari di grup.`
            })
        }

        if (room.nightAction.kills[0] === '__none__') room.nightAction.kills = []

        await resolveNight(room, conn)
    }, NIGHT_TIMEOUT_SEC * 1000)
}

function clearNightTimer(room) {
    if (room._nightTimeout)     { clearTimeout(room._nightTimeout);     room._nightTimeout     = null }
    if (room._nightWarnTimeout) { clearTimeout(room._nightWarnTimeout); room._nightWarnTimeout = null }
}

function getNightPending(room) {
    let pending = []
    let wwAlive    = room.players.filter(p => p.role === 'WEREWOLF' && p.status === 'ALIVE')
    let seerAlive  = room.players.filter(p => p.role === 'SEER'     && p.status === 'ALIVE')
    let docAlive   = room.players.filter(p => p.role === 'DOCTOR'   && p.status === 'ALIVE')
    let witchAlive = room.players.filter(p => p.role === 'WITCH'    && p.status === 'ALIVE')

    if (wwAlive.length    > 0 && room.nightAction.kills.length === 0)  pending.push(...wwAlive)
    if (seerAlive.length  > 0 && room.nightAction.seer === null)        pending.push(...seerAlive)
    if (docAlive.length   > 0 && room.nightAction.protect === null)     pending.push(...docAlive)
    if (witchAlive.length > 0 && !room.nightAction.witchDone)          pending.push(...witchAlive)

    return pending
}

// =============================================================================
//  VOTE TRACKER — tampilkan tally + tag siapa belum vote
// =============================================================================

async function sendVoteSummary(room, conn) {
    let alivePlayers = room.players.filter(p => p.status === 'ALIVE')
    let voted        = Object.keys(room.votes)
    let notVoted     = alivePlayers.filter(p => !room.votes[p.jid])

    // Hitung tally
    let tally = {}
    for (let [, targetJid] of Object.entries(room.votes)) {
        tally[targetJid] = (tally[targetJid] || 0) + 1
    }

    let msg = `📊 *STATUS VOTE* (${voted.length}/${alivePlayers.length})\n\n`

    // Tabel perolehan suara
    if (Object.keys(tally).length > 0) {
        msg += `🗳️ *Perolehan Suara:*\n`
        let sorted = Object.entries(tally).sort((a, b) => b[1] - a[1])
        for (let [jid, count] of sorted) {
            msg += `@${jid.split('@')[0]}: ${'⭐'.repeat(count)} *(${count})*\n`
        }
        msg += '\n'
    }

    // Siapa yang sudah vote (beserta pilihannya)
    if (voted.length > 0) {
        msg += `✅ *Sudah vote:*\n`
        for (let [voterJid, targetJid] of Object.entries(room.votes)) {
            msg += `• @${voterJid.split('@')[0]} → @${targetJid.split('@')[0]}\n`
        }
        msg += '\n'
    }

    // ── FIX: Yang belum vote di-tag/mention ──────────────────────────────────
    if (notVoted.length > 0) {
        msg += `⏳ *Belum vote:*\n`
        msg += notVoted.map(p => `• @${p.jid.split('@')[0]}`).join('\n')
    } else {
        msg += `✅ *Semua sudah vote!*`
    }

    // Kumpulkan semua JID untuk mention — termasuk yang BELUM vote agar di-tag
    let allMentions = [
        ...voted,
        ...Object.values(room.votes),
        ...notVoted.map(p => p.jid)   // ← FIX: mention yang belum vote
    ]

    await safeSendGroup(conn, room.id, { text: msg, mentions: [...new Set(allMentions)] })
}

// =============================================================================
//  VOTE TIMER — 75 detik (1 menit 15 detik)
// =============================================================================

function startVoteTimer(room, conn) {
    clearVoteTimer(room)

    const WARN_SEC = 30  // peringatan sisa 30 detik sebelum timeout

    room._voteWarnTimeout = setTimeout(async () => {
        if (room.state !== 'DAY') return
        let alivePlayers = room.players.filter(p => p.status === 'ALIVE')
        let notVoted     = alivePlayers.filter(p => !room.votes[p.jid])
        if (notVoted.length === 0) return

        // Grup: mention yang belum vote agar mereka sadar
        await safeSendGroup(conn, room.id, {
            text     : `⚠️ *[VOTING]* Sisa *${WARN_SEC} detik!*\nMasih ada *${notVoted.length}* pemain yang belum vote:\n` +
                       notVoted.map(p => `• @${p.jid.split('@')[0]}`).join('\n') +
                       `\nJika tidak vote, suaramu dianggap *abstain*!`,
            mentions : notVoted.map(p => p.jid)
        })

        // PM pribadi ke masing-masing yang belum vote
        for (let p of notVoted) {
            await sleep(500)
            await safeSend(conn, p.jid, {
                text : `⚠️ *[PERINGATAN VOTING - Putaran ${room.round}]*\nKamu belum vote! Sisa *${WARN_SEC} detik*.\nKetik *.ww vote <nomor>* di grup sekarang atau suaramu dianggap *abstain*!`
            })
        }
    }, (VOTE_TIMEOUT_SEC - WARN_SEC) * 1000)

    room._voteTimeout = setTimeout(async () => {
        if (room.state !== 'DAY') return

        let alivePlayers = room.players.filter(p => p.status === 'ALIVE')
        let notVoted     = alivePlayers.filter(p => !room.votes[p.jid])
        if (notVoted.length === 0) return

        console.log(`[WW] Vote timeout! Abstain untuk: ${notVoted.map(p => p.jid).join(', ')}`)

        await safeSendGroup(conn, room.id, {
            text     : `⏰ *WAKTU VOTING HABIS!*\n*${notVoted.length}* pemain tidak vote dan dianggap *abstain*:\n` +
                       notVoted.map(p => `• @${p.jid.split('@')[0]}`).join('\n') +
                       `\nMenghitung hasil suara...`,
            mentions : notVoted.map(p => p.jid)
        })

        await resolveVote(room, conn)
    }, VOTE_TIMEOUT_SEC * 1000)
}

function clearVoteTimer(room) {
    if (room._voteTimeout)     { clearTimeout(room._voteTimeout);     room._voteTimeout     = null }
    if (room._voteWarnTimeout) { clearTimeout(room._voteWarnTimeout); room._voteWarnTimeout = null }
}

// =============================================================================
//  HELPER: Akhiri game, update leaderboard, hapus room
// =============================================================================

async function endGame(room, conn, winner, finalMsg) {
    // Update leaderboard
    let lb = updateLeaderboard(room.players, winner)

    // Ambil top 3 untuk dikirim bersama pesan akhir
    let medals   = ['🥇', '🥈', '🥉']
    let top3     = lb.slice(0, 3).map((e, i) =>
        `${medals[i]} @${e.name} — ${e.wins}W | WR ${e.winRate}`
    ).join('\n')

    let fullMsg =
        finalMsg +
        `\n\n🏆 *TOP 3 MASTER OF WEREWOLF*\n` +
        top3 +
        `\n\n_Ketik *.ww leaderboard* untuk ranking lengkap._`

    await safeSendGroup(conn, room.id, {
        text     : fullMsg,
        mentions : room.players.map(p => p.jid)
    })

    clearNightTimer(room)
    clearVoteTimer(room)
    delete global.werewolf[room.id]
}

// =============================================================================
//  RESOLVE VOTE
// =============================================================================

async function resolveVote(room, conn) {
    clearVoteTimer(room)

    if (Object.keys(room.votes).length === 0) {
        let noVoteMsg =
            `🤷 *Tidak ada yang vote!* Desa tidak mengeksekusi siapapun.\n\n` +
            `🌙 *MALAM TIBA...* ⏰ ${NIGHT_TIMEOUT_SEC} detik\nCek Private Message bot!`
        await safeSendGroup(conn, room.id, { text: noVoteMsg, mentions: room.players.map(p => p.jid) })

        let prevProtect  = room.nightAction.protect
        room.round++
        room.nightAction = freshNightAction(prevProtect)
        room.votes       = {}
        await startNight(room, conn)
        return
    }

    let tally = {}
    for (let v of Object.values(room.votes)) tally[v] = (tally[v] || 0) + 1

    let maxVotes = 0, candidates = []
    for (let [jid, count] of Object.entries(tally)) {
        if (count > maxVotes)       { maxVotes = count; candidates = [jid] }
        else if (count === maxVotes)  candidates.push(jid)
    }

    let execMsg = `🔥 *HASIL VOTING* 🔥\n\n`

    execMsg += `📊 *Rekap Suara:*\n`
    let sortedTally = Object.entries(tally).sort((a, b) => b[1] - a[1])
    for (let [jid, count] of sortedTally)
        execMsg += `  @${jid.split('@')[0]}: ${'⭐'.repeat(count)} (${count})\n`
    execMsg += `\n`

    if (candidates.length > 1) {
        execMsg += `⚖️ *SERI!* Tidak ada yang dieksekusi.\n`
        let prevProtect  = room.nightAction.protect
        room.round++
        room.nightAction = freshNightAction(prevProtect)
        room.votes       = {}
        execMsg += `\n🌙 *MALAM TIBA...* ⏰ ${NIGHT_TIMEOUT_SEC} detik\nCek Private Message bot!`
        await safeSendGroup(conn, room.id, { text: execMsg, mentions: room.players.map(p => p.jid) })
        await startNight(room, conn)
        return
    }

    let executedJid = candidates[0]
    let execPlayer  = room.players.find(p => p.jid === executedJid)
    execPlayer.status = 'DEAD'
    execMsg += `☠️ Warga mengeksekusi *@${executedJid.split('@')[0]}* (${maxVotes} suara)\n`
    execMsg += `Perannya: *${roleEmoji(execPlayer.role)} ${execPlayer.role}*\n\n`
    if (execPlayer.role === 'HUNTER') room.hunterPending = executedJid

    let win = checkWinCondition(room)
    if (win) {
        execMsg += win === 'VILLAGE'
            ? `🎉 *WARGA DESA MENANG!* 🎉`
            : `🐺 *WEREWOLF MENANG!* 🐺`
        execMsg += `\n\n*Peran semua pemain:*\n` + room.players.map((p, i) =>
            `${i+1}. @${p.jid.split('@')[0]} → ${roleEmoji(p.role)} ${p.role}`
        ).join('\n')
        await endGame(room, conn, win, execMsg)
        return
    }

    if (room.hunterPending) {
        execMsg += `🏹 *HUNTER TEWAS!* @${execPlayer.jid.split('@')[0]} boleh menembak!\nHunter, pilih target di PM ⬇️`
        await safeSendGroup(conn, room.id, { text: execMsg, mentions: room.players.map(p => p.jid) })
        await sleep(1000)
        {
            let _hpfx = room.pfx || '.ww'
            let _srows = nightPlayerRows(room, _hpfx, 'shoot', [room.hunterPending])
            await sendWWButtons(conn, room.hunterPending,
                `🏹 Kamu dieksekusi! Balas dendam, pilih target:\n\n*Daftar Pemain:*\n${buildPlayerList(room.players)}`,
                _srows.length ? [{ type: 'list', title: '🏹 Tembak Siapa?', sections: toSections(_srows) }] : [])
        }
        room.state = 'HUNTER'
        room._prevProtectAfterHunter = room.nightAction.protect
        return
    }

    let prevProtect  = room.nightAction.protect
    room.round++
    room.nightAction = freshNightAction(prevProtect)
    room.votes       = {}

    execMsg += `🌙 *MALAM TIBA...* ⏰ ${NIGHT_TIMEOUT_SEC} detik\nCek Private Message bot!`
    await safeSendGroup(conn, room.id, { text: execMsg, mentions: room.players.map(p => p.jid) })
    await startNight(room, conn)
}

// =============================================================================
//  CEK MALAM SELESAI
// =============================================================================
async function checkNightComplete(room, conn) {
    let wwAlive    = room.players.some(p => p.role === 'WEREWOLF' && p.status === 'ALIVE')
    let seerAlive  = room.players.some(p => p.role === 'SEER'     && p.status === 'ALIVE')
    let docAlive   = room.players.some(p => p.role === 'DOCTOR'   && p.status === 'ALIVE')
    let witchAlive = room.players.some(p => p.role === 'WITCH'    && p.status === 'ALIVE')

    let wwDone    = !wwAlive    || room.nightAction.kills.length > 0
    let seerDone  = !seerAlive  || room.nightAction.seer !== null
    let docDone   = !docAlive   || room.nightAction.protect !== null
    let witchDone = !witchAlive || room.nightAction.witchDone === true

    console.log(`[WW] checkNightComplete: ww=${wwDone} seer=${seerDone} doc=${docDone} witch=${witchDone}`)

    if (wwDone && seerDone && docDone && witchDone) {
        clearNightTimer(room)
        await resolveNight(room, conn)
    }
}

// =============================================================================
//  MULAI MALAM
// =============================================================================
async function startNight(room, conn) {
    room.state = 'NIGHT'
    room.votes = {}

    let alivePlayers = room.players.filter(p => p.status === 'ALIVE')
    let playerList   = buildPlayerList(room.players)
    let allJids      = room.players.map(x => x.jid)
    let wwJids       = room.players.filter(p => p.role === 'WEREWOLF' && p.status === 'ALIVE').map(p => p.jid)

    console.log(`[WW] startNight putaran ${room.round}, kirim PM ke ${alivePlayers.length} pemain`)

    for (let i = 0; i < alivePlayers.length; i++) {
        let p = alivePlayers[i]
        if (i > 0) await sleep(1500)
        console.log(`[WW] Kirim malam ke pemain ${i+1}/${alivePlayers.length}: ${p.jid}`)

        let msg = `🌙 *MALAM HARI - PUTARAN ${room.round}*\n⏰ Waktu: *${NIGHT_TIMEOUT_SEC} detik*\n\n`

        if (p.role === 'WEREWOLF') {
            let partners = wwJids.filter(j => j !== p.jid)
            if (partners.length > 0)
                msg += `🐺 Sesama Werewolf: ${partners.map(j => '@' + j.split('@')[0]).join(', ')}\n\n`
            msg += `Pilih korban malam ini:\n*.ww kill <nomor>*\n\n`
        } else if (p.role === 'SEER') {
            msg += `Terawang satu pemain:\n*.ww terawang <nomor>*\n\n`
        } else if (p.role === 'DOCTOR') {
            let lp = room.nightAction.lastProtect
            msg += `Lindungi satu pemain:\n*.ww protect <nomor>*\n`
            if (lp) msg += `_(Tidak bisa lindungi @${lp.split('@')[0]} lagi)_\n\n`
            else msg += `\n`
        } else if (p.role === 'WITCH') {
            msg += `Aksi Penyihir:\n`
            msg += `${room.witch.canSave   ? '✅' : '❌'} Ramuan Hidup → *.ww save*\n`
            msg += `${room.witch.canPoison ? '✅' : '❌'} Racun → *.ww poison <nomor>*\n`
            msg += `Atau *.ww skip* untuk melewati.\n\n`
        } else {
            msg += `Selamat tidur, warga desa 😴\n\n`
        }

        msg += `*Daftar Pemain:*\n${playerList}`

        // Tombol aksi malam sesuai role (fallback ke teks bila gagal)
        let ok = await sendWWButtons(conn, p.jid, msg, nightButtonsFor(room, p, room.pfx || '.ww'))
        console.log(`[WW] PM malam ke ${p.jid} → ${ok ? 'BERHASIL' : 'GAGAL'}`)
    }

    startNightTimer(room, conn)
}

// =============================================================================
//  RESOLVE MALAM
// =============================================================================
async function resolveNight(room, conn) {
    clearNightTimer(room)
    room.state = 'DAY'

    let victimJid = room.nightAction.kills[0] || null

    if (room.nightAction.seer    === '__skip__') room.nightAction.seer    = null
    if (room.nightAction.protect === '__skip__') room.nightAction.protect = null

    let saved = false

    if (victimJid && room.nightAction.protect === victimJid) {
        saved = true; victimJid = null
    }
    if (victimJid && room.nightAction.save && room.witch.canSave) {
        saved = true; victimJid = null; room.witch.canSave = false
    }

    let morningMsg = `☀️ *PAGI HARI - PUTARAN ${room.round}* ☀️\n\n`

    if (victimJid) {
        let victim = room.players.find(p => p.jid === victimJid)
        if (victim) {
            victim.status = 'DEAD'
            morningMsg += `😱 Warga menemukan mayat *@${victim.jid.split('@')[0]}* tergeletak di jalanan!\n`
            morningMsg += `Perannya: *${roleEmoji(victim.role)} ${victim.role}*\n\n`
            if (victim.role === 'HUNTER') room.hunterPending = victimJid
        }
    } else if (saved) {
        morningMsg += `🍀 Keajaiban! Semua warga bangun dengan selamat malam ini.\n\n`
    } else {
        morningMsg += `🌅 Malam berlalu tanpa insiden.\n\n`
    }

    if (room.nightAction.poison && room.witch.canPoison) {
        let poisoned = room.players.find(p => p.jid === room.nightAction.poison)
        if (poisoned && poisoned.status === 'ALIVE') {
            poisoned.status      = 'DEAD'
            room.witch.canPoison = false
            morningMsg += `💀 Seseorang mati karena RACUN... *@${poisoned.jid.split('@')[0]}*\n`
            morningMsg += `Perannya: *${roleEmoji(poisoned.role)} ${poisoned.role}*\n\n`
            if (poisoned.role === 'HUNTER') room.hunterPending = poisoned.jid
        }
    }

    let prevProtect = room.nightAction.protect

    let win = checkWinCondition(room)
    if (win) {
        morningMsg += win === 'VILLAGE'
            ? `🎉 *WARGA DESA MENANG!* 🎉\nSemua Werewolf telah dimusnahkan!`
            : `🐺 *WEREWOLF MENANG!* 🐺\nWerewolf menguasai desa.`
        morningMsg += `\n\n*Peran asli semua pemain:*\n` + room.players.map((p, i) =>
            `${i+1}. @${p.jid.split('@')[0]} → ${roleEmoji(p.role)} ${p.role}`
        ).join('\n')
        await endGame(room, conn, win, morningMsg)
        return
    }

    if (room.hunterPending) {
        let hunter = room.players.find(p => p.jid === room.hunterPending)
        morningMsg += `🏹 *HUNTER TEWAS!* *@${hunter.jid.split('@')[0]}* boleh menembak 1 pemain!\n`
        morningMsg += `Hunter, pilih target di Private Chat ⬇️`
        await safeSendGroup(conn, room.id, { text: morningMsg, mentions: room.players.map(p => p.jid) })
        await sleep(1000)
        {
            let _hpfx = room.pfx || '.ww'
            let _srows = nightPlayerRows(room, _hpfx, 'shoot', [room.hunterPending])
            await sendWWButtons(conn, room.hunterPending,
                `🏹 Kamu mati! Balas dendam dengan menembak, pilih target:\n\n*Daftar Pemain:*\n${buildPlayerList(room.players)}`,
                _srows.length ? [{ type: 'list', title: '🏹 Tembak Siapa?', sections: toSections(_srows) }] : [])
        }
        room.state       = 'HUNTER'
        room.nightAction = freshNightAction(prevProtect)
        return
    }

    let alivePlayers = room.players.filter(p => p.status === 'ALIVE')
    morningMsg += `👥 *Pemain Hidup (${alivePlayers.length}):*\n`
    // Nomor = indeks global room.players (1-based) agar cocok dengan *.ww vote <nomor>*
    room.players.forEach((p, i) => {
        if (p.status === 'ALIVE') morningMsg += `${i+1}. @${p.jid.split('@')[0]}\n`
    })
    morningMsg += `\nBerdiskusi lalu vote via tombol di bawah ⬇️\n⏰ Waktu voting: *${VOTE_TIMEOUT_SEC} detik*`

    await sendWWButtons(conn, room.id, morningMsg, voteListButtons(room, room.pfx || '.ww'), { mentions: room.players.map(p => p.jid) })
    room.nightAction = freshNightAction(prevProtect)
    room.votes       = {}
    startVoteTimer(room, conn)
}

// =============================================================================
//   MAIN HANDLER
// =============================================================================
let handler = async (m, { conn, args, usedPrefix, command }) => {

    let room   = m.isGroup
        ? global.werewolf[m.chat]
        : Object.values(global.werewolf).find(r => r.players.some(p => p.jid === m.sender))

    let action = (args[0] || '').toLowerCase()
    let pfx    = usedPrefix + command

    // Simpan pfx di room agar timer (resolveNight/resolveVote/startNight)
    // yang jalan tanpa konteks pesan tetap bisa bikin id tombol yang valid
    if (room) room.pfx = pfx

    // ── HELP (list menu buttons) ────────────────────────────────────────────
    if (!action || action === 'help') {
        let helpBody =
`🐺 *ULTIMATE WEREWOLF GAME* 🐺

*🎭 Role:*
🐺 Werewolf • 🔮 Penerawang • 💉 Dokter (≥5)
🏹 Pemburu (≥7) • 🧙 Penyihir (≥9) • 👨‍🌾 Warga

⏰ Malam: *${NIGHT_TIMEOUT_SEC} detik* | Vote: *${VOTE_TIMEOUT_SEC} detik*
👥 Min. 4 pemain | Ketuk tombol di bawah ⬇️`
        let helpRows = [
            { title: '➕ Create', description: 'Buat lobi baru', id: `${pfx} create` },
            { title: '✅ Join', description: 'Gabung ke lobi', id: `${pfx} join` },
            { title: '🚪 Leave', description: 'Keluar dari lobi', id: `${pfx} leave` },
            { title: '▶️ Start', description: 'Mulai game (min. 4)', id: `${pfx} start` },
            { title: 'ℹ️ Info', description: 'Status & pemain', id: `${pfx} info` },
            { title: '🗳️ Votes', description: 'Status voting', id: `${pfx} votes` },
            { title: '🏆 Leaderboard', description: 'Ranking Master WW', id: `${pfx} leaderboard` },
            { title: '📊 Stats', description: 'Statistikmu', id: `${pfx} stats` },
            { title: '🛑 Stop', description: 'Hentikan (Host/Admin)', id: `${pfx} stop` },
        ]
        return sendWWButtons(conn, m.chat, helpBody,
            [{ type: 'list', title: '🐺 Menu Werewolf', sections: toSections(helpRows, '🐺 Menu Werewolf') }],
            { quoted: m })
    }

    // ── LEADERBOARD ───────────────────────────────────────────────────────────
    if (action === 'leaderboard' || action === 'lb' || action === 'rank') {
        let topN  = parseInt(args[1]) || 10
        let text  = formatLeaderboard(topN)
        let data  = readLeaderboard()
        let mentions = data.slice(0, topN).map(e => e.jid).filter(Boolean)
        return conn.sendMessage(m.chat, { text, mentions }, { quoted: m })
    }

    // ── MY STATS ──────────────────────────────────────────────────────────────
    if (action === 'stats') {
        let data  = readLeaderboard()
        let entry = data.find(e => e.jid === m.sender)
        if (!entry) return m.reply('❌ Kamu belum punya data. Ikut game dulu!')

        let rank  = data.findIndex(e => e.jid === m.sender) + 1
        let medals = ['🥇', '🥈', '🥉']
        let medal  = medals[rank - 1] || `#${rank}`

        return m.reply(
            `📊 *STATISTIK KAMU* ${medal}\n` +
            `${'─'.repeat(25)}\n` +
            `👤 @${entry.name}\n` +
            `🎮 Total Game : *${entry.games}*\n` +
            `🏆 Menang     : *${entry.wins}*\n` +
            `💀 Kalah      : *${entry.losses}*\n` +
            `📈 Win Rate   : *${entry.winRate}*\n` +
            `😮‍💨 Survive    : *${entry.survived}x*\n\n` +
            `🐺 Sebagai WW    : ${entry.asWerewolf}x (menang ${entry.winAsWerewolf}x)\n` +
            `👨‍🌾 Sebagai Warga : ${entry.asVillager}x (menang ${entry.winAsVillager}x)\n` +
            `${'─'.repeat(25)}\n` +
            `🏅 Ranking Global: *#${rank}*`
        )
    }

    // ── CREATE ────────────────────────────────────────────────────────────────
    if (action === 'create') {
        if (!m.isGroup) return m.reply('❌ Hanya bisa di grup!')
        if (room) return m.reply('⚠️ Sudah ada sesi aktif! Ketik *stop* dulu.')
        global.werewolf[m.chat] = {
            id: m.chat, state: 'LOBBY', host: m.sender,
            players: [], votes: {}, round: 0,
            hunterPending: null,
            witch: { canSave: true, canPoison: true },
            nightAction: freshNightAction(),
            _nightTimeout: null,
            _nightWarnTimeout: null,
            _voteTimeout: null,
            _voteWarnTimeout: null,
            _prevProtectAfterHunter: null
        }
        return sendWWButtons(conn, m.chat,
            `🐺 *Lobby Werewolf dibuat!*\n👥 Min. 4 pemain — ketuk tombol untuk bergabung ⬇️`,
            [
                { title: '✅ Join', id: `${pfx} join` },
                { title: 'ℹ️ Info', id: `${pfx} info` },
                { title: '▶️ Start', id: `${pfx} start` },
            ], { quoted: m })
    }

    // ── JOIN ──────────────────────────────────────────────────────────────────
    if (action === 'join') {
        if (!m.isGroup) return m.reply('❌ Hanya bisa di grup!')
        if (!room) return m.reply(`⚠️ Belum ada lobi. Ketik *${pfx} create* dulu.`)
        if (room.state !== 'LOBBY') return m.reply('🚫 Game sudah dimulai.')
        if (room.players.find(p => p.jid === m.sender)) return m.reply('✅ Kamu sudah di lobi.')
        room.players.push({ jid: m.sender, role: null, status: 'ALIVE' })
        return sendWWButtons(conn, m.chat,
            `✅ *@${m.sender.split('@')[0]}* bergabung!\n👥 Total: *${room.players.length}* pemain\n\n${buildPlayerList(room.players)}`,
            [
                { title: '▶️ Start', id: `${pfx} start` },
                { title: 'ℹ️ Info', id: `${pfx} info` },
                { title: '🚪 Leave', id: `${pfx} leave` },
            ], { quoted: m, mentions: room.players.map(p => p.jid) })
    }

    // ── LEAVE ─────────────────────────────────────────────────────────────────
    if (action === 'leave') {
        if (!m.isGroup) return m.reply('❌ Hanya bisa di grup!')
        if (!room || room.state !== 'LOBBY') return m.reply('🚫 Tidak bisa keluar sekarang.')
        let idx = room.players.findIndex(p => p.jid === m.sender)
        if (idx === -1) return m.reply('❌ Kamu tidak ada di lobi.')
        room.players.splice(idx, 1)
        return sendWWButtons(conn, m.chat,
            `🚪 *@${m.sender.split('@')[0]}* keluar.\n👥 Total: *${room.players.length}* pemain`,
            [
                { title: '✅ Join', id: `${pfx} join` },
                { title: 'ℹ️ Info', id: `${pfx} info` },
            ], { quoted: m, mentions: [m.sender] })
    }

    // ── INFO ──────────────────────────────────────────────────────────────────
    if (action === 'info') {
        if (!room) return m.reply('⚠️ Tidak ada game aktif.')
        let alive = room.players.filter(p => p.status === 'ALIVE').length
        let dead  = room.players.filter(p => p.status === 'DEAD').length
        return sendWWButtons(conn, m.chat,
            `🐺 *INFO WEREWOLF*\n📌 Fase: *${room.state}* | 🔄 Putaran: *${room.round}*\n🟢 Hidup: *${alive}* | ☠️ Mati: *${dead}*\n\n${buildPlayerList(room.players)}`,
            [
                { title: '🗳️ Votes', id: `${pfx} votes` },
                { title: '🏆 Leaderboard', id: `${pfx} leaderboard` },
            ], { quoted: m, mentions: room.players.map(p => p.jid) })
    }

    // ── VOTES ─────────────────────────────────────────────────────────────────
    if (action === 'votes') {
        if (!m.isGroup) return m.reply('❌ Hanya bisa di grup!')
        if (!room) return m.reply('⚠️ Tidak ada game aktif.')
        if (room.state !== 'DAY') return m.reply('🚫 Voting hanya saat siang hari!')
        await sendVoteSummary(room, conn)
        return
    }

    // ── START ─────────────────────────────────────────────────────────────────
    if (action === 'start') {
        if (!m.isGroup) return m.reply('❌ Hanya bisa di grup!')
        if (!room) return m.reply(`⚠️ Belum ada lobi. Ketik *${pfx} create* dulu.`)
        if (room.state !== 'LOBBY') return m.reply('🚫 Game sudah berjalan!')
        if (room.players.length < 4) return m.reply(`❌ Min. 4 pemain! Sekarang baru *${room.players.length}*.`)

        let total    = room.players.length
        let roleConf = getRoleCount(total)
        let rolePool = []
        for (let [role, count] of Object.entries(roleConf))
            for (let i = 0; i < count; i++) rolePool.push(role)

        for (let i = rolePool.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [rolePool[i], rolePool[j]] = [rolePool[j], rolePool[i]]
        }
        let shuffled = [...room.players].sort(() => Math.random() - 0.5)
        shuffled.forEach((p, i) => {
            room.players.find(x => x.jid === p.jid).role = rolePool[i]
        })

        room.state         = 'NIGHT'
        room.round         = 1
        room.hunterPending = null
        room.witch         = { canSave: true, canPoison: true }
        room.nightAction   = freshNightAction()
        room.votes         = {}

        let roleBreakdown = Object.entries(roleConf)
            .filter(([, c]) => c > 0)
            .map(([r, c]) => `${roleEmoji(r)} ${r}: *${c}*`)
            .join(' | ')

        await safeSendGroup(conn, m.chat, {
            text     : `🎭 *GAME DIMULAI!* 🎭\n\n👥 *${total} Pemain*\n${roleBreakdown}\n\nCek Private Message bot untuk peranmu!\n🌙 *MALAM PERTAMA...* ⏰ ${NIGHT_TIMEOUT_SEC} detik`,
            mentions : room.players.map(p => p.jid)
        })

        let playerList = buildPlayerList(room.players)
        let allJids    = room.players.map(p => p.jid)
        let wwJids     = room.players.filter(p => p.role === 'WEREWOLF').map(p => p.jid)

        let groupName = ''
        try { groupName = await conn.getName(room.id) } catch (_) { groupName = 'grup' }

        console.log(`[WW] start: total ${room.players.length} pemain, mulai kirim PM...`)

        for (let i = 0; i < room.players.length; i++) {
            let p = room.players[i]
            if (i > 0) await sleep(PM_DELAY_MS)
            console.log(`[WW] Kirim peran ke pemain ${i+1}/${room.players.length}: ${p.jid} (${p.role})`)

            let msg =
`🐺 *ULTIMATE WEREWOLF*
Grup: *${groupName}* | Putaran: *1*

${roleEmoji(p.role)} Peranmu: *${p.role}*
${roleDesc(p.role)}
`
            if (p.role === 'WEREWOLF' && wwJids.length > 1) {
                let partners = wwJids.filter(j => j !== p.jid)
                msg += `\n🐺 Sesama Werewolf: ${partners.map(j => '@' + j.split('@')[0]).join(', ')}\n`
            }

            msg += `\n*Daftar Pemain:*\n${playerList}\n\n`

            if (p.role === 'WEREWOLF')    msg += `🔪 Ketik *.ww kill <nomor>* untuk memilih korban.\n⏰ Batas waktu: *${NIGHT_TIMEOUT_SEC} detik*`
            else if (p.role === 'SEER')   msg += `🔮 Ketik *.ww terawang <nomor>* untuk menerawang.\n⏰ Batas waktu: *${NIGHT_TIMEOUT_SEC} detik*`
            else if (p.role === 'DOCTOR') msg += `💉 Ketik *.ww protect <nomor>* untuk melindungi.\n⏰ Batas waktu: *${NIGHT_TIMEOUT_SEC} detik*`
            else if (p.role === 'WITCH')  msg += `🧙 Gunakan *.ww save*, *.ww poison <nomor>*, atau *.ww skip*.\n⏰ Batas waktu: *${NIGHT_TIMEOUT_SEC} detik*`
            else                          msg += `😴 Tunggu pagi hari untuk berdiskusi.`

            let ok = await sendWWButtons(conn, p.jid, msg, nightButtonsFor(room, p, pfx))
            if (!ok) {
                console.warn(`[WW] Gagal kirim ke ${p.jid}, retry setelah 4 detik...`)
                await sleep(RETRY_DELAY_MS)
                await sendWWButtons(conn, p.jid, msg, nightButtonsFor(room, p, pfx))
            }
        }

        console.log(`[WW] Selesai kirim semua peran.`)
        startNightTimer(room, conn)
        return
    }

    // ── KILL (Werewolf) ───────────────────────────────────────────────────────
    if (action === 'kill') {
        if (m.isGroup) return m.reply('❌ Lakukan di Private Chat bot!')
        if (!room) return m.reply('⚠️ Kamu tidak sedang di dalam game.')
        if (room.state !== 'NIGHT') return m.reply('🚫 Bukan fase malam!')

        let me = room.players.find(p => p.jid === m.sender)
        if (!me || me.role !== 'WEREWOLF') return m.reply('❌ Kamu bukan Werewolf!')
        if (me.status === 'DEAD') return m.reply('☠️ Kamu sudah mati.')
        if (room.nightAction.kills.length > 0) return m.reply('✅ Sudah memilih target malam ini.')

        let targetIdx = parseInt(args[1]) - 1
        if (isNaN(targetIdx) || targetIdx < 0 || targetIdx >= room.players.length) return m.reply('❌ Nomor tidak valid!')

        let target = room.players[targetIdx]
        if (!target) return m.reply('❌ Pemain tidak ditemukan.')
        if (target.status === 'DEAD') return m.reply('❌ Target sudah mati!')
        if (target.jid === m.sender) return m.reply('❌ Tidak bisa membunuh diri sendiri!')
        if (target.role === 'WEREWOLF') return m.reply('❌ Tidak bisa membunuh sesama Werewolf!')

        room.nightAction.kills.push(target.jid)
        await m.reply(`🔪 Memilih *@${target.jid.split('@')[0]}*. Menunggu aksi lain...`)

        let otherWW = room.players.filter(p => p.role === 'WEREWOLF' && p.status === 'ALIVE' && p.jid !== m.sender)
        for (let ww of otherWW) {
            await sleep(500)
            await safeSend(conn, ww.jid, { text: `🐺 Rekanmu memilih @${target.jid.split('@')[0]} sebagai korban.`, mentions: [target.jid] })
        }

        await checkNightComplete(room, conn)
        return
    }

    // ── TERAWANG (Seer) ───────────────────────────────────────────────────────
    if (action === 'terawang') {
        if (m.isGroup) return m.reply('❌ Lakukan di Private Chat bot!')
        if (!room) return m.reply('⚠️ Kamu tidak sedang di dalam game.')
        if (room.state !== 'NIGHT') return m.reply('🚫 Bukan fase malam!')

        let me = room.players.find(p => p.jid === m.sender)
        if (!me || me.role !== 'SEER') return m.reply('❌ Kamu bukan Penerawang!')
        if (me.status === 'DEAD') return m.reply('☠️ Kamu sudah mati.')
        if (room.nightAction.seer !== null) return m.reply('✅ Sudah menerawang malam ini.')

        let targetIdx = parseInt(args[1]) - 1
        if (isNaN(targetIdx) || targetIdx < 0 || targetIdx >= room.players.length) return m.reply('❌ Nomor tidak valid!')

        let target = room.players[targetIdx]
        if (!target) return m.reply('❌ Pemain tidak ditemukan.')
        if (target.status === 'DEAD') return m.reply('❌ Target sudah mati.')
        if (target.jid === m.sender) return m.reply('❌ Tidak bisa menerawang diri sendiri.')

        room.nightAction.seer = target.jid
        await safeSend(conn, m.sender, {
            text     : `🔮 *Hasil Terawang:*\n@${target.jid.split('@')[0]} adalah *${roleEmoji(target.role)} ${target.role}*`,
            mentions : [target.jid]
        })

        await checkNightComplete(room, conn)
        return
    }

    // ── PROTECT (Doctor) ──────────────────────────────────────────────────────
    if (action === 'protect') {
        if (m.isGroup) return m.reply('❌ Lakukan di Private Chat bot!')
        if (!room) return m.reply('⚠️ Kamu tidak sedang di dalam game.')
        if (room.state !== 'NIGHT') return m.reply('🚫 Bukan fase malam!')

        let me = room.players.find(p => p.jid === m.sender)
        if (!me || me.role !== 'DOCTOR') return m.reply('❌ Kamu bukan Dokter!')
        if (me.status === 'DEAD') return m.reply('☠️ Kamu sudah mati.')
        if (room.nightAction.protect !== null) return m.reply('✅ Sudah memilih target perlindungan.')

        let targetIdx = parseInt(args[1]) - 1
        if (isNaN(targetIdx) || targetIdx < 0 || targetIdx >= room.players.length) return m.reply('❌ Nomor tidak valid!')

        let target = room.players[targetIdx]
        if (!target) return m.reply('❌ Pemain tidak ditemukan.')
        if (target.status === 'DEAD') return m.reply('❌ Pemain itu sudah mati.')
        if (target.jid === room.nightAction.lastProtect) return m.reply('❌ Tidak bisa lindungi orang yang sama 2 malam berturut-turut!')

        room.nightAction.protect = target.jid
        await m.reply(`💉 Melindungi *@${target.jid.split('@')[0]}* malam ini.`)

        await checkNightComplete(room, conn)
        return
    }

    // ── SAVE (Witch) ──────────────────────────────────────────────────────────
    if (action === 'save') {
        if (m.isGroup) return m.reply('❌ Lakukan di Private Chat bot!')
        if (!room) return m.reply('⚠️ Kamu tidak sedang di dalam game.')
        if (room.state !== 'NIGHT') return m.reply('🚫 Bukan fase malam!')

        let me = room.players.find(p => p.jid === m.sender)
        if (!me || me.role !== 'WITCH') return m.reply('❌ Kamu bukan Penyihir!')
        if (me.status === 'DEAD') return m.reply('☠️ Kamu sudah mati.')
        if (room.nightAction.witchDone) return m.reply('✅ Sudah melakukan aksi malam ini.')
        if (!room.witch.canSave) return m.reply('❌ Ramuan hidupmu sudah habis!')
        if (room.nightAction.kills.length === 0) return m.reply('ℹ️ Belum ada korban WW. Gunakan *.ww poison* atau *.ww skip*.')

        room.nightAction.save      = true
        room.nightAction.witchDone = true
        await m.reply(`✨ Ramuan Hidup digunakan! Korban WW akan diselamatkan.\n_(Ramuan habis)_`)

        await checkNightComplete(room, conn)
        return
    }

    // ── POISON (Witch) ────────────────────────────────────────────────────────
    if (action === 'poison') {
        if (m.isGroup) return m.reply('❌ Lakukan di Private Chat bot!')
        if (!room) return m.reply('⚠️ Kamu tidak sedang di dalam game.')
        if (room.state !== 'NIGHT') return m.reply('🚫 Bukan fase malam!')

        let me = room.players.find(p => p.jid === m.sender)
        if (!me || me.role !== 'WITCH') return m.reply('❌ Kamu bukan Penyihir!')
        if (me.status === 'DEAD') return m.reply('☠️ Kamu sudah mati.')
        if (room.nightAction.witchDone) return m.reply('✅ Sudah melakukan aksi malam ini.')
        if (!room.witch.canPoison) return m.reply('❌ Racunmu sudah habis!')

        let targetIdx = parseInt(args[1]) - 1
        if (isNaN(targetIdx) || targetIdx < 0 || targetIdx >= room.players.length) return m.reply('❌ Nomor tidak valid!')

        let target = room.players[targetIdx]
        if (!target) return m.reply('❌ Pemain tidak ditemukan.')
        if (target.status === 'DEAD') return m.reply('❌ Target sudah mati.')
        if (target.jid === m.sender) return m.reply('❌ Tidak bisa meracuni diri sendiri!')

        room.nightAction.poison    = target.jid
        room.nightAction.witchDone = true
        await m.reply(`☠️ Racun dituangkan untuk *@${target.jid.split('@')[0]}*.\n_(Racun habis)_`)

        await checkNightComplete(room, conn)
        return
    }

    // ── SKIP (Witch) ──────────────────────────────────────────────────────────
    if (action === 'skip') {
        if (m.isGroup) return m.reply('❌ Lakukan di Private Chat bot!')
        if (!room) return m.reply('⚠️ Kamu tidak sedang di dalam game.')
        if (room.state !== 'NIGHT') return m.reply('🚫 Bukan fase malam!')

        let me = room.players.find(p => p.jid === m.sender)
        if (!me || me.role !== 'WITCH') return m.reply('❌ Hanya Penyihir yang bisa skip.')
        if (me.status === 'DEAD') return m.reply('☠️ Kamu sudah mati.')
        if (room.nightAction.witchDone) return m.reply('✅ Sudah skip malam ini.')

        room.nightAction.witchDone = true
        await m.reply('⏭️ Kamu memilih untuk tidak bertindak malam ini.')

        await checkNightComplete(room, conn)
        return
    }

    // ── SHOOT (Hunter) ────────────────────────────────────────────────────────
    if (action === 'shoot') {
        if (m.isGroup) return m.reply('❌ Lakukan di Private Chat bot!')
        if (!room) return m.reply('⚠️ Kamu tidak sedang di dalam game.')
        if (room.state !== 'HUNTER') return m.reply('🚫 Bukan waktu Hunter menembak!')

        let me = room.players.find(p => p.jid === m.sender)
        if (!me || me.role !== 'HUNTER') return m.reply('❌ Kamu bukan Hunter!')
        if (room.hunterPending !== m.sender) return m.reply('❌ Bukan giliranmu!')

        let targetIdx = parseInt(args[1]) - 1
        if (isNaN(targetIdx) || targetIdx < 0 || targetIdx >= room.players.length) return m.reply('❌ Nomor tidak valid!')

        let target = room.players[targetIdx]
        if (!target) return m.reply('❌ Pemain tidak ditemukan.')
        if (target.status === 'DEAD') return m.reply('❌ Target sudah mati.')
        if (target.jid === m.sender) return m.reply('❌ Tidak bisa menembak diri sendiri!')

        target.status      = 'DEAD'
        room.hunterPending = null

        let shotMsg = `🏹 *HUNTER MENEMBAK!*\n\n@${me.jid.split('@')[0]} menembak *@${target.jid.split('@')[0]}*!\n`
        shotMsg += `Peran: *${roleEmoji(target.role)} ${target.role}*\n\n`

        let win = checkWinCondition(room)
        if (win) {
            shotMsg += win === 'VILLAGE'
                ? `🎉 *WARGA DESA MENANG!* 🎉`
                : `🐺 *WEREWOLF MENANG!* 🐺`
            shotMsg += `\n\n*Peran semua pemain:*\n` + room.players.map((p, i) =>
                `${i+1}. @${p.jid.split('@')[0]} → ${roleEmoji(p.role)} ${p.role}`
            ).join('\n')
            await endGame(room, conn, win, shotMsg)
            return
        }

        let alivePlayers = room.players.filter(p => p.status === 'ALIVE')
        shotMsg += `👥 *Pemain Hidup (${alivePlayers.length}):*\n`
        shotMsg += alivePlayers.map((p, i) => `${i+1}. @${p.jid.split('@')[0]}`).join('\n')
        shotMsg += `\n\n🗳️ Berdiskusi dan vote:\n*.ww vote <nomor>*\n⏰ Waktu voting: *${VOTE_TIMEOUT_SEC} detik*`

        room.state = 'DAY'
        room.votes = {}
        await safeSendGroup(conn, room.id, { text: shotMsg, mentions: room.players.map(p => p.jid) })
        startVoteTimer(room, conn)
        return
    }

    // ── VOTE ──────────────────────────────────────────────────────────────────
    if (action === 'vote') {
        if (!m.isGroup) return m.reply('❌ Voting hanya bisa di grup!')
        if (!room) return m.reply('⚠️ Tidak ada game aktif.')
        if (room.state !== 'DAY') return m.reply('🚫 Voting hanya di siang hari!')

        let me = room.players.find(p => p.jid === m.sender)
        if (!me) return m.reply('❌ Kamu tidak ikut game ini.')
        if (me.status === 'DEAD') return m.reply('☠️ Orang mati tidak bisa vote.')
        if (room.votes[m.sender]) return m.reply('❌ Sudah memberikan suara!')

        let targetIdx = parseInt(args[1]) - 1
        if (isNaN(targetIdx) || targetIdx < 0 || targetIdx >= room.players.length) return m.reply('❌ Nomor tidak valid!')

        let target = room.players[targetIdx]
        if (!target) return m.reply('❌ Pemain tidak ditemukan.')
        if (target.status === 'DEAD') return m.reply('❌ Pemain itu sudah mati.')
        if (target.jid === m.sender) return m.reply('❌ Tidak bisa vote diri sendiri!')

        room.votes[m.sender] = target.jid

        let aliveCount = room.players.filter(p => p.status === 'ALIVE').length
        let voteCount  = Object.keys(room.votes).length

        await conn.sendMessage(m.chat, {
            text     : `🗳️ *@${m.sender.split('@')[0]}* vote *@${target.jid.split('@')[0]}*\n(${voteCount}/${aliveCount} suara masuk)`,
            mentions : [m.sender, target.jid]
        }, { quoted: m })

        await sendVoteSummary(room, conn)

        if (voteCount >= aliveCount) {
            await resolveVote(room, conn)
        }
        return
    }

    // ── STOP ──────────────────────────────────────────────────────────────────
    if (action === 'stop') {
        if (!m.isGroup) return m.reply('❌ Hanya bisa di grup.')
        if (!global.werewolf[m.chat]) return m.reply('⚠️ Tidak ada game aktif.')

        let isHost  = global.werewolf[m.chat].host === m.sender
        let isAdmin = false
        try {
            let meta = await conn.groupMetadata(m.chat)
            isAdmin  = meta.participants.find(p => p.id === m.sender)?.admin != null
        } catch (_) {}

        if (!isHost && !isAdmin) return m.reply('❌ Hanya Host atau Admin yang bisa stop.')

        clearNightTimer(global.werewolf[m.chat])
        clearVoteTimer(global.werewolf[m.chat])
        delete global.werewolf[m.chat]
        return m.reply(`🛑 *Game dihentikan.*\nKetik *${pfx} create* untuk mulai lagi.`)
    }

    return m.reply(`❓ Perintah tidak dikenal. Ketik *${pfx} help* untuk bantuan.`)
}

handler.help    = ['ww', 'werewolf']
handler.tags    = ['game']
handler.command = /^(ww|werewolf)$/i

export default handler