import { smsg } from './lib/simple.js';
import { format } from 'util';
import { fileURLToPath } from 'url';
import path from 'path';
import fs, { unwatchFile, watchFile } from 'fs'; 
import chalk from 'chalk';
import fetch from 'node-fetch'
import { Canvas, loadImage } from 'skia-canvas'; // Cukup Canvas dan loadImage


const isNumber = (x) => typeof x === 'number' && !isNaN(x);
if (!global.anonymous) global.anonymous = {}
/**
 * Handle messages upsert
 * @param {import('baileys').BaileysEventMap<unknown>['messages.upsert']} groupsUpdate
 */
export async function handler(chatUpdate) {
	if (!chatUpdate) return;
	this.pushMessage(chatUpdate.messages).catch(console.error);
	let m = chatUpdate.messages[chatUpdate.messages.length - 1];
	if (!m) return;
	if (global.db.data == null) await global.loadDatabase();
	try {
		m = smsg(this, m) || m;
		if (!m) return;
		m.exp = 0;
		m.limit = false;

		if (m.sender.endsWith('@broadcast') || m.sender.endsWith('@newsletter')) return;
		await (await import(`./lib/database.js?v=${Date.now()}`)).default(m, this);
		// ... kode pemuatan database sebelumnya ...


// ... kode pengecekan isCommand dan plugin akan lanjut di bawahnya ...

if (global.opts?.pconly && m.isGroup) return
if (global.opts?.gconly && !m.isGroup) return
		if (typeof m.text !== 'string') m.text = '';

		const isROwner = [conn.decodeJid(global.conn.user.id), ...global.owner.map(([number]) => number)].map((v) => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(m.sender);
		const isOwner = isROwner || m.fromMe;
		const isMods = isOwner || global.mods.map((v) => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(m.sender);
		// Cara yang aman
		const isPrems = isROwner || (global.db.data.users[m.sender] && global.db.data.users[m.sender].premiumTime > 0);

	if (!global.db.data.settings[this.user.jid].public && !isMods && !isOwner && !m.fromMe) return;
if (m.isBaileys) return;
m.exp += Math.ceil(Math.random() * 10);

// 2. BARU JALANKAN AUTO DOWNLOAD TIKTOK

const tiktokRegex = /(tiktok\.com|vt\.tiktok\.com|vm\.tiktok\.com|v\.doubletick\.com)/i; 
if (tiktokRegex.test(m.text) && !m.isCommand) {
    // 1. Cek Database User
    let user = global.db.data.users[m.sender]
	
    
    // 2. Cek apakah limit masih mencukupi (minimal 1)
    if (user.limit < 1 && !isPrems) {
        // Jika limit habis, kita abaikan saja fiturnya agar tidak spam
        return 
    }

    try {
        let linkMatch = m.text.match(/(https?:\/\/[^\s]+)/g);
        if (!linkMatch) return;
        let link = linkMatch[0];

        await this.reply(m.chat, '⏳ *Auto TikTok terdeteksi, memproses...*', m);

        let apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(link)}`;
        let res = await fetch(apiUrl);
        let json = await res.json();
        let data = json.data;

        if (!data) return;

        // 3. Potong Limit User sebesar 1 setelah berhasil fetch
        if (!isPrems) user.limit -= 1

        if (data.images && data.images.length > 0) {
            for (let img of data.images) {
                await this.sendMessage(m.chat, { image: { url: img } });
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } else {
            await this.sendMessage(m.chat, { 
                video: { url: data.play }, 
                caption: `✅ *Auto Download*\n\n📝 *Title:* ${data.title}\n👤 *Author:* ${data.author.nickname}\n\n*Limit terpakai:* 1`
            }, { quoted: m });
        }

    } catch (e) {
        console.error("TikTok Auto Error:", e);
    }
}
        // --- OTOMATIS ANTI VIEWONCE (DOWNLOAD & SEND) ---
		let chat = global.db.data.chats[m.chat]
		if (chat?.viewOnce && !m.fromMe) {
			// Cek apakah pesan adalah View Once
			let q = m.msg?.viewOnce || m.message?.viewOnceMessageV2 || m.message?.viewOnceMessage
			if (q) {
				try {
					// Ambil objek pesan sebenarnya
					let val = m.message?.viewOnceMessageV2?.message || m.message?.viewOnceMessage?.message || m.message
					let type = Object.keys(val)[0] // imageMessage atau videoMessage
					
					// Download media
					let media = await m.download()
					if (media) {
						let cap = val[type]?.caption || ''
						await this.sendFile(m.chat, media, '', `📸 *Anti View-Once Terdeteksi*\n\n${cap}`.trim(), m)
					}
				} catch (e) {
					console.error("Gagal memproses Anti ViewOnce:", e)
				}
			}
		}
		// --- END ANTI VIEWONCE ---
// --- SESSION JT HANDLER ---
this.jt_session = this.jt_session ? this.jt_session : {}
if (this.jt_session[m.sender] && m.text && !m.isCommand) {
    if (m.text.toLowerCase() === 'cancel') {
        delete this.jt_session[m.sender];
        return m.reply('❌ Sesi dibatalkan.');
    }

    if (m.text.includes('email:') && m.text.includes('sumber:') && m.text.includes('jatuh tempo:')) {
        let email = m.text.match(/email:\s*(.*)/i)?.[1]?.trim()
        let sumber = m.text.match(/sumber:\s*(.*)/i)?.[1]?.trim()
        let tglStr = m.text.match(/jatuh tempo:\s*(\d{2}-\d{2}-\d{4})/i)?.[1]?.trim()

        if (email && sumber && tglStr) {
            let [d, bln, y] = tglStr.split('-')
            let tglFix = `${y}-${bln}-${d}`
            let data = fs.existsSync('./json/jt.json') ? JSON.parse(fs.readFileSync('./json/jt.json')) : []
            
            data.push({ jid: m.sender, target: `${email} [${sumber}]`, tanggal: tglFix })
            fs.writeFileSync('./json/jt.json', JSON.stringify(data, null, 2))
            delete this.jt_session[m.sender]
            return m.reply(`✅ *BERHASIL SIMPAN*\n\nEmail: ${email}\nSumber: ${sumber}\nJT: ${tglStr}`)
        }
    }
}
		// --- RELAXED ANONYMOUS SYSTEM START ---
const anonPath = './json/anonymous.json'
if (!m.isGroup && fs.existsSync(anonPath)) {
    let anonData = JSON.parse(fs.readFileSync(anonPath, 'utf-8') || '{}')
    let jid = m.sender.split('@')[0].split(':')[0] + '@s.whatsapp.net'
    let room = anonData[jid]
    let isCommand = global.prefix.test(m.text)

    if (room && room.status === 'chatting' && !isCommand) {
        let partner = room.a === jid ? room.b : room.a
        let msg = m.text ? m.text.toLowerCase() : ''
        let user = global.db.data.users[m.sender]

        // A. LOGIKA PERSETUJUAN KONTAK
        if (global.anonymous[jid]?.pendingAction) {
            if (msg === 'setuju') {
                let { pending, from } = global.anonymous[jid].pendingAction
                await this.copyNForward(jid, pending, true)
                await this.reply(from, `✅ *Partner setuju!* Kontak berhasil terkirim.`, null)
                delete global.anonymous[jid].pendingAction
                return
            } else if (msg === 'tolak') {
                let { from } = global.anonymous[jid].pendingAction
                await this.reply(from, `❌ *Partner menolak* kiriman kontak kamu.`, null)
                delete global.anonymous[jid].pendingAction
                return m.reply('Okelah, permintaan ditolak.')
            }
        }

        // B. PROTEKSI KHUSUS KONTAK
        if (m.mtype === 'contactMessage' || m.mtype === 'contactsArrayMessage') {
            global.anonymous[partner] = { 
                pendingAction: { pending: m, from: jid } 
            }
            await m.reply(`⏳ *Izin Diperlukan.* Mengirim kontak butuh persetujuan partner.`)
            await this.reply(partner, `⚠️ *Partner ingin mengirim Kartu Kontak.*\n\nKetik *setuju* atau *tolak*`, null)
            return
        }

        // C. SECURITY & ANTI-TOXIC
        const filterLink = /(https?:\/\/|www\.|wa\.me)/gi
        if (m.text && filterLink.test(m.text)) return m.reply('🚫 *Dilarang mengirim Link!*')

        const badWords = ['anjing', 'bangsat', 'memek', 'kontol']
        if (badWords.some(word => msg.includes(word))) {
            user.warn = (user.warn || 0) + 1
            if (user.warn >= 5) {
                await m.reply('🚫 *BANNED:* Kamu terlalu toxic.')
                delete anonData[partner]; delete anonData[jid]
                fs.writeFileSync(anonPath, JSON.stringify(anonData, null, 2))
                return
            }
            return m.reply(`⚠️ *Pesan Kasar!* Pesan tidak diteruskan.`)
        }

        // D. FORWARDING (MENGGUNAKAN TRY-CATCH AGAR TIDAK LOG BINER JIKA ERROR)
        try {
            await this.copyNForward(partner, m, true)
        } catch (e) {
            console.error("Gagal meneruskan pesan anonymous")
        }
        return 
    }
}
// --- RELAXED ANONYMOUS SYSTEM END ---



		let usedPrefix;
		let _user = global.db.data && global.db.data.users && global.db.data.users[m.sender];

		const groupMetadata = (m.isGroup ? (conn.chats[m.chat] || {}).metadata || (await this.groupMetadata(m.chat).catch((_) => null)) : {}) || {};
		const participants = (m.isGroup ? groupMetadata.participants : []) || [];
		const user = (m.isGroup ? participants.find((u) => conn.getJid(u.id) === m.sender) : {}) || {}; // User Data
		const bot = (m.isGroup ? participants.find((u) => conn.getJid(u.id) == this.user.jid) : {}) || {}; // Your Data
		const isRAdmin = user?.admin == 'superadmin' || false;
		const isAdmin = isRAdmin || user?.admin == 'admin' || false; // Is User Admin?
		const isBotAdmin = bot?.admin || false; // Are you Admin?

		const ___dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), './plugins');

		async function getTikTokId(url) {
						// Jika link pendek (vt.tiktok.com), kita harus fetch dulu untuk dapat link aslinya
						if (url.includes('vt.tiktok.com') || url.includes('v.doubletick.com')) {
							const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
							url = res.url;
						}
						// Mengambil deretan angka (ID) di dalam URL
						const match = url.match(/\/video\/(\d+)/);
						return match ? match[1] : null;
					}
					if (m.isBaileys) return;

       if (m.isBaileys) return;
        if (typeof m.text !== 'string') m.text = '';


		for (let name in global.plugins) {
			let plugin = global.plugins[name];
			if (!plugin) continue;
			if (plugin.disabled) continue;
			const __filename = path.join(___dirname, name);
			if (typeof plugin.all === 'function') {
				try {
					await plugin.all.call(this, m, {
						chatUpdate,
						__dirname: ___dirname,
						__filename,
					});
				} catch (e) {
					// if (typeof e === 'string') continue
					console.error(e);
					for (let [jid] of global.owner.filter(([number, _, isDeveloper]) => isDeveloper && number)) {
						let data = (await conn.onWhatsApp(jid))[0] || {};
						if (data.exists) m.reply(`*Plugin:* ${name}\n*Sender:* ${m.sender}\n*Chat:* ${m.chat}\n*Command:* ${m.text}\n\n\`\`\`${format(e)}\`\`\``.trim(), data.jid);
					}
				}
			}
			if (plugin.tags && plugin.tags.includes('admin')) {
				// global.dfail('restrict', m, this)
				continue;
			}
			const str2Regex = (str) => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
			let _prefix = plugin.customPrefix ? plugin.customPrefix : conn.prefix ? conn.prefix : global.prefix;
			let match = (
				_prefix instanceof RegExp // RegExp Mode?
					? [[_prefix.exec(m.text), _prefix]]
					: Array.isArray(_prefix) // Array?
						? _prefix.map((p) => {
								let re =
									p instanceof RegExp // RegExp in Array?
										? p
										: new RegExp(str2Regex(p));
								return [re.exec(m.text), re];
							})
						: typeof _prefix === 'string' // String?
							? [[new RegExp(str2Regex(_prefix)).exec(m.text), new RegExp(str2Regex(_prefix))]]
							: [[[], new RegExp()]]
			).find((p) => p[1]);
			if (typeof plugin.before === 'function') {
				if (
					await plugin.before.call(this, m, {
						match,
						conn: this,
						participants,
						groupMetadata,
						user,
						bot,
						isROwner,
						isOwner,
						isRAdmin,
						isAdmin,
						isBotAdmin,
						isPrems,
						chatUpdate,
						__dirname: ___dirname,
						__filename,
					})
				)
					continue;
			}
			if (typeof plugin !== 'function') continue;
			if ((usedPrefix = (match[0] || '')[0])) {
				let noPrefix = m.text.replace(usedPrefix, '');
				let [command, ...args] = noPrefix.trim().split` `.filter((v) => v);
				args = args || [];
				let _args = noPrefix.trim().split` `.slice(1);
				let text = _args.join` `;
				command = (command || '').toLowerCase();
				let fail = plugin.fail || global.dfail; // When failed
				let isAccept =
					plugin.command instanceof RegExp // RegExp Mode?
						? plugin.command.test(command)
						: Array.isArray(plugin.command) // Array?
							? plugin.command.some((cmd) =>
									cmd instanceof RegExp // RegExp in Array?
										? cmd.test(command)
										: cmd === command
								)
							: typeof plugin.command === 'string' // String?
								? plugin.command === command
								: false;

				if (!isAccept) continue;
				
                m.plugin = name;
				if (m.chat in global.db.data.chats || m.sender in global.db.data.users) {
					let chat = global.db.data.chats[m.chat];
					let user = global.db.data.users[m.sender];
					if (name != 'owner-unbanchat.js' && name != 'owner-exec.js' && name != 'owner-exec2.js' && name != 'tools-delete.js' && chat?.isBanned) return; // Except this
					if (name != 'owner-unbanuser.js' && user?.banned) return;
				}
				if (plugin.rowner && plugin.owner && !(isROwner || isOwner)) {
					// Both Owner
					fail('owner', m, this);
					continue;
				}
				if (plugin.rowner && !isROwner) {
					// Real Owner
					fail('rowner', m, this);
					continue;
				}
				if (plugin.owner && !isOwner) {
					// Number Owner
					fail('owner', m, this);
					continue;
				}
				if (plugin.mods && !isMods) {
					// Moderator
					fail('mods', m, this);
					continue;
				}
				if (plugin.premium && !isPrems) {
					// Premium
					fail('premium', m, this);
					continue;
				}
				if (plugin.group && !m.isGroup) {
					// Group Only
					fail('group', m, this);
					continue;
				} else if (plugin.botAdmin && !isBotAdmin) {
					// You Admin
					fail('botAdmin', m, this);
					continue;
				} else if (plugin.admin && !isAdmin) {
					// User Admin
					fail('admin', m, this);
					continue;
				}
				if (plugin.private && m.isGroup) {
					// Private Chat Only
					fail('private', m, this);
					continue;
				}
				if (plugin.register == true && _user.registered == false) {
					// Butuh daftar?
					fail('unreg', m, this);
					continue;
				}
				m.isCommand = true;
				let xp = 'exp' in plugin ? parseInt(plugin.exp) : 17; // XP Earning per command
				if (xp > 200)
					m.reply('Ngecit -_-'); // Hehehe
				else m.exp += xp;
				if (!isPrems && plugin.limit && global.db.data.users[m.sender].limit < plugin.limit * 1) {
					this.reply(m.chat, `[❗] Limit anda habis, silahkan beli melalui *${usedPrefix}buylimit*`, m);
					continue; // Limit habis
				}
				if (plugin.level > _user.level) {
					this.reply(m.chat, `[💬] Diperlukan level ${plugin.level} untuk menggunakan perintah ini\n*Level mu:* ${_user.level} 📊`, m);
					continue; // If the level has not been reached
				}
				let extra = {
					match,
					usedPrefix,
					noPrefix,
					_args,
					args,
					command,
					text,
					conn: this,
					participants,
					groupMetadata,
					user,
					bot,
					isROwner,
					isOwner,
					isRAdmin,
					isAdmin,
					isBotAdmin,
					isPrems,
					chatUpdate,
					__dirname: ___dirname,
					__filename,
				};
				try {
					await plugin.call(this, m, extra);
					if (!isPrems) m.limit = m.limit || plugin.limit || false;
				} catch (e) {
					// Error occured
					m.error = e;
					console.error(e);
					if (e) {
						let text = format(e);
						if (e.name)
							for (let [jid] of global.owner.filter(([number, _, isDeveloper]) => isDeveloper && number)) {
								let data = (await conn.onWhatsApp(jid))[0] || {};
								if (data.exists)
									m.reply(
										`*🗂️ Plugin:* ${m.plugin}\n*👤 Sender:* ${m.sender}\n*💬 Chat:* ${m.chat}\n*💻 Command:* ${usedPrefix}${command} ${args.join(' ')}\n📄 *Error Logs:*\n\n\`\`\`${text}\`\`\``.trim(),
										data.jid
									);
							}
						m.reply(text);
					}
				} finally {
					// m.reply(util.format(_user))
					if (typeof plugin.after === 'function') {
						try {
							await plugin.after.call(this, m, extra);
						} catch (e) {
							console.error(e);
						}
					}
				}
				break;
			}
		}
	} catch (e) {
		console.error(e);
	} finally {
		//console.log(global.db.data.users[m.sender])
		let user,
			stats = global.db.data.stats;
		if (m) {
			if (m.sender && (user = global.db.data.users[m.sender])) {
				user.exp += m.exp;
				user.limit -= m.limit * 1;
			}

			let stat;
			if (m.plugin) {
				let now = Date.now();
				if (m.plugin in stats) {
					stat = stats[m.plugin];
					if (!isNumber(stat.total)) stat.total = 1;
					if (!isNumber(stat.success)) stat.success = m.error != null ? 0 : 1;
					if (!isNumber(stat.last)) stat.last = now;
					if (!isNumber(stat.lastSuccess)) stat.lastSuccess = m.error != null ? 0 : now;
				} else
					stat = stats[m.plugin] = {
						total: 1,
						success: m.error != null ? 0 : 1,
						last: now,
						lastSuccess: m.error != null ? 0 : now,
					};
				stat.total += 1;
				stat.last = now;
				if (m.error == null) {
					stat.success += 1;
					stat.lastSuccess = now;
				}
			}
		}

		try {
			await (await import(`./lib/print.js`)).default(m, this);
		} catch (e) {
			console.log(m, m.quoted, e);
		}
		if (global.db.data.settings[this.user.jid]?.autoread) await conn.readMessages([m.key]);
	}
}

/**
 * Handle groups participants update
 * @param {import('baileys').BaileysEventMap<unknown>['group-participants.update']} groupsUpdate
 */
/**
 * Handle groups participants update
 */
/**
 * Handle groups participants update
 */

// Bagian ini biasanya ada di paling bawah handler.js atau di main.js

export async function bangke(ani) {
    const wajibGrupJid = '120363043223925309@g.us';
    const pathJoin = './json/join.json';
    if (!fs.existsSync(pathJoin)) fs.writeFileSync(pathJoin, JSON.stringify([]));

    if (ani.id === wajibGrupJid) {
        let database = JSON.parse(fs.readFileSync(pathJoin));
        let participants = ani.participants;

        for (let num of participants) {
            let userJid = num.split('@')[0].split(':')[0] + '@s.whatsapp.net';
            
            if (ani.action === 'add') {
                if (!database.includes(userJid)) {
                    database.push(userJid);
                    console.log(`[DB JOIN] Member Masuk: ${userJid}`);
                }
            } else if (ani.action === 'remove' || ani.action === 'leave') {
                database = database.filter(id => id !== userJid);
                console.log(`[DB JOIN] Member Keluar: ${userJid}`);
            }
        }
        fs.writeFileSync(pathJoin, JSON.stringify(database, null, 2));
    }
}
export async function participantsUpdate({ id, participants, action, simulate = false }) {
    if (this.isInit && !simulate) return;
    if (global.db.data == null) await global.loadDatabase();
    
    let chat = global.db.data.chats[id] || {};
    let groupMetadata = {};
    
    try {
        groupMetadata = (conn.chats[id] || {}).metadata || (await this.groupMetadata(id)) || {};
    } catch (e) {
        console.error("Gagal mengambil metadata grup:", e);
    }

    for (let user of participants) {
        user = this.getJid(user?.phoneNumber || user.id);
        
        let isWelcome = (action === 'add' || action === 'remove') && chat.welcome;
        let isDetect = (action === 'promote' || action === 'demote') && chat.detect;

        if (isWelcome || isDetect) {
            try {
                // Inisialisasi Canvas
                const canvas = new Canvas(1200, 600);
                const ctx = canvas.getContext('2d');

                // 1. Latar Belakang dari file bg.png
                let background;
                const bgPath = './media/bg.png';
                if (fs.existsSync(bgPath)) {
                    background = await loadImage(bgPath);
                } else {
                    // Fallback jika file tidak ada
                    background = await loadImage('https://via.placeholder.com/1200x600/1e2b3a/ffffff?text=Background');
                }
                ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

                // 2. Overlay gelap tipis untuk kontras teks
                ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // 3. Nama Grup (atas, tengah)
                ctx.shadowBlur = 15;
                ctx.shadowColor = 'rgba(0,0,0,0.8)';
                ctx.shadowOffsetX = 4;
                ctx.shadowOffsetY = 4;
                ctx.font = 'bold 50px "Poppins", "Segoe UI", "Roboto", sans-serif';
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.fillText(groupMetadata.subject || 'WHATSAPP GROUP', 600, 90);

                // 4. Ambil foto profil user
                let pp;
                try {
                    let ppUrl = await this.profilePictureUrl(user, 'image').catch(_ => null);
                    if (ppUrl) {
                        pp = await loadImage(ppUrl);
                    } else {
                        throw new Error('No profile picture');
                    }
                } catch (e) {
                    // Gambar default jika tidak ada foto profil
                    pp = await loadImage('https://thumbs.dreamstime.com/b/default-avatar-profile-icon-vector-social-media-user-image-182145777.jpg'); // Ganti dengan URL default yang sesuai
                }

                // 5. Ukuran dan posisi foto profil (lingkaran di kiri)
                const fotoSize = 120;
                const fotoX = 340; // posisi kiri
                const fotoY = 200;

                // Gambar lingkaran dengan efek bayangan dan stroke putih
                ctx.save();
                ctx.shadowBlur = 20;
                ctx.shadowColor = 'rgba(0,0,0,0.6)';
                ctx.beginPath();
                ctx.arc(fotoX + fotoSize/2, fotoY + fotoSize/2, fotoSize/2 + 4, 0, Math.PI*2);
                ctx.fillStyle = 'rgba(255,255,255,0.2)';
                ctx.fill();
                ctx.beginPath();
                ctx.arc(fotoX + fotoSize/2, fotoY + fotoSize/2, fotoSize/2, 0, Math.PI*2);
                ctx.lineWidth = 6;
                ctx.strokeStyle = '#ffffff';
                ctx.stroke();
                ctx.clip();
                ctx.shadowBlur = 0; // reset shadow agar tidak mengganggu gambar
                ctx.drawImage(pp, fotoX, fotoY, fotoSize, fotoSize);
                ctx.restore();

                // 6. Nama user di samping kanan foto
                ctx.shadowBlur = 15;
                ctx.shadowColor = 'rgba(0,0,0,0.8)';
                ctx.font = 'bold 70px "Poppins", "Segoe UI", "Roboto", sans-serif';
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'left';
                // --- PERBAIKAN DI SINI ---
				// Ambil nama dari database global jika ada, jika tidak pakai getName, jika gagal baru nomor
				let name = global.db.data.users[user]?.name || await this.getName(user);
                if (name.includes('@')) name = name.split('@')[0];

                if (name.length > 20) name = name.substring(0, 18) + '...';
                ctx.fillText(name, fotoX + fotoSize + 30, fotoY + fotoSize/2 + 20);

                // 7. Pesan aksi (dengan nama grup)
                ctx.font = 'bold 40px "Poppins", "Segoe UI", "Roboto", sans-serif';
                ctx.textAlign = 'center';
                let messageLine = '';
                if (action === 'add') {
                    messageLine = `WELCOME TO GRUP “${groupMetadata.subject || 'GROUP'}”`;
                } else if (action === 'remove') {
                    messageLine = `GOODBYE FROM GRUP “${groupMetadata.subject || 'GROUP'}”`;
                } else if (action === 'promote') {
                    messageLine = `PROMOTED IN GRUP “${groupMetadata.subject || 'GROUP'}”`;
                } else if (action === 'demote') {
                    messageLine = `DEMOTED IN GRUP “${groupMetadata.subject || 'GROUP'}”`;
                }
                ctx.fillText(messageLine, 600, 450);

                // 8. Footer "JOJO BOT WHATSAPP"
                ctx.font = '30px "Poppins", "Segoe UI", "Roboto", sans-serif';
                ctx.fillText('JOJO BOT WHATSAPP', 600, 550);

                // Reset shadow
                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;

                // Export ke Buffer
                const buffer = await canvas.toBuffer('png');

                // 9. Kirim pesan dengan caption dari database
                let text = (action === 'add' ? chat.sWelcome || this.welcome || conn.welcome || 'Welcome, @user!' : 
                            action === 'remove' ? chat.sBye || this.bye || conn.bye || 'Bye, @user!' : 
                            `@user ${action} in group.`)
                    .replace('@user', `@${user.split('@')[0]}`)
                    .replace('@subject', groupMetadata.subject || 'Group')
                    .replace('@desc', groupMetadata.desc || '');

                await this.sendMessage(id, {
                    image: buffer,
                    caption: text,
                    mentions: [user]
                });

            } catch (e) {
                console.error("Gagal Render Canvas Update:", e);
                // Fallback: kirim pesan teks biasa
                this.sendMessage(id, { 
                    text: `Update: @${user.split('@')[0]} status: ${action}`, 
                    mentions: [user] 
                });
            }
        }
    }
}
/**
 * Handle groups update
 * @param {import('baileys').BaileysEventMap<unknown>['groups.update']} groupsUpdate
 */
export async function groupsUpdate(groupsUpdate) {
	for (const groupUpdate of groupsUpdate) {
		const id = groupUpdate.id;
		if (!id) continue;
		let chats = global.db.data.chats[id],
			text = '';
		if (!chats?.detect) continue;
		if (groupUpdate.desc) text = (chats.sDesc || this.sDesc || conn.sDesc || '```Description has been changed to```\n@desc').replace('@desc', groupUpdate.desc);
		if (groupUpdate.subject) text = (chats.sSubject || this.sSubject || conn.sSubject || '```Subject has been changed to```\n@subject').replace('@subject', groupUpdate.subject);
		if (groupUpdate.icon) text = (chats.sIcon || this.sIcon || conn.sIcon || '```Icon has been changed to```').replace('@icon', groupUpdate.icon);
		if (groupUpdate.revoke) text = (chats.sRevoke || this.sRevoke || conn.sRevoke || '```Group link has been changed to```\n@revoke').replace('@revoke', groupUpdate.revoke);
		if (!text) continue;
		await this.sendMessage(id, { text, mentions: this.parseMention(text) });
	}
}
/**
 * Handle View Once Message
 */

export async function deleteUpdate(message) {
	try {
		const { fromMe, id, participant } = message;
		if (fromMe) return;
		let msg = this.serializeM(this.loadMessage(id));
		if (!msg) return;
		let chat = global.db.data.chats[msg.chat];
		if (!chat.delete) return;
		await this.reply(
			msg.chat,
			`
Terdeteksi @${participant.split`@`[0]} telah menghapus pesan
Untuk mematikan fitur ini, ketik
*.enable delete*
`.trim(),
			msg,
			{
				mentions: [participant],
			}
		);
		this.copyNForward(msg.chat, msg).catch((e) => console.log(e, msg));
	} catch (e) {
		console.error(e);
	}
}

global.dfail = (type, m, conn) => {
	let msg = {
	  rowner: (m, conn) => conn.reply(m.chat, `Command ini hanya untuk developer bot`, m),
  
	  owner: (m, conn) => conn.reply(m.chat, `Command ini khusus owner`, m),
  
	  mods: (m, conn) => conn.reply(m.chat, `Hanya moderator yang boleh pakai fitur ini`, m),
  
	  premium: (m, conn) => conn.reply(m.chat, `Silahkan upgrade ke pengguna premium untuk menggunakan fitur premium ini, silahkan ketik /buyprem`, m),
	  
	  group: (m, conn) => conn.reply(m.chat, `Command ini cuma bisa dipakai di grup`, m),
  
	  private: (m, conn) => conn.reply(m.chat, `Command ini hanya bisa dipakai di chat pribadi`, m),
  
	  admin: (m, conn) => conn.reply(m.chat, `Hanya admin grup yang boleh pakai fitur ini`, m),
  
	  botAdmin: (m, conn) => conn.reply(m.chat, `Jadikan aku admin dulu`, m),
  
	  unreg: (m, conn) =>
		conn.reply(
		  m.chat,
		  `Kamu belum terdaftar.\nDaftar dulu ya kalau mau pakai fiturku~\n.daftar Nama.Umur`,
		  m
		),
	}[type]
  
	if (!msg) return
	return msg(m, conn)
  }
let file = global.__filename(import.meta.url, true);
watchFile(file, async () => {
	unwatchFile(file);
	console.log(chalk.redBright("Update 'handler.js'"));
	if (global.reloadHandler) console.log(await global.reloadHandler());
});
