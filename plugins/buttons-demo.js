// Contoh plugin buttons native via ourin-baileys (interactiveMessage)
// Command: .tombol / .buttons / .btn
//
// Cara kerja:
// 1. Handler di bawah mengirim 1 pesan berisi 4 tipe tombol sekaligus:
//    - quick_reply (balasan cepat)
//    - cta_url (buka link)
//    - cta_copy (salin kode)
//    - single_select (menu list / daftar pilihan)
// 2. Saat user menekan tombol quick_reply / memilih list, WhatsApp mengirim
//    interactiveResponseMessage yang otomatis diurai menjadi m.text berisi
//    id tombol (lihat parser nativeFlowResponseMessage di lib/simple.js).
// 3. handler.before di bawah menangkap id tersebut dan membalasnya.

let handler = async (m, { conn }) => {
	let text =
		`*🔘 CONTOH BUTTONS*\n\n` +
		`Pilih salah satu tombol di bawah:\n` +
		`• *Halo* → tombol balasan cepat\n` +
		`• *Website* → buka link\n` +
		`• *Salin Kode* → salin kode\n` +
		`• *Menu* → buka daftar pilihan`;

	await conn.sendButtons(
		m.chat,
		text,
		[
			// 1. Quick reply (tanpa type = quick_reply)
			{ id: 'demo_hello', title: '👋 Halo' },
			// 2. URL button
			{ type: 'url', title: '🌐 Website', url: 'https://www.npmjs.com/package/ourin-baileys' },
			// 3. Copy button
			{ type: 'copy', title: '📋 Salin Kode', code: 'OURIN2024' },
			// 4. List / single_select button
			{
				type: 'list',
				title: '📂 Menu',
				sections: [
					{
						title: 'Demo',
						rows: [
							{ title: 'Lihat Info', id: 'demo_info', description: 'Info tentang bot' },
							{ title: 'Cek Ping', id: 'demo_ping', description: 'Ukur kecepatan respon' },
						],
					},
				],
			},
		],
		{
			footer: 'JOJO BOT • ourin-baileys',
			quoted: m,
		}
	);
};

handler.help = ['tombol'];
handler.tags = ['main'];
handler.command = ['tombol', 'buttons', 'btn'];

// Menangani hasil tap tombol (id dikembalikan sebagai m.text)
handler.before = async function (m) {
	if (m.isBaileys) return;
	if (!m.text || m.isCommand) return;

	if (m.text === 'demo_hello') {
		await this.reply(m.chat, '👋 Halo juga! Ini balasan dari tombol *quick_reply*.', m);
		return true;
	}
	if (m.text === 'demo_info') {
		await this.reply(m.chat, `ℹ️ *INFO BOT*\n\n🤖 Nama: ${global.namebot}\n📚 Library: ourin-baileys\n✅ Buttons: native interactiveMessage`, m);
		return true;
	}
	if (m.text === 'demo_ping') {
		let start = Date.now();
		await this.reply(m.chat, `🏓 Pong! *${Date.now() - start} ms*`, m);
		return true;
	}
};

export default handler;
