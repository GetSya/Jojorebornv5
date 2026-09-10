/**
 * Helper login JVault — sumber kebenaran user: https://bot.acamedia.xyz
 * Bin: https://jvault.aerialstudio.tech/api?bin_id=255feaaa-e64c-4b4e-b2de-5f2ec0ee54b3
 * Bentuk respon: { users: [{ id, username, whatsapp, email, ... }], ... }
 */

function getConf() {
	return (
		global.jvault || {
			api: 'https://jvault.aerialstudio.tech/api',
			bin_id: '255feaaa-e64c-4b4e-b2de-5f2ec0ee54b3',
			cacheMs: 60 * 1000,
			loginUrl: 'https://bot.acamedia.xyz',
			registerUrl: 'https://bot.acamedia.xyz/register',
		}
	);
}

let _cache = { at: 0, data: null };

/** Ambil fetch yang tersedia (Node 18+ punya global fetch, fallback ke node-fetch). */
async function getFetch() {
	if (typeof fetch !== 'undefined') return fetch;
	const mod = await import('node-fetch');
	return mod.default || mod;
}

/** Normalisasi nomor ke format 62xxxxxxxxxx (tanpa +, tanpa spasi/strip). */
export function normalizePhone(input = '') {
	let d = String(input || '').replace(/[^0-9]/g, '');
	if (!d) return '';
	if (d.startsWith('00')) d = d.slice(2);
	if (d.startsWith('+')) d = d.slice(1);
	if (d.startsWith('0')) d = '62' + d.slice(1);
	// Nomor lokal tanpa kode negara, mis. 8123456789 (panjang 9-12, diawali 8)
	if (/^8\d{8,11}$/.test(d)) d = '62' + d;
	return d;
}

/** Ambil nomor dari JID WhatsApp. */
export function phoneFromJid(jid = '') {
	return normalizePhone(String(jid).split('@')[0].split(':')[0]);
}

/** Ambil field whatsapp dari satu object user (toleran beda penamaan). */
export function userWhatsapp(u = {}) {
	const raw =
		u.whatsapp ??
		u.phone ??
		u.no_hp ??
		u.noHp ??
		u.nomor ??
		u.nomor_wa ??
		u.wa ??
		'';
	return normalizePhone(raw);
}

function extractUsers(json) {
	if (!json) return [];
	if (Array.isArray(json)) return json;
	if (Array.isArray(json.users)) return json.users;
	if (Array.isArray(json.data)) return json.data;
	if (Array.isArray(json.data?.users)) return json.data.users;
	if (Array.isArray(json.result)) return json.result;
	if (Array.isArray(json.rows)) return json.rows;
	return [];
}

/** Fetch mentah bin JVault (pakai cache memori). force=true untuk bypass cache. */
export async function fetchJvaultBin(force = false) {
	const conf = getConf();
	const now = Date.now();
	if (!force && _cache.data && now - _cache.at < (conf.cacheMs || 60 * 1000)) {
		return _cache.data;
	}
	const _fetch = await getFetch();
	const url = `${conf.api}?bin_id=${encodeURIComponent(conf.bin_id)}`;
	const res = await _fetch(url);
	if (!res.ok) throw new Error(`JVault HTTP ${res.status}`);
	const json = await res.json();
	_cache = { at: now, data: json };
	return json;
}

/** Cari user JVault berdasarkan nomor telepon (perbandingan dinormalisasi). */
export async function findJvaultUserByPhone(phone, { force = false } = {}) {
	const mine = normalizePhone(phone);
	if (!mine) return null;
	const json = await fetchJvaultBin(force);
	const users = extractUsers(json);
	// 1. Cocok persis
	let hit = users.find((u) => userWhatsapp(u) && userWhatsapp(u) === mine);
	if (hit) return hit;
	// 2. Fallback: cocok 10 digit terakhir (toleransi format 0/62/+62)
	const tail = (n) => String(n).slice(-10);
	hit = users.find((u) => {
		const w = userWhatsapp(u);
		return w && tail(w) === tail(mine) && tail(mine).length >= 9;
	});
	return hit || null;
}

/** Cek apakah nomor WA sudah terdaftar di JVault. */
export async function checkJvaultLogin(phone, opts = {}) {
	const user = await findJvaultUserByPhone(phone, opts);
	return { found: !!user, jvaultUser: user || null };
}

export function clearJvaultCache() {
	_cache = { at: 0, data: null };
}

export default {
	normalizePhone,
	phoneFromJid,
	userWhatsapp,
	fetchJvaultBin,
	findJvaultUserByPhone,
	checkJvaultLogin,
	clearJvaultCache,
};
