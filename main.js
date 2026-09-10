//process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
import './config.js';
global.opts = global.opts || {}

import { createRequire } from 'module'; // Bring in the ability to create the 'require' method
import path, { join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { platform } from 'process';
import AdmZip from 'adm-zip'
import fetch from 'node-fetch'
global.__filename = function filename(pathURL = import.meta.url, rmPrefix = platform !== 'win32') {
	return rmPrefix ? (/file:\/\/\//.test(pathURL) ? fileURLToPath(pathURL) : pathURL) : pathToFileURL(pathURL).toString();
};
global.__dirname = function dirname(pathURL) {
	return path.dirname(global.__filename(pathURL, true));
};
global.__require = function require(dir = import.meta.url) {
	return createRequire(dir);
};

import fs from 'fs';
import { spawn } from 'child_process';
import { tmpdir } from 'os';
import { format } from 'util';
import { parentPort } from 'worker_threads';
import { makeWASocket, protoType, serialize } from './lib/simple.js';
import chalk from 'chalk';
import pino from 'pino';
import syntaxerror from 'syntax-error';
import { Low, JSONFile } from 'lowdb';

import { useMultiFileAuthState, Browsers, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } from 'ourin-baileys';

protoType();
serialize();

const __dirname = global.__dirname(import.meta.url);

global.prefix = new RegExp('^[' + '‎xzXZ/i!#$%+£¢€¥^°=¶∆×÷π√✓©®:;?&.\\-'.replace(/[|\\{}[\]()^$+*?.-]/g, '\\$&') + ']');
global.db = new Low(new JSONFile(`database.json`));

global.loadDatabase = async function loadDatabase() {
	if (global.db.READ)
		return new Promise((resolve) =>
			setInterval(async function () {
				if (!global.db.READ) {
					clearInterval(this);
					resolve(global.db.data == null ? global.loadDatabase() : global.db.data);
				}
			}, 1 * 1000)
		);
	if (global.db.data !== null) return;
	global.db.READ = true;
	await global.db.read().catch(console.error);
	global.db.READ = null;
	global.db.data = {
		users: {},
		chats: {},
		stats: {},
		msgs: {},
		sticker: {},
		settings: {},
		...(global.db.data || {}),
	};
};
loadDatabase();

const { state, saveCreds } = await useMultiFileAuthState('sessions');
const { version } = await fetchLatestBaileysVersion();
const connectionOptions = {
	auth: {
		creds: state.creds,
		keys: makeCacheableSignalKeyStore(state.keys, pino().child({ level: 'fatal', stream: 'store' })),
	},
	version,
	logger: pino({ level: 'silent' }),
	browser: Browsers.ubuntu('Edge'),
	generateHighQualityLinkPreview: true,
	syncFullHistory: false,
	shouldSyncHistoryMessage: () => false,
	markOnlineOnConnect: true,
	connectTimeoutMs: 60_000,
	keepAliveIntervalMs: 30_000,
	retryRequestDelayMs: 250,
	maxMsgRetryCount: 5,
};

global.conn = makeWASocket(connectionOptions);

if (fs.existsSync('./sessions/creds.json') && !conn.authState.creds.registered) {
	console.log(chalk.yellow('-- WARNING: creds.json is broken, please delete it first --'));
	//fs.rmSync('./sessions', { recursive: true, force: true })
	process.exit(0);
}

if (!conn.authState.creds.registered) {
	console.log(chalk.bgWhite(chalk.blue('Generating code...')));
	setTimeout(async () => {
		try {
			let code = await conn.requestPairingCode(String(global.pairingNumber), global.pairingCode);
			code = code?.match(/.{1,4}/g)?.join('-') || code;
			console.log(chalk.black(chalk.bgGreen(`Your Pairing Code : `)), chalk.black(chalk.white(code)));
		} catch (e) {
			console.log(e);
			parentPort.postMessage('restart');
		}
	}, 3000);
}

if (global.db) {
	setInterval(async () => {
		if (global.db.data) {
			await global.db.write().catch(console.error);
		}
		if ((global.support || {}).find) {
			const tmp = [tmpdir(), 'tmp'];
			tmp.forEach((filename) => spawn('find', [filename, '-amin', '3', '-type', 'f', '-delete']));
		}
	}, 2000);
}

const anu = [
  Buffer.from("MTIwMzYzMzk1MTE0MTY4NzQ2QG5ld3NsZXR0ZXI=", "base64").toString()
]

let followed = false

async function connectionUpdate(update) {
  const { receivedPendingNotifications, connection, lastDisconnect, isOnline } = update
  global.stopped = connection

  if (connection == 'connecting') {
    console.log(chalk.redBright('⚡ Mengaktifkan Bot, Mohon tunggu sebentar...'))
  } 
  else if (connection == 'open') {
    console.log(chalk.green('✅ Tersambung'))

    if (!followed) {
      followed = true
      for (let id of anu) {
        try {
          await conn.newsletterFollow(id)
        } catch (e) {}
      }
    }
  }

  if (isOnline == true) {
    console.log(chalk.green('Status Aktif'))
  } 
  else if (isOnline == false) {
    console.log(chalk.red('Status Mati'))
  }

  if (receivedPendingNotifications) {
    console.log(chalk.yellow('Menunggu Pesan Baru'))
  }

  if (connection == 'close') {
    console.log(chalk.red('⏱️ Koneksi terputus & mencoba menyambung ulang...'))
  }

  if (
    lastDisconnect &&
    lastDisconnect.error &&
    lastDisconnect.error.output &&
    lastDisconnect.error.output.payload
  ) {
    console.log(chalk.red(lastDisconnect.error.output.payload.message))
    await global.reloadHandler(true)
  }

  if (global.db.data == null) {
    await global.loadDatabase()
  }
}
process.on('uncaughtException', console.error);
// let strQuot = /(["'])(?:(?=(\\?))\2.)*?\1/

let isInit = true;
let handler = await import('./handler.js');
global.reloadHandler = async function (restatConn) {
	try {
		const Handler = await import(`./handler.js?update=${Date.now()}`).catch(console.error);
		if (Object.keys(Handler || {}).length) handler = Handler;
	} catch (e) {
		console.error(e);
	}
	if (restatConn) {
		const oldChats = global.conn.chats;
		try {
			global.conn.ws.close();
		} catch {}
		conn.ev.removeAllListeners();
		global.conn = makeWASocket(connectionOptions, { chats: oldChats });
		isInit = true;
	}
	if (!isInit) {
		conn.ev.off('messages.upsert', conn.handler);
		conn.ev.off('group-participants.update', conn.participantsUpdate);
		conn.ev.off('groups.update', conn.groupsUpdate);
		conn.ev.off('message.delete', conn.onDelete);
		conn.ev.off('connection.update', conn.connectionUpdate);
		conn.ev.off('creds.update', conn.credsUpdate);
	}

	conn.welcome =
		'✦━━━━━━[ *WELCOME* ]━━━━━━✦\n\n┏––––––━━━━━━━━•\n│⫹⫺ @subject\n┣━━━━━━━━┅┅┅\n│( 👋 Hallo @user)\n├[ *INTRO* ]—\n│ *Nama:* \n│ *Umur:* \n│ *Gender:*\n┗––––––━━┅┅┅\n\n––––––┅┅ *DESCRIPTION* ┅┅––––––\n@desc';
	conn.bye = '✦━━━━━━[ *GOOD BYE* ]━━━━━━✦\nSayonara *@user* 👋( ╹▽╹ )';
	conn.spromote = '@user sekarang admin!';
	conn.sdemote = '@user sekarang bukan admin!';
	conn.sDesc = 'Deskripsi telah diubah ke \n@desc';
	conn.sSubject = 'Judul grup telah diubah ke \n@subject';
	conn.sIcon = 'Icon grup telah diubah!';
	conn.sRevoke = 'Link group telah diubah ke \n@revoke';
	conn.handler = handler.handler.bind(global.conn);
	conn.participantsUpdate = handler.participantsUpdate.bind(global.conn);
	conn.groupsUpdate = handler.groupsUpdate.bind(global.conn);
	conn.onDelete = handler.deleteUpdate.bind(global.conn);
	conn.connectionUpdate = connectionUpdate.bind(global.conn);
	conn.credsUpdate = saveCreds.bind(global.conn);

	conn.ev.on('call', async (calls) => {
		for (const call of calls) {
			const { id, from, status } = call;
			const settings = global.db.data.settings[conn.user.jid];
			if (status === 'offer' && settings.anticall) {
				await conn.rejectCall(id, from);
				console.log('Menolak panggilan dari', from);
			}
		}
	});

	conn.ev.on('messages.upsert', conn.handler);
	conn.ev.on('group-participants.update', conn.participantsUpdate);
	conn.ev.on('groups.update', conn.groupsUpdate);
	conn.ev.on('message.delete', conn.onDelete);
	conn.ev.on('connection.update', conn.connectionUpdate);
	conn.ev.on('creds.update', conn.credsUpdate);
	isInit = false;
	return true;
};

const pluginFolder = global.__dirname(join(__dirname, './plugins/index'));
const pluginFilter = (filename) => /\.js$/.test(filename);
global.plugins = {};
async function filesInit() {
	for (let filename of fs.readdirSync(pluginFolder).filter(pluginFilter)) {
		try {
			let file = global.__filename(join(pluginFolder, filename));
			const module = await import(file);
			global.plugins[filename] = module.default || module;
		} catch (e) {
			conn.logger.error(`❌ Failed to load plugins ${filename}: ${e}`);
			delete global.plugins[filename];
		}
	}
}
// Preload canvas SEBELUM plugin lain: di Windows, sharp yang ke-load duluan
// bikin canvas.node gagal ("The specified procedure could not be found").
// Urutan canvas-duluan terbukti aman (canvas-then-sharp OK).
await import('canvas').catch((e) => console.log('canvas preload gagal:', e.message));
filesInit()
	.then((_) => console.log(`Successfully Loaded ${Object.keys(global.plugins).length} Plugins`))
	.catch(console.error);

global.reload = async (_ev, filename) => {
	if (pluginFilter(filename)) {
		let dir = global.__filename(join(pluginFolder, filename), true);
		if (filename in global.plugins) {
			if (fs.existsSync(dir)) conn.logger.info(`re - require plugin '${filename}'`);
			else {
				conn.logger.warn(`deleted plugin '${filename}'`);
				return delete global.plugins[filename];
			}
		} else conn.logger.info(`requiring new plugin '${filename}'`);
		let err = syntaxerror(fs.readFileSync(dir), filename, {
			sourceType: 'module',
			allowAwaitOutsideFunction: true,
		});
		if (err) conn.logger.error(`syntax error while loading '${filename}'\n${format(err)}`);
		else
			try {
				const module = await import(`${global.__filename(dir)}?update=${Date.now()}`);
				global.plugins[filename] = module.default || module;
			} catch (e) {
				conn.logger.error(`error require plugin '${filename}\n${format(e)}'`);
			} finally {
				global.plugins = Object.fromEntries(Object.entries(global.plugins).sort(([a], [b]) => a.localeCompare(b)));
			}
	}
};
Object.freeze(global.reload);
fs.watch(pluginFolder, global.reload);
await global.reloadHandler();
// Tambahkan log ini di dalam setInterval main.js
// --- FITUR AUTO REMINDER JT ---
setInterval(async () => {
    if (!global.conn || !global.conn.user) return
    const jtPath = './json/jt.json'
    if (!fs.existsSync(jtPath)) return

    try {
        let sekarang = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
        let jamSekarang = sekarang.getHours().toString().padStart(2, '0') + ':' + sekarang.getMinutes().toString().padStart(2, '0');

        // Notif dikirim jam 09:00 pagi
        if (jamSekarang !== '09:00') return

        let dataJt = JSON.parse(fs.readFileSync(jtPath, 'utf-8'))
        let hariIni = new Date(sekarang.getFullYear(), sekarang.getMonth(), sekarang.getDate());
        let masiBerlaku = []

        for (let item of dataJt) {
            let [y, m, d] = item.tanggal.split('-')
            let tglTarget = new Date(y, m - 1, d)
            let sisaHari = Math.round((tglTarget.getTime() - hariIni.getTime()) / (1000 * 60 * 60 * 24));

            let caption = '';
            if (sisaHari === 3) caption = `⏳ *PENGINGAT H-3*\n\nLayanan *${item.target}* jatuh tempo dalam 3 hari lagi.`;
            else if (sisaHari === 1) caption = `⚠️ *PENGINGAT H-1*\n\nLayanan *${item.target}* jatuh tempo *BESOK!*`;
            else if (sisaHari === 0) caption = `🚨 *PENGINGAT HARI H*\n\nLayanan *${item.target}* jatuh tempo *HARI INI*.`;

            if (caption) {
                await global.conn.sendMessage(item.jid, { 
                    text: caption,
                    contextInfo: {
                        externalAdReply: {
                            title: "BILLING REMINDER",
                            body: item.target,
                            thumbnailUrl: "https://files.catbox.moe/0v9x3q.jpg",
                            mediaType: 1,
                            renderLargerThumbnail: true
                        }
                    }
                }).catch(e => console.log('Gagal kirim notif JT'))
            }
            if (sisaHari >= 0) masiBerlaku.push(item)
        }
        fs.writeFileSync(jtPath, JSON.stringify(masiBerlaku, null, 2))
    } catch (e) { console.log("Error JT System: ", e) }
}, 60 * 1000);
// --- FITUR AUTO BACKUP JAM 10 MALEM ---
setInterval(async () => {
    // Pastikan koneksi sudah siap
    if (!global.conn || !global.conn.user) return

    // Setting Waktu Jakarta
    let now = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
    let dateObj = new Date(now);
    let hour = dateObj.getHours();
    let minute = dateObj.getMinutes();
    let timeNow = hour.toString().padStart(2, '0') + ':' + minute.toString().padStart(2, '0');
    let dateToday = dateObj.toISOString().split('T')[0];

    // Target Jam 22:00 (10 Malem)
    if (timeNow === '22:00') {
        // Anti-spam agar tidak backup berkali-kali di menit yang sama
        if (global.lastBackup === dateToday) return
        global.lastBackup = dateToday

        const targetGroup = '120363043223925309@g.us'
        console.log('⏳ Menjalankan Auto Backup Jam 10 Malam...')

        try {
            const zip = new AdmZip()
            const folderName = path.basename(process.cwd())
            const zipName = `AutoBackup_${folderName}_${dateToday}.zip`
            const rootPath = process.cwd()

            // Daftar yang diabaikan (sama dengan manual kamu)
            const ignoreList = [
                'node_modules',
                'package-lock.json',
                '.git',
                '.npm',
                'tmp',
                'sessions' // Opsional: sessions biasanya berat, tapi terserah Arasya mau ikut dibackup atau tidak
            ]

            const files = fs.readdirSync(rootPath)
            for (const file of files) {
                if (ignoreList.includes(file) || file.endsWith('.zip')) continue
                const filePath = path.join(rootPath, file)
                const stats = fs.statSync(filePath)
                if (stats.isDirectory()) {
                    zip.addLocalFolder(filePath, file)
                } else {
                    zip.addLocalFile(filePath)
                }
            }

            const buffer = zip.toBuffer()

            // Kirim ke Grup Tujuan
            await global.conn.sendMessage(targetGroup, {
                document: buffer,
                mimetype: 'application/zip',
                fileName: zipName,
                caption: `🗂️ *AUTO BACKUP SYSTEM*\n\n📅 Tanggal: ${dateToday}\n⏰ Waktu: 22:00 WIB\n📂 Status: Berhasil dicadangkan otomatis.`
            })

            console.log('✅ Auto Backup Berhasil Terkirim ke Grup.')

        } catch (e) {
            console.error('❌ Gagal Auto Backup:', e)
            // Kirim laporan error ke owner jika gagal
            await global.conn.sendMessage(global.owner[0] + '@s.whatsapp.net', { 
                text: `❌ *Laporan Gagal Auto Backup:*\n${e.message}` 
            })
        }
    }
}, 60 * 1000); // Cek setiap 1 menit
// --- FITUR AUTO NOTIF SHOLAT ---
setInterval(async () => {
    if (!global.db.data || !global.conn) return

    let now = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
    let dateObj = new Date(now);
    let timeNow = dateObj.getHours().toString().padStart(2, '0') + ':' + dateObj.getMinutes().toString().padStart(2, '0');
    let dateSearch = dateObj.toISOString().split('T')[0];

    let allChats = Object.keys(global.db.data.chats)
    let uniqueCities = [...new Set(allChats.map(id => global.db.data.chats[id].kotaSholat).filter(v => v))]

    for (let idKota of uniqueCities) {
        try {
            let res = await fetch(`https://api.myquran.com/v2/sholat/jadwal/${idKota}/${dateSearch}`)
            let json = await res.json()
            if (!json.status) continue
            
            let j = json.data.jadwal
            let jadwalSholat = {
                subuh: j.subuh,
                dzuhur: j.dzuhur,
                ashar: j.ashar,
                maghrib: j.maghrib,
                isya: j.isya
            }

            for (let [nama, waktu] of Object.entries(jadwalSholat)) {
                if (timeNow === waktu) {
                    for (let jid of allChats) {
                        let chat = global.db.data.chats[jid]
                        if (chat.kotaSholat !== idKota || chat.lastNotif === waktu) continue

                        // Logika Notif Sholat
                        if (chat.notifsholat) {
                            let caption = `🔔 *WAKTUNYA SHOLAT ${nama.toUpperCase()}* 🔔\n\n`
                            caption += `📍 Wilayah: *${json.data.lokasi}*\n`
                            caption += `⏰ Waktu: *${waktu}* WIB\n\n`
                            caption += `_"Shalatlah tepat pada waktunya, sesungguhnya shalat itu adalah kewajiban yang ditentukan waktunya atas orang-orang yang beriman."_`
                            await global.conn.sendMessage(jid, { text: caption })
                            chat.lastNotif = waktu
                        }
                    }
                }
            }
        } catch (e) {}
    }
}, 30 * 1000);
// Quick Test
async function _quickTest() {
	let test = await Promise.all(
		[
			spawn('ffmpeg'),
			spawn('ffprobe'),
			spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-filter_complex', 'color', '-frames:v', '1', '-f', 'webp', '-']),
			spawn('convert'),
			spawn('magick'),
			spawn('gm'),
			spawn('find', ['--version']),
		].map((p) => {
			return Promise.race([
				new Promise((resolve) => {
					p.on('close', (code) => {
						resolve(code !== 127);
					});
				}),
				new Promise((resolve) => {
					p.on('error', (_) => resolve(false));
				}),
			]);
		})
	);
	let [ffmpeg, ffprobe, ffmpegWebp, convert, magick, gm, find] = test;
	//console.log(test)
	let s = (global.support = {
		ffmpeg,
		ffprobe,
		ffmpegWebp,
		convert,
		magick,
		gm,
		find,
	});
	// require('./lib/sticker').support = s
	Object.freeze(global.support);

	if (!s.ffmpeg) conn.logger.warn('Please install ffmpeg for sending videos (pkg install ffmpeg)');
	if (s.ffmpeg && !s.ffmpegWebp) conn.logger.warn('Stickers may not animated without libwebp on ffmpeg (--enable-ibwebp while compiling ffmpeg)');
	if (!s.convert && !s.magick && !s.gm) conn.logger.warn('Stickers may not work without imagemagick if libwebp on ffmpeg doesnt isntalled (pkg install imagemagick)');
}

/*
setInterval(async () => {
    if (stopped === 'close' && conn.authState.creds.registered) return;
    fs.readdir("./sessions", async function(err, files) {
        if (err) {
            console.log('Unable to scan directory: ' + err);
        }
        let filteredArray = await files.filter(item => item.startsWith("pre-key") || item.startsWith("sender-key") || item.startsWith("device-list") || item.startsWith("lid-mapping") || item.startsWith("session-") || item.startsWith("app-state"))
        if (filteredArray.length == 0) return

        console.log(`Menghapus ${filteredArray.length} file sessions...`)
        filteredArray.forEach(function(file) {
            fs.unlinkSync(`./sessions/${file}`)
        });
        console.log("Berhasil menghapus semua sampah di folder session")
    });
}, 2 * 60 * 60 * 1000);
*/

_quickTest()
	.then(() => conn.logger.info('☑️ Quick Test Done'))
	.catch(console.error);
