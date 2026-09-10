// Elarion RPG - plugin tunggal via command .rpg / .elarion
// DB terpisah database-rpg.json. Tanpa emoji bawaan, hanya simbol fonts-emojis.
import { getPlayer, setPlayer, getDB, writeDB, isRpgEnabled, setRpgEnabled } from '../lib/rpg-db.js'
import * as R from '../lib/rpg.js'

const A = R.ARROW
const HELP = `${R.head('ELARION RPG')}
${R.SEP_B}
Dunia fantasi via chat. DB tersimpan terpisah di database-rpg.json.
${A} toggle grup: rpg on | rpg off (admin grup saja, chat pribadi selalu aktif)
${A} mulai: rpg start [nama]
${A} lihat: rpg profile | rpg stats | rpg inv | rpg skill | rpg equipment
${A} main: rpg adventure | rpg hunt | rpg explore
${A} tempur: rpg attack | rpg skilluse | rpg defend | rpg flee | rpg use [id]
${A} progres: rpg quest | rpg daily | rpg weekly | rpg ach | rpg title | rpg rep
${A} dungeon: rpg dungeon [normal/hard/nightmare/hell/abyss]
${A} ekonomi: rpg shop | rpg buy [id] | rpg sell [id] | rpg trade @user [gold] | rpg gift @user [id]
${A} gear: rpg equip [id] | rpg enhance | rpg heal
${A} sosial: rpg party | rpg guild | rpg duel | rpg rank [level/gold/kill] | rpg wb | rpg event
${A} lain: rpg class [nama] | rpg rename [nama] | rpg wilayah [id]
${R.SEP_A}`

function need(p, m) {
  if (!p) return 'Belum mulai. Ketik: rpg start [nama]\n' + A + ' contoh: rpg start Arasya'
  if (!p.classId) return 'Pilih class dulu. Ketik: rpg class [nama]\n' + A + ' daftar: ' + Object.keys(R.CLASS_LIST).join(', ')
  return null
}

function profileTxt(p, jid) {
  const c = R.CLASS_LIST[p.classId] || { nama: '-' }
  const w = R.wilayahById(p.wilayah)
  return `${R.head('PROFILE')}
${R.SEP_B}
Nama : ${p.nama} | Lv ${p.level}
Class : ${c.nama} | Title : ${p.title}
Wilayah : ${w.nama}
HP : ${R.bar(p.hp, p.maxHp)}
MP : ${R.bar(p.mana, p.maxMana)}
ATK ${p.atk} | DEF ${p.def} | SPD ${p.spd}
Crit ${p.crit}% | Luck ${p.luck}
Gold : ${R.fmt(p.gold)} | EXP ${p.exp}/${R.expNeeded(p.level)}
SkillPoint : ${p.skillPoint}
${A} lanjut: rpg stats | rpg inv | rpg adventure
${R.SEP_A}`
}

function battleTxt(p) {
  const b = p.battle
  if (!b) return 'Tidak ada battle aktif.'
  return `${R.head('BATTLE')}
${R.SEP_B}
${b.nama} [ ${b.tier} | Lv ${b.lv} ]
HP : ${R.bar(b.hp, b.maxHp)}
ATK ${b.atk} | DEF ${b.def}
${A} Kamu HP ${R.fmt(p.hp)}/${R.fmt(p.maxHp)} | MP ${R.fmt(p.mana)}/${R.fmt(p.maxMana)}
${A} pilih: rpg attack | rpg skilluse | rpg defend | rpg use [id] | rpg flee
${R.SEP_A}`
}

function winBattle(p, b) {
  const exp = b.exp + R.rand(0, 20)
  const gold = b.gold + R.rand(0, 50)
  const naik = R.addExp(p, exp)
  p.gold += gold
  p.kills = (p.kills || 0) + 1
  const qk = 'mq' + p.quest.main
  p.quest[qk] = (p.quest[qk] || 0) + 1
  const drops = []
  if (Math.random() < 0.35) { const ex = p.inv.find(i => i.id === 'php'); if (ex) ex.qty += 1; else p.inv.push({ id: 'php', n: 'Potion HP +300', qty: 1 }); drops.push('Potion HP +300 x1') }
  if (Math.random() < 0.12) { p.gold += 300; drops.push('Bonus Gold +300') }
  if (b.tier === 'Elite' || b.tier === 'Epic' || b.tier === 'Boss') { p.rep.pemburu += 5 }
  const nb = R.checkAch(p)
  p.battle = null; p.defend = false
  p.hp = Math.min(p.maxHp, p.hp + 10)
  let t = `${R.head('MENANG')}
${R.SEP_B}
${A} Kalahkan ${b.nama} [${b.tier}]
${A} EXP +${exp} | Gold +${gold}
${A} Drop: ${drops.length ? drops.join(', ') : '-'}
${drops.length ? '' : A + ' tips: rpg hunt lagi untuk farm'}
${naik > 0 ? A + ' NAIK LEVEL +' + naik + ' ke Lv ' + p.level + ' | HP/MP pulih penuh' + '\n' : ''}${nb.length ? A + ' Ach baru: ' + nb.map(x => x.nama).join(', ') + '\n' : ''}${A} lanjut: rpg adventure | rpg quest | rpg profile
${R.SEP_A}`
  return t
}

function enemyTurn(p, b) {
  let dmg = Math.max(1, Math.round(b.atk * (0.85 + Math.random() * 0.3) - p.def * 0.5))
  if (p.defend) { dmg = Math.max(1, Math.round(dmg * 0.5)); p.defend = false; p.mana = Math.min(p.maxMana, p.mana + 10) }
  p.hp -= dmg
  return dmg
}

let handler = async (m, { conn, text, usedPrefix, isAdmin, isOwner, isROwner }) => {
  const jid = m.sender
  const args = (text || '').trim().split(/\s+/).filter(Boolean)
  const sub = (args[0] || '').toLowerCase()
  const rest = args.slice(1).join(' ')
  let p = getPlayer(jid)
  const px = usedPrefix + 'rpg '
  const isGroup = !!m.isGroup
  const enabled = isRpgEnabled(m.chat, isGroup)
  const statusTxt = isGroup ? (enabled ? 'AKTIF di grup ini' : 'NONAKTIF di grup ini') : 'AKTIF (chat pribadi selalu aktif)'

  async function sendToggle() {
    const t = `${R.head('ELARION RPG')}
${R.SEP_B}
${A} Status: ${statusTxt}
${A} Ketik: ${px}on untuk aktifkan | ${px}off untuk matikan
${isGroup ? A + ' Hanya admin grup / owner yang bisa toggle.\n' : ''}${R.SEP_B}
${HELP}`
    const btns = [
      { id: `${px}on`, title: 'Aktifkan RPG' },
      { id: `${px}off`, title: 'Matikan RPG' }
    ]
    try {
      await conn.sendButtons(m.chat, t, btns, { footer: 'ELARION RPG', quoted: m })
    } catch {
      await m.reply(t + `\n${A} Tombol tidak didukung, ketik manual: ${px}on / ${px}off`)
    }
  }

  // Bare: rpg saja -> tombol on/off + status
  if (!sub || sub === 'help' || sub === 'menu') return sendToggle()

  // TOGGLE on/off
  if (sub === 'on' || sub === 'enable' || sub === 'aktif') {
    if (!isGroup) return m.reply(`${R.head('ELARION RPG')}\n${A} Chat pribadi selalu AKTIF.\n${R.SEP_A}`)
    if (!(isAdmin || isOwner || isROwner)) return global.dfail ? global.dfail('admin', m, conn) : m.reply('Hanya admin grup yang bisa mengaktifkan RPG.')
    setRpgEnabled(m.chat, true)
    return m.reply(`${R.head('ELARION RPG')}\n${A} RPG DIAKTIFKAN untuk grup ini.\n${A} Mulai: ${px}start [nama]\n${R.SEP_A}`)
  }
  if (sub === 'off' || sub === 'disable' || sub === 'mati') {
    if (!isGroup) return m.reply(`${R.head('ELARION RPG')}\n${A} Chat pribadi tidak bisa dimatikan.\n${R.SEP_A}`)
    if (!(isAdmin || isOwner || isROwner)) return global.dfail ? global.dfail('admin', m, conn) : m.reply('Hanya admin grup yang bisa mematikan RPG.')
    setRpgEnabled(m.chat, false)
    return m.reply(`${R.head('ELARION RPG')}\n${A} RPG DIMATIKAN untuk grup ini.\n${A} Aktifkan lagi: ${px}on\n${R.SEP_A}`)
  }

  // Gate: grup nonaktif -> tolak selain on/off
  if (isGroup && !enabled) {
    const t = `${R.head('ELARION RPG')}\n${A} RPG NONAKTIF di grup ini.\n${A} Minta admin ketik: ${px}on`
    try {
      await conn.sendButtons(m.chat, t, [{ id: `${px}on`, title: 'Aktifkan RPG' }], { footer: 'ELARION RPG', quoted: m })
    } catch {
      await m.reply(t)
    }
    return
  }

  // START
  if (sub === 'start' || sub === 'register' || sub === 'daftar') {
    if (p) return m.reply(`${R.head('ELARION')}\n${A} Kamu sudah terdaftar sebagai ${p.nama} Lv ${p.level}.\n${A} lanjut: ${px}profile`)
    const nm = rest || m.name || jid.split('@')[0]
    p = R.newPlayer(nm.slice(0, 20))
    setPlayer(jid, p)
    return m.reply(`${R.head('SELAMAT DATANG DI ELARION')}
${R.SEP_B}
${A} Nama: ${p.nama}
${A} Gold awal: ${R.fmt(p.gold)}
${A} Pilih class: ${px}class [nama]
${A} Daftar: ${Object.keys(R.CLASS_LIST).join(', ')}
${A} contoh: ${px}class warrior
${R.SEP_A}`)
  }

  if (!p) return m.reply(need(null, m))

  // CLASS
  if (sub === 'class' || sub === 'job') {
    if (!rest) {
      let t = `${R.head('DAFTAR CLASS')}\n${R.SEP_B}\n`
      for (const [id, c] of Object.entries(R.CLASS_LIST)) t += `${A} ${id} = ${c.nama} [${c.role}] - ${c.desc}\n`
      t += `${A} pakai: ${px}class warrior\n${R.SEP_A}`
      return m.reply(t)
    }
    const id = rest.toLowerCase()
    const c = R.CLASS_LIST[id]
    if (!c) return m.reply('Class tidak ada. Ketik: rpg class untuk daftar.')
    if (['assassin', 'necromancer'].includes(id) && p.level < 10) return m.reply('Class ini butuh Lv 10+. Hunt dulu via: ' + px + 'hunt')
    p.classId = id
    p.maxHp = 100 + c.hp; p.hp = p.maxHp
    p.maxMana = 50 + c.mana; p.mana = p.maxMana
    p.atk = 10 + c.atk; p.def = 8 + c.def; p.spd = 8 + c.spd
    p.crit = c.crit; p.luck = c.luck
    setPlayer(jid, p)
    return m.reply(`${R.head('CLASS DIPILIH')}\n${A} ${c.nama} [${c.role}]\n${A} Skill: ${c.skills.map(s => s.n).join(', ')}\n${A} lanjut: ${px}profile | ${px}adventure\n${R.SEP_A}`)
  }

  // RENAME
  if (sub === 'rename') {
    if (!rest) return m.reply('Pakai: rpg rename [nama baru]')
    p.nama = rest.slice(0, 20); setPlayer(jid, p)
    return m.reply(`${R.head('RENAME')}\n${A} Nama baru: ${p.nama}\n${R.SEP_A}`)
  }

  // PROFILE / STATS / INV / SKILL
  if (sub === 'profile' || sub === 'me') { const e = need(p, m); if (e && !p.classId && p) { if (!p.classId) return m.reply(e) } return m.reply(profileTxt(p, jid)) }
  if (sub === 'stats' || sub === 'stat') {
    const e = need(p, m); if (e) return m.reply(e)
    const c = R.CLASS_LIST[p.classId]
    return m.reply(`${R.head('STATS')}\n${R.SEP_B}\n${A} ${p.nama} | ${c.nama} Lv ${p.level}\n${A} HP ${R.fmt(p.hp)}/${R.fmt(p.maxHp)} | MP ${R.fmt(p.mana)}/${R.fmt(p.maxMana)}\n${A} ATK ${p.atk} DEF ${p.def} SPD ${p.spd} Crit ${p.crit}% Luck ${p.luck}\n${A} Quest Main Ch.${p.quest.main} | Title ${p.title}\n${A} Rep: kerajaan ${p.rep.kerajaan}, pemburu ${p.rep.pemburu}\n${R.SEP_A}`)
  }
  if (sub === 'inv' || sub === 'inventory' || sub === 'tas') {
    let t = `${R.head('INVENTORY')}\n${R.SEP_B}\n${A} Gold: ${R.fmt(p.gold)}\n`
    if (!p.inv.length) t += `${A} kosong. Beli via: ${px}shop\n`
    else p.inv.forEach((it, i) => { t += `${A} ${i + 1}. ${it.n} x${it.qty} [${it.id}]\n` })
    t += `${A} pakai: ${px}use [id] | ${px}equip [id]\n${R.SEP_A}`
    return m.reply(t)
  }
  if (sub === 'skill' && !rest) {
    const e = need(p, m); if (e) return m.reply(e)
    const c = R.CLASS_LIST[p.classId]
    let t = `${R.head('SKILL - ' + c.nama)}\n${R.SEP_B}\n`
    c.skills.forEach((s, i) => { t += `${A} ${i + 1}. ${s.n} | MP ${s.mp} | Pow x${s.pow}\n` })
    t += `${A} pakai di battle: ${px}skilluse 1\n${R.SEP_A}`
    return m.reply(t)
  }
  if (sub === 'equip') {
    const e = need(p, m); if (e) return m.reply(e)
    if (!rest) return m.reply('Pakai: rpg equip [id]\n' + A + ' contoh: rpg equip ironsword')
    const id = rest.toLowerCase()
    const st = R.EQUIP_STAT[id]
    if (!st) return m.reply('Item ini tidak bisa di-equip. Cek: ' + px + 'shop')
    const idx = p.inv.findIndex(i => i.id === id)
    if (idx < 0) return m.reply('Item tidak ada di tas. Beli dulu: ' + px + 'buy ' + id)
    if (p.equip[st.slot]) return m.reply('Slot ' + st.slot + ' sudah terisi (' + p.equip[st.slot] + ').')
    const it = p.inv[idx]
    p.equip[st.slot] = it.n
    if (st.atk) p.atk += st.atk
    if (st.def) p.def += st.def
    if (st.spd) p.spd += st.spd
    if (st.crit) p.crit += st.crit
    if (st.luck) p.luck += st.luck
    if (st.hp) { p.maxHp += st.hp; p.hp += st.hp }
    it.qty -= 1; if (it.qty <= 0) p.inv.splice(idx, 1)
    const nb = R.checkAch(p); setPlayer(jid, p)
    return m.reply(`${R.head('EQUIP')}\n${A} Pasang [${st.slot}]: ${it.n}\n${A} ATK ${p.atk} | DEF ${p.def} | SPD ${p.spd}${nb.length ? '\n' + A + ' Ach baru: ' + nb.map(x => x.nama).join(', ') : ''}\n${R.SEP_A}`)
  }
  if (sub === 'equipment' || sub === 'gear') {
    let t = `${R.head('EQUIPMENT')}\n${R.SEP_B}\n`
    for (const s of ['weapon', 'armor', 'helmet', 'boots', 'ring', 'necklace']) t += `${A} ${s}: ${p.equip[s] || '-'}\n`
    t += `${A} stat: ATK ${p.atk} DEF ${p.def} SPD ${p.spd} Crit ${p.crit}% Luck ${p.luck}\n${R.SEP_A}`
    return m.reply(t)
  }
  if (sub === 'enhance') {
    const e = need(p, m); if (e) return m.reply(e)
    if (!p.equip.weapon && !p.equip.armor) return m.reply('Equip dulu minimal weapon/armor.')
    const cost = 1000 + p.level * 100
    if (p.gold < cost) return m.reply(`Butuh ${R.fmt(cost)}G. Kamu ${R.fmt(p.gold)}G.`)
    p.gold -= cost
    if (Math.random() < 0.7) { p.atk += 3; p.def += 2; setPlayer(jid, p); return m.reply(`${R.head('ENHANCE SUKSES')}\n${A} ATK +3 DEF +2. Sisa ${R.fmt(p.gold)}G.\n${R.SEP_A}`) }
    setPlayer(jid, p)
    return m.reply(`${R.head('ENHANCE GAGAL')}\n${A} Gold hilang. Coba lagi.\n${R.SEP_A}`)
  }
  if (sub === 'title' || sub === 'titles') {
    if (!rest) {
      let t = `${R.head('TITLE')}\n${R.SEP_B}\n${A} aktif: ${p.title}\n`
      R.TITLES.forEach(ti => { t += `${A} ${ti.id} - ${ti.nama} [${ti.syarat}]\n` })
      t += `${A} pakai: ${px}title pemburu\n${R.SEP_A}`
      return m.reply(t)
    }
    const ti = R.TITLES.find(x => x.id === rest.toLowerCase())
    if (!ti) return m.reply('Title tidak ada.')
    p.title = ti.nama; setPlayer(jid, p)
    return m.reply(`${A} Title aktif: ${ti.nama}\n${R.SEP_A}`)
  }
  if (sub === 'ach' || sub === 'achievement') {
    const nb = R.checkAch(p); setPlayer(jid, p)
    let t = `${R.head('ACHIEVEMENT')}\n${R.SEP_B}\n${A} milik: ${p.ach.length ? p.ach.join(', ') : '-'}\n`
    R.ACHIEVEMENTS.forEach(a => { t += `${A} ${a.id} - ${a.nama}: ${a.desc}\n` })
    if (nb.length) t += `${A} baru dibuka: ${nb.map(x => x.nama).join(', ')}\n`
    t += R.SEP_A
    return m.reply(t)
  }
  if (sub === 'rep' || sub === 'reputasi') {
    let t = `${R.head('REPUTASI')}\n${R.SEP_B}\n`
    for (const [k, v] of Object.entries(p.rep)) t += `${A} ${k}: ${v}\n`
    t += `${A} naik via quest/dungeon. Buka shop dan quest khusus.\n${R.SEP_A}`
    return m.reply(t)
  }
  if (sub === 'heal') {
    const cost = 300
    if (p.gold < cost) return m.reply('Butuh 300G untuk heal.')
    p.gold -= cost; p.hp = p.maxHp; p.mana = p.maxMana
    setPlayer(jid, p)
    return m.reply(`${A} Pulih penuh. HP ${R.fmt(p.hp)}. Sisa ${R.fmt(p.gold)}G.\n${R.SEP_A}`)
  }
  if (sub === 'gift') {
    const target = m.mentionedJid && m.mentionedJid[0]
    const itemId = args[args.length - 1].toLowerCase()
    if (!target || !itemId) return m.reply('Pakai: rpg gift @user [id]')
    const q = getPlayer(target)
    if (!q) return m.reply('Target belum main RPG.')
    const idx = p.inv.findIndex(i => i.id === itemId)
    if (idx < 0) return m.reply('Item tidak ada di tasmu.')
    const it = p.inv[idx]
    const ex = q.inv.find(i => i.id === it.id)
    if (ex) ex.qty += 1
    else q.inv.push({ id: it.id, n: it.n, qty: 1 })
    it.qty -= 1; if (it.qty <= 0) p.inv.splice(idx, 1)
    setPlayer(jid, p); setPlayer(target, q)
    return m.reply(`${A} Kirim ${it.n} x1 ke ${q.nama}.\n${R.SEP_A}`)
  }

  // WILAYAH
  if (sub === 'wilayah' || sub === 'area' || sub === 'map') {
    if (!rest) {
      let t = `${R.head('WILAYAH ELARION')}\n${R.SEP_B}\n`
      R.WILAYAH.forEach(w => { t += `${A} ${w.id} [Lv ${w.minLv}+] - ${w.nama}\n` })
      t += `${A} pindah: ${px}wilayah hutan\n${A} kamu: ${R.wilayahById(p.wilayah).nama}\n${R.SEP_A}`
      return m.reply(t)
    }
    const w = R.WILAYAH.find(x => x.id === rest.toLowerCase())
    if (!w) return m.reply('Wilayah tidak ada.')
    if (p.level < w.minLv) return m.reply(`Butuh Lv ${w.minLv}. Kamu Lv ${p.level}.`)
    p.wilayah = w.id; setPlayer(jid, p)
    return m.reply(`${R.head('Pindah WILAYAH')}\n${A} Kini: ${w.nama}\n${A} ${w.desc}\n${R.SEP_A}`)
  }

  // ADVENTURE / HUNT / EXPLORE
  if (sub === 'adventure' || sub === 'adv' || sub === 'hunt' || sub === 'explore') {
    const e = need(p, m); if (e) return m.reply(e)
    if (p.battle) return m.reply('Selesaikan battle dulu.\n' + battleTxt(p))
    const cdKey = sub === 'hunt' ? 'hunt' : 'adv'
    const cdMs = sub === 'hunt' ? 45000 : 120000
    if (Date.now() - (p.cd[cdKey] || 0) < cdMs) {
      const s = Math.ceil((cdMs - (Date.now() - p.cd[cdKey])) / 1000)
      return m.reply(`${R.head('COOLDOWN')}\n${A} tunggu ${s} detik lagi.\n${R.SEP_A}`)
    }
    p.cd[cdKey] = Date.now()
    const w = R.wilayahById(p.wilayah)
    const roll = Math.random()
    if (roll < 0.45) {
      const mo = R.monsterForLevel(p.level)
      p.battle = mo; setPlayer(jid, p)
      return m.reply(`${R.head('ENCOUNTER - ' + w.nama)}\n${R.SEP_B}\n${A} Kamu bertemu ${mo.nama} [${mo.tier} Lv ${mo.lv}]\n${battleTxt(p)}`)
    } else if (roll < 0.75) {
      const g = R.rand(100, 300) + p.level * 20
      const x = R.rand(40, 120) + p.level * 8
      p.gold += g; const naik = R.addExp(p, x); setPlayer(jid, p)
      return m.reply(`${R.head('HASIL ' + sub.toUpperCase())}\n${R.SEP_B}\n${A} Lokasi: ${w.nama}\n${A} EXP +${x} | Gold +${g}\n${A} Loot: Herbal x${R.rand(1, 3)}${naik ? '\n' + A + ' NAIK ke Lv ' + p.level : ''}\n${A} lanjut: ${px}hunt | ${px}quest\n${R.SEP_A}`)
    } else if (roll < 0.9) {
      p.inv.push({ id: 'php', n: 'Potion HP +300', qty: 1 })
      const x = R.rand(60, 150); const naik = R.addExp(p, x); setPlayer(jid, p)
      return m.reply(`${R.head('TREASURE')}\n${A} Peti di ${w.nama}: Potion HP +300 x1\n${A} EXP +${x}${naik ? ' | NAIK Lv ' + p.level : ''}\n${R.SEP_A}`)
    } else {
      p.inv.push({ id: 'bomb', n: 'Bom Api', qty: 1 })
      setPlayer(jid, p)
      return m.reply(`${R.head('RARE EVENT')}\n${A} Merchant misterius: kamu dapat Bom Api x1\n${A} lanjut: ${px}inv\n${R.SEP_A}`)
    }
  }

  // COMBAT
  if (sub === 'attack' || sub === 'hit') {
    const e = need(p, m); if (e) return m.reply(e)
    if (!p.battle) return m.reply('Tidak ada musuh. Cari via: ' + px + 'hunt')
    const b = p.battle
    const r = R.calcDamage(p.atk, b.def, 1, p.crit)
    b.hp -= r.dmg
    let t = `${A} Kamu serang: -${r.dmg}${r.crit ? ' CRIT' : ''} ke ${b.nama}\n`
    if (b.hp <= 0) { const s = winBattle(p, b); setPlayer(jid, p); return m.reply(t + s) }
    const ed = enemyTurn(p, b)
    t += `${A} Musuh balas: -${ed} ke kamu [HP ${Math.max(0, p.hp)}/${p.maxHp}]\n`
    if (p.hp <= 0) { p.hp = Math.round(p.maxHp * 0.5); p.battle = null; p.gold = Math.max(0, p.gold - 200); setPlayer(jid, p); return m.reply(t + `${A} Kamu tumbang. Respawn HP 50%. Gold -200.\n${R.SEP_A}`) }
    setPlayer(jid, p)
    return m.reply(t + battleTxt(p))
  }
  if (sub === 'skilluse' || sub === 'sk') {
    const e = need(p, m); if (e) return m.reply(e)
    if (!p.battle) return m.reply('Tidak ada musuh.')
    const c = R.CLASS_LIST[p.classId]
    const idx = Math.max(0, (parseInt(rest) || 1) - 1)
    const sk = c.skills[idx] || c.skills[0]
    if (p.mana < sk.mp) return m.reply(`MP kurang. Butuh ${sk.mp}, kamu ${p.mana}.`)
    p.mana -= sk.mp
    const b = p.battle
    if (sk.pow < 0) { const h = 150 + p.level * 10; p.hp = Math.min(p.maxHp, p.hp + h); setPlayer(jid, p); return m.reply(`${A} ${sk.n}: Heal +${h} [HP ${p.hp}/${p.maxHp}]\n` + battleTxt(p)) }
    if (sk.pow === 0) { p.defend = true; setPlayer(jid, p); return m.reply(`${A} ${sk.n}: stance bertahan.\n` + battleTxt(p)) }
    const r = R.calcDamage(p.atk, b.def, sk.pow, p.crit + 5)
    b.hp -= r.dmg
    let t = `${A} ${sk.n}: -${r.dmg}${r.crit ? ' CRIT' : ''}\n`
    if (b.hp <= 0) { const s = winBattle(p, b); setPlayer(jid, p); return m.reply(t + s) }
    const ed = enemyTurn(p, b)
    t += `${A} Musuh balas -${ed} [HP ${Math.max(0, p.hp)}/${p.maxHp}]\n`
    if (p.hp <= 0) { p.hp = Math.round(p.maxHp * 0.5); p.battle = null; setPlayer(jid, p); return m.reply(t + `${A} Tumbang. Respawn 50%.\n${R.SEP_A}`) }
    setPlayer(jid, p)
    return m.reply(t + battleTxt(p))
  }
  if (sub === 'defend' || sub === 'guard') {
    if (!p.battle) return m.reply('Tidak ada musuh.')
    p.defend = true; setPlayer(jid, p)
    return m.reply(`${A} Bertahan. Damage berikutnya -50%.\n` + battleTxt(p))
  }
  if (sub === 'flee' || sub === 'kabur') {
    if (!p.battle) return m.reply('Tidak ada musuh.')
    const b = p.battle
    const chance = 50 + (p.spd - b.lv) * 2
    if (Math.random() * 100 < chance) { p.battle = null; setPlayer(jid, p); return m.reply(`${A} Berhasil kabur dari ${b.nama}.\n${R.SEP_A}`) }
    const ed = enemyTurn(p, b); setPlayer(jid, p)
    return m.reply(`${A} Gagal kabur. Musuh hit -${ed}.\n` + battleTxt(p))
  }
  if (sub === 'use') {
    if (!rest) return m.reply('Pakai: rpg use [id]. Cek: rpg inv')
    const idx = p.inv.findIndex(i => i.id === rest.toLowerCase())
    if (idx < 0) return m.reply('Item tidak ada.')
    const it = p.inv[idx]
    if (it.id === 'php') p.hp = Math.min(p.maxHp, p.hp + 300)
    else if (it.id === 'pmp') p.mana = Math.min(p.maxMana, p.mana + 200)
    else if (it.id === 'bomb' && p.battle) { p.battle.hp -= 250 }
    else return m.reply('Item itu untuk equip/shop, bukan use.')
    it.qty -= 1; if (it.qty <= 0) p.inv.splice(idx, 1)
    setPlayer(jid, p)
    if (p.battle && p.battle.hp <= 0) { const s = winBattle(p, p.battle); setPlayer(jid, p); return m.reply(`${A} Pakai ${it.n}.\n` + s) }
    return m.reply(`${A} Pakai ${it.n}. HP ${p.hp}/${p.maxHp} MP ${p.mana}/${p.maxMana}\n` + (p.battle ? battleTxt(p) : R.SEP_A))
  }

  // QUEST / DAILY / WEEKLY
  if (sub === 'quest') {
    const e = need(p, m); if (e) return m.reply(e)
    const ch = p.quest.main
    const needKill = 3 + ch * 2
    const key = 'mq' + ch
    const prog = p.quest[key] || 0
    if (prog >= needKill) {
      const rw = 300 + ch * 250
      p.gold += rw; const naik = R.addExp(p, 200 + ch * 150)
      p.quest.main += 1; p.rep.kerajaan += 20
      setPlayer(jid, p)
      return m.reply(`${R.head('QUEST SELESAI')}\n${A} Chapter ${ch} clear. Gold +${rw}${naik ? ' | NAIK Lv ' + p.level : ''}\n${A} lanjut: ${px}quest\n${R.SEP_A}`)
    }
    return m.reply(`${R.head('MAIN QUEST Ch.' + ch)}\n${R.SEP_B}\n${A} Kalahkan ${needKill} monster via ${px}hunt [${prog}/${needKill}]\n${A} tiap menang di hunt menambah 1 progres.\n${R.SEP_A}`)
  }
  if (sub === 'daily') {
    const today = new Date().toISOString().slice(0, 10)
    if (p.quest.lastDaily === today) return m.reply('Daily sudah diklaim. Besok lagi.')
    p.quest.lastDaily = today; p.gold += 1000
    const naik = R.addExp(p, 300)
    p.inv.push({ id: 'php', n: 'Potion HP +300', qty: 2 })
    setPlayer(jid, p)
    return m.reply(`${R.head('DAILY REWARD')}\n${A} Gold +1000 | EXP +300 | Potion x2${naik ? ' | NAIK Lv ' + p.level : ''}\n${R.SEP_A}`)
  }
  if (sub === 'weekly') {
    const wk = Math.floor(Date.now() / (7 * 864e5))
    if (p.quest.lastWeekly === wk) return m.reply('Weekly sudah diklaim.')
    p.quest.lastWeekly = wk; p.gold += 5000
    const naik = R.addExp(p, 1200)
    setPlayer(jid, p)
    return m.reply(`${R.head('WEEKLY REWARD')}\n${A} Gold +5000 | EXP +1200${naik ? ' | NAIK Lv ' + p.level : ''}\n${R.SEP_A}`)
  }

  // SHOP / BUY / SELL
  if (sub === 'shop') {
    let t = `${R.head('SHOP KERAJAAN')}\n${R.SEP_B}\n${A} Gold: ${R.fmt(p.gold)}\n`
    R.SHOP.forEach(s => { t += `${A} ${s.id} - ${s.nama} : ${R.fmt(s.harga)}G\n` })
    t += `${A} beli: ${px}buy php\n${R.SEP_A}`
    return m.reply(t)
  }
  if (sub === 'buy') {
    if (!rest) return m.reply('Pakai: rpg buy [id]')
    const s = R.SHOP.find(x => x.id === rest.toLowerCase())
    if (!s) return m.reply('Item tidak ada di shop.')
    if (p.gold < s.harga) return m.reply('Gold kurang.')
    p.gold -= s.harga
    const ex = p.inv.find(i => i.id === s.id)
    if (ex) ex.qty += 1
    else p.inv.push({ id: s.id, n: s.nama, qty: 1 })
    setPlayer(jid, p)
    return m.reply(`${A} Beli ${s.nama}. Sisa ${R.fmt(p.gold)}G.\n${R.SEP_A}`)
  }
  if (sub === 'sell') {
    if (!rest) return m.reply('Pakai: rpg sell [id]')
    const idx = p.inv.findIndex(i => i.id === rest.toLowerCase())
    if (idx < 0) return m.reply('Item tidak ada.')
    const s = R.SHOP.find(x => x.id === p.inv[idx].id)
    const harga = s ? Math.floor(s.harga * 0.4) : 200
    p.gold += harga; p.inv[idx].qty -= 1
    if (p.inv[idx].qty <= 0) p.inv.splice(idx, 1)
    setPlayer(jid, p)
    return m.reply(`${A} Jual +${harga}G. Kini ${R.fmt(p.gold)}G.\n${R.SEP_A}`)
  }

  // DUNGEON bertier
  if (sub === 'dungeon' || sub === 'dg') {
    const e = need(p, m); if (e) return m.reply(e)
    const tierId = (rest || 'normal').toLowerCase()
    const dg = R.DUNGEONS.find(d => d.id === tierId)
    if (!dg) {
      let t = `${R.head('DUNGEON')}\n${R.SEP_B}\n`
      R.DUNGEONS.forEach(d => { t += `${A} ${d.id} [Lv ${d.minLv}+] x${d.mult} - ${d.desc}\n` })
      t += `${A} pakai: ${px}dungeon hard\n${R.SEP_A}`
      return m.reply(t)
    }
    if (p.level < dg.minLv) return m.reply(`Butuh Lv ${dg.minLv}. Kamu Lv ${p.level}.`)
    if (Date.now() - (p.cd.dg || 0) < 180000) {
      const s = Math.ceil((180000 - (Date.now() - p.cd.dg)) / 1000)
      return m.reply(`Dungeon cooldown ${s} detik.`)
    }
    if (dg.tiket > 0) {
      const ti = p.inv.find(i => i.id === 'tiketdg')
      const punya = ti ? ti.qty : 0
      if (punya < dg.tiket) return m.reply(`Butuh tiket x${dg.tiket}. Punya x${punya}. Beli: ${px}buy tiketdg`)
      ti.qty -= dg.tiket; if (ti.qty <= 0) p.inv.splice(p.inv.indexOf(ti), 1)
    }
    p.cd.dg = Date.now()
    const stages = 3
    let totExp = 0, totGold = 0
    for (let i = 0; i < stages; i++) { totExp += Math.round((R.rand(80, 160) + p.level * 10) * dg.mult); totGold += Math.round((R.rand(150, 400) + p.level * 15) * dg.mult) }
    const naik = R.addExp(p, totExp); p.gold += totGold
    p.dgClear = (p.dgClear || 0) + 1
    p.rep.pemburu += 10
    let bonus = ''
    if (dg.id !== 'normal' && Math.random() < 0.35) { const ex = p.inv.find(i => i.id === 'powerring'); if (ex) ex.qty += 1; else p.inv.push({ id: 'powerring', n: 'Power Ring [Epic]', qty: 1 }); bonus = ' | Drop: Power Ring' }
    else if (Math.random() < 0.25) { const ex = p.inv.find(i => i.id === 'ironsword'); if (ex) ex.qty += 1; else p.inv.push({ id: 'ironsword', n: 'Iron Sword [Rare]', qty: 1 }); bonus = ' | Drop: Iron Sword' }
    const nb = R.checkAch(p); setPlayer(jid, p)
    return m.reply(`${R.head('DUNGEON ' + dg.nama.toUpperCase() + ' CLEAR')}\n${R.SEP_B}\n${A} 3 stage selesai.\n${A} EXP +${totExp} | Gold +${totGold}${bonus}${naik ? '\n' + A + ' NAIK Lv ' + p.level : ''}${nb.length ? '\n' + A + ' Ach: ' + nb.map(x => x.nama).join(', ') : ''}\n${R.SEP_A}`)
  }

  // PARTY / GUILD (ringkas, tersimpan di DB baru)
  if (sub === 'party') {
    const db = getDB()
    const pid = 'party_' + (m.chat || jid).replace(/[^0-9]/g, '').slice(-6)
    if (!db.parties[pid]) db.parties[pid] = { members: [] }
    const pt = db.parties[pid]
    if (!pt.members.includes(jid)) pt.members.push(jid)
    writeDB()
    return m.reply(`${R.head('PARTY')}\n${A} Anggota ${pt.members.length}/4 di chat ini.\n${A} Bonus: EXP +10% saat dungeon bareng (klaim manual via rpg dungeon).\n${R.SEP_A}`)
  }
  if (sub === 'guild') {
    const db = getDB()
    if (!rest) {
      const names = Object.keys(db.guilds)
      return m.reply(`${R.head('GUILD')}\n${A} Daftar: ${names.length ? names.join(', ') : '-'}\n${A} buat: ${px}guild buat [nama]\n${A} join: ${px}guild join [nama]\n${R.SEP_A}`)
    }
    const [act, ...nm] = rest.split(' ')
    const gname = nm.join(' ').slice(0, 20)
    if (act === 'buat') {
      if (!gname) return m.reply('Pakai: rpg guild buat [nama]')
      if (db.guilds[gname]) return m.reply('Guild sudah ada.')
      if (p.gold < 5000) return m.reply('Butuh 5000G untuk buat guild.')
      p.gold -= 5000
      db.guilds[gname] = { owner: jid, members: [jid], level: 1, exp: 0 }
      setPlayer(jid, p); writeDB()
      return m.reply(`${A} Guild ${gname} dibuat.\n${R.SEP_A}`)
    }
    if (act === 'join') {
      const g = db.guilds[gname]
      if (!g) return m.reply('Guild tidak ada.')
      if (!g.members.includes(jid)) g.members.push(jid)
      writeDB()
      return m.reply(`${A} Join guild ${gname}. Anggota ${g.members.length}.\n${R.SEP_A}`)
    }
    return m.reply('Pakai: rpg guild buat/join [nama]')
  }

  // DUEL (PvP simpel vs sesama player di DB baru)
  if (sub === 'duel') {
    const e = need(p, m); if (e) return m.reply(e)
    const target = m.mentionedJid && m.mentionedJid[0]
    if (!target) return m.reply('Tag lawan: rpg duel @user')
    const q = getPlayer(target)
    if (!q || !q.classId) return m.reply('Lawan belum main RPG.')
    const ps = p.atk + R.rand(0, 20)
    const qs = q.atk + R.rand(0, 20)
    let t = `${R.head('DUEL')}\n${A} ${p.nama} [${ps}] vs ${q.nama} [${qs}]\n`
    if (ps >= qs) { p.gold += 500; const n = R.addExp(p, 200); setPlayer(jid, p); t += `${A} Kamu menang. +500G +200EXP${n ? ' NAIK Lv ' + p.level : ''}\n${R.SEP_A}` }
    else { p.gold = Math.max(0, p.gold - 200); setPlayer(jid, p); t += `${A} Kamu kalah. -200G.\n${R.SEP_A}` }
    return m.reply(t)
  }

  // RANK / LB kategori
  if (sub === 'rank' || sub === 'ranking' || sub === 'lb' || sub === 'leaderboard') {
    const db = getDB()
    const mode = (rest || 'level').toLowerCase()
    const all = Object.entries(db.players).map(([id, v]) => ({ id, ...v }))
    let arr = []
    if (mode === 'gold' || mode === 'kaya') arr = all.sort((a, b) => b.gold - a.gold).slice(0, 10)
    else if (mode === 'kill' || mode === 'hunt') arr = all.sort((a, b) => (b.kills || 0) - (a.kills || 0)).slice(0, 10)
    else arr = all.sort((a, b) => b.level - a.level || b.exp - a.exp).slice(0, 10)
    let t = `${R.head('LEADERBOARD ' + mode.toUpperCase())}\n${R.SEP_B}\n`
    arr.forEach((v, i) => { t += `${A} ${i + 1}. ${v.nama} - Lv ${v.level} [${R.CLASS_LIST[v.classId]?.nama || '-'}] Gold ${R.fmt(v.gold)} Kill ${v.kills || 0}\n` })
    t += `${A} mode: ${px}rank level | ${px}rank gold | ${px}rank kill\n${R.SEP_A}`
    return m.reply(t)
  }

  // TRADE gold antar pemain (DB baru, pajak 5%)
  if (sub === 'trade') {
    const target = m.mentionedJid && m.mentionedJid[0]
    const amount = parseInt(args[args.length - 1], 10)
    if (!target || !amount || amount < 100) return m.reply('Pakai: rpg trade @user [gold min 100]')
    const q = getPlayer(target)
    if (!q) return m.reply('Target belum main RPG.')
    const fee = Math.ceil(amount * 0.05)
    const total = amount + fee
    if (p.gold < total) return m.reply(`Gold kurang. Butuh ${R.fmt(total)} (termasuk pajak ${fee}). Kamu ${R.fmt(p.gold)}.`)
    p.gold -= total; q.gold += amount
    setPlayer(jid, p); setPlayer(target, q)
    return m.reply(`${R.head('TRADE')}\n${A} Kirim ${R.fmt(amount)}G ke ${q.nama} (pajak ${fee}G).\n${A} Sisamu ${R.fmt(p.gold)}G.\n${R.SEP_A}`)
  }

  // WORLD BOSS berfase + kontribusi
  if (sub === 'wb') {
    const e = need(p, m); if (e) return m.reply(e)
    if (Date.now() - (p.cd.wb || 0) < 60000) return m.reply('WB cooldown 60 detik.')
    p.cd.wb = Date.now()
    const db = getDB()
    if (!db.worldBoss || Date.now() - db.worldBoss.start > 3600000) {
      db.worldBoss = { hp: 100000, maxHp: 100000, start: Date.now(), hits: {} }
    }
    const wb = db.worldBoss
    const dmg = Math.round(p.atk * (1.5 + Math.random()) + p.level * 5)
    wb.hp = Math.max(0, wb.hp - dmg)
    wb.hits[jid] = (wb.hits[jid] || 0) + dmg
    const persen = Math.round((wb.hp / wb.maxHp) * 100)
    const fase = persen > 50 ? 'Fase 1 - Normal' : persen > 20 ? 'Fase 2 - Enrage (+ATK boss)' : 'Fase 3 - Desperate (drop x2)'
    let mult = persen > 20 ? 1 : 2
    const reward = Math.round(dmg * 0.8 * mult) + 300
    p.gold += reward
    const naik = R.addExp(p, 250 * mult)
    let t = `${R.head('WORLD BOSS VARKHUL')}\n${R.SEP_B}\n${A} HP Boss: ${R.bar(wb.hp, wb.maxHp)}\n${A} ${fase}\n${A} Damage kamu -${dmg} (total ${R.fmt(wb.hits[jid])})\n${A} Reward +${reward}G +${250 * mult}EXP${naik ? ' NAIK Lv ' + p.level : ''}\n`
    if (wb.hp <= 0) {
      t += `${A} BOSS TUMBANG. Semua partisipan dapat bonus 5000G.\n`
      for (const [pid, d] of Object.entries(wb.hits)) {
        const pl = getPlayer(pid)
        if (pl) { pl.gold += 5000; setPlayer(pid, pl) }
      }
      db.worldBoss = null
    }
    setPlayer(jid, p); writeDB()
    return m.reply(t + R.SEP_A)
  }

  // EVENT aktif (otomatis harian + set manual)
  if (sub === 'event') {
    const db = getDB()
    if (rest.startsWith('set ')) {
      const ev = rest.slice(4).slice(0, 30)
      db.event = { nama: ev, by: jid, at: Date.now() }
      writeDB()
      return m.reply(`${A} Event diset: ${ev}\n${R.SEP_A}`)
    }
    const day = new Date().getDay()
    const auto = day === 6 || day === 0 ? 'Double EXP Weekend' : day === 3 ? 'Treasure Hunt Rabu' : 'Tidak ada event auto'
    const custom = db.event ? db.event.nama : '-'
    return m.reply(`${R.head('EVENT')}\n${A} Auto: ${auto}\n${A} Custom: ${custom}\n${A} set: ${px}event set [nama]\n${R.SEP_A}`)
  }

  return m.reply(HELP)
}

handler.help = ['rpg', 'elarion']
handler.tags = ['rpg']
handler.command = /^(rpg|elarion)$/i

export default handler
