let handler = m => m

// Tombol native + fallback teks (pola sama seperti game-suitpvp.js).
// Tap kembali sebagai m.text berisi id ('batu'/'gunting'/'kertas').
async function sendSuitButtons(conn, jid, text, buttons, opts = {}) {
  try {
    if (buttons && buttons.length > 0) {
      await conn.sendButtons(jid, text, buttons, {
        footer: opts.footer || '✊ Suit PvP',
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

handler.before = async function (m) {
  this.suit = this.suit ? this.suit : {}
  if (global.db.data.users[m.sender].suit < 0) global.db.data.users[m.sender].suit = 0
  let room = Object.values(this.suit).find(room => room.id && room.status && [room.p, room.p2].includes(m.sender))
  
  if (room) {
    let win = ''
    let tie = false
    
    // Pastikan user terdaftar di database agar tidak error saat manipulasi money
    if (!global.db.data.users[room.p]) global.db.data.users[room.p] = { money: 0, exp: 0 }
    if (!global.db.data.users[room.p2]) global.db.data.users[room.p2] = { money: 0, exp: 0 }

    if (m.sender == room.p2 && /^(acc(ept)?|terima|gas|oke?|tolak|gamau|nanti|ga(k.)?bisa)/i.test(m.text) && m.isGroup && room.status == 'wait') {
      
      // JIKA LAWAN MENOLAK
      if (/^(tolak|gamau|nanti|ga(k.)?bisa)/i.test(m.text)) {
        this.reply(m.chat, `@${room.p2.split`@`[0]} menolak suit, suit dibatalkan`, m, { contextInfo: { mentionedJid: [room.p2] }})
        delete this.suit[room.id]
        return !0
      }

      // --- VALIDASI TARUHAN SAAT TERIMA ---
      if (room.taruhan > 0) {
        let user2 = global.db.data.users[room.p2]
        let user1 = global.db.data.users[room.p]

        // Cek ulang apakah uang kedua player masih cukup saat game dimulai
        if (user1.money < room.taruhan) {
          this.reply(m.chat, `Suit gagal dimulai karena uang tantangan dari @${room.p.split`@`[0]} mendadak kurang!`, m, { mentions: [room.p] })
          delete this.suit[room.id]
          return !0
        }
        if (user2.money < room.taruhan) {
          this.reply(m.chat, `Uang kamu tidak cukup untuk menerima taruhan ini!\nTaruhan: *Rp${room.taruhan.toLocaleString('id-ID')}*\nSaldo kamu: *Rp${(user2.money || 0).toLocaleString('id-ID')}*`, m)
          return !0
        }

        // Sedot uang kedua pemain (Masuk pool sistem)
        user1.money -= room.taruhan
        user2.money -= room.taruhan
      }
      // ------------------------------------

      room.status = 'play'
      room.asal = m.chat
      clearTimeout(room.waktu)
      
      this.reply(m.chat, `Suit telah dikirimkan ke chat\n@${room.p.split`@`[0]} dan \n@${room.p2.split`@`[0]}\n\nSilahkan pilih suit di chat masing-masing.\nklik wa.me/${this.user.jid.split`@`[0]}`, m, { mentions: [room.p, room.p2] })

       if (room.status == 'play') {
          let pickText = `Silahkan pilih suit di bawah ⬇️\n\n🏆 Menang: +${room.poin} XP ${room.taruhan > 0 ? `& +Rp${(room.taruhan * 2).toLocaleString('id-ID')}` : ''}\n☠️ Kalah: -${room.poin_lose} XP`
          let pickBtns = [
            { title: '✊ Batu', id: 'batu' },
            { title: '✌️ Gunting', id: 'gunting' },
            { title: '✋ Kertas', id: 'kertas' },
          ]
          await sendSuitButtons(this, room.p, pickText, pickBtns)
          delay(1500)
          await sendSuitButtons(this, room.p2, pickText, pickBtns)
       }
      
      // TIMEOUT JIKA TIDAK MEMILIH
      room.waktu_milih = setTimeout(() => {
        if (!room.pilih && !room.pilih2) {
          this.reply(m.chat, `Kedua pemain tidak niat main,\nSuit dibatalkan.`, m)
          // Jika keduanya AFK, kembalikan uangnya
          if (room.taruhan > 0) {
            global.db.data.users[room.p].money += room.taruhan
            global.db.data.users[room.p2].money += room.taruhan
          }
        } else if (!room.pilih || !room.pilih2) {
          win = !room.pilih ? room.p2 : room.p
          this.reply(m.chat, `@${(room.pilih ? room.p2 : room.p).split`@`[0]} tidak memilih suit, game berakhir.`, m, { mentions: [room.pilih ? room.p2 : room.p] })
          
          global.db.data.users[win == room.p ? room.p : room.p2].exp += room.poin
          global.db.data.users[win == room.p ? room.p2 : room.p].exp -= room.poin_lose
          
          // Yang milih menang WO (Kalah karena AFK)
          if (room.taruhan > 0) {
            global.db.data.users[win].money += (room.taruhan * 2)
          }
        }
        delete this.suit[room.id]
        return !0
      }, room.timeout)
    }

    let jwb = m.sender == room.p
    let jwb2 = m.sender == room.p2
    let g = /gunting/i
    let b = /batu/i
    let k = /kertas/i
    let reg = /^(gunting|batu|kertas)/i
    
    if (jwb && reg.test(m.text) && !room.pilih && !m.isGroup) {
      room.pilih = reg.exec(m.text.toLowerCase())[0]
      room.text = m.text
      m.reply(`Kamu telah memilih ${m.text} ${!room.pilih2 ? `\n\nMenunggu lawan memilih` : ''}`)
      if (!room.pilih2) this.reply(room.p2, '_Lawan sudah memilih_\nSekarang giliran kamu', null)
    }
    if (jwb2 && reg.test(m.text) && !room.pilih2 && !m.isGroup) {
      room.pilih2 = reg.exec(m.text.toLowerCase())[0]
      room.text2 = m.text
      m.reply(`Kamu telah memilih ${m.text} ${!room.pilih ? `\n\nMenunggu lawan memilih` : ''}`)
      if (!room.pilih) this.reply(room.p, '_Lawan sudah memilih_\nSekarang giliran kamu', null)
    }

    let stage = room.pilih
    let stage2 = room.pilih2
    
    // KONDISI KEDUA PEMAIN SUDAH MEMILIH
    if (room.pilih && room.pilih2) {
      clearTimeout(room.waktu_milih)
      if (b.test(stage) && g.test(stage2)) win = room.p
      else if (b.test(stage) && k.test(stage2)) win = room.p2
      else if (g.test(stage) && k.test(stage2)) win = room.p
      else if (g.test(stage) && b.test(stage2)) win = room.p2
      else if (k.test(stage) && b.test(stage2)) win = room.p
      else if (k.test(stage) && g.test(stage2)) win = room.p2
      else if (stage == stage2) tie = true

      let totalTaruhan = room.taruhan * 2

      this.reply(room.asal, `
_*Hasil Suit*_${tie ? '\nSERI' : ''}

@${room.p.split`@`[0]} (${room.text}) ${tie ? '' : room.p == win ? ` Menang \n+${room.poin}XP ${room.taruhan > 0 ? `\n+Rp${totalTaruhan.toLocaleString('id-ID')}` : ''}` : ` Kalah \n-${room.poin_lose}XP`}
@${room.p2.split`@`[0]} (${room.text2}) ${tie ? '' : room.p2 == win ? ` Menang \n+${room.poin}XP ${room.taruhan > 0 ? `\n+Rp${totalTaruhan.toLocaleString('id-ID')}` : ''}` : ` Kalah \n-${room.poin_lose}XP`}
`.trim(), null, { mentions: [room.p, room.p2] })

      // DISTRIBUSI HADIAH / PENGEMBALIAN SALDO
      if (!tie) {
        global.db.data.users[win == room.p ? room.p : room.p2].exp += room.poin
        global.db.data.users[win == room.p ? room.p2 : room.p].exp += room.poin_lose // Ini di kode aslimu += poin_lose (berarti nambah minus, alias berkurang)
        
        // Pemenang mengambil seluruh total taruhan pool
        if (room.taruhan > 0) {
          global.db.data.users[win].money += totalTaruhan
        }
      } else {
        // Jika SERI, kembalikan uang masing-masing player
        if (room.taruhan > 0) {
          global.db.data.users[room.p].money += room.taruhan
          global.db.data.users[room.p2].money += room.taruhan
        }
      }
      delete this.suit[room.id]
    }
  }
  return !0
}
handler.exp = 0
export default handler 

const delay = time => new Promise(res => setTimeout(res, time))