let timeout = 60000;
let poin = 500;
let poin_lose = -100;

// Tombol native + fallback teks. Tap kembali sebagai m.text berisi id
// ('terima'/'tolak') sehingga diproses before-hook yang sudah ada.
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

let handler = async (m, { conn, args, usedPrefix, command }) => {
  let who;
  if (m.isGroup) {
    who = m.mentionedJid[0] ? m.mentionedJid[0] : (m.quoted ? m.quoted.sender : false);
  } else {
    who = m.sender;
  }

  conn.suit = conn.suit || {};
  
  if (Object.values(conn.suit).find(room => room.id.startsWith("suit") && [room.p, room.p2].includes(m.sender))) {
    throw "Selesaikan suit sebelumnya terlebih dahulu.";
  }

  if (!who) {
    return m.reply(`_Siapa yang ingin kamu tantang?_\nTag orangnya.. Contoh\n\n${usedPrefix}suit @${conn.user.jid.split('@')[0]} 50000`, m.chat, { contextInfo: { mentionedJid: [conn.user.jid] } });
  }

  if (who === m.sender) return m.reply(`Masa mau suit lawan diri sendiri? 🤔`);

  if (Object.values(conn.suit).find(room => room.id.startsWith("suit") && [room.p, room.p2].includes(who))) {
    throw `Orang yang kamu tantang sedang bermain suit bersama orang lain :(`;
  }

  // --- FITUR TARUHAN ---
  let taruhan = 0;
  // Mengambil argumen terakhir (cek apakah ada nominal taruhan angka)
  let lastArg = args[args.length - 1];
  if (lastArg && !isNaN(lastArg) && !lastArg.startsWith('@')) {
    taruhan = parseInt(lastArg);
  }

  if (taruhan < 0) throw 'Taruhan tidak boleh minus!';
  
  if (taruhan > 0) {
    let user1 = global.db.data.users[m.sender];
    if (!user1 || (user1.money || 0) < taruhan) {
      throw `Uang kamu tidak cukup untuk bertaruh sebesar *Rp${taruhan.toLocaleString('id-ID')}*!\nSaldo kamu saat ini: *Rp${(user1?.money || 0).toLocaleString('id-ID')}*`;
    }
  }
  // ---------------------

  let id = "suit_" + (new Date() * 1);
  let caption = `_*SUIT PvP*_${taruhan > 0 ? ` [ 💸 TARUHAN: *Rp${taruhan.toLocaleString('id-ID')}* ]` : ''}

@${m.sender.split('@')[0]} menantang @${who.split('@')[0]} untuk bermain suit.

Silahkan @${who.split('@')[0]}, ketuk tombol di bawah ⬇️
(atau ketik "terima" / "tolak")`;

  conn.suit[id] = {
    chat: await sendSuitButtons(conn, m.chat, caption,
      [
        { title: '✅ Terima', id: 'terima' },
        { title: '❌ Tolak', id: 'tolak' },
      ], { quoted: m, mentions: [m.sender, who] }),
    id,
    p: m.sender,
    p2: who,
    status: "wait",
    waktu: setTimeout(() => {
      if (conn.suit[id]) conn.reply(m.chat, `_Waktu suit habis_`, m);
      delete conn.suit[id];
    }, timeout),
    poin,
    poin_lose,
    timeout,
    taruhan // simpan nominal taruhan di room judi/game
  };
};

handler.tags = ["game"];
handler.help = ["suitpvp"].map(v => v + " @tag [taruhan]");
handler.command = /^(suitpvp)$/i;
handler.group = true;

export default handler;