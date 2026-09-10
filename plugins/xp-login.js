import { createHash } from 'crypto';
import { findJvaultUserByPhone, phoneFromJid } from '../lib/jvault.js';

// LOGIN via JVault — ketik .login saja.
// Cek nomor WA pengirim ke JVault bin (users[].whatsapp).
// Kalau tidak ada → disuruh login/register dulu ke https://bot.acamedia.xyz

let handler = async function (m, { conn, usedPrefix }) {
	let user = global.db.data.users[m.sender];
	if (!user) return m.reply('❌ User tidak ada di database lokal. Coba lagi sebentar.');

	// Sudah login → tidak perlu login lagi
	if (user.loggedIn && user.registered) {
		let since = user.loginTime
			? new Date(user.loginTime).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
			: '-';
		return m.reply(
			`✅ *Kamu sudah login, tidak perlu login lagi.*\n\n` +
				`👤 Username : *${user.jvaultUsername || user.name || '-'}*\n` +
				`📱 WhatsApp : *${user.jvaultWhatsapp || phoneFromJid(m.sender)}*\n` +
				`⏰ Login sejak : ${since}\n\n` +
				`Mau ganti akun? Ketik *${usedPrefix}logout* dulu, baru *${usedPrefix}login*.`
		);
	}

	const conf = global.jvault || {};
	const loginUrl = conf.loginUrl || 'https://bot.acamedia.xyz';
	const registerUrl = conf.registerUrl || 'https://bot.acamedia.xyz/register';

	const myNumber = phoneFromJid(m.sender);
	if (!myNumber) return m.reply('❌ Nomor WhatsApp kamu tidak terbaca.');

	await m.reply(global.wait || '⏳ Mengecek data login...');

	let jvaultUser = null;
	try {
		jvaultUser = await findJvaultUserByPhone(myNumber);
	} catch (e) {
		console.error('[jvault login] fetch gagal:', e);
		let errText =
			`⚠️ Gagal menghubungi server login. Coba lagi sebentar dengan tombol di bawah ya.`;
		let errButtons = [
			{ id: `${usedPrefix}login`, title: '🔄 Coba Lagi' },
			{ type: 'url', title: '📝 Daftar Akun', url: registerUrl },
		];
		try {
			return await conn.sendButtons(m.chat, errText, errButtons, {
				footer: global.namebot || 'JOJO BOT',
				quoted: m,
			});
		} catch {
			return m.reply(`${errText}\n\nKetik *${usedPrefix}login* atau daftar di:\n${registerUrl}`);
		}
	}

	// Nomor belum terdaftar di web → arahkan login dulu ke web
	if (!jvaultUser) {
		let needText =
			`🔐 *Nomor kamu belum terdaftar.*\n\n` +
			`Nomor WA: *${myNumber}*\n` +
			`Status: *Belum login di web*\n\n` +
			`Silakan login dulu lewat tombol di bawah, lalu ketik lagi *${usedPrefix}login* di sini.`;
		let needButtons = [
			{ type: 'url', title: '🌐 Login Web', url: loginUrl },
			{ type: 'url', title: '📝 Daftar Akun', url: registerUrl },
			{ id: `${usedPrefix}login`, title: '🔄 Cek Lagi' },
		];
		try {
			return await conn.sendButtons(m.chat, needText, needButtons, {
				footer: global.namebot || 'JOJO BOT',
				quoted: m,
			});
		} catch {
			return conn.sendMessage(
				m.chat,
				{
					text:
						`${needText}\n\n🌐 ${loginUrl}\n📝 ${registerUrl}`,
				},
				{ quoted: m }
			);
		}
	}

	// Ketemu → tandai login di database lokal bot
	const username = jvaultUser.username || jvaultUser.name || user.name;
	user.registered = true; // biar lolos gate plugin.register di handler.js
	user.loggedIn = true;
	user.loginTime = Date.now();
	user.jvaultId = jvaultUser.id || '';
	user.jvaultUsername = username || '';
	user.jvaultWhatsapp = myNumber;
	user.jvaultEmail = jvaultUser.email || user.jvaultEmail || '';
	if (!user.name || user.name === 'User' || user.age === -1) {
		if (username) user.name = username;
	}
	if (user.regTime === -1 || !user.regTime) user.regTime = Date.now();

	let pp;
	try {
		pp = await conn.profilePictureUrl(m.sender, 'image');
	} catch {
		pp = 'https://i.ibb.co/2WzLyGk/profile.jpg';
	}

	let sn = createHash('md5').update(m.sender).digest('hex');
	let regDate = jvaultUser.created_at
		? new Date(jvaultUser.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
		: user.regTime
			? new Date(user.regTime).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
			: '-';

	let textResult =
		`✅ *LOGIN BERHASIL*\n\n` +
		`👤 Username : *${username || '-'}*\n` +
		`📱 WhatsApp : *${myNumber}*\n` +
		`📧 Email : *${jvaultUser.email || '-'}*\n` +
		`🏷️ Role : *${user.role || '-'}*\n` +
		`⭐ Level : *${user.level || 0}*\n` +
		`🎫 Limit : *${user.premiumTime > 0 ? 'Unlimited' : (user.limit ?? 0)}*\n` +
		`🔐 Serial : ${sn}\n\n` +
		`📌 Terdaftar sejak:\n${regDate}\n\n` +
		`✨ Selamat datang kembali!`;

	let imagePayload = Buffer.isBuffer(pp) ? { image: pp } : { image: { url: pp } };
	await conn.sendMessage(m.chat, { ...imagePayload, caption: textResult }, { quoted: m });
};

handler.help = ['login'];
handler.tags = ['xp'];
handler.command = /^(login|log-in|masuk)$/i;

export default handler;
