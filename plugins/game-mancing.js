// ╔══════════════════════════════════════════════════╗
// ║         🎣 FISHING GAME PLUGIN - JOJO BOT        ║
// ║     by: Plugin Creator | Full Featured Fishing   ║
// ╚══════════════════════════════════════════════════╝

const fishingActive = new Map()      // userId -> true/false (sedang mancing)
const fishCooldown  = new Map()      // userId -> timestamp
const sellSessions  = new Map()      // buyerId -> { sellerId, fish, price, msgId }

// ═══════════════════════════════════════════════════
//                    DATA TABLES
// ═══════════════════════════════════════════════════

const BAITS = {
  cacing:      { name: '🪱 Cacing',       price: 150,   bonus: 1.0,  desc: 'Umpan dasar, cocok untuk pemula'          },
  udang:       { name: '🦐 Udang',         price: 300,   bonus: 1.2,  desc: 'Menarik ikan lebih besar'                 },
  jangkrik:    { name: '🦗 Jangkrik',      price: 250,   bonus: 1.15, desc: 'Umpan hidup yang aktif bergerak'          },
  pelet:       { name: '🟡 Pelet',         price: 200,   bonus: 1.1,  desc: 'Umpan buatan pabrik'                      },
  roti:        { name: '🍞 Roti',          price: 100,   bonus: 0.9,  desc: 'Umpan murah meriah'                       },
  daging:      { name: '🥩 Daging',        price: 500,   bonus: 1.4,  desc: 'Umpan premium untuk ikan besar'           },
  sotong:      { name: '🦑 Sotong',        price: 600,   bonus: 1.5,  desc: 'Sangat menarik untuk ikan laut'           },
  ikan_kecil:  { name: '🐟 Ikan Kecil',    price: 450,   bonus: 1.35, desc: 'Predator besar menyukainya'               },
  luminous:    { name: '✨ Luminous',       price: 1200,  bonus: 1.8,  desc: 'Bersinar dalam gelap, menarik ikan abyss' },
  mistik:      { name: '🔮 Umpan Mistik',  price: 3000,  bonus: 2.5,  desc: 'Umpan legenda dari kedalaman abyss'       }
}

const LOCATIONS = {
  Empang: {
    minLevel: 0,
    maxLevel: 5,
    emoji: '🌿',
    desc: 'Kolam tenang di desa',
    fishes: [
      { name: '🐟 Ikan Mas', rarity: 'common', basePrice: 200, weight: 40 },
      { name: '🐠 Ikan Nila', rarity: 'common', basePrice: 180, weight: 35 },
      { name: '🐡 Ikan Mujair', rarity: 'uncommon', basePrice: 350, weight: 12 },
      { name: '🦈 Ikan Lele Kecil', rarity: 'rare', basePrice: 600, weight: 5 },

      { name: '🐟 Ikan Sepat', rarity: 'common', basePrice: 150, weight: 35 },
      { name: '🐠 Ikan Wader', rarity: 'common', basePrice: 120, weight: 45 },
      { name: '🐡 Ikan Betok', rarity: 'uncommon', basePrice: 320, weight: 15 },
      { name: '⭐ Lele Albino', rarity: 'rare', basePrice: 900, weight: 3 },
      { name: '💎 Ikan Mas Raja', rarity: 'epic', basePrice: 2500, weight: 1 }
    ]
  },

  Kali: {
    minLevel: 6,
    maxLevel: 10,
    emoji: '🌊',
    desc: 'Aliran sungai kecil yang jernih',
    fishes: [
      { name: '🐟 Ikan Gabus', rarity: 'common', basePrice: 400, weight: 35 },
      { name: '🐠 Ikan Bawal', rarity: 'common', basePrice: 380, weight: 30 },
      { name: '🐡 Ikan Tawes', rarity: 'uncommon', basePrice: 700, weight: 18 },
      { name: '🦈 Ikan Belut', rarity: 'rare', basePrice: 1200, weight: 6 },
      { name: '⭐ Ikan Mas Koki', rarity: 'epic', basePrice: 3000, weight: 2 },

      { name: '🐟 Ikan Baung', rarity: 'common', basePrice: 420, weight: 30 },
      { name: '🐠 Ikan Nilem', rarity: 'common', basePrice: 350, weight: 28 },
      { name: '🐡 Udang Sungai', rarity: 'uncommon', basePrice: 900, weight: 15 },
      { name: '🦈 Sidat Hitam', rarity: 'rare', basePrice: 1800, weight: 5 },
      { name: '💎 Koi Liar', rarity: 'epic', basePrice: 4500, weight: 2 }
    ]
  },

  Sungai: {
    minLevel: 11,
    maxLevel: 35,
    emoji: '🏞️',
    desc: 'Sungai besar dengan arus deras',
    fishes: [
      { name: '🐟 Ikan Patin', rarity: 'common', basePrice: 800, weight: 35 },
      { name: '🐠 Ikan Kakap', rarity: 'common', basePrice: 750, weight: 30 },
      { name: '🐡 Ikan Arwana', rarity: 'uncommon', basePrice: 2500, weight: 18 },
      { name: '🦈 Ikan Tapah', rarity: 'rare', basePrice: 5000, weight: 12 },
      { name: '⭐ Ikan Siluk', rarity: 'epic', basePrice: 15000, weight: 3 },

      { name: '🐟 Ikan Jelawat', rarity: 'common', basePrice: 900, weight: 28 },
      { name: '🐠 Udang Galah', rarity: 'uncommon', basePrice: 3000, weight: 18 },
      { name: '🐡 Arwana Golden', rarity: 'rare', basePrice: 9000, weight: 10 },
      { name: '🦈 Buaya Sungai Kecil', rarity: 'epic', basePrice: 25000, weight: 3 },
      { name: '💎 Spirit River Fish', rarity: 'legendary', basePrice: 60000, weight: 1 }
    ]
  },

  Laut: {
    minLevel: 36,
    maxLevel: 50,
    emoji: '🌊',
    desc: 'Lautan luas tak bertepi',
    fishes: [
      { name: '🐟 Ikan Tuna', rarity: 'common', basePrice: 3000, weight: 30 },
      { name: '🐠 Ikan Marlin', rarity: 'uncommon', basePrice: 8000, weight: 25 },
      { name: '🐡 Ikan Todak', rarity: 'rare', basePrice: 20000, weight: 18 },
      { name: '🦈 Hiu Biru', rarity: 'epic', basePrice: 50000, weight: 12 },
      { name: '⭐ Ikan Dewa Laut', rarity: 'legendary', basePrice: 150000, weight: 8 },
      { name: '💎 Naga Laut', rarity: 'mythic', basePrice: 500000, weight: 1 },

      { name: '🐟 Ikan Kerapu', rarity: 'common', basePrice: 3500, weight: 28 },
      { name: '🐠 Lobster Laut', rarity: 'uncommon', basePrice: 12000, weight: 20 },
      { name: '🐡 Pari Raksasa', rarity: 'rare', basePrice: 28000, weight: 15 },
      { name: '🦈 Hiu Martil', rarity: 'epic', basePrice: 70000, weight: 10 },
      { name: '🌟 Phoenix Sea Fish', rarity: 'legendary', basePrice: 250000, weight: 4 }
    ]
  },

  Abyss: {
    minLevel: 100,
    maxLevel: 1000,
    emoji: '🌑',
    desc: 'Kedalaman tak terkira — wilayah para legenda',
    fishes: [
      { name: '🐟 Ikan Angler', rarity: 'uncommon', basePrice: 25000, weight: 25 },
      { name: '🐠 Ikan Oarfish', rarity: 'rare', basePrice: 80000, weight: 22 },
      { name: '🐡 Ikan Gulper Eel', rarity: 'rare', basePrice: 150000, weight: 20 },
      { name: '🦈 Megalodon Muda', rarity: 'epic', basePrice: 400000, weight: 15 },
      { name: '⭐ Leviathan Kecil', rarity: 'legendary', basePrice: 1000000, weight: 10 },
      { name: '💎 Kraken Baby', rarity: 'mythic', basePrice: 3000000, weight: 6 },
      { name: '🌟 Poseidon Fish', rarity: 'divine', basePrice: 9999999, weight: 2 },

      { name: '🐟 Shadow Lantern Fish', rarity: 'rare', basePrice: 200000, weight: 18 },
      { name: '🐠 Abyss Jelly', rarity: 'epic', basePrice: 600000, weight: 12 },
      { name: '🐡 Void Eel', rarity: 'legendary', basePrice: 1800000, weight: 8 },
      { name: '🦈 Ancient Megalodon', rarity: 'mythic', basePrice: 5000000, weight: 4 },
      { name: '👁️ Eldritch Leviathan', rarity: 'divine', basePrice: 15000000, weight: 1 }
    ]
  }
}

const FISHING_MESSAGES = [
  // Phase 1 - Persiapan
  [
    '🎣 *[{LOC}]* Menyiapkan kail...',
    '🧵 *[{LOC}]* Menggulung senar pancing...',
    '🎒 *[{LOC}]* Membuka kotak perlengkapan...',
    '⚙️ *[{LOC}]* Memasang umpan ke kail...',
    '🧤 *[{LOC}]* Memakai sarung tangan pancing...'
  ],
  // Phase 2 - Melempar
  [
    '🚀 *SYUUUT!* Melemparkan umpan ke air...',
    '💨 *WUUUSH!* Umpan melayang jauh ke tengah...',
    '🌀 *SPLASH!* Senar melesat deras ke permukaan...',
    '🎯 *HIYAAA!* Lempar umpan dengan presisi...',
    '⚡ *ZIIING!* Senar menegang saat umpan jatuh...'
  ],
  // Phase 3 - Menunggu
  [
    '⏳ Menunggu ikan mendekat...',
    '🌊 Mengamati gerakan air...',
    '😴 Duduk sambil menikmati suasana...',
    '🎵 Bersiul kecil menunggu gigitan...',
    '🍵 Meneguk teh sambil bersabar...',
    '🌿 Angin sepoi-sepoi, suasana tenang...',
    '🔍 Menatap tajam permukaan air...',
    '🦟 Mengusir nyamuk yang mengganggu...'
  ],
  // Phase 4 - Sinyal
  [
    '📳 *Pelampung bergerak...*',
    '💧 *Ada riak kecil di permukaan...*',
    '🔔 *Senar sedikit bergetar...*',
    '👀 *Sesuatu mendekat dari bawah...*',
    '🌀 *Pelampung mulai goyang-goyang...*',
    '⚡ *Tarikan pertama terasa!!*'
  ],
  // Phase 5 - Tarikan
  [
    '💥 *HAPP!* Ada yang menyambar umpan!',
    '🎣 *TUK TUK!* Kail bergetar hebat!',
    '🔥 *WUOOOSH!* Senar menegang kencang!',
    '⚡ *TARIK!!!* Kail ditarik sesuatu besar!',
    '🌊 *SPLASH SPLASH!* Air bergolak di sana!'
  ]
]

const RARITY_COLORS = {
  common:    '⬜',
  uncommon:  '🟩',
  rare:      '🟦',
  epic:      '🟪',
  legendary: '🟨',
  mythic:    '🟥',
  divine:    '💠'
}

// ═══════════════════════════════════════════════════
//                  HELPER FUNCTIONS
// ═══════════════════════════════════════════════════

function randomFromArray(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function weightedRandom(items) {
  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0)
  let rand = Math.random() * totalWeight
  for (const item of items) {
    rand -= item.weight
    if (rand <= 0) return item
  }
  return items[items.length - 1]
}

function getUserLocation(user) {
  return user.location || 'Empang'
}

function getLocationData(locName) {
  return LOCATIONS[locName] || LOCATIONS['Empang']
}

function getRodConditionText(rod) {
  if (rod >= 80) return { text: '✅ Sangat Baik', color: 'hijau' }
  if (rod >= 60) return { text: '🟡 Baik', color: 'kuning' }
  if (rod >= 40) return { text: '🟠 Cukup', color: 'oranye' }
  if (rod >= 20) return { text: '🔴 Buruk', color: 'merah' }
  return { text: '💔 Hampir Rusak', color: 'kritis' }
}

function calculateRodBonus(rod) {
  // Semakin rendah rod, semakin rendah kualitas ikan & harga
  if (rod >= 80) return 1.0
  if (rod >= 60) return 0.85
  if (rod >= 40) return 0.65
  if (rod >= 20) return 0.40
  return 0.20 // kritis: ikan sangat jelek
}

function rollFishForRod(fishes, rod) {
  // Jika rod sangat rendah, shift weight ke common fish
  if (rod < 30) {
    const adjusted = fishes.map(f => ({
      ...f,
      weight: f.rarity === 'common' ? f.weight * 4 :
              f.rarity === 'uncommon' ? f.weight * 2 :
              Math.max(f.weight * 0.3, 0.1)
    }))
    return weightedRandom(adjusted)
  }
  return weightedRandom(fishes)
}

function getBaitBonus(baitName) {
  if (!baitName || baitName === 'None') return 1.0
  const key = baitName.toLowerCase().replace(/[^a-z_]/g, '')
  // Match partial key
  for (const [k, v] of Object.entries(BAITS)) {
    if (baitName.toLowerCase().includes(k)) return v.bonus
  }
  return 1.0
}

function formatMoney(n) {
  return n.toLocaleString('id-ID')
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function initUser(user) {
  if (user.rod === undefined || user.rod === null) user.rod = 100
  if (!user.bait) user.bait = 'None'
  if (!user.bait_count) user.bait_count = 0
  if (!user.location) user.location = 'Empang'
  if (!user.total_tangkapan) user.total_tangkapan = 0
  if (!user.inventory) user.inventory = []
  return user
}

// ═══════════════════════════════════════════════════
//              BUTTON HELPERS (native + fallback)
//  Tap tombol/list kembali sebagai m.text berisi id
//  (mis. ".buyumpan cacing"), sehingga diproses alur
//  command yang sudah ada tanpa ubah logika.
// ═══════════════════════════════════════════════════

function toSections10(rows, title = '☰ Pilih') {
  const sections = []
  for (let i = 0; i < rows.length; i += 10)
    sections.push({ title: i === 0 ? title : `${title} ${i / 10 + 1}`, rows: rows.slice(i, i + 10) })
  return sections
}

async function sendFishButtons(conn, jid, text, buttons, opts = {}) {
  try {
    if (buttons && buttons.length > 0) {
      await conn.sendButtons(jid, text, buttons, {
        footer: opts.footer || '🎣 Fishing Game',
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
      return false
    }
  }
}

// ═══════════════════════════════════════════════════
//                   MAIN HANDLER
// ═══════════════════════════════════════════════════

let handler = async (m, { conn, usedPrefix, command, text, args }) => {
  const sender = m.sender
  let user = global.db.data.users[sender]
  if (!user) return m.reply('❌ Kamu belum terdaftar di database.')
  user = initUser(user)

  // ───────────────────────────────────────────────
  //  /mancing — Mulai Memancing
  // ───────────────────────────────────────────────
  if (/^(mancing|fishing|fish)$/i.test(command)) {
    if (fishingActive.get(sender)) return m.reply('🎣 Kamu sedang memancing! Tunggu hasilnya dulu.')

    const cooldownTime = 30_000 // 30 detik cooldown antar mancing
    const lastFish = fishCooldown.get(sender) || 0
    if (Date.now() - lastFish < cooldownTime) {
      const sisa = Math.ceil((cooldownTime - (Date.now() - lastFish)) / 1000)
      return m.reply(`⏳ Kamu masih lelah memancing! Tunggu *${sisa} detik* lagi.`)
    }

    if (!user.bait || user.bait === 'None' || user.bait_count <= 0) {
      await sendFishButtons(conn, m.chat,
        `🪣 *Kamu tidak punya umpan!*\n\nBeli umpan dulu, ketuk tombol di bawah ⬇️`,
        [{ title: '🪱 Lihat Umpan', id: `${usedPrefix}buyumpan` }], { quoted: m })
      return
    }

    if (user.rod <= 0) {
      return m.reply('💔 *Pancinganmu sudah hancur!* Beli pancingan baru dulu dengan `' + usedPrefix + 'repairing`')
    }

    const myLoc = getUserLocation(user)
    const locData = getLocationData(myLoc)

    // Cek level untuk lokasi
    const lvl = user.level || 0
    if (lvl < locData.minLevel) {
      return m.reply(`❌ Level kamu tidak cukup untuk memancing di *${myLoc}*!\n📊 Level butuh: *${locData.minLevel}*\n📈 Level kamu: *${lvl}*`)
    }

    fishingActive.set(sender, true)

    // ── Tentukan durasi per fase (acak) ──
    const phase1Delay = [2000, 3000, 4000][Math.floor(Math.random() * 3)]
    const phase2Delay = [1500, 2000, 2500][Math.floor(Math.random() * 3)]
    const waitDelay   = [5000, 10000, 15000, 30000, 60000][Math.floor(Math.random() * 5)]
    const phase4Delay = [2000, 3000][Math.floor(Math.random() * 2)]
    const phase5Delay = [1000, 1500][Math.floor(Math.random() * 2)]

    // ── Kirim pesan awal & simpan msgId untuk di-edit ──
    const sentMsg = await conn.sendMessage(m.chat, {
      text: randomFromArray(FISHING_MESSAGES[0]).replace('{LOC}', myLoc)
    }, { quoted: m })

    const msgKey = sentMsg?.key

    const editMsg = async (text) => {
      try {
        await conn.relayMessage(m.chat, {
          protocolMessage: {
            key: msgKey,
            type: 14,
            editedMessage: {
              conversation: text
            }
          }
        }, {})
      } catch {
        // fallback jika edit tidak didukung
        await conn.sendMessage(m.chat, { text }, { quoted: m })
      }
    }

    await sleep(phase1Delay)
    await editMsg(randomFromArray(FISHING_MESSAGES[1]).replace('{LOC}', myLoc))

    await sleep(phase2Delay)
    await editMsg(randomFromArray(FISHING_MESSAGES[2]).replace('{LOC}', myLoc))

    await sleep(waitDelay)
    await editMsg(randomFromArray(FISHING_MESSAGES[3]).replace('{LOC}', myLoc))

    await sleep(phase4Delay)
    await editMsg(randomFromArray(FISHING_MESSAGES[4]).replace('{LOC}', myLoc))

    await sleep(phase5Delay)

    // ── Kalkulasi hasil ──
    const rod = user.rod
    const baitBonus = getBaitBonus(user.bait)
    const rodBonus  = calculateRodBonus(rod)
    const fish = rollFishForRod(locData.fishes, rod)

    const rarityIcon = RARITY_COLORS[fish.rarity] || '⬜'

    // Harga final
    const rawPrice = Math.floor(fish.basePrice * baitBonus * rodBonus)
    const priceVariance = 0.8 + Math.random() * 0.4 // ±20% harga pasar
    const marketPrice = Math.floor(rawPrice * priceVariance)

    // Kurangi umpan
    user.bait_count -= 1
    if (user.bait_count <= 0) {
      user.bait = 'None'
      user.bait_count = 0
    }

    // Kurangi kondisi rod (1-5% per mancing)
    const rodDamage = Math.floor(Math.random() * 5) + 1
    user.rod = Math.max(0, rod - rodDamage)

    // Tambah tangkapan
    user.total_tangkapan = (user.total_tangkapan || 0) + 1

    // Simpan ikan ke inventory
    if (!user.inventory) user.inventory = []
    const existingFish = user.inventory.find(i => i.name === fish.name)
    if (existingFish) {
      existingFish.count = (existingFish.count || 1) + 1
      existingFish.lastPrice = marketPrice
    } else {
      user.inventory.push({ name: fish.name, rarity: fish.rarity, count: 1, lastPrice: marketPrice })
    }

    fishingActive.delete(sender)
    fishCooldown.set(sender, Date.now())

    const rodCond = getRodConditionText(user.rod)
    const rodWarning = user.rod < 25 ? `\n\n⚠️ *PERINGATAN!* Pancinganmu hampir rusak (${user.rod}%)!\nKualitas ikan yang didapat akan sangat buruk!` : ''

    await editMsg(
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `🎣 *HASIL MEMANCING*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📍 Lokasi  : *${myLoc}* ${locData.emoji}\n` +
      `🪱 Umpan   : *${user.bait === 'None' ? 'Habis' : user.bait}*\n\n` +
      `${rarityIcon} *${fish.name}*\n` +
      `⭐ Rarity  : *${fish.rarity.toUpperCase()}*\n` +
      `💰 Harga   : *Rp ${formatMoney(marketPrice)}*\n\n` +
      `🎯 Rod     : ${rodCond.text} (${user.rod}%)\n` +
      `🧺 Stok Umpan: *${user.bait_count}x*\n` +
      `📦 Total Tangkapan: *${user.total_tangkapan}*\n\n` +
      `💡 Jual ke bot: \`${usedPrefix}jualikan bot\`\n` +
      `💡 Jual ke user: \`${usedPrefix}jualikan @user\`` +
      rodWarning
    )

    // Tombol aksi lanjutan (pesan hasil di atas tidak bisa ditempeli tombol karena via edit)
    await sendFishButtons(conn, m.chat,
      `🎣 *Mau apa lagi?*`,
      [
        { title: '🎣 Mancing Lagi', id: `${usedPrefix}mancing` },
        { title: '🏪 Jual ke Bot', id: `${usedPrefix}jualikan bot` },
        { title: '🎒 Inventory', id: `${usedPrefix}inventory` },
      ], { quoted: m })

    global.db.data.users[sender] = user
    return
  }

  // ───────────────────────────────────────────────
  //  /inventory atau /kantong — Lihat Inventaris
  // ───────────────────────────────────────────────
  if (/^(inventory|inv|kantong|tas)$/i.test(command)) {
    if (!user.inventory || user.inventory.length === 0) {
      return m.reply(`🎒 *Inventarismu kosong!*\nCoba mancing dulu: \`${usedPrefix}mancing\``)
    }

    let list = user.inventory.map((item, i) =>
      `${i + 1}. ${RARITY_COLORS[item.rarity] || '⬜'} *${item.name}* x${item.count}\n   💰 ~Rp ${formatMoney(item.lastPrice || 0)} /ekor`
    ).join('\n')

    const totalVal = user.inventory.reduce((s, i) => s + (i.lastPrice || 0) * i.count, 0)

    return sendFishButtons(conn, m.chat,
      `🎒 *INVENTARIS - ${(user.name || m.sender.split('@')[0]).toUpperCase()}*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `${list}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `💎 *Total Estimasi: Rp ${formatMoney(totalVal)}*\n` +
      `📦 Total Jenis: ${user.inventory.length} jenis ikan`,
      [
        { title: '🏪 Jual ke Bot', id: `${usedPrefix}jualikan bot` },
        { title: '🎣 Mancing', id: `${usedPrefix}mancing` },
      ], { quoted: m })
  }

  // ───────────────────────────────────────────────
  //  /buyumpan atau /buybait — Beli Umpan
  // ───────────────────────────────────────────────
  if (/^(buyumpan|buybait|beliumpan)$/i.test(command)) {
    const baitKey = text?.toLowerCase().trim().replace(/\s+/g, '_')

    if (!baitKey) {
      // Tampilkan toko umpan sebagai LIST (ketuk = beli 1 biji)
      const rows = Object.entries(BAITS).map(([key, b]) => ({
        title: b.name,
        description: `Rp ${formatMoney(b.price)} | Bonus x${b.bonus}`,
        id: `${usedPrefix}buyumpan ${key}`
      }))

      return sendFishButtons(conn, m.chat,
        `🪱 *TOKO UMPAN PANCING*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `💰 Uangmu: Rp ${formatMoney(user.money)}\n` +
        `Ketuk umpan untuk beli 1 biji ⬇️`,
        [{ type: 'list', title: '🪱 Pilih Umpan', sections: toSections10(rows, '🪱 Daftar Umpan') }],
        { quoted: m })
    }

    // Cek apakah ada argumen jumlah
    const parts = text.trim().split(/\s+/)
    const baitName = parts[0].toLowerCase()
    const qty = parseInt(parts[1]) || 1

    // Cari umpan yang cocok
    let matchedKey = null
    let matchedBait = null
    for (const [k, v] of Object.entries(BAITS)) {
      if (k.startsWith(baitName) || baitName.startsWith(k) || v.name.toLowerCase().includes(baitName)) {
        matchedKey = k
        matchedBait = v
        break
      }
    }

    if (!matchedBait) {
      return m.reply(`❌ Umpan *"${text}"* tidak ditemukan!\nKetik \`${usedPrefix}buyumpan\` untuk melihat daftar.`)
    }

    if (qty < 1 || qty > 100) return m.reply('❌ Jumlah beli harus antara 1 - 100.')

    const totalCost = matchedBait.price * qty
    if (user.money < totalCost) {
      return m.reply(
        `❌ *Uang tidak cukup!*\n` +
        `💰 Harga total: Rp ${formatMoney(totalCost)}\n` +
        `💳 Uang kamu: Rp ${formatMoney(user.money)}\n` +
        `📉 Kurang: Rp ${formatMoney(totalCost - user.money)}`
      )
    }

    // Cek apakah sedang memakai umpan berbeda
    if (user.bait !== 'None' && user.bait !== matchedBait.name && user.bait_count > 0) {
      return m.reply(
        `⚠️ Kamu masih punya *${user.bait_count}x ${user.bait}*!\n` +
        `Habiskan dulu sebelum ganti umpan.\n` +
        `Atau ketik \`${usedPrefix}buangumpan\` untuk membuang umpan lama.`
      )
    }

    user.money -= totalCost
    user.bait = matchedBait.name
    user.bait_count = (user.bait_count || 0) + qty
    global.db.data.users[sender] = user

    return sendFishButtons(conn, m.chat,
      `✅ *BERHASIL BELI UMPAN!*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `${matchedBait.name} x${qty}\n` +
      `💰 Total Bayar: Rp ${formatMoney(totalCost)}\n` +
      `💳 Sisa Uang: Rp ${formatMoney(user.money)}\n` +
      `🪱 Stok Umpan: *${user.bait_count}x*`,
      [
        { title: '🎣 Mancing', id: `${usedPrefix}mancing` },
        { title: '🪱 Beli Lagi', id: `${usedPrefix}buyumpan` },
      ], { quoted: m })
  }

  // ───────────────────────────────────────────────
  //  /buangumpan — Buang umpan saat ini
  // ───────────────────────────────────────────────
  if (/^(buangumpan|dropbait)$/i.test(command)) {
    if (!user.bait || user.bait === 'None' || user.bait_count <= 0) {
      return m.reply('❌ Kamu tidak punya umpan untuk dibuang.')
    }
    const oldBait = user.bait
    const oldCount = user.bait_count
    user.bait = 'None'
    user.bait_count = 0
    global.db.data.users[sender] = user
    return m.reply(`🗑️ *${oldCount}x ${oldBait}* telah dibuang.`)
  }

  // ───────────────────────────────────────────────
  //  /pindahlokasi / /pindah — Pindah lokasi mancing
  // ───────────────────────────────────────────────
  if (/^(pindahlokasi|pindah|goto|pergi)$/i.test(command)) {
    const target = text?.trim()

    if (!target) {
      const currentLvl = user.level || 0
      const rows = Object.entries(LOCATIONS).map(([name, loc]) => ({
        title: `${currentLvl >= loc.minLevel ? '✅' : '🔒'} ${name} ${loc.emoji}`,
        description: `Level ${loc.minLevel}–${loc.maxLevel} | ${loc.desc}`,
        id: `${usedPrefix}pindah ${name}`
      }))

      return sendFishButtons(conn, m.chat,
        `🗺️ *DAFTAR LOKASI MEMANCING*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📍 Lokasi sekarang: *${getUserLocation(user)}*\n` +
        `📈 Level kamu: *${currentLvl}*\n` +
        `Ketuk lokasi untuk pindah ⬇️`,
        [{ type: 'list', title: '🗺️ Pilih Lokasi', sections: toSections10(rows, '🗺️ Lokasi') }],
        { quoted: m })
    }

    // Cari lokasi
    const locKey = Object.keys(LOCATIONS).find(k => k.toLowerCase() === target.toLowerCase())
    if (!locKey) {
      return m.reply(`❌ Lokasi *"${target}"* tidak ditemukan!\nKetik \`${usedPrefix}pindah\` untuk daftar lokasi.`)
    }

    const locData = LOCATIONS[locKey]
    const userLevel = user.level || 0

    if (userLevel < locData.minLevel) {
      return m.reply(
        `🔒 *Lokasi Terkunci!*\n\n` +
        `📍 Lokasi: *${locKey}* ${locData.emoji}\n` +
        `📊 Level butuh: *${locData.minLevel}*\n` +
        `📈 Level kamu: *${userLevel}*\n` +
        `📉 Kurang: *${locData.minLevel - userLevel} level lagi*`
      )
    }

    if (getUserLocation(user) === locKey) {
      return m.reply(`📍 Kamu sudah berada di *${locKey}*!`)
    }

    user.location = locKey
    global.db.data.users[sender] = user

    return sendFishButtons(conn, m.chat,
      `🗺️ *PINDAH LOKASI BERHASIL!*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📍 Lokasi Baru: *${locKey}* ${locData.emoji}\n` +
      `📝 ${locData.desc}\n\n` +
      `🐟 Ikan tersedia:\n` +
      locData.fishes.map(f => `  ${RARITY_COLORS[f.rarity]} ${f.name} — Rp ${formatMoney(f.basePrice)}`).join('\n'),
      [{ title: '🎣 Mancing', id: `${usedPrefix}mancing` }],
      { quoted: m })
  }

  // ───────────────────────────────────────────────
  //  /jualikan — Jual ikan ke bot atau user
  // ───────────────────────────────────────────────
  if (/^(jualikan|sellfish|jual)$/i.test(command)) {
    if (!user.inventory || user.inventory.length === 0) {
      return m.reply(`❌ *Inventarismu kosong!* Tidak ada ikan untuk dijual.\n🎣 Coba mancing dulu: \`${usedPrefix}mancing\``)
    }

    const target = text?.trim().toLowerCase()

    // ── Jual ke bot ──
    if (!target || target === 'bot' || target === 'npc') {
      const totalItems = user.inventory.reduce((s, i) => s + i.count, 0)
      let totalEarned = 0
      let salesDetail = []

      for (const item of user.inventory) {
        const taxRate = 0.05 + Math.random() * 0.04 // 5-9% pajak
        const gross = item.lastPrice * item.count
        const tax = Math.floor(gross * taxRate)
        const net = gross - tax
        totalEarned += net
        salesDetail.push(
          `${RARITY_COLORS[item.rarity] || '⬜'} *${item.name}* x${item.count}\n` +
          `   💰 Rp ${formatMoney(gross)} — Pajak ${(taxRate * 100).toFixed(0)}% (Rp ${formatMoney(tax)})\n` +
          `   ✅ Terima: Rp ${formatMoney(net)}`
        )
      }

      user.money = (user.money || 0) + totalEarned
      user.inventory = []
      global.db.data.users[sender] = user

      return sendFishButtons(conn, m.chat,
        `🏪 *JUAL KE BOT BERHASIL!*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        salesDetail.join('\n\n') +
        `\n━━━━━━━━━━━━━━━━━━━━\n` +
        `📦 Total Terjual: *${totalItems} ekor*\n` +
        `💵 Total Diterima: *Rp ${formatMoney(totalEarned)}*\n` +
        `💳 Uang Kamu Kini: *Rp ${formatMoney(user.money)}*`,
        [
          { title: '🎣 Mancing', id: `${usedPrefix}mancing` },
          { title: '🎒 Inventory', id: `${usedPrefix}inventory` },
        ], { quoted: m })
    }

    // ── Jual ke user lain ──
    let buyerJid = null

    // Dari mention
    const mentioned = m.mentionedJid?.[0]
    if (mentioned) buyerJid = mentioned

    // Dari reply
    if (!buyerJid && m.quoted?.sender) buyerJid = m.quoted.sender

    // Dari @tag di teks
    if (!buyerJid) {
      const tagMatch = text.match(/@(\d+)/)
      if (tagMatch) buyerJid = tagMatch[1] + '@s.whatsapp.net'
    }

    if (!buyerJid) {
      return m.reply(
        `❌ *Sebutkan target pembeli!*\n\n` +
        `Cara pakai:\n` +
        `➤ \`${usedPrefix}jualikan @user\` — mention user\n` +
        `➤ Reply pesan user + \`${usedPrefix}jualikan\`\n` +
        `➤ \`${usedPrefix}jualikan bot\` — jual ke bot`
      )
    }

    if (buyerJid === sender) return m.reply('❌ Kamu tidak bisa jual ke diri sendiri!')

    const buyer = global.db.data.users[buyerJid]
    if (!buyer) return m.reply('❌ User tersebut tidak terdaftar di database!')

    // Hitung total harga semua ikan
    const totalPrice = user.inventory.reduce((s, i) => s + (i.lastPrice || 0) * i.count, 0)
    const buyerName = buyer.name || buyerJid.split('@')[0]
    const sellerName = user.name || sender.split('@')[0]

    // Buat session transaksi
    sellSessions.set(buyerJid, {
      sellerId: sender,
      sellerName,
      buyerName,
      inventory: JSON.parse(JSON.stringify(user.inventory)),
      totalPrice,
      createdAt: Date.now(),
      timeout: setTimeout(() => {
        sellSessions.delete(buyerJid)
      }, 60_000) // expire 1 menit
    })

    const fishList = user.inventory.map(i =>
      `${RARITY_COLORS[i.rarity] || '⬜'} ${i.name} x${i.count} — Rp ${formatMoney((i.lastPrice || 0) * i.count)}`
    ).join('\n')

    return sendFishButtons(conn, m.chat,
      `🤝 *PENAWARAN IKAN*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👨 Penjual: *@${sender.split('@')[0]}*\n` +
      `👤 Pembeli: *@${buyerJid.split('@')[0]}*\n\n` +
      `📦 Daftar Ikan:\n${fishList}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `💰 Total Harga: *Rp ${formatMoney(totalPrice)}*\n\n` +
      `✅ *@${buyerJid.split('@')[0]}* ketuk tombol di bawah\n` +
      `⏰ Kadaluarsa dalam 60 detik`,
      [
        { title: '✅ Terima', id: 'accept' },
        { title: '❌ Tolak', id: 'cancel' },
      ], { quoted: m, mentions: [sender, buyerJid] })
  }

  // ───────────────────────────────────────────────
  //  /rodinfo — Info kondisi pancing
  // ───────────────────────────────────────────────
  if (/^(rodinfo|pancingan|cekpancing|rod)$/i.test(command)) {
    const rodCond = getRodConditionText(user.rod)
    return sendFishButtons(conn, m.chat,
      `🎣 *INFO PANCINGAN*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📊 Kondisi: ${rodCond.text}\n` +
      `⚙️ Durabilitas: *${user.rod}%*\n` +
      `📉 Pengaruh ke harga ikan: x${calculateRodBonus(user.rod).toFixed(2)}\n\n` +
      `${user.rod < 30 ? '⚠️ *KRITIS!* Pancingan hampir hancur!\nIkan yang didapat sangat buruk.' :
        user.rod < 60 ? '🟠 Kondisi menurun, pertimbangkan repair.' :
        '✅ Kondisi masih bagus!'}`,
      [
        { title: '🔧 Repair', id: `${usedPrefix}repairing` },
        { title: '🎣 Mancing', id: `${usedPrefix}mancing` },
      ], { quoted: m })
  }

  // ───────────────────────────────────────────────
  //  /repairing — Repair pancingan
  // ───────────────────────────────────────────────
  if (/^(repairing|repair|perbaiki|fixrod)$/i.test(command)) {
    if (user.rod >= 100) return m.reply('✅ Pancinganmu masih dalam kondisi sempurna!')

    const repairCost = Math.floor((100 - user.rod) * 500) // 500 per % kerusakan
    if (user.money < repairCost) {
      return m.reply(
        `❌ *Uang tidak cukup untuk repair!*\n` +
        `🔧 Biaya repair: Rp ${formatMoney(repairCost)}\n` +
        `💳 Uang kamu: Rp ${formatMoney(user.money)}\n` +
        `📉 Kurang: Rp ${formatMoney(repairCost - user.money)}`
      )
    }

    const oldRod = user.rod
    user.money -= repairCost
    user.rod = 100
    global.db.data.users[sender] = user

    return sendFishButtons(conn, m.chat,
      `🔧 *REPAIR BERHASIL!*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `⚙️ ${oldRod}% → *100%*\n` +
      `💰 Biaya: Rp ${formatMoney(repairCost)}\n` +
      `💳 Sisa Uang: Rp ${formatMoney(user.money)}`,
      [{ title: '🎣 Mancing', id: `${usedPrefix}mancing` }],
      { quoted: m })
  }

  // ───────────────────────────────────────────────
  //  /statmancing — Statistik mancing user
  // ───────────────────────────────────────────────
  if (/^(statmancing|fishstats|statpancing)$/i.test(command)) {
    const rodCond = getRodConditionText(user.rod)
    const invCount = (user.inventory || []).reduce((s, i) => s + i.count, 0)
    const invVal   = (user.inventory || []).reduce((s, i) => s + (i.lastPrice || 0) * i.count, 0)

    return sendFishButtons(conn, m.chat,
      `📊 *STATISTIK MANCING*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `👤 User: *${user.name || sender.split('@')[0]}*\n` +
      `📍 Lokasi: *${getUserLocation(user)}*\n` +
      `📈 Level: *${user.level || 0}*\n\n` +
      `🎣 Total Tangkapan: *${user.total_tangkapan || 0} ekor*\n` +
      `📦 Ikan di Kantong: *${invCount} ekor*\n` +
      `💎 Nilai Kantong: *Rp ${formatMoney(invVal)}*\n\n` +
      `🪱 Umpan: *${user.bait === 'None' ? '❌ Kosong' : `${user.bait_count}x ${user.bait}`}*\n` +
      `🎣 Pancing: ${rodCond.text} (${user.rod}%)\n` +
      `💰 Uang: *Rp ${formatMoney(user.money || 0)}*`,
      [
        { title: '🎣 Mancing', id: `${usedPrefix}mancing` },
        { title: '🎒 Inventory', id: `${usedPrefix}inventory` },
      ], { quoted: m })
  }

  // ───────────────────────────────────────────────
  //  /daftarikan — Lihat daftar ikan per lokasi
  // ───────────────────────────────────────────────
  if (/^(daftarikan|listfish|ikanlist)$/i.test(command)) {
    const locTarget = text?.trim()
    const locKey = locTarget
      ? Object.keys(LOCATIONS).find(k => k.toLowerCase() === locTarget.toLowerCase())
      : getUserLocation(user)

    if (!locKey) return m.reply(`❌ Lokasi *"${locTarget}"* tidak ditemukan!`)

    const loc = LOCATIONS[locKey]
    const fishList = loc.fishes.map(f =>
      `${RARITY_COLORS[f.rarity]} *${f.name}*\n   ⭐ ${f.rarity.toUpperCase()} | 💰 Rp ${formatMoney(f.basePrice)}`
    ).join('\n\n')

    return sendFishButtons(conn, m.chat,
      `🐟 *DAFTAR IKAN — ${locKey.toUpperCase()}* ${loc.emoji}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📊 Level: ${loc.minLevel}–${loc.maxLevel}\n\n` +
      `${fishList}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `⬜ Common | 🟩 Uncommon | 🟦 Rare\n🟪 Epic | 🟨 Legendary | 🟥 Mythic | 💠 Divine`,
      [
        { title: '🎣 Mancing', id: `${usedPrefix}mancing` },
        { title: '🗺️ Lokasi', id: `${usedPrefix}pindah` },
      ], { quoted: m })
  }
}

// ═══════════════════════════════════════════════════
//       ACCEPT / CANCEL HANDLER (message event)
// ═══════════════════════════════════════════════════

handler.before = async (m, { conn }) => {
  if (!m.text) return
  const txt = m.text.trim().toLowerCase()

  if (txt === 'accept' || txt === 'terima') {
    const session = sellSessions.get(m.sender)
    if (!session) return

    const seller = global.db.data.users[session.sellerId]
    const buyer  = global.db.data.users[m.sender]

    if (!seller || !buyer) {
      sellSessions.delete(m.sender)
      return m.reply('❌ Transaksi gagal: data user tidak valid.')
    }

    clearTimeout(session.timeout)

    if (buyer.money < session.totalPrice) {
      sellSessions.delete(m.sender)
      return conn.sendMessage(m.chat, {
        text:
          `❌ *TRANSAKSI DIBATALKAN!*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `💸 Uang *${session.buyerName}* tidak cukup!\n` +
          `💰 Dibutuhkan: Rp ${formatMoney(session.totalPrice)}\n` +
          `💳 Dimiliki: Rp ${formatMoney(buyer.money)}\n` +
          `📉 Kurang: Rp ${formatMoney(session.totalPrice - buyer.money)}`,
        mentions: [session.sellerId, m.sender]
      }, { quoted: m })
    }

    // Proses transaksi
    buyer.money  -= session.totalPrice
    seller.money  = (seller.money || 0) + session.totalPrice

    // Transfer inventory
    if (!seller.inventory) seller.inventory = []
    for (const item of session.inventory) {
      const existing = seller.inventory.find(i => i.name === item.name)
      if (existing) {
        existing.count = Math.max(0, existing.count - item.count)
        if (existing.count === 0) seller.inventory = seller.inventory.filter(i => i.name !== item.name)
      }
    }

    if (!buyer.inventory) buyer.inventory = []
    for (const item of session.inventory) {
      const existing = buyer.inventory.find(i => i.name === item.name)
      if (existing) {
        existing.count += item.count
        existing.lastPrice = item.lastPrice
      } else {
        buyer.inventory.push({ ...item })
      }
    }

    global.db.data.users[session.sellerId] = seller
    global.db.data.users[m.sender] = buyer
    sellSessions.delete(m.sender)

    const fishSummary = session.inventory.map(i =>
      `${RARITY_COLORS[i.rarity] || '⬜'} ${i.name} x${i.count}`
    ).join('\n')

    return conn.sendMessage(m.chat, {
      text:
        `✅ *TRANSAKSI BERHASIL!*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📦 Ikan yang berpindah:\n${fishSummary}\n\n` +
        `👨 *${session.sellerName}* +Rp ${formatMoney(session.totalPrice)}\n` +
        `👤 *${session.buyerName}* -Rp ${formatMoney(session.totalPrice)}\n\n` +
        `💰 Saldo *${session.sellerName}*: Rp ${formatMoney(seller.money)}\n` +
        `💰 Saldo *${session.buyerName}*: Rp ${formatMoney(buyer.money)}`,
      mentions: [session.sellerId, m.sender]
    }, { quoted: m })
  }

  if (txt === 'cancel' || txt === 'tolak' || txt === 'batal') {
    const session = sellSessions.get(m.sender)
    if (!session) return

    clearTimeout(session.timeout)
    sellSessions.delete(m.sender)

    return conn.sendMessage(m.chat, {
      text:
        `❌ *PENAWARAN DITOLAK*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `*${session.buyerName}* menolak untuk membeli ikan dari *${session.sellerName}*.`,
      mentions: [session.sellerId, m.sender]
    }, { quoted: m })
  }
}

handler.command = /^(mancing|fishing|fish|inventory|inv|kantong|tas|buyumpan|buybait|beliumpan|buangumpan|dropbait|pindahlokasi|pindah|goto|pergi|jualikan|sellfish|jual|rodinfo|pancingan|cekpancing|rod|repairing|repair|perbaiki|fixrod|statmancing|fishstats|statpancing|daftarikan|listfish|ikanlist)$/i
handler.tags  = ['game', 'fishing']
handler.help  = [
  'mancing',
  'inventory',
  'buyumpan [nama] [qty]',
  'pindah [lokasi]',
  'jualikan [bot/@user]',
  'rodinfo',
  'repairing',
  'statmancing',
  'daftarikan [lokasi]'
]

export default handler