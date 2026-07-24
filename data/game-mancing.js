/*
 FILE: game-mancing.js
 Fitur pindah lokasi (move.js) menggunakan global.db.data.users[m.sender]
*/

if (!global.fishing_session) global.fishing_session = {}

let handler = async (m, { conn, usedPrefix, command }) => {
  // 1. Ambil data dari database pusat
  let u = global.db.data.users[m.sender]
  
  // 2. Inisialisasi properti jika belum ada
  if (typeof u.rod === 'undefined') u.rod = 100
  if (typeof u.bait === 'undefined') u.bait = 'None'
  if (typeof u.bait_count === 'undefined') u.bait_count = 0
  if (typeof u.location === 'undefined') u.location = 'Empang'
  if (typeof u.total_tangkapan === 'undefined') u.total_tangkapan = 0
  if (typeof u.money === 'undefined') u.money = 0
  if (typeof u.exp === 'undefined') u.exp = 0

  // 3. Cek Sesi (Anti Spam)
  if (global.fishing_session[m.sender]) {
    throw `⏳ Kamu sedang memancing, tunggu sampai tarikanmu selesai!`
  }

  // 4. Cek Syarat (Umpan & Pancingan)
  if (u.bait === 'None' || u.bait_count <= 0) {
    u.bait = 'None'
    u.bait_count = 0
    throw `❌ Kamu tidak punya umpan! Beli dulu di *${usedPrefix}buybait*`
  }
  if (u.rod <= 0) {
    throw `⚠️ Pancinganmu patah! Perbaiki dulu dengan *${usedPrefix}repair*`
  }

  // Set Sesi Aktif
  global.fishing_session[m.sender] = true

  try {
    // 5. Database Ikan berdasarkan Lokasi
    const locations = {
      'Empang': { 
        fish: [
          { name: 'Ranting Kayu', price: 2, weight: [0.1, 0.5], rarity: 0.9, bait: 'Lumut' },
          { name: 'Plastik Bekas', price: 1, weight: [0.1, 0.2], rarity: 0.85, bait: 'Cacing' },
          { name: 'Ikan Sepat', price: 50, weight: [0.1, 0.2], rarity: 0.8, bait: 'Lumut' },
          { name: 'Ikan Betok', price: 150, weight: [0.2, 0.4], rarity: 0.7, bait: 'Cacing' },
          { name: 'Ikan Mujair Kecil', price: 300, weight: [0.3, 0.6], rarity: 0.6, bait: 'Lumut' },
          { name: 'Ikan Nila', price: 750, weight: [0.5, 1.2], rarity: 0.5, bait: 'Lumut' },
          { name: 'Ikan Lele Lokal', price: 1200, weight: [0.8, 1.5], rarity: 0.45, bait: 'Cacing' },
          { name: 'Ikan Gabus Kecil', price: 2000, weight: [1, 2], rarity: 0.4, bait: 'Cacing' },
          { name: 'Ikan Mas Pemancingan', price: 3500, weight: [1.5, 3], rarity: 0.35, bait: 'Pelet' },
          { name: 'Ikan Bawal', price: 4000, weight: [1, 2.5], rarity: 0.3, bait: 'Cacing' },
          { name: 'Ikan Koi Standar', price: 8000, weight: [1, 2], rarity: 0.15, bait: 'Pelet' },
          { name: 'Lele Jumbo (Hadiah)', price: 15000, weight: [5, 8], rarity: 0.05, bait: 'Cacing' }
        ] 
      },
      'Sungai': { 
        fish: [
          { name: 'Sandal Jepit Hanyut', price: 10, weight: [0.4, 0.7], rarity: 0.8, bait: 'Cacing' },
          { name: 'Ikan Wader', price: 200, weight: [0.1, 0.3], rarity: 0.75, bait: 'Cacing' },
          { name: 'Ikan Tawes', price: 1800, weight: [0.5, 2], rarity: 0.65, bait: 'Lumut' },
          { name: 'Ikan Nilem', price: 2500, weight: [0.3, 1], rarity: 0.6, bait: 'Lumut' },
          { name: 'Ikan Baung', price: 6500, weight: [2, 5], rarity: 0.5, bait: 'Cacing' },
          { name: 'Ikan Patin Sungai', price: 12000, weight: [4, 12], rarity: 0.4, bait: 'Pelet' },
          { name: 'Ikan Gurame Liar', price: 18000, weight: [3, 7], rarity: 0.35, bait: 'Pelet' },
          { name: 'Ikan Sidat (Moa)', price: 45000, weight: [2, 6], rarity: 0.25, bait: 'Cacing' },
          { name: 'Ikan Belida (Langka)', price: 120000, weight: [5, 15], rarity: 0.1, bait: 'Udang' },
          { name: 'Ikan Semah (Mahseer)', price: 400000, weight: [10, 20], rarity: 0.05, bait: 'Udang' },
          { name: 'Bulus Sungai', price: 650000, weight: [15, 30], rarity: 0.02, bait: 'Udang' }
        ] 
      },
      'Laut': { 
        fish: [
          { name: 'Kaleng Berkarat', price: 50, weight: [0.3, 0.5], rarity: 0.7, bait: 'Udang' },
          { name: 'Ikan Kembung', price: 3500, weight: [0.3, 0.8], rarity: 0.65, bait: 'Udang' },
          { name: 'Ikan Kakap Merah', price: 25000, weight: [3, 10], rarity: 0.5, bait: 'Udang' },
          { name: 'Ikan Kerapu Sunu', price: 55000, weight: [5, 15], rarity: 0.4, bait: 'Udang' },
          { name: 'Ikan Tenggiri', price: 75000, weight: [7, 20], rarity: 0.35, bait: 'Udang' },
          { name: 'Ikan Barakuda', price: 120000, weight: [10, 30], rarity: 0.25, bait: 'Daging' },
          { name: 'Ikan Tuna Bluefin', price: 450000, weight: [50, 200], rarity: 0.15, bait: 'Daging' },
          { name: 'Ikan Marlin Biru', price: 950000, weight: [100, 400], rarity: 0.08, bait: 'Daging' },
          { name: 'Hiu Martil', price: 2500000, weight: [300, 800], rarity: 0.04, bait: 'Daging' },
          { name: 'Hiu Putih Besar', price: 7500000, weight: [800, 2000], rarity: 0.02, bait: 'Daging' },
          { name: 'Paus Orca', price: 20000000, weight: [3000, 5000], rarity: 0.01, bait: 'Daging' }
        ]  
      },
      'Abyss': { 
        fish: [
          { name: 'Batu Kerikil Hitam', price: 0, weight: [1, 5], rarity: 0.8, bait: 'Daging' },
          { name: 'Ikan Transparan Abyss', price: 75000, weight: [1, 4], rarity: 0.6, bait: 'Daging' },
          { name: 'Anglerfish', price: 150000, weight: [5, 12], rarity: 0.5, bait: 'Daging' },
          { name: 'Gulper Eel', price: 350000, weight: [8, 25], rarity: 0.4, bait: 'Daging' },
          { name: 'Goblin Shark', price: 950000, weight: [150, 500], rarity: 0.3, bait: 'Daging' },
          { name: 'Coelacanth (Ikan Purba)', price: 3500000, weight: [60, 180], rarity: 0.2, bait: 'Daging' },
          { name: 'Oarfish (Naga Laut)', price: 8500000, weight: [100, 300], rarity: 0.1, bait: 'Daging' },
          { name: 'Giant Squid', price: 25000000, weight: [500, 1500], rarity: 0.05, bait: 'Daging' },
          { name: 'Megalodon', price: 85000000, weight: [5000, 10000], rarity: 0.02, bait: 'Daging' },
          { name: 'Kraken Junior', price: 250000000, weight: [8000, 20000], rarity: 0.01, bait: 'Daging' },
          { name: 'Ancient Leviathan', price: 1000000000, weight: [50000, 99999], rarity: 0.001, bait: 'Daging' }
        ] 
      }
    }

    // Pastikan lokasi valid
    let myLoc = locations[u.location] ? u.location : 'Empang'

    // 6. Animasi Memancing
    const { key } = await conn.sendMessage(m.chat, { text: `🎣 *[${myLoc}]* Menyiapkan kail...` }, { quoted: m })
    
    await new Promise(res => setTimeout(res, 1500))
    await conn.sendMessage(m.chat, { text: `🚀 *SYUUUT!* Melemparkan umpan *${u.bait}*...`, edit: key })

    // Delay acak
    let delay = Math.floor(Math.random() * 3000) + 4000 
    await new Promise(res => setTimeout(res, delay))

    // 7. Filter Ikan Berdasarkan Umpan (Udang adalah 'Master Bait')
    let pool = locations[myLoc].fish.filter(f => 
      f.bait.toLowerCase() === u.bait.toLowerCase() || u.bait.toLowerCase() === 'udang'
    )

    // 8. Kurangi umpan (sudah dipakai)
    u.bait_count -= 1
    if (u.bait_count <= 0) u.bait = 'None'

    // 9. Tentukan probabilitas bomb (hanya di lokasi berisiko)
    let bombProb = 0
    if (myLoc !== 'Empang') { // Bomb hanya di Sungai, Laut, Abyss
      if (u.money > 1e12) bombProb = 0.8
      else if (u.money > 1e9) bombProb = 0.79
      else if (u.money > 1e8) bombProb = 0.2
      else if (u.money > 1e6) bombProb = 0.3
      else bombProb = 0 // < 1 juta
    }

    let isBomb = Math.random() < bombProb

    if (isBomb) {
      // 10. Proses Bomb
      // Hitung kerugian uang (10% - 60% dari total, maksimal 1 triliun)
      let lossPercent = 0.1 + Math.random() * 0.5 // 10% - 60%
      let loss = Math.floor(u.money * lossPercent)
      if (loss > 1e12) loss = 1e12 // Maksimal 1T
      u.money -= loss
      if (u.money < 0) u.money = 0

      // Kerusakan pancing (10% - 30%)
      let rodDamage = Math.floor(Math.random() * 21) + 10 // 10-30
      u.rod -= rodDamage
      if (u.rod < 0) u.rod = 0

      // Kirim pesan bomb
      let bombCaption = `💣 *BOOM!* Kamu terkena bomb saat memancing di ${myLoc}!\n`
      bombCaption += `🔥 Uangmu berkurang Rp${loss.toLocaleString()}\n`
      bombCaption += `⚙️ Pancingan rusak: -${rodDamage}% (sisa ${u.rod}%)\n`
      bombCaption += `Sisa umpan: ${u.bait_count}`
      await conn.sendMessage(m.chat, { text: bombCaption, edit: key })
    } else {
      // 11. Proses Normal (Dapat Ikan atau Gagal)
      if (pool.length > 0) {
        // Ambil ikan acak
        let caught = pool[Math.floor(Math.random() * pool.length)]
        
        // Hitung berat dan harga
        let weight = (Math.random() * (caught.weight[1] - caught.weight[0]) + caught.weight[0]).toFixed(2)
        let finalPrice = Math.floor(caught.price * weight)
        let expGain = Math.floor(weight * 10)

        // Update database
        u.money += finalPrice
        u.exp += expGain
        u.total_tangkapan += 1
        u.rod -= (weight > 50 ? 15 : 2) // Ikan besar merusak pancing

        // Kirim hasil
        let caption = `🎉 *STRIKE!* Di ${myLoc}\n\n`
        caption += `🐟 *Ikan:* ${caught.name}\n`
        caption += `⚖️ *Berat:* ${weight} kg\n`
        caption += `💰 *Pendapatan:* Rp${finalPrice.toLocaleString()}\n`
        caption += `📈 *Exp:* +${expGain}\n\n`
        caption += `Sisa Umpan: ${u.bait_count} | Kondisi Pancing: ${u.rod}%`

        await conn.sendMessage(m.chat, { text: caption, edit: key })
      } else {
        // Tidak ada ikan yang cocok dengan umpan
        u.rod -= 2
        await conn.sendMessage(m.chat, { 
          text: `📉 *YAAH!* Tidak ada ikan yang tertarik dengan umpan *${u.bait}* di sini. \nSisa pancingan: ${u.rod}% | Sisa umpan: ${u.bait_count}`, 
          edit: key 
        })
      }
    }

  } catch (e) {
    console.error(e)
    m.reply('⚠️ Terjadi error saat memancing!')
  } finally {
    // Hapus sesi
    delete global.fishing_session[m.sender]
  }
}

handler.help = ['mancing']
handler.tags = ['game']
handler.command = /^(mancing|fishing)$/i
handler.register = true // Opsional

export default handler