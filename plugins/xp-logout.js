// LOGOUT — hapus status login JVault di bot (data di web tidak dihapus).
// Ketik .logout untuk keluar. Login lagi dengan .login

let handler = async function (m, { usedPrefix }) {
	let user = global.db.data.users[m.sender];
	if (!user?.loggedIn) {
		return m.reply(
			`Kamu belum login.\nLogin dengan cara ketik *${usedPrefix}login*\n` +
				`Data dicek otomatis dari nomor WhatsApp kamu di:\n🌐 ${(global.jvault?.loginUrl) || 'https://bot.acamedia.xyz'}`
		);
	}
	user.loggedIn = false;
	user.registered = false; // kunci lagi fitur yang butuh register sampai login ulang
	user.loginTime = 0;
	m.reply(`👋 *LOGOUT BERHASIL*\n\nSesi login bot kamu dihapus.\nLogin lagi kapan saja dengan *${usedPrefix}login*`);
};

handler.help = ['logout', 'keluar'];
handler.tags = ['xp'];
handler.command = /^(logout|log-out|keluar)$/i;

export default handler;
