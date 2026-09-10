// DAFTAR dialihkan ke web — sumber akun resmi: https://bot.acamedia.xyz/register
// Akun web tersimpan di JVault, lalu login di bot cukup ketik .login (cek nomor WA otomatis).

let handler = async function (m, { conn, usedPrefix }) {
	const loginUrl = global.jvault?.loginUrl || 'https://bot.acamedia.xyz';
	const registerUrl = global.jvault?.registerUrl || 'https://bot.acamedia.xyz/register';

	let text =
		`📝 *Pendaftaran pindah ke website.*\n\n` +
		`1. Daftar dulu lewat tombol *Daftar Akun*\n` +
		`   Isi: Nomor WhatsApp + Username + Password\n` +
		`2. Kalau sudah punya akun, buka *Login Web*\n` +
		`3. Terakhir, tekan *Cek Login* di bawah.\n\n` +
		`Nomor WA kamu dicek otomatis di database web.`;

	let buttons = [
		{ type: 'url', title: '📝 Daftar Akun', url: registerUrl },
		{ type: 'url', title: '🌐 Login Web', url: loginUrl },
		{ id: `${usedPrefix}login`, title: '🔄 Cek Login' },
	];

	try {
		return await conn.sendButtons(m.chat, text, buttons, {
			footer: global.namebot || 'JOJO BOT',
			quoted: m,
		});
	} catch {
		return m.reply(`${text}\n\n📝 ${registerUrl}\n🌐 ${loginUrl}\n\nLalu ketik *${usedPrefix}login*`);
	}
};

handler.help = ['daftar', 'register', 'verify'];
handler.tags = ['xp'];
handler.command = /^(daftar|verify|reg(ister)?)$/i;

export default handler;
