import fs from 'fs'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'database-rpg.json')

const DEFAULT_DB = {
  players: {},
  guilds: {},
  parties: {},
  tradePending: {},
  worldBoss: null,
  groups: {},
  meta: { created: Date.now(), version: 2 }
}

let cache = null
let dirty = false

function load() {
  if (cache) return cache
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, 'utf-8')
      cache = raw.trim() ? JSON.parse(raw) : JSON.parse(JSON.stringify(DEFAULT_DB))
    } else {
      cache = JSON.parse(JSON.stringify(DEFAULT_DB))
      fs.writeFileSync(DB_PATH, JSON.stringify(cache, null, 2))
    }
  } catch {
    cache = JSON.parse(JSON.stringify(DEFAULT_DB))
  }
  for (const k of Object.keys(DEFAULT_DB)) {
    if (!(k in cache)) cache[k] = DEFAULT_DB[k]
  }
  return cache
}

function save() {
  if (!cache) return
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(cache, null, 2))
    dirty = false
  } catch {}
}

setInterval(() => { if (dirty && cache) save() }, 5000)
process.on('exit', () => { if (dirty && cache) { try { fs.writeFileSync(DB_PATH, JSON.stringify(cache, null, 2)) } catch {} } })

export function getDB() {
  return load()
}

export function writeDB() {
  dirty = true
  save()
}

export function getPlayer(jid) {
  const db = load()
  return db.players[jid] || null
}

export function setPlayer(jid, data) {
  const db = load()
  db.players[jid] = data
  writeDB()
}

export function getGuild(id) {
  const db = load()
  return db.guilds[id] || null
}

export function setGuild(id, data) {
  const db = load()
  db.guilds[id] = data
  writeDB()
}

export function isRpgEnabled(chatId, isGroup) {
  if (!isGroup) return true
  const db = load()
  return db.groups && db.groups[chatId] && db.groups[chatId].enabled === true
}

export function setRpgEnabled(chatId, on) {
  const db = load()
  if (!db.groups) db.groups = {}
  db.groups[chatId] = { enabled: !!on, updated: Date.now() }
  writeDB()
}

export default { getDB, writeDB, getPlayer, setPlayer, getGuild, setGuild, isRpgEnabled, setRpgEnabled, DB_PATH }
