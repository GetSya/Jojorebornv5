import { watchFile, unwatchFile } from 'fs';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

global.pairingNumber = 6288213292687;
global.pairingCode = 'RSYARAFI'; // custom pairing code (8 karakter, tanpa tanda -). Ditampilkan sebagai RSYA-RAFI
global.owner = [['6288214772441', 'ARASYA', true]];
global.mods = [];

global.namebot = 'JOJO BOT';
global.author = 'Syaa';

global.wait = '✨ _Wait..._';
global.eror = '🚩 Terjadi Kesalahan...';

global.pakasir = {
	slug: 'acamedia',
	apikey: 'ZU0JBrZtUZSqI8nAqz73zbtgJFtj0tY5',
	expired: 2, //1 = 1menit. 30 = 30menit
};

/*============== JVAULT LOGIN (bot.acamedia.xyz) ==============*/
// Login bot = cek nomor WA pengirim ada di users[].whatsapp.
// Kalau tidak ada → suruh login/register dulu ke loginUrl.
global.jvault = {
	api: 'https://jvault.aerialstudio.tech/api',
	bin_id: '255feaaa-e64c-4b4e-b2de-5f2ec0ee54b3',
	cacheMs: 60 * 1000, // cache hasil fetch 60 detik biar tidak spam API
	loginUrl: 'https://bot.acamedia.xyz',
	registerUrl: 'https://bot.acamedia.xyz/register',
};

global.stickpack = 'My Sticker';
global.stickauth = 'Sticker Akuh';

global.multiplier = 38; // The higher, The harder levelup

/*============== EMOJI ==============*/
global.rpg = {
	emoticon(string) {
		string = string.toLowerCase();
		let emot = {
			level: '📊',
			limit: '🎫',
			health: '❤️',
			stamina: '🔋',
			exp: '✨',
			money: '💹',
			bank: '🏦',
			potion: '🥤',
			diamond: '💎',
			common: '📦',
			uncommon: '🛍️',
			mythic: '🎁',
			legendary: '🗃️',
			superior: '💼',
			pet: '🔖',
			trash: '🗑',
			armor: '🥼',
			sword: '⚔️',
			pickaxe: '⛏️',
			fishingrod: '🎣',
			wood: '🪵',
			rock: '🪨',
			string: '🕸️',
			horse: '🐴',
			cat: '🐱',
			dog: '🐶',
			fox: '🦊',
			petFood: '🍖',
			iron: '⛓️',
			gold: '🪙',
			emerald: '❇️',
			upgrader: '🧰',
		};
		let results = Object.keys(emot)
			.map((v) => [v, new RegExp(v, 'gi')])
			.filter((v) => v[1].test(string));
		if (!results.length) return '';
		else return emot[results[0][0]];
	},
};

let file = fileURLToPath(import.meta.url);
watchFile(file, () => {
	unwatchFile(file);
	console.log(chalk.redBright("Update 'config.js'"));
	import(`${file}?update=${Date.now()}`);
});
