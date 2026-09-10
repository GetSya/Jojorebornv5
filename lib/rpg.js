// Elarion RPG core. DB terpisah: database-rpg.json. Tanpa emoji bawaan.
// Simbol visual hanya gaya fonts-emojis: ────୨ৎ──── / ── ⋆⋅𖤓⋅⋆ ── / 「 ✦ 」 / ╰┈➤ / ⋆˚࿔

export const SEP_A = '────୨ৎ────'
export const SEP_B = '-- ⋆⋅𖤓⋅⋆ --'
export const ARROW = '╰┈➤'
export const DOT = '⋆˚࿔'

export function head(t) { return '「 ✦ ' + t + ' ✦ 」' }
export function fmt(n) { return Number(n || 0).toLocaleString('id-ID') }
export function bar(cur, max, len = 10) {
  cur = Math.max(0, cur); max = Math.max(1, max)
  const f = Math.round((cur / max) * len)
  return '[' + '■'.repeat(f) + '□'.repeat(Math.max(0, len - f)) + '] ' + fmt(cur) + '/' + fmt(max)
}
export function expNeeded(lv) { return Math.floor(100 * Math.pow(1.5, lv - 1)) + (lv - 1) * 50 }
export function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
export function weighted(items) {
  const tot = items.reduce((s, i) => s + (i.w || 1), 0)
  let r = Math.random() * tot
  for (const it of items) { r -= (it.w || 1); if (r <= 0) return it }
  return items[items.length - 1]
}
export function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }

export const WILAYAH = [
  { id: 'desa', nama: 'Desa Pemula', minLv: 1, desc: 'Titik awal petualang. Aman untuk latihan.' },
  { id: 'hutan', nama: 'Hutan Terlarang', minLv: 6, desc: 'Kabut tebal. Ranger hilang di sini.' },
  { id: 'kerajaan', nama: 'Kerajaan Manusia', minLv: 10, desc: 'Pusat shop, guild, dan arena.' },
  { id: 'gunung', nama: 'Pegunungan Es', minLv: 16, desc: 'Jalur beku. Golem es berkeliaran.' },
  { id: 'gurun', nama: 'Gurun Kuno', minLv: 25, desc: 'Reruntuhan, jebakan, dan harta.' },
  { id: 'bawahtanah', nama: 'Kota Bawah Tanah', minLv: 30, desc: 'Pasar gelap dan quest tersembunyi.' },
  { id: 'laut', nama: 'Lautan Misterius', minLv: 35, desc: 'Portal laut dan kapal hantu.' },
  { id: 'iblis', nama: 'Wilayah Iblis', minLv: 50, desc: 'Gerbang iblis. Elite berkumpul.' },
  { id: 'akhir', nama: 'Dunia Akhir', minLv: 70, desc: 'Ujung realitas. Endgame sejati.' }
]

export const CLASS_LIST = {
  warrior: { nama: 'Warrior', role: 'Damage', hp: 120, mana: 40, atk: 14, def: 10, spd: 8, crit: 5, luck: 5, desc: 'Seimbang. Cocok solo pemula.', skills: [{ n: 'Slash', mp: 5, pow: 1.3 }, { n: 'Guard Stance', mp: 4, pow: 0 }, { n: 'War Cry', mp: 8, pow: 1.6 }] },
  knight: { nama: 'Knight', role: 'Tank', hp: 160, mana: 40, atk: 11, def: 15, spd: 6, crit: 3, luck: 5, desc: 'Tank party. Wajib dungeon Hard+.', skills: [{ n: 'Taunt', mp: 4, pow: 0 }, { n: 'Shield Wall', mp: 6, pow: 0 }, { n: 'Holy Slash', mp: 8, pow: 1.5 }] },
  berserker: { nama: 'Berserker', role: 'Damage', hp: 140, mana: 30, atk: 18, def: 7, spd: 10, crit: 8, luck: 6, desc: 'Makin sekarat makin sakit.', skills: [{ n: 'Rage', mp: 5, pow: 1.4 }, { n: 'Blood Slash', mp: 10, pow: 2.0 }, { n: 'Frenzy', mp: 12, pow: 2.4 }] },
  archer: { nama: 'Archer', role: 'Damage', hp: 100, mana: 50, atk: 15, def: 8, spd: 16, crit: 12, luck: 10, desc: 'Cepat + crit. Raja hunt.', skills: [{ n: 'Double Shot', mp: 6, pow: 1.5 }, { n: 'Piercing Arrow', mp: 9, pow: 1.9 }, { n: 'Trap', mp: 5, pow: 0 }] },
  assassin: { nama: 'Assassin', role: 'Damage', hp: 90, mana: 50, atk: 17, def: 7, spd: 18, crit: 15, luck: 12, desc: 'Burst luck. Unlock Bawah Tanah.', skills: [{ n: 'Backstab', mp: 7, pow: 1.8 }, { n: 'Poison', mp: 6, pow: 1.2 }, { n: 'Shadow Step', mp: 8, pow: 0 }] },
  mage: { nama: 'Mage', role: 'Damage', hp: 80, mana: 120, atk: 19, def: 6, spd: 9, crit: 8, luck: 7, desc: 'Burst mana besar, boros.', skills: [{ n: 'Fireball', mp: 10, pow: 1.8 }, { n: 'Freeze', mp: 12, pow: 1.5 }, { n: 'Meteor', mp: 25, pow: 3.0 }] },
  healer: { nama: 'Healer', role: 'Healer', hp: 100, mana: 110, atk: 9, def: 9, spd: 10, crit: 4, luck: 8, desc: 'Wajib party. Solo lemah.', skills: [{ n: 'Heal', mp: 12, pow: -1 }, { n: 'Cleanse', mp: 8, pow: 0 }, { n: 'Revive', mp: 30, pow: 0 }] },
  necromancer: { nama: 'Necromancer', role: 'Support', hp: 95, mana: 110, atk: 14, def: 8, spd: 9, crit: 6, luck: 9, desc: 'Summon skeleton. Quest kematian.', skills: [{ n: 'Summon', mp: 15, pow: 1.4 }, { n: 'Life Drain', mp: 10, pow: 1.5 }, { n: 'Curse', mp: 8, pow: 1.1 }] },
  paladin: { nama: 'Paladin', role: 'Tank', hp: 150, mana: 80, atk: 13, def: 13, spd: 7, crit: 5, luck: 7, desc: 'Tank + heal hybrid.', skills: [{ n: 'Smite', mp: 8, pow: 1.6 }, { n: 'Blessing', mp: 12, pow: -1 }, { n: 'Sanctuary', mp: 15, pow: 0 }] },
  summoner: { nama: 'Summoner', role: 'Support', hp: 105, mana: 100, atk: 13, def: 9, spd: 11, crit: 7, luck: 10, desc: 'Pet permanen yang bisa di-build.', skills: [{ n: 'Contract', mp: 15, pow: 1.3 }, { n: 'Evolve', mp: 10, pow: 0 }, { n: 'Link', mp: 12, pow: 1.6 }] }
}

export const MONSTERS = [
  { id: 'slime', nama: 'Slime Hijau', tier: 'Common', lv: 1, hp: 40, atk: 6, def: 2, exp: 20, gold: 30 },
  { id: 'tikus', nama: 'Tikus Got', tier: 'Common', lv: 2, hp: 55, atk: 8, def: 3, exp: 28, gold: 40 },
  { id: 'serigala', nama: 'Serigala Kabut', tier: 'Uncommon', lv: 8, hp: 180, atk: 20, def: 10, exp: 90, gold: 150 },
  { id: 'jamur', nama: 'Jamur Beracun', tier: 'Uncommon', lv: 10, hp: 220, atk: 24, def: 12, exp: 110, gold: 180 },
  { id: 'bandit', nama: 'Bandit Jalanan', tier: 'Rare', lv: 14, hp: 350, atk: 34, def: 16, exp: 180, gold: 320 },
  { id: 'golemes', nama: 'Golem Es', tier: 'Elite', lv: 22, hp: 900, atk: 55, def: 40, exp: 400, gold: 700 },
  { id: 'mumi', nama: 'Mumi Kuno', tier: 'Elite', lv: 30, hp: 1500, atk: 80, def: 55, exp: 650, gold: 1100 },
  { id: 'kraken', nama: 'Kraken Muda', tier: 'Epic', lv: 40, hp: 2600, atk: 120, def: 70, exp: 1100, gold: 2000 },
  { id: 'iblis', nama: 'Iblis Abyss', tier: 'Legendary', lv: 55, hp: 5000, atk: 180, def: 110, exp: 2200, gold: 4000 },
  { id: 'varkhul', nama: 'Raja Iblis Varkhul', tier: 'Boss', lv: 70, hp: 12000, atk: 260, def: 160, exp: 6000, gold: 12000 }
]

export const SHOP = [
  { id: 'php', nama: 'Potion HP +300', harga: 500, efek: 'Heal 300 HP di battle. Pakai: use php' },
  { id: 'pmp', nama: 'Potion MP +200', harga: 450, efek: 'Restore 200 MP. Pakai: use pmp' },
  { id: 'bomb', nama: 'Bom Api', harga: 800, efek: 'Damage 250 pasti ke musuh. Pakai: use bomb' },
  { id: 'ironsword', nama: 'Iron Sword [Rare]', harga: 5000, efek: 'Weapon ATK +25. Pakai: equip ironsword' },
  { id: 'steelarmor', nama: 'Steel Armor [Rare]', harga: 5500, efek: 'Armor DEF +20. Pakai: equip steelarmor' },
  { id: 'windboots', nama: 'Wind Boots [Rare]', harga: 4000, efek: 'Boots SPD +8. Pakai: equip windboots' },
  { id: 'ironhelm', nama: 'Iron Helm [Rare]', harga: 3500, efek: 'Helmet DEF +10 HP +50. Pakai: equip ironhelm' },
  { id: 'powerring', nama: 'Power Ring [Epic]', harga: 9000, efek: 'Ring ATK +15 Crit +3%. Pakai: equip powerring' },
  { id: 'luckneck', nama: 'Luck Necklace [Epic]', harga: 9000, efek: 'Necklace Luck +8. Pakai: equip luckneck' },
  { id: 'tiketdg', nama: 'Tiket Dungeon', harga: 1000, efek: 'Syarat masuk dungeon Hard+.' }
]

export const EQUIP_STAT = {
  ironsword: { slot: 'weapon', atk: 25 },
  steelarmor: { slot: 'armor', def: 20 },
  windboots: { slot: 'boots', spd: 8 },
  ironhelm: { slot: 'helmet', def: 10, hp: 50 },
  powerring: { slot: 'ring', atk: 15, crit: 3 },
  luckneck: { slot: 'necklace', luck: 8 }
}

export const TITLES = [
  { id: 'pemula', nama: 'Pemula', syarat: 'Awal', atk: 0, def: 0 },
  { id: 'pemburu', nama: 'Pemburu Hutan', syarat: 'Kalahkan 10 monster', atk: 5, def: 0 },
  { id: 'penakluk', nama: 'Penakluk Dungeon', syarat: 'Clear 3 dungeon', atk: 8, def: 8 },
  { id: 'sultan', nama: 'Sultan Elarion', syarat: 'Punya 50.000 Gold', atk: 0, def: 10 },
  { id: 'legenda', nama: 'Legenda Hidup', syarat: 'Capai Lv 50', atk: 15, def: 15 }
]

export const ACHIEVEMENTS = [
  { id: 'kill10', nama: 'Pemburu 10', desc: 'Kalahkan 10 monster', cek: (p) => (p.kills || 0) >= 10, gold: 1000, exp: 200 },
  { id: 'lv10', nama: 'Lv 10', desc: 'Capai Lv 10', cek: (p) => p.level >= 10, gold: 2000, exp: 0 },
  { id: 'lv30', nama: 'Lv 30', desc: 'Capai Lv 30', cek: (p) => p.level >= 30, gold: 8000, exp: 0 },
  { id: 'kaya', nama: 'Kaya Raya', desc: 'Punya 50.000 Gold', cek: (p) => p.gold >= 50000, gold: 0, exp: 500 },
  { id: 'dg3', nama: 'Penjelajah Dungeon', desc: 'Clear 3 dungeon', cek: (p) => (p.dgClear || 0) >= 3, gold: 3000, exp: 400 }
]

export const DUNGEONS = [
  { id: 'normal', nama: 'Normal', minLv: 10, mult: 1, tiket: 0, desc: 'Solo bisa.' },
  { id: 'hard', nama: 'Hard', minLv: 25, mult: 1.8, tiket: 1, desc: 'Party 2-3 disarankan.' },
  { id: 'nightmare', nama: 'Nightmare', minLv: 40, mult: 2.8, tiket: 1, desc: 'Party full + gear Epic.' },
  { id: 'hell', nama: 'Hell', minLv: 60, mult: 4, tiket: 2, desc: 'Gear Legendary.' },
  { id: 'abyss', nama: 'Abyss', minLv: 75, mult: 6, tiket: 3, desc: 'Endgame. Drop Mythic.' }
]

export function checkAch(p) {
  const baru = []
  for (const a of ACHIEVEMENTS) {
    if (!p.ach.includes(a.id) && a.cek(p)) {
      p.ach.push(a.id)
      if (a.gold) p.gold += a.gold
      if (a.exp) addExp(p, a.exp)
      baru.push(a)
    }
  }
  return baru
}

export function newPlayer(name) {
  return {
    nama: name || 'Petualang',
    classId: null,
    level: 1, exp: 0,
    hp: 100, maxHp: 100, mana: 50, maxMana: 50,
    atk: 10, def: 8, spd: 8, crit: 5, luck: 5,
    gold: 500,
    wilayah: 'desa',
    inv: [{ id: 'php', n: 'Potion HP +300', qty: 2 }, { id: 'pmp', n: 'Potion MP +200', qty: 1 }],
    equip: { weapon: null, armor: null, helmet: null, boots: null, ring: null, necklace: null },
    kills: 0, dgClear: 0,
    skillPoint: 0,
    quest: { main: 0, daily: {}, weekly: {}, lastDaily: '', lastWeekly: '' },
    ach: [],
    rep: { kerajaan: 0, bawahtanah: 0, pemburu: 0, penyihir: 0, iblis: 0 },
    title: 'Pemula',
    battle: null,
    defend: false,
    cd: { adv: 0, hunt: 0, dg: 0, wb: 0 },
    created: Date.now()
  }
}

export function addExp(p, amount) {
  p.exp += amount
  let naik = 0
  while (p.exp >= expNeeded(p.level)) {
    p.exp -= expNeeded(p.level)
    p.level += 1; naik += 1
    p.maxHp += 25; p.maxMana += 10
    p.atk += 3; p.def += 2; p.spd += 1
    p.skillPoint += 3
    p.hp = p.maxHp; p.mana = p.maxMana
  }
  return naik
}

export function calcDamage(atk, def, pow = 1, crit = 5) {
  const isCrit = Math.random() * 100 < crit
  let d = Math.max(1, Math.round(atk * pow * (0.85 + Math.random() * 0.3) - def * 0.5))
  if (isCrit) d = Math.round(d * 1.6)
  return { dmg: d, crit: isCrit }
}

export function monsterForLevel(lv) {
  const pool = MONSTERS.filter(mo => mo.lv <= lv + 4)
  const base = pool.length ? pool : MONSTERS.slice(0, 2)
  const m = pick(base)
  const scale = 1 + Math.max(0, lv - m.lv) * 0.06
  return { ...m, hp: Math.round(m.hp * scale), maxHp: Math.round(m.hp * scale), atk: Math.round(m.atk * scale), def: Math.round(m.def * scale) }
}

export function wilayahById(id) { return WILAYAH.find(w => w.id === id) || WILAYAH[0] }
