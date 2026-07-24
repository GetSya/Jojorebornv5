import * as baileys from "baileys";
import crypto from "node:crypto";

/**
BY ARSRFII
 */
async function groupStatus(conn, jid, content) {
    const { backgroundColor } = content;
    delete content.backgroundColor;

    const inside = await baileys.generateWAMessageContent(content, {
        upload: conn.waUploadToServer,
        backgroundColor
    });

    const messageSecret = crypto.randomBytes(32);

    const m = baileys.generateWAMessageFromContent(
        jid,
        {
            messageContextInfo: { messageSecret },
            groupStatusMessageV2: {
                message: {
                    ...inside,
                    messageContextInfo: { messageSecret }
                }
            }
        },
        {}
    );

    await conn.relayMessage(jid, m.message, { messageId: m.key.id });
    return m;
}

let handler = async (m, { conn, usedPrefix, command, text }) => {
    let getGroups = await conn.groupFetchAllParticipating();
    let groups = Object.keys(getGroups);

    if (groups.length === 0) return m.reply("Bot tidak memiliki grup.");

    const q = m.quoted ? m.quoted : m;
    const mime = (q.msg || q).mimetype || "";
    const caption = text || q.text || "";

    if (!mime && !caption) 
        return m.reply(`*Format Salah!*\n\nContoh: Reply foto/video atau ketik teks dengan perintah:\n${usedPrefix + command} Halo semuanya`);

    await m.reply(`⏳ Mengirim Status ke ${groups.length} grup. Mohon tunggu...`);

    let payload = {};
    try {
        if (/image/.test(mime)) {
            payload = { image: await q.download(), caption };
        } else if (/video/.test(mime)) {
            payload = { video: await q.download(), caption };
        } else if (/audio/.test(mime)) {
            payload = { audio: await q.download(), mimetype: "audio/mp4" };
        } else {
            payload = { text: caption };
        }

        let sukses = 0;
        let gagal = 0;

        for (let id of groups) {
            try {
                await groupStatus(conn, id, payload);
                sukses++;
                await new Promise(resolve => setTimeout(resolve, 1500)); // buat delay
            } catch (e) {
                console.error(`Gagal kirim status ke ${id}:`, e);
                gagal++;
            }
        }

        m.reply(`✅ *Broadcast Status Selesai*\n\nTotal Grup: ${groups.length}\nBerhasil: ${sukses}\nGagal: ${gagal}`);

    } catch (e) {
        console.error(e);
        m.reply("❌ Terjadi kesalahan teknis saat memproses media.");
    }
};

handler.help = ["upswgcall"];
handler.tags = ["owner"];
handler.command = /^(upswgcall|swgcall)$/i;

handler.owner = true
handler.group = false

export default handler;