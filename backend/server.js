import { randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'
import { createReadStream, existsSync, readFileSync, readdirSync } from 'node:fs'
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import path from 'node:path'
import { Readable } from 'node:stream'
import { URL, fileURLToPath } from 'node:url'

const PORT = Number(process.env.PORT || 4000)
const HOST = process.env.HOST || '0.0.0.0'
const BACKEND_DIR = fileURLToPath(new URL('.', import.meta.url))
const REPO_DIR = path.resolve(BACKEND_DIR, '..')
const DATA_DIR = process.env.LIBHUB_DATA_DIR?.trim()
  ? path.resolve(process.env.LIBHUB_DATA_DIR)
  : BACKEND_DIR
const STORAGE_DIR = process.env.LIBHUB_STORAGE_DIR?.trim()
  ? path.resolve(process.env.LIBHUB_STORAGE_DIR)
  : ''
const DATA_PATH = path.join(DATA_DIR, 'data.json')
const SQLITE_DB_PATH = path.join(DATA_DIR, 'db.sqlite3')
const DEFAULT_DATA_TEMPLATE_PATH = path.join(BACKEND_DIR, 'default-data.json')
const FRONTEND_DIST_DIR = path.join(REPO_DIR, 'frontend', 'dist')
const DJANGO_API_ORIGIN = (process.env.DJANGO_API_ORIGIN || '').trim().replace(/\/+$/, '')
/** fallback when env is unset (local dev); render sets DJANGO_API_ORIGIN explicitly */
const DEFAULT_DJANGO_DEV_ORIGIN = 'http://127.0.0.1:8000'

const normalizeDjangoFetchUrl = (urlString) => {
  try {
    const next = new URL(urlString)
    if (next.hostname === 'localhost') {
      next.hostname = '127.0.0.1'
    }
    return next.toString()
  } catch {
    return urlString
  }
}

const sessions = new Map()
const DEVELOPER_USER_ID = 'developer-root'
const DEVELOPER_PASSWORD_SALT = '3880ee17ce72a6a45a7591c52d42538f'
const DEVELOPER_PASSWORD_HASH =
  '082ad539540e564a35d1227f772fbb47da14925019c9a5f3acfa7e8b7daecd4c34e9c458031a84e347273db9701be870bec0c79b087e5df13cb9535a39f94592'
const DEVELOPER_PROFILE = {
  id: DEVELOPER_USER_ID,
  firstName: 'Dev',
  lastName: 'Admin',
  name: 'Dev Admin',
  email: 'dev-admin@libhub.local',
  role: 'developer',
  bio: 'Hidden developer control panel for LibHub.',
}

const FILE_EXTENSIONS = {
  '.txt': 'text',
  '.md': 'text',
  '.html': 'html',
  '.htm': 'html',
  '.pdf': 'pdf',
  '.epub': 'epub',
}

const CONTENT_TYPES = {
  pdf: 'application/pdf',
  epub: 'application/epub+zip',
  html: 'text/html; charset=utf-8',
  text: 'text/plain; charset=utf-8',
}

const STATIC_CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-length',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
])

const COMMENT_BODY_LIMIT = 800
const BLOCKED_COMMENT_STEMS = [
  'хуй',
  'пизд',
  'ебан',
  'ебат',
  'ебл',
  'бля',
  'бляд',
  'сука',
  'сучк',
  'мудак',
  'гандон',
  'шлюх',
]

const DEMO_BOOK_IDS = new Set([
  'book-focus-learning',
  'book-interface-basics',
  'book-kg-history',
  'book-reading-routine',
])

const defaultData = {
  users: [
    {
      id: 'teacher-1',
      name: 'Р С’Р в„–Р В¶Р В°Р Р… Р СћР С•Р С”РЎвЂљР С•Р В±Р В°Р ВµР Р†Р В°',
      email: 'teacher@libhub.dev',
      password: 'teach123',
      role: 'teacher',
      bio: 'Р СџРЎР‚Р ВµР С—Р С•Р Т‘Р В°Р Р†Р В°РЎвЂљР ВµР В»РЎРЉ Р С‘ Р С”РЎС“РЎР‚Р В°РЎвЂљР С•РЎР‚ РЎвЂћР С•Р Р…Р Т‘Р В° РЎС“РЎвЂЎР ВµР В±Р Р…РЎвЂ№РЎвЂ¦ Р СР В°РЎвЂљР ВµРЎР‚Р С‘Р В°Р В»Р С•Р Р†.',
    },
    {
      id: 'student-1',
      name: 'Р С’Р в„–Р Т‘Р В°Р Р…Р В° Р СњРЎС“РЎР‚Р В±Р ВµР С”Р С•Р Р†Р В°',
      email: 'student@libhub.dev',
      password: 'study123',
      role: 'student',
      bio: 'Р РЋРЎвЂљРЎС“Р Т‘Р ВµР Р…РЎвЂљР С”Р В°, Р С”Р С•РЎвЂљР С•РЎР‚Р В°РЎРЏ Р С‘РЎРѓР С—Р С•Р В»РЎРЉР В·РЎС“Р ВµРЎвЂљ Р С—Р В»Р В°РЎвЂљРЎвЂћР С•РЎР‚Р СРЎС“ Р С”Р В°Р С” Р В»Р С‘РЎвЂЎР Р…РЎС“РЎР‹ РЎРЊР В»Р ВµР С”РЎвЂљРЎР‚Р С•Р Р…Р Р…РЎС“РЎР‹ Р В±Р С‘Р В±Р В»Р С‘Р С•РЎвЂљР ВµР С”РЎС“.',
    },
  ],
  categories: [
    { id: 'cat-school', name: 'Р РЃР С”Р С•Р В»РЎРЉР Р…Р С‘Р С”Р В°Р С Р С™Р В ' },
    { id: 'cat-history', name: 'Р ВРЎРѓРЎвЂљР С•РЎР‚Р С‘РЎвЂЎР ВµРЎРѓР С”Р С‘Р Вµ Р Р…Р В°РЎС“Р С”Р С‘' },
    { id: 'cat-design', name: 'Р вЂќР С‘Р В·Р В°Р в„–Р Р… Р С‘ РЎвЂ Р С‘РЎвЂћРЎР‚Р С•Р Р†Р В°РЎРЏ РЎРѓРЎР‚Р ВµР Т‘Р В°' },
    { id: 'cat-productivity', name: 'Р СџРЎР‚Р С•Р Т‘РЎС“Р С”РЎвЂљР С‘Р Р†Р Р…Р С•РЎРѓРЎвЂљРЎРЉ' },
  ],
  books: [
    {
      id: 'book-focus-learning',
      title: 'Р РЋР С•РЎРѓРЎР‚Р ВµР Т‘Р С•РЎвЂљР С•РЎвЂЎР ВµР Р…Р Р…Р С•Р Вµ Р С•Р В±РЎС“РЎвЂЎР ВµР Р…Р С‘Р Вµ',
      author: 'Р С™Р С•Р СР В°Р Р…Р Т‘Р В° LibHub',
      description: 'Р СџРЎР‚Р В°Р С”РЎвЂљР С‘РЎвЂЎР ВµРЎРѓР С”Р С•Р Вµ РЎР‚РЎС“Р С”Р С•Р Р†Р С•Р Т‘РЎРѓРЎвЂљР Р†Р С• Р С• РЎвЂљР С•Р С, Р С”Р В°Р С” РЎС“РЎвЂЎР С‘РЎвЂљРЎРЉРЎРѓРЎРЏ Р С–Р В»РЎС“Р В±Р В¶Р Вµ Р С‘ РЎвЂЎР С‘РЎвЂљР В°РЎвЂљРЎРЉ Р С•РЎРѓР СРЎвЂ№РЎРѓР В»Р ВµР Р…Р Р…Р С•.',
      categoryId: 'cat-productivity',
      theme: 'Р СњР В°Р Р†РЎвЂ№Р С”Р С‘ Р С•Р В±РЎС“РЎвЂЎР ВµР Р…Р С‘РЎРЏ',
      published: true,
      estimatedMinutes: 24,
      coverTone: '#4F46E5',
      publishYear: 2026,
      openCount: 182,
      createdAt: '2026-04-24T08:00:00.000Z',
      updatedAt: '2026-04-24T08:00:00.000Z',
      createdBy: 'teacher-1',
      readerType: 'text',
      sourceKind: 'manual',
      format: 'text',
      sourceLabel: 'Р В РЎС“РЎвЂЎР Р…Р С•Р Вµ Р Т‘Р С•Р В±Р В°Р Р†Р В»Р ВµР Р…Р С‘Р Вµ',
      content: [
        'Р ТђР С•РЎР‚Р С•РЎв‚¬Р ВµР Вµ Р С•Р В±РЎС“РЎвЂЎР ВµР Р…Р С‘Р Вµ Р Р…Р В°РЎвЂЎР С‘Р Р…Р В°Р ВµРЎвЂљРЎРѓРЎРЏ Р Р…Р Вµ РЎРѓ Р С”Р С•Р В»Р С‘РЎвЂЎР ВµРЎРѓРЎвЂљР Р†Р В° РЎвЂЎР В°РЎРѓР С•Р Р†, Р В° РЎРѓ Р С”Р В°РЎвЂЎР ВµРЎРѓРЎвЂљР Р†Р В° Р Р†Р Р…Р С‘Р СР В°Р Р…Р С‘РЎРЏ. Р вЂўРЎРѓР В»Р С‘ РЎРѓРЎвЂљРЎС“Р Т‘Р ВµР Р…РЎвЂљ РЎвЂЎР С‘РЎвЂљР В°Р ВµРЎвЂљ Р В±РЎвЂ№РЎРѓРЎвЂљРЎР‚Р С• Р С‘ Р В±Р ВµРЎРѓРЎРѓР С‘РЎРѓРЎвЂљР ВµР СР Р…Р С•, Р С•Р Р… Р С—Р С•Р В»РЎС“РЎвЂЎР В°Р ВµРЎвЂљ Р С•РЎвЂ°РЎС“РЎвЂ°Р ВµР Р…Р С‘Р Вµ Р В·Р В°Р Р…РЎРЏРЎвЂљР С•РЎРѓРЎвЂљР С‘, Р Р…Р С• Р Р…Р Вµ РЎР‚Р ВµР В°Р В»РЎРЉР Р…Р С•Р Вµ Р С—Р С•Р Р…Р С‘Р СР В°Р Р…Р С‘Р Вµ.',
        'Р СџР ВµРЎР‚Р Р†РЎвЂ№Р в„– РЎв‚¬Р В°Р С– Р С” Р С–Р В»РЎС“Р В±Р С•Р С”Р С•Р СРЎС“ РЎвЂЎРЎвЂљР ВµР Р…Р С‘РЎР‹ РІР‚вЂќ РЎРѓР С•Р В·Р Т‘Р В°РЎвЂљРЎРЉ РЎР‚Р С‘РЎвЂљР С. Р вЂ™РЎвЂ№Р Т‘Р ВµР В»Р С‘РЎвЂљР Вµ Р С”Р С•РЎР‚Р С•РЎвЂљР С”Р С‘Р в„– Р С•РЎвЂљРЎР‚Р ВµР В·Р С•Р С” Р Р†РЎР‚Р ВµР СР ВµР Р…Р С‘, РЎС“Р В±Р ВµРЎР‚Р С‘РЎвЂљР Вµ Р С•РЎвЂљР Р†Р В»Р ВµР С”Р В°РЎР‹РЎвЂ°Р С‘Р Вµ Р Р†Р С”Р В»Р В°Р Т‘Р С”Р С‘ Р С‘ Р В·Р В°РЎР‚Р В°Р Р…Р ВµР Вµ Р С•Р С—РЎР‚Р ВµР Т‘Р ВµР В»Р С‘РЎвЂљР Вµ, РЎвЂЎРЎвЂљР С• Р С‘Р СР ВµР Р…Р Р…Р С• РЎвЂ¦Р С•РЎвЂљР С‘РЎвЂљР Вµ Р С—Р С•Р Р…РЎРЏРЎвЂљРЎРЉ Р С” Р С”Р С•Р Р…РЎвЂ РЎС“ РЎРѓР ВµРЎРѓРЎРѓР С‘Р С‘.',
        'Р вЂ™Р С• Р Р†РЎР‚Р ВµР СРЎРЏ РЎвЂЎРЎвЂљР ВµР Р…Р С‘РЎРЏ Р В·Р В°Р Т‘Р В°Р Р†Р В°Р в„–РЎвЂљР Вµ РЎвЂљР ВµР С”РЎРѓРЎвЂљРЎС“ Р Р†Р С•Р С—РЎР‚Р С•РЎРѓРЎвЂ№. Р СџР С•РЎвЂЎР ВµР СРЎС“ Р В°Р Р†РЎвЂљР С•РЎР‚ РЎвЂћР С•РЎР‚Р СРЎС“Р В»Р С‘РЎР‚РЎС“Р ВµРЎвЂљ Р СРЎвЂ№РЎРѓР В»РЎРЉ Р С‘Р СР ВµР Р…Р Р…Р С• РЎвЂљР В°Р С”? Р СњР В° Р С”Р В°Р С”Р С‘Р Вµ Р С—РЎР‚Р С•Р В±Р В»Р ВµР СРЎвЂ№ Р С•Р Р… Р С•РЎвЂљР Р†Р ВµРЎвЂЎР В°Р ВµРЎвЂљ? Р вЂњР Т‘Р Вµ Р СР С•Р В¶Р Р…Р С• Р С—РЎР‚Р С‘Р СР ВµР Р…Р С‘РЎвЂљРЎРЉ РЎРЊРЎвЂљРЎС“ Р С‘Р Т‘Р ВµРЎР‹ Р Р† РЎР‚Р ВµР В°Р В»РЎРЉР Р…Р С•Р в„– РЎС“РЎвЂЎР ВµР В±Р Вµ?',
        'Р СџР С•РЎРѓР В»Р Вµ Р С”Р В°Р В¶Р Т‘Р С•Р С–Р С• РЎРѓР СРЎвЂ№РЎРѓР В»Р С•Р Р†Р С•Р С–Р С• Р В±Р В»Р С•Р С”Р В° Р С—Р С•Р В»Р ВµР В·Р Р…Р С• РЎРѓР Т‘Р ВµР В»Р В°РЎвЂљРЎРЉ Р С”Р С•РЎР‚Р С•РЎвЂљР С”РЎС“РЎР‹ Р С•РЎРѓРЎвЂљР В°Р Р…Р С•Р Р†Р С”РЎС“. Р СџР ВµРЎР‚Р ВµРЎРѓР С”Р В°Р В¶Р С‘РЎвЂљР Вµ Р С—РЎР‚Р С•РЎвЂЎР С‘РЎвЂљР В°Р Р…Р Р…Р С•Р Вµ РЎРѓР Р†Р С•Р С‘Р СР С‘ РЎРѓР В»Р С•Р Р†Р В°Р СР С‘ Р С‘ Р С—Р С•Р С—РЎР‚Р С•Р В±РЎС“Р в„–РЎвЂљР Вµ РЎРѓР Р†РЎРЏР В·Р В°РЎвЂљРЎРЉ Р ВµР С–Р С• РЎРѓ РЎвЂљР ВµР С, РЎвЂЎРЎвЂљР С• РЎС“Р В¶Р Вµ Р В·Р Р…Р В°Р ВµРЎвЂљР Вµ.',
        'Р вЂ”Р В°Р С—Р С•Р СР С‘Р Р…Р В°Р Р…Р С‘Р Вµ РЎС“РЎРѓР С‘Р В»Р С‘Р Р†Р В°Р ВµРЎвЂљРЎРѓРЎРЏ, Р С”Р С•Р С–Р Т‘Р В° РЎвЂЎРЎвЂљР ВµР Р…Р С‘Р Вµ РЎРѓР С•Р С—РЎР‚Р С•Р Р†Р С•Р В¶Р Т‘Р В°Р ВµРЎвЂљРЎРѓРЎРЏ Р Т‘Р ВµР в„–РЎРѓРЎвЂљР Р†Р С‘Р ВµР С. Р С›РЎвЂљР СР ВµРЎвЂЎР В°Р в„–РЎвЂљР Вµ Р С”Р В»РЎР‹РЎвЂЎР ВµР Р†РЎвЂ№Р Вµ Р СР ВµРЎРѓРЎвЂљР В°, РЎРѓР С•Р В·Р Т‘Р В°Р Р†Р В°Р в„–РЎвЂљР Вµ Р В·Р В°Р С”Р В»Р В°Р Т‘Р С”Р С‘ Р С‘ РЎвЂћР С‘Р С”РЎРѓР С‘РЎР‚РЎС“Р в„–РЎвЂљР Вµ РЎРѓР С•Р В±РЎРѓРЎвЂљР Р†Р ВµР Р…Р Р…РЎвЂ№Р Вµ Р В·Р В°Р СР ВµРЎвЂљР С”Р С‘ РЎР‚РЎРЏР Т‘Р С•Р С РЎРѓ РЎвЂљР ВµР СР С‘ Р В°Р В±Р В·Р В°РЎвЂ Р В°Р СР С‘, Р С” Р С”Р С•РЎвЂљР С•РЎР‚РЎвЂ№Р С РЎвЂ¦Р С•РЎвЂљР С‘РЎвЂљР Вµ Р Р†Р ВµРЎР‚Р Р…РЎС“РЎвЂљРЎРЉРЎРѓРЎРЏ.',
        'Р ТђР С•РЎР‚Р С•РЎв‚¬Р В°РЎРЏ Р С•Р В±РЎР‚Р В°Р В·Р С•Р Р†Р В°РЎвЂљР ВµР В»РЎРЉР Р…Р В°РЎРЏ Р С—Р В»Р В°РЎвЂљРЎвЂћР С•РЎР‚Р СР В° Р Р…Р Вµ Р С—РЎР‚Р С•РЎРѓРЎвЂљР С• РЎвЂ¦РЎР‚Р В°Р Р…Р С‘РЎвЂљ Р С”Р Р…Р С‘Р С–Р С‘, Р В° Р С—Р С•Р СР С•Р С–Р В°Р ВµРЎвЂљ Р Р†Р С•Р В·Р Р†РЎР‚Р В°РЎвЂ°Р В°РЎвЂљРЎРЉРЎРѓРЎРЏ Р Р† Р Р…РЎС“Р В¶Р Р…Р С•Р Вµ Р СР ВµРЎРѓРЎвЂљР С• Р В±Р ВµР В· РЎвЂљРЎР‚Р ВµР Р…Р С‘РЎРЏ. Р СџР С•РЎРЊРЎвЂљР С•Р СРЎС“ РЎРѓР С‘Р Р…РЎвЂ¦РЎР‚Р С•Р Р…Р С‘Р В·Р В°РЎвЂ Р С‘РЎРЏ Р С—РЎР‚Р С•Р С–РЎР‚Р ВµРЎРѓРЎРѓР В° Р С‘ Р С‘РЎРѓРЎвЂљР С•РЎР‚Р С‘Р С‘ РЎвЂЎРЎвЂљР ВµР Р…Р С‘РЎРЏ Р Т‘Р ВµР в„–РЎРѓРЎвЂљР Р†Р С‘РЎвЂљР ВµР В»РЎРЉР Р…Р С• Р Р†Р В»Р С‘РЎРЏР ВµРЎвЂљ Р Р…Р В° РЎР‚Р ВµР В·РЎС“Р В»РЎРЉРЎвЂљР В°РЎвЂљ.',
        'Р вЂўРЎРѓР В»Р С‘ Р С”Р В°Р С”Р С•Р в„–-РЎвЂљР С• РЎвЂћРЎР‚Р В°Р С–Р СР ВµР Р…РЎвЂљ Р С”Р В°Р В¶Р ВµРЎвЂљРЎРѓРЎРЏ РЎРѓР В»Р С•Р В¶Р Р…РЎвЂ№Р С, Р Р…Р Вµ Р Р…РЎС“Р В¶Р Р…Р С• РЎРѓРЎР‚Р В°Р В·РЎС“ Р С—Р ВµРЎР‚Р ВµРЎРѓР С”Р В°Р С”Р С‘Р Р†Р В°РЎвЂљРЎРЉ Р Т‘Р В°Р В»РЎРЉРЎв‚¬Р Вµ. Р вЂєРЎС“РЎвЂЎРЎв‚¬Р Вµ Р Р†РЎвЂ№Р Т‘Р ВµР В»Р С‘РЎвЂљРЎРЉ Р С‘Р Т‘Р ВµРЎР‹, РЎРѓРЎвЂћР С•РЎР‚Р СРЎС“Р В»Р С‘РЎР‚Р С•Р Р†Р В°РЎвЂљРЎРЉ Р Р†Р С•Р С—РЎР‚Р С•РЎРѓ Р С‘ Р С•Р В±РЎРѓРЎС“Р Т‘Р С‘РЎвЂљРЎРЉ Р ВµР С–Р С• РЎРѓ Р С—РЎР‚Р ВµР С—Р С•Р Т‘Р В°Р Р†Р В°РЎвЂљР ВµР В»Р ВµР С.',
        'Р В Р ВµР С–РЎС“Р В»РЎРЏРЎР‚Р Р…Р С•РЎРѓРЎвЂљРЎРЉ Р Р†Р В°Р В¶Р Р…Р ВµР Вµ Р С‘Р Т‘Р ВµР В°Р В»РЎРЉР Р…Р С•Р в„– Р СР С•РЎвЂљР С‘Р Р†Р В°РЎвЂ Р С‘Р С‘. Р С™Р С•Р С–Р Т‘Р В° РЎРѓРЎвЂљРЎС“Р Т‘Р ВµР Р…РЎвЂљ РЎвЂЎР С‘РЎвЂљР В°Р ВµРЎвЂљ Р С—Р С•Р Р…Р ВµР СР Р…Р С•Р С–РЎС“, Р Р…Р С• РЎвЂЎР В°РЎРѓРЎвЂљР С•, Р С—Р С•Р Р…Р С‘Р СР В°Р Р…Р С‘Р Вµ РЎРѓРЎвЂљР В°Р Р…Р С•Р Р†Р С‘РЎвЂљРЎРѓРЎРЏ РЎС“РЎРѓРЎвЂљР С•Р в„–РЎвЂЎР С‘Р Р†РЎвЂ№Р С, Р В° РЎС“РЎвЂЎР ВµР В±Р В° РІР‚вЂќ Р С—РЎР‚Р ВµР Т‘РЎРѓР С”Р В°Р В·РЎС“Р ВµР СР С•Р в„– Р С‘ РЎРѓР С—Р С•Р С”Р С•Р в„–Р Р…Р С•Р в„–.',
      ],
    },
    {
      id: 'book-interface-basics',
      title: 'Р В§Р С‘РЎвЂљР В°Р ВµР СРЎвЂ№Р Вµ Р С‘Р Р…РЎвЂљР ВµРЎР‚РЎвЂћР ВµР в„–РЎРѓРЎвЂ№',
      author: 'Р С™Р С•Р СР В°Р Р…Р Т‘Р В° LibHub',
      description: 'Р СњР ВµР В±Р С•Р В»РЎРЉРЎв‚¬Р В°РЎРЏ Р С”Р Р…Р С‘Р С–Р В° Р С• РЎвЂљР С•Р С, Р С”Р В°Р С” Р С—РЎР‚Р С•Р ВµР С”РЎвЂљР С‘РЎР‚Р С•Р Р†Р В°РЎвЂљРЎРЉ Р С‘Р Р…РЎвЂљР ВµРЎР‚РЎвЂћР ВµР в„–РЎРѓРЎвЂ№, Р Р† Р С”Р С•РЎвЂљР С•РЎР‚РЎвЂ№РЎвЂ¦ РЎС“Р Т‘Р С•Р В±Р Р…Р С• РЎвЂЎР С‘РЎвЂљР В°РЎвЂљРЎРЉ Р С‘ РЎС“РЎвЂЎР С‘РЎвЂљРЎРЉРЎРѓРЎРЏ.',
      categoryId: 'cat-design',
      theme: 'UI/UX',
      published: true,
      estimatedMinutes: 18,
      coverTone: '#0F172A',
      publishYear: 2026,
      openCount: 134,
      createdAt: '2026-04-24T08:30:00.000Z',
      updatedAt: '2026-04-24T08:30:00.000Z',
      createdBy: 'teacher-1',
      readerType: 'text',
      sourceKind: 'manual',
      format: 'text',
      sourceLabel: 'Р В РЎС“РЎвЂЎР Р…Р С•Р Вµ Р Т‘Р С•Р В±Р В°Р Р†Р В»Р ВµР Р…Р С‘Р Вµ',
      content: [
        'Р вЂєР С•Р С–Р С‘РЎвЂЎР Р…РЎвЂ№Р в„– Р С‘Р Р…РЎвЂљР ВµРЎР‚РЎвЂћР ВµР в„–РЎРѓ Р Р…Р Вµ Р С—Р ВµРЎР‚Р ВµР С–РЎР‚РЎС“Р В¶Р В°Р ВµРЎвЂљ Р С—Р С•Р В»РЎРЉР В·Р С•Р Р†Р В°РЎвЂљР ВµР В»РЎРЏ РЎР‚Р ВµРЎв‚¬Р ВµР Р…Р С‘РЎРЏР СР С‘. Р С›Р Р… Р С—Р С•Р Т‘РЎРѓР С”Р В°Р В·РЎвЂ№Р Р†Р В°Р ВµРЎвЂљ РЎРѓР В»Р ВµР Т‘РЎС“РЎР‹РЎвЂ°Р С‘Р в„– РЎв‚¬Р В°Р С– Р С‘ РЎС“Р В±Р С‘РЎР‚Р В°Р ВµРЎвЂљ Р В»Р С‘РЎв‚¬Р Р…Р ВµР Вµ Р С‘Р В· Р С—Р С•Р В»РЎРЏ Р В·РЎР‚Р ВµР Р…Р С‘РЎРЏ.',
        'Р С™Р С•Р С–Р Т‘Р В° Р С—РЎР‚Р С•Р Т‘РЎС“Р С”РЎвЂљ РЎРѓР Р†РЎРЏР В·Р В°Р Р… РЎРѓ РЎвЂЎРЎвЂљР ВµР Р…Р С‘Р ВµР С, РЎвЂљР С‘Р С—Р С•Р С–РЎР‚Р В°РЎвЂћР С‘Р С”Р В° РЎРѓРЎвЂљР В°Р Р…Р С•Р Р†Р С‘РЎвЂљРЎРѓРЎРЏ РЎвЂЎР В°РЎРѓРЎвЂљРЎРЉРЎР‹ РЎвЂћРЎС“Р Р…Р С”РЎвЂ Р С‘Р С•Р Р…Р В°Р В»РЎРЉР Р…Р С•РЎРѓРЎвЂљР С‘. Р В Р В°Р В·Р СР ВµРЎР‚ РЎв‚¬РЎР‚Р С‘РЎвЂћРЎвЂљР В°, Р Р†РЎвЂ№РЎРѓР С•РЎвЂљР В° РЎРѓРЎвЂљРЎР‚Р С•Р С”Р С‘ Р С‘ РЎв‚¬Р С‘РЎР‚Р С‘Р Р…Р В° Р С”Р С•Р В»Р С•Р Р…Р С”Р С‘ Р Р…Р В°Р С—РЎР‚РЎРЏР СРЎС“РЎР‹ Р Р†Р В»Р С‘РЎРЏРЎР‹РЎвЂљ Р Р…Р В° РЎС“РЎРѓР Р†Р С•Р ВµР Р…Р С‘Р Вµ Р СР В°РЎвЂљР ВµРЎР‚Р С‘Р В°Р В»Р В°.',
        'Р Р€РЎвЂЎР ВµР В±Р Р…РЎвЂ№Р в„– Р С‘Р Р…РЎвЂљР ВµРЎР‚РЎвЂћР ВµР в„–РЎРѓ Р Т‘Р С•Р В»Р В¶Р ВµР Р… Р В±РЎвЂ№РЎвЂљРЎРЉ РЎРѓР С—Р С•Р С”Р С•Р в„–Р Р…РЎвЂ№Р С. Р РЋР С‘Р В»РЎРЉР Р…РЎвЂ№Р Вµ Р В°Р С”РЎвЂ Р ВµР Р…РЎвЂљРЎвЂ№ РЎРѓРЎвЂљР С•Р С‘РЎвЂљ Р С•РЎРѓРЎвЂљР В°Р Р†Р В»РЎРЏРЎвЂљРЎРЉ Р Т‘Р В»РЎРЏ РЎвЂ Р ВµР В»Р ВµР Р†РЎвЂ№РЎвЂ¦ Р Т‘Р ВµР в„–РЎРѓРЎвЂљР Р†Р С‘Р в„–: Р С—РЎР‚Р С•Р Т‘Р С•Р В»Р В¶Р С‘РЎвЂљРЎРЉ РЎвЂЎРЎвЂљР ВµР Р…Р С‘Р Вµ, Р С•РЎвЂљР С”РЎР‚РЎвЂ№РЎвЂљРЎРЉ Р СР В°РЎвЂљР ВµРЎР‚Р С‘Р В°Р В», РЎРѓР С•РЎвЂ¦РЎР‚Р В°Р Р…Р С‘РЎвЂљРЎРЉ Р Р† Р В±Р С‘Р В±Р В»Р С‘Р С•РЎвЂљР ВµР С”РЎС“.',
        'Р вЂўРЎРѓР В»Р С‘ РЎРѓРЎвЂљРЎС“Р Т‘Р ВµР Р…РЎвЂљ Р В·Р В°РЎвЂ¦Р С•Р Т‘Р С‘РЎвЂљ РЎРѓ РЎвЂљР ВµР В»Р ВµРЎвЂћР С•Р Р…Р В°, РЎРѓРЎвЂ Р ВµР Р…Р В°РЎР‚Р С‘Р в„– Р Р…Р Вµ Р Т‘Р С•Р В»Р В¶Р ВµР Р… Р В»Р С•Р СР В°РЎвЂљРЎРЉРЎРѓРЎРЏ. Р СњР В°Р Р†Р С‘Р С–Р В°РЎвЂ Р С‘РЎРЏ, Р В·Р В°Р СР ВµРЎвЂљР С”Р С‘ Р С‘ Р С—Р ВµРЎР‚Р ВµРЎвЂ¦Р С•Р Т‘ Р С” Р С—Р С•РЎРѓР В»Р ВµР Т‘Р Р…Р ВµР СРЎС“ Р СР ВµРЎРѓРЎвЂљРЎС“ РЎвЂЎРЎвЂљР ВµР Р…Р С‘РЎРЏ Р Т‘Р С•Р В»Р В¶Р Р…РЎвЂ№ Р В±РЎвЂ№РЎвЂљРЎРЉ Р Т‘Р С•РЎРѓРЎвЂљРЎС“Р С—Р Р…РЎвЂ№ Р С•Р Т‘Р Р…Р С•Р в„– РЎР‚РЎС“Р С”Р С•Р в„–.',
        'Р СњР С•РЎвЂЎР Р…РЎвЂ№Р Вµ Р С‘ РЎРѓР Р†Р ВµРЎвЂљР В»РЎвЂ№Р Вµ РЎР‚Р ВµР В¶Р С‘Р СРЎвЂ№ Р С—Р С•Р В»Р ВµР В·Р Р…РЎвЂ№ Р Р…Р Вµ Р С”Р В°Р С” Р Т‘Р ВµР С”Р С•РЎР‚Р В°РЎвЂљР С‘Р Р†Р Р…Р В°РЎРЏ Р С•Р С—РЎвЂ Р С‘РЎРЏ, Р В° Р С”Р В°Р С” Р С‘Р Р…РЎРѓРЎвЂљРЎР‚РЎС“Р СР ВµР Р…РЎвЂљ Р С”Р С•Р Р…РЎвЂљРЎР‚Р С•Р В»РЎРЏ Р Р…Р В°Р Т‘ РЎРѓРЎР‚Р ВµР Т‘Р С•Р в„– РЎвЂЎРЎвЂљР ВµР Р…Р С‘РЎРЏ.',
        'Р ТђР С•РЎР‚Р С•РЎв‚¬Р В°РЎРЏ teacher-Р С—Р В°Р Р…Р ВµР В»РЎРЉ Р С•РЎвЂљР В»Р С‘РЎвЂЎР В°Р ВµРЎвЂљРЎРѓРЎРЏ Р С•РЎвЂљ student-Р С‘Р Р…РЎвЂљР ВµРЎР‚РЎвЂћР ВµР в„–РЎРѓР В°. Р С›Р Р…Р В° Р С—Р С•Р СР С•Р С–Р В°Р ВµРЎвЂљ Р В±РЎвЂ№РЎРѓРЎвЂљРЎР‚Р С• Р В·Р В°Р С–РЎР‚РЎС“Р В¶Р В°РЎвЂљРЎРЉ РЎвЂћР С•Р Р…Р Т‘, Р В° Р Р…Р Вµ Р С•РЎвЂљР Р†Р В»Р ВµР С”Р В°Р ВµРЎвЂљ РЎРѓР В»Р С•Р В¶Р Р…Р С•Р в„– РЎРѓРЎвЂљРЎР‚РЎС“Р С”РЎвЂљРЎС“РЎР‚Р С•Р в„–.',
      ],
    },
    {
      id: 'book-kg-history',
      title: 'Р ВРЎРѓРЎвЂљР С•РЎР‚Р С‘РЎРЏ Р С™РЎвЂ№РЎР‚Р С–РЎвЂ№Р В·РЎРѓРЎвЂљР В°Р Р…Р В°. Р вЂ™Р Р†Р ВµР Т‘Р ВµР Р…Р С‘Р Вµ',
      author: 'Р В Р ВµР Т‘Р В°Р С”РЎвЂ Р С‘РЎРЏ LibHub',
      description: 'Р вЂ™Р Р†Р С•Р Т‘Р Р…РЎвЂ№Р в„– РЎС“РЎвЂЎР ВµР В±Р Р…РЎвЂ№Р в„– Р СР В°РЎвЂљР ВµРЎР‚Р С‘Р В°Р В» Р С—Р С• Р С‘РЎРѓРЎвЂљР С•РЎР‚Р С‘Р С‘ Р С™РЎвЂ№РЎР‚Р С–РЎвЂ№Р В·РЎРѓРЎвЂљР В°Р Р…Р В° Р Т‘Р В»РЎРЏ Р В±Р С‘Р В±Р В»Р С‘Р С•РЎвЂљР ВµРЎвЂЎР Р…Р С•Р С–Р С• Р С”Р В°РЎвЂљР В°Р В»Р С•Р С–Р В°.',
      categoryId: 'cat-history',
      theme: 'Р ВРЎРѓРЎвЂљР С•РЎР‚Р С‘РЎРЏ',
      published: true,
      estimatedMinutes: 20,
      coverTone: '#0EA5E9',
      publishYear: 2025,
      openCount: 221,
      createdAt: '2026-04-25T09:00:00.000Z',
      updatedAt: '2026-04-25T09:00:00.000Z',
      createdBy: 'teacher-1',
      readerType: 'text',
      sourceKind: 'manual',
      format: 'text',
      sourceLabel: 'Р В РЎС“РЎвЂЎР Р…Р С•Р Вµ Р Т‘Р С•Р В±Р В°Р Р†Р В»Р ВµР Р…Р С‘Р Вµ',
      content: [
        'Р ВРЎРѓРЎвЂљР С•РЎР‚Р С‘РЎРЏ Р С—Р С•Р СР С•Р С–Р В°Р ВµРЎвЂљ РЎвЂЎР С‘РЎвЂљР В°РЎвЂљРЎРЉ Р Р…Р В°РЎРѓРЎвЂљР С•РЎРЏРЎвЂ°Р ВµР Вµ Р С–Р В»РЎС“Р В±Р В¶Р Вµ. Р Р€РЎвЂЎР ВµР В±Р Р…РЎвЂ№Р в„– РЎвЂљР ВµР С”РЎРѓРЎвЂљ Р Р†РЎРѓР ВµР С–Р Т‘Р В° Р Р†РЎвЂ№Р С‘Р С–РЎР‚РЎвЂ№Р Р†Р В°Р ВµРЎвЂљ, Р С”Р С•Р С–Р Т‘Р В° Р С•Р Р… Р Р…Р Вµ Р С—Р ВµРЎР‚Р ВµР С–РЎР‚РЎС“Р В¶Р ВµР Р… Р Т‘Р В°РЎвЂљР В°Р СР С‘, Р В° Р С—Р С•Р С”Р В°Р В·РЎвЂ№Р Р†Р В°Р ВµРЎвЂљ Р Р†Р В·Р В°Р С‘Р СР С•РЎРѓР Р†РЎРЏР В·Р С‘ РЎРѓР С•Р В±РЎвЂ№РЎвЂљР С‘Р в„–.',
        'Р вЂќР В»РЎРЏ РЎв‚¬Р С”Р С•Р В»РЎРЉР Р…Р С•Р С–Р С• Р СР В°РЎвЂљР ВµРЎР‚Р С‘Р В°Р В»Р В° Р Р†Р В°Р В¶Р Р…Р В° РЎРЏРЎРѓР Р…Р В°РЎРЏ РЎРѓРЎвЂљРЎР‚РЎС“Р С”РЎвЂљРЎС“РЎР‚Р В°: Р С”Р С•РЎР‚Р С•РЎвЂљР С”Р С‘Р Вµ РЎвЂљР ВµР СР В°РЎвЂљР С‘РЎвЂЎР ВµРЎРѓР С”Р С‘Р Вµ Р В±Р В»Р С•Р С”Р С‘, Р С—Р С•Р Р…РЎРЏРЎвЂљР Р…РЎвЂ№Р Вµ Р В·Р В°Р С–Р С•Р В»Р С•Р Р†Р С”Р С‘ Р С‘ Р Р†Р С•Р В·Р СР С•Р В¶Р Р…Р С•РЎРѓРЎвЂљРЎРЉ Р В±РЎвЂ№РЎРѓРЎвЂљРЎР‚Р С• Р Р†Р ВµРЎР‚Р Р…РЎС“РЎвЂљРЎРЉРЎРѓРЎРЏ Р С” Р Р…РЎС“Р В¶Р Р…Р С•Р СРЎС“ Р СР ВµРЎРѓРЎвЂљРЎС“.',
        'Р В­Р В»Р ВµР С”РЎвЂљРЎР‚Р С•Р Р…Р Р…Р В°РЎРЏ Р В±Р С‘Р В±Р В»Р С‘Р С•РЎвЂљР ВµР С”Р В° Р Т‘Р С•Р В»Р В¶Р Р…Р В° Р С—Р С•Р Т‘Р Т‘Р ВµРЎР‚Р В¶Р С‘Р Р†Р В°РЎвЂљРЎРЉ Р С‘Р СР ВµР Р…Р Р…Р С• РЎвЂљР В°Р С”Р С•Р в„– РЎР‚Р С‘РЎвЂљР С: Р С•РЎвЂљР С”РЎР‚РЎвЂ№Р В» Р С”Р Р…Р С‘Р С–РЎС“, Р Т‘Р С•РЎвЂЎР С‘РЎвЂљР В°Р В» РЎР‚Р В°Р В·Р Т‘Р ВµР В», РЎРѓР С•РЎвЂ¦РЎР‚Р В°Р Р…Р С‘Р В» Р С—РЎР‚Р С•Р С–РЎР‚Р ВµРЎРѓРЎРѓ Р С‘ Р Р†Р ВµРЎР‚Р Р…РЎС“Р В»РЎРѓРЎРЏ Р С—Р С•Р В·Р В¶Р Вµ.',
      ],
    },
    {
      id: 'book-reading-routine',
      title: 'Р В Р С‘РЎвЂљР С РЎвЂЎРЎвЂљР ВµР Р…Р С‘РЎРЏ',
      author: 'Р С™Р С•Р СР В°Р Р…Р Т‘Р В° LibHub',
      description: 'Р С™Р В°Р С” Р Р†РЎРѓРЎвЂљРЎР‚Р С•Р С‘РЎвЂљРЎРЉ РЎР‚Р ВµР С–РЎС“Р В»РЎРЏРЎР‚Р Р…Р С•Р Вµ РЎвЂЎРЎвЂљР ВµР Р…Р С‘Р Вµ Р Р† РЎС“РЎвЂЎР ВµР В±Р Р…РЎС“РЎР‹ Р Р…Р ВµР Т‘Р ВµР В»РЎР‹ Р С‘ Р Р…Р Вµ РЎвЂљР ВµРЎР‚РЎРЏРЎвЂљРЎРЉ Р Р…Р С‘РЎвЂљРЎРЉ Р СР В°РЎвЂљР ВµРЎР‚Р С‘Р В°Р В»Р В°.',
      categoryId: 'cat-productivity',
      theme: 'Р СџРЎР‚Р С‘Р Р†РЎвЂ№РЎвЂЎР С”Р С‘',
      published: false,
      estimatedMinutes: 16,
      coverTone: '#22C55E',
      publishYear: 2026,
      openCount: 14,
      createdAt: '2026-04-24T09:00:00.000Z',
      updatedAt: '2026-04-24T09:00:00.000Z',
      createdBy: 'teacher-1',
      readerType: 'text',
      sourceKind: 'manual',
      format: 'text',
      sourceLabel: 'Р В§Р ВµРЎР‚Р Р…Р С•Р Р†Р С‘Р С”',
      content: [
        'Р В§РЎвЂљР ВµР Р…Р С‘Р Вµ РЎРѓРЎвЂљР В°Р Р…Р С•Р Р†Р С‘РЎвЂљРЎРѓРЎРЏ РЎС“РЎРѓРЎвЂљР С•Р в„–РЎвЂЎР С‘Р Р†Р С•Р в„– Р С—РЎР‚Р С‘Р Р†РЎвЂ№РЎвЂЎР С”Р С•Р в„–, Р С”Р С•Р С–Р Т‘Р В° РЎС“ Р Р…Р ВµР С–Р С• Р ВµРЎРѓРЎвЂљРЎРЉ Р С—Р С•РЎРѓРЎвЂљР С•РЎРЏР Р…Р Р…Р С•Р Вµ Р СР ВµРЎРѓРЎвЂљР С• Р Р† РЎР‚Р В°РЎРѓР С—Р С‘РЎРѓР В°Р Р…Р С‘Р С‘.',
        'Р СџР С•Р СР С•Р С–Р В°Р ВµРЎвЂљ Р С‘ РЎР‚Р С‘РЎвЂљРЎС“Р В°Р В» Р В·Р В°Р С—РЎС“РЎРѓР С”Р В°: Р С•Р Т‘Р Р…Р С• Р С‘ РЎвЂљР С• Р В¶Р Вµ Р Р†РЎР‚Р ВµР СРЎРЏ Р Т‘Р Р…РЎРЏ, РЎРѓР С—Р С•Р С”Р С•Р в„–Р Р…РЎвЂ№Р в„– РЎРЊР С”РЎР‚Р В°Р Р… Р С‘ Р С—Р С•Р Р…РЎРЏРЎвЂљР Р…Р В°РЎРЏ РЎвЂљР С•РЎвЂЎР С”Р В° Р Р†Р С•Р В·Р Р†РЎР‚Р В°РЎвЂљР В°.',
        'Р СџРЎР‚Р С•Р С–РЎР‚Р ВµРЎРѓРЎРѓ-Р В±Р В°РЎР‚ Р С—Р С•Р В»Р ВµР В·Р ВµР Р… Р Р…Р Вµ РЎвЂљР С•Р В»РЎРЉР С”Р С• Р С”Р В°Р С” РЎС“Р С”РЎР‚Р В°РЎв‚¬Р ВµР Р…Р С‘Р Вµ. Р С›Р Р… Р Т‘Р В°Р ВµРЎвЂљ Р С•РЎвЂ°РЎС“РЎвЂ°Р ВµР Р…Р С‘Р Вµ Р Т‘Р Р†Р С‘Р В¶Р ВµР Р…Р С‘РЎРЏ Р С‘ Р С—Р С•Р СР С•Р С–Р В°Р ВµРЎвЂљ Р Р†Р ВµРЎР‚Р Р…РЎС“РЎвЂљРЎРЉРЎРѓРЎРЏ Р С” Р С”Р Р…Р С‘Р С–Р Вµ Р В±Р ВµР В· РЎРѓР С•Р С—РЎР‚Р С•РЎвЂљР С‘Р Р†Р В»Р ВµР Р…Р С‘РЎРЏ.',
      ],
    },
  ],
  favorites: [],
  views: [],
  progress: [],
  bookmarks: [],
  notes: [],
  comments: [],
}

const jsonHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
}

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, jsonHeaders)
  response.end(JSON.stringify(payload))
}

const ensureStorageFileParent = async (filePath) => {
  await mkdir(path.dirname(filePath), { recursive: true })
}

const isSafeChildPath = (candidatePath, basePath) => {
  const resolvedFile = path.resolve(candidatePath)
  const resolvedBase = path.resolve(basePath)
  if (resolvedFile === resolvedBase) {
    return true
  }
  const rel = path.relative(resolvedBase, resolvedFile)
  return Boolean(rel) && !rel.startsWith('..') && !path.isAbsolute(rel)
}

const buildForwardHeaders = (headers) => {
  const forwardHeaders = new Headers()

  Object.entries(headers).forEach(([key, value]) => {
    const normalizedKey = key.toLowerCase()
    if (!value || HOP_BY_HOP_HEADERS.has(normalizedKey)) {
      return
    }

    if (Array.isArray(value)) {
      forwardHeaders.set(key, value.join(', '))
      return
    }

    forwardHeaders.set(key, value)
  })

  return forwardHeaders
}

const serveStaticFile = async (response, filePath, extraHeaders = {}, method = 'GET') => {
  const extension = path.extname(filePath).toLowerCase()
  response.writeHead(200, {
    'Content-Type': STATIC_CONTENT_TYPES[extension] || 'application/octet-stream',
    ...extraHeaders,
  })

  if (method === 'HEAD') {
    response.end()
    return
  }

  createReadStream(filePath).pipe(response)
}

const serveFrontendApp = async (pathname, response, method = 'GET') => {
  if (!existsSync(FRONTEND_DIST_DIR)) {
    sendJson(response, 503, { message: 'Frontend build not found. Run the frontend build first.' })
    return true
  }

  const decodedPath = decodeURIComponent(pathname)
  const normalizedPath = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^\/+/, '')
  const candidatePath = path.resolve(FRONTEND_DIST_DIR, normalizedPath)

  if (isSafeChildPath(candidatePath, FRONTEND_DIST_DIR) && existsSync(candidatePath)) {
    const fileStats = await stat(candidatePath).catch(() => null)
    if (fileStats?.isFile()) {
      await serveStaticFile(response, candidatePath, {}, method)
      return true
    }
  }

  const indexPath = path.join(FRONTEND_DIST_DIR, 'index.html')
  if (!existsSync(indexPath)) {
    sendJson(response, 503, { message: 'Frontend index.html was not found in the build output.' })
    return true
  }

  if (path.extname(decodedPath)) {
    sendJson(response, 404, { message: 'Static asset not found.' })
    return true
  }

  await serveStaticFile(response, indexPath, { 'Cache-Control': 'no-cache' }, method)
  return true
}

const proxyDjangoRequest = async (request, response, url) => {
  if (!DJANGO_API_ORIGIN) {
    sendJson(response, 502, {
      message: 'Django API proxy is not configured. Set DJANGO_API_ORIGIN for this service.',
    })
    return true
  }

  const targetPath = url.pathname === '/django-api' ? '/api/' : `/api${url.pathname.slice('/django-api'.length)}`
  const targetUrl = new URL(`${targetPath}${url.search}`, DJANGO_API_ORIGIN)
  const requestBody =
    request.method === 'GET' || request.method === 'HEAD' ? undefined : request

  let proxiedResponse
  try {
    proxiedResponse = await fetch(targetUrl, {
      method: request.method,
      headers: buildForwardHeaders(request.headers),
      body: requestBody,
      ...(requestBody ? { duplex: 'half' } : {}),
    })
  } catch (error) {
    sendJson(response, 502, {
      message:
        error instanceof Error && error.message
          ? `Failed to reach Django service: ${error.message}`
          : 'Failed to reach Django service.',
    })
    return true
  }

  const responseHeaders = {}
  proxiedResponse.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      responseHeaders[key] = value
    }
  })

  response.writeHead(proxiedResponse.status, responseHeaders)

  if (!proxiedResponse.body || request.method === 'HEAD') {
    response.end()
    return true
  }

  Readable.fromWeb(proxiedResponse.body).pipe(response)
  return true
}

const parseBody = async (request) => {
  const chunks = []

  for await (const chunk of request) {
    chunks.push(chunk)
  }

  if (!chunks.length) {
    return {}
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf-8'))
}

const isDeveloperRole = (role) => role === 'developer'
const isManagerRole = (role) => role === 'teacher' || role === 'developer'
const getDeveloperUser = () => ({ ...DEVELOPER_PROFILE })

const isDeveloperPasswordValid = (password) => {
  const hashedCandidate = scryptSync(String(password || ''), DEVELOPER_PASSWORD_SALT, 64)
  const expectedHash = Buffer.from(DEVELOPER_PASSWORD_HASH, 'hex')

  return hashedCandidate.length === expectedHash.length && timingSafeEqual(hashedCandidate, expectedHash)
}

const splitUserName = (value = '') => {
  const parts = String(value)
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  }
}

const composeUserName = (firstName = '', lastName = '', fallback = '') =>
  [String(firstName).trim(), String(lastName).trim()].filter(Boolean).join(' ').trim() ||
  String(fallback).trim() ||
  'Пользователь'

const normalizePublishDate = (value) => {
  const normalized = typeof value === 'string' ? value.trim() : ''
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : ''
}

const resolvePublishYear = (publishDate, publishYear) => {
  const normalizedDate = normalizePublishDate(publishDate)
  if (normalizedDate) {
    return Number(normalizedDate.slice(0, 4))
  }

  const parsedYear = Number(publishYear)
  if (Number.isFinite(parsedYear) && parsedYear > 0) {
    return parsedYear
  }

  return new Date().getFullYear()
}

const normalizeCoverImage = (value) => {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (
    normalized.startsWith('data:image/') ||
    normalized.startsWith('http://') ||
    normalized.startsWith('https://') ||
    normalized.startsWith('/media/')
  ) {
    return normalized
  }

  return ''
}

const normalizeUserRecord = (user) => {
  const fallbackNames = splitUserName(user?.name)
  const firstName = String(user?.firstName || fallbackNames.firstName || '').trim()
  const lastName = String(user?.lastName || fallbackNames.lastName || '').trim()
  const role =
    user?.role === 'teacher' ? 'teacher' : user?.role === 'developer' ? 'developer' : 'student'

  return {
    id: user?.id || `user-${randomUUID()}`,
    firstName: firstName || 'Пользователь',
    lastName,
    name: composeUserName(firstName || 'Пользователь', lastName, user?.name),
    email: user?.email?.trim()?.toLowerCase() || `user-${randomUUID()}@libhub.dev`,
    password: user?.password || (role === 'teacher' ? 'teach123' : role === 'developer' ? '' : 'study123'),
    role,
    bio: user?.bio?.trim() || '',
  }
}

const normalizeModerationText = (value = '') =>
  String(value)
    .toLowerCase()
    .replace(/ё/g, 'е')

const containsBlockedCommentStem = (value = '') => {
  const normalized = normalizeModerationText(value)
  return BLOCKED_COMMENT_STEMS.some((stem) => normalized.includes(stem))
}

const normalizeCommentRecord = (comment, validUserIds, validBookIds) => {
  if (!comment?.userId || !comment?.bookId) {
    return null
  }

  if (!validUserIds.has(comment.userId) || !validBookIds.has(comment.bookId)) {
    return null
  }

  const body = String(comment.body || '').trim().slice(0, COMMENT_BODY_LIMIT)
  if (!body) {
    return null
  }

  const likes = [
    ...new Set(
      Array.isArray(comment.likes)
        ? comment.likes.filter((userId) => validUserIds.has(userId))
        : [],
    ),
  ]
  const parentId =
    typeof comment.parentId === 'string' && comment.parentId.trim() ? comment.parentId.trim() : null

  return {
    id: comment.id || `comment-${randomUUID()}`,
    userId: comment.userId,
    bookId: comment.bookId,
    parentId,
    body,
    likes,
    createdAt: comment.createdAt || new Date().toISOString(),
  }
}

const normalizeComments = (comments, validUserIds, validBookIds) => {
  const normalized = (Array.isArray(comments) ? comments : [])
    .map((comment) => normalizeCommentRecord(comment, validUserIds, validBookIds))
    .filter(Boolean)

  const validCommentIds = new Set(normalized.map((comment) => comment.id))

  return normalized
    .filter((comment) => !comment.parentId || validCommentIds.has(comment.parentId))
    .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt))
}

const sanitizeUser = (user) => {
  if (!user) {
    return null
  }

  const { password, ...safeUser } = user
  const normalized = normalizeUserRecord(safeUser)
  const { password: hiddenPassword, ...publicUser } = normalized
  return publicUser
}

const splitTextSections = (text = '') =>
  String(text)
    .replace(/\r/g, '')
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean)

const stripHtml = (html = '') =>
  String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()

const extractHtmlTitle = (html, fallback = 'Без названия') => {
  const match = String(html).match(/<title>(.*?)<\/title>/i)
  if (!match?.[1]) {
    return fallback
  }

  return match[1].replace(/\s+/g, ' ').trim()
}

const normalizeFileFormat = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'pdf' || normalized === 'epub') {
    return normalized
  }

  return ''
}

const getUploadedBookSourcePathname = (sourceUrl) => {
  const normalized = String(sourceUrl || '').trim()
  if (!normalized) {
    return ''
  }

  try {
    const raw = new URL(normalized).pathname || ''
    let decoded
    try {
      decoded = decodeURIComponent(raw)
    } catch {
      decoded = raw
    }
    try {
      return decoded.normalize('NFC')
    } catch {
      return decoded
    }
  } catch {
    const tail = normalized.startsWith('/') ? normalized : ''
    try {
      return tail ? tail.normalize('NFC') : ''
    } catch {
      return tail
    }
  }
}

const resolveUploadedBookSourceUrl = (sourceUrl) => {
  const normalized = String(sourceUrl || '').trim()
  if (!normalized) {
    return ''
  }

  const djangoBase = DJANGO_API_ORIGIN || DEFAULT_DJANGO_DEV_ORIGIN

  if (normalized.startsWith('/media/')) {
    try {
      return new URL(normalized, djangoBase).toString()
    } catch {
      return ''
    }
  }

  try {
    const parsed = new URL(normalized)
    const isLocalHost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname)

    if (!isLocalHost && ['http:', 'https:'].includes(parsed.protocol)) {
      return parsed.toString()
    }

    if (DJANGO_API_ORIGIN && parsed.pathname) {
      return new URL(`${parsed.pathname}${parsed.search}`, DJANGO_API_ORIGIN).toString()
    }

    if (isLocalHost && ['http:', 'https:'].includes(parsed.protocol)) {
      return parsed.toString()
    }
  } catch {
    if (normalized.startsWith('/')) {
      try {
        return new URL(normalized, djangoBase).toString()
      } catch {
        return ''
      }
    }
  }

  return ''
}

const getUploadedBookLocalPath = (sourceUrl) => {
  const pathname = getUploadedBookSourcePathname(sourceUrl)
  if (!pathname.startsWith('/media/')) {
    return ''
  }

  const relativePath = pathname.replace(/^\/+/, '')
  const candidateRoots = [...new Set([STORAGE_DIR, DATA_DIR, BACKEND_DIR].filter(Boolean))]

  for (const rootPath of candidateRoots) {
    const candidatePath = path.resolve(rootPath, relativePath)
    if (isSafeChildPath(candidatePath, rootPath) && existsSync(candidatePath)) {
      return candidatePath
    }
  }

  return ''
}

const normalizeUnicodeFileName = (value) => {
  try {
    return String(value || '').normalize('NFC')
  } catch {
    return String(value || '')
  }
}

/** scan media/books: exact name, NFC match, or django suffix -hex12.pdf / .epub */
const findUploadedBookByStoredName = (sourceUrl) => {
  const pathname = getUploadedBookSourcePathname(sourceUrl)
  const baseRaw = path.basename(pathname || '')
  if (!baseRaw || !/\.(pdf|epub)$/i.test(baseRaw)) {
    return ''
  }

  const baseNfc = normalizeUnicodeFileName(baseRaw)
  const nested = path.join('media', 'books', baseNfc)
  const candidateRoots = [...new Set([STORAGE_DIR, DATA_DIR, BACKEND_DIR].filter(Boolean))]

  for (const rootPath of candidateRoots) {
    const candidatePath = path.resolve(rootPath, nested)
    if (isSafeChildPath(candidatePath, rootPath) && existsSync(candidatePath)) {
      return candidatePath
    }
  }

  const suffixMatch = baseNfc.match(/-([a-f0-9]{12})\.(pdf|epub)$/i)
  const hex12 = suffixMatch ? suffixMatch[1] : ''
  const extLower = suffixMatch ? suffixMatch[2].toLowerCase() : ''

  for (const rootPath of candidateRoots) {
    const booksRoot = path.join(rootPath, 'media', 'books')
    const rootResolved = path.resolve(rootPath)
    const resolvedBooksRoot = path.resolve(booksRoot)
    if (!isSafeChildPath(resolvedBooksRoot, rootResolved)) {
      continue
    }
    if (!existsSync(resolvedBooksRoot)) {
      continue
    }

    let entries
    try {
      entries = readdirSync(resolvedBooksRoot, { withFileTypes: true })
    } catch {
      continue
    }

    for (const ent of entries) {
      if (!ent.isFile()) {
        continue
      }
      const n = ent.name
      const nNfc = normalizeUnicodeFileName(n)
      if (nNfc === baseNfc || n === baseRaw) {
        const full = path.join(resolvedBooksRoot, n)
        if (isSafeChildPath(full, rootResolved)) {
          return full
        }
      }
      if (hex12 && extLower && n.toLowerCase().endsWith(`-${hex12}.${extLower}`)) {
        const full = path.join(resolvedBooksRoot, n)
        if (isSafeChildPath(full, rootResolved)) {
          return full
        }
      }
    }
  }

  return ''
}

const resolveUploadedBookLocalFile = (sourceUrl) =>
  getUploadedBookLocalPath(sourceUrl) || findUploadedBookByStoredName(sourceUrl)

const uploadedBookCacheExt = (book) => {
  const fmt = normalizeFileFormat(book?.format)
  return fmt === 'epub' ? 'epub' : 'pdf'
}

const getUploadedBookCachePath = (book) =>
  path.join(DATA_DIR, 'file-cache', `${book.id}.${uploadedBookCacheExt(book)}`)

const saveUploadedBookCache = async (book, buffer) => {
  const dest = getUploadedBookCachePath(book)
  await mkdir(path.dirname(dest), { recursive: true })
  await writeFile(dest, buffer)
}

const fetchUploadedBookFileBuffer = async (book) => {
  const localPath = resolveUploadedBookLocalFile(book.sourceUrl)
  if (localPath && existsSync(localPath)) {
    return readFile(localPath)
  }

  const targetUrl = resolveUploadedBookSourceUrl(book.sourceUrl)
  if (!targetUrl) {
    return null
  }

  const uploaded = await fetch(normalizeDjangoFetchUrl(targetUrl))
  if (!uploaded.ok) {
    return null
  }

  return Buffer.from(await uploaded.arrayBuffer())
}

const getUrlFormat = (value) => {
  try {
    const pathname = new URL(value).pathname
    return FILE_EXTENSIONS[path.extname(pathname).toLowerCase()] || null
  } catch {
    return null
  }
}

const getLocalFormat = (filePath) => FILE_EXTENSIONS[path.extname(filePath).toLowerCase()] || null

const toBookSections = (source, format) => {
  if (format === 'html') {
    return splitTextSections(stripHtml(source))
  }

  return splitTextSections(source)
}

const createTextBook = ({
  teacherId,
  title,
  author,
  description,
  categoryId,
  theme,
  published,
  estimatedMinutes,
  coverTone,
  coverImage,
  publishDate,
  publishYear,
  content,
  sourceKind,
  sourceLabel,
  sourceUrl = '',
}) => {
  const now = new Date().toISOString()
  const sections = Array.isArray(content)
    ? content.map((item) => String(item || '').trim()).filter(Boolean)
    : splitTextSections(content)
  const normalizedPublishDate = normalizePublishDate(publishDate)

  return {
    id: `book-${randomUUID()}`,
    title: title?.trim() || 'Без названия',
    author: author?.trim() || 'Неизвестный автор',
    description: description?.trim() || '',
    categoryId,
    theme: theme?.trim() || '',
    published: Boolean(published),
    estimatedMinutes: Math.max(5, Number(estimatedMinutes || 10)),
    coverTone: coverTone?.trim() || '#4F46E5',
    coverImage: normalizeCoverImage(coverImage),
    publishDate: normalizedPublishDate,
    publishYear: resolvePublishYear(normalizedPublishDate, publishYear),
    openCount: 0,
    createdAt: now,
    updatedAt: now,
    createdBy: teacherId,
    readerType: 'text',
    sourceKind,
    sourceLabel,
    sourceUrl: String(sourceUrl || '').trim(),
    sourcePath: '',
    format: 'text',
    content: sections,
  }
}

const createFileBook = ({
  teacherId,
  title,
  author,
  description,
  categoryId,
  theme,
  published,
  estimatedMinutes,
  coverTone,
  coverImage,
  publishDate,
  publishYear,
  format,
  sourceKind,
  sourceLabel,
  sourceUrl = '',
  sourcePath = '',
}) => {
  const now = new Date().toISOString()
  const normalizedPublishDate = normalizePublishDate(publishDate)
  const normalizedSourceUrl = String(sourceUrl || '').trim()
  const normalizedSourcePath = String(sourcePath || '').trim()

  return {
    id: `book-${randomUUID()}`,
    title: title?.trim() || 'Без названия',
    author: author?.trim() || 'Неизвестный автор',
    description: description?.trim() || '',
    categoryId,
    theme: theme?.trim() || '',
    published: Boolean(published),
    estimatedMinutes: Math.max(5, Number(estimatedMinutes || 10)),
    coverTone: coverTone?.trim() || '#4F46E5',
    coverImage: normalizeCoverImage(coverImage),
    publishDate: normalizedPublishDate,
    publishYear: resolvePublishYear(normalizedPublishDate, publishYear),
    openCount: 0,
    createdAt: now,
    updatedAt: now,
    createdBy: teacherId,
    readerType: 'file',
    sourceKind,
    sourceLabel,
    sourceUrl: normalizedSourceUrl,
    sourcePath: normalizedSourcePath,
    format: normalizeFileFormat(format) || getUrlFormat(normalizedSourceUrl) || getLocalFormat(normalizedSourcePath) || 'pdf',
    content: [],
  }
}

const normalizeBookRecord = (book, ownerId, categories) => {
  const categoryId = categories.some((item) => item.id === book?.categoryId)
    ? book.categoryId
    : categories[0]?.id || null
  const readerType =
    book?.readerType === 'file' ||
    ['pdf', 'epub'].includes(normalizeFileFormat(book?.format)) ||
    ['local-file', 'remote-file', 'uploaded-file'].includes(String(book?.sourceKind || '').trim())
      ? 'file'
      : 'text'
  const normalizedPublishDate = normalizePublishDate(book?.publishDate)
  const normalizedSourceUrl = String(book?.sourceUrl || '').trim()
  const normalizedSourcePath = String(book?.sourcePath || '').trim()
  const content =
    readerType === 'file'
      ? []
      : Array.isArray(book?.content)
        ? book.content.map((item) => String(item || '').trim()).filter(Boolean)
        : splitTextSections(book?.content || '')

  return {
    id: book?.id || `book-${randomUUID()}`,
    title: book?.title?.trim() || 'Без названия',
    author: book?.author?.trim() || 'Неизвестный автор',
    description: book?.description?.trim() || '',
    categoryId,
    theme: book?.theme?.trim() || '',
    published: Boolean(book?.published),
    estimatedMinutes: Math.max(5, Number(book?.estimatedMinutes || 10)),
    coverTone: book?.coverTone?.trim() || '#4F46E5',
    coverImage: normalizeCoverImage(book?.coverImage),
    publishDate: normalizedPublishDate,
    publishYear: resolvePublishYear(normalizedPublishDate, book?.publishYear),
    openCount: Math.max(0, Number(book?.openCount || 0)),
    createdAt: book?.createdAt || new Date().toISOString(),
    updatedAt: book?.updatedAt || new Date().toISOString(),
    createdBy: book?.createdBy || ownerId || 'teacher-1',
    readerType,
    sourceKind:
      String(book?.sourceKind || '').trim() || (readerType === 'file' ? 'uploaded-file' : 'manual'),
    sourceLabel:
      String(book?.sourceLabel || '').trim() || (readerType === 'file' ? 'Файл книги' : 'Ручное добавление'),
    sourceUrl: normalizedSourceUrl,
    sourcePath: normalizedSourcePath,
    format:
      readerType === 'file'
        ? normalizeFileFormat(book?.format) || getUrlFormat(normalizedSourceUrl) || getLocalFormat(normalizedSourcePath) || 'pdf'
        : 'text',
    content: readerType === 'file' ? [] : content.length ? content : ['Материал пока не добавлен.'],
  }
}

const cloneDefaultData = () => {
  try {
    const template = readFileSync(DEFAULT_DATA_TEMPLATE_PATH, 'utf-8')
    return JSON.parse(template)
  } catch {
    return JSON.parse(JSON.stringify(defaultData))
  }
}

const migrateData = (data) => {
  const source = data && typeof data === 'object' ? data : {}
  const fallback = cloneDefaultData()
  let users = (Array.isArray(source.users) && source.users.length ? source.users : fallback.users).map(normalizeUserRecord)

  if (!users.some((user) => user.role === 'teacher')) {
    const teacherSeed = fallback.users.find((user) => user.role === 'teacher') || {
      id: 'teacher-1',
      firstName: 'Учитель',
      lastName: '',
      email: 'teacher@libhub.dev',
      password: 'teach123',
      role: 'teacher',
      bio: '',
    }
    users = [normalizeUserRecord(teacherSeed), ...users]
  }

  const categories = (
    Array.isArray(source.categories) && source.categories.length ? source.categories : fallback.categories
  )
    .map((category) => ({
      id: category?.id || `cat-${randomUUID()}`,
      name: String(category?.name || '').trim() || 'Без категории',
    }))
    .filter((category, index, items) => items.findIndex((item) => item.id === category.id) === index)

  const ownerId = users.find((user) => user.role === 'teacher')?.id || 'teacher-1'
  const books = (
    Array.isArray(source.books) && source.books.length ? source.books : fallback.books
  ).map((book) => normalizeBookRecord(book, ownerId, categories))

  const validUserIds = new Set(users.map((user) => user.id))
  const validBookIds = new Set(books.map((book) => book.id))

  const favorites = (Array.isArray(source.favorites) ? source.favorites : [])
    .filter((item) => validUserIds.has(item?.userId) && validBookIds.has(item?.bookId))
    .map((item) => ({
      id: item?.id || `favorite-${randomUUID()}`,
      userId: item.userId,
      bookId: item.bookId,
    }))

  const views = (Array.isArray(source.views) ? source.views : [])
    .filter((item) => validUserIds.has(item?.userId) && validBookIds.has(item?.bookId))
    .map((item) => ({
      id: item?.id || `view-${randomUUID()}`,
      userId: item.userId,
      bookId: item.bookId,
      viewedAt: item?.viewedAt || new Date().toISOString(),
    }))

  const progress = (Array.isArray(source.progress) ? source.progress : [])
    .filter((item) => validUserIds.has(item?.userId) && validBookIds.has(item?.bookId))
    .map((item) => ({
      id: item?.id || `progress-${randomUUID()}`,
      userId: item.userId,
      bookId: item.bookId,
      lastPosition: Math.max(0, Number(item?.lastPosition || 0)),
      lastPercent: Math.max(0, Math.min(100, Number(item?.lastPercent || 0))),
      readingSeconds: Math.max(0, Number(item?.readingSeconds || 0)),
      updatedAt: item?.updatedAt || null,
    }))

  const bookmarks = (Array.isArray(source.bookmarks) ? source.bookmarks : [])
    .filter((item) => validUserIds.has(item?.userId) && validBookIds.has(item?.bookId))
    .map((item) => ({
      id: item?.id || `bookmark-${randomUUID()}`,
      userId: item.userId,
      bookId: item.bookId,
      title: String(item?.title || '').trim() || `Раздел ${Number(item?.position || 0) + 1}`,
      excerpt: String(item?.excerpt || '').trim(),
      position: Math.max(0, Number(item?.position || 0)),
      createdAt: item?.createdAt || new Date().toISOString(),
    }))

  const notes = (Array.isArray(source.notes) ? source.notes : [])
    .filter((item) => validUserIds.has(item?.userId) && validBookIds.has(item?.bookId))
    .map((item) => ({
      id: item?.id || `note-${randomUUID()}`,
      userId: item.userId,
      bookId: item.bookId,
      position: Math.max(0, Number(item?.position || 0)),
      selection: String(item?.selection || '').trim(),
      body: String(item?.body || '').trim(),
      createdAt: item?.createdAt || new Date().toISOString(),
    }))
    .filter((item) => item.body)

  const comments = normalizeComments(source.comments, validUserIds, validBookIds)

  return {
    users,
    categories,
    books,
    favorites,
    views,
    progress,
    bookmarks,
    notes,
    comments,
  }
}

const loadData = async () => {
  await ensureStorageFileParent(DATA_PATH)

  if (!existsSync(DATA_PATH)) {
    const initialData = migrateData(cloneDefaultData())
    await writeFile(DATA_PATH, JSON.stringify(initialData, null, 2), 'utf-8')
    return initialData
  }

  const raw = await readFile(DATA_PATH, 'utf-8')
  return migrateData(JSON.parse(raw))
}

const saveData = async (data) => {
  const normalizedData = migrateData(data)
  await ensureStorageFileParent(DATA_PATH)
  await writeFile(DATA_PATH, JSON.stringify(normalizedData, null, 2), 'utf-8')
  return normalizedData
}

const getStorageFileStatus = async (fileUrl, relativePath, label) => {
  try {
    if (!existsSync(fileUrl)) {
      return {
        label,
        path: relativePath,
        ok: false,
        exists: false,
        size: 0,
        updatedAt: null,
      }
    }

    const fileStats = await stat(fileUrl)

    return {
      label,
      path: relativePath,
      ok: fileStats.isFile(),
      exists: fileStats.isFile(),
      size: fileStats.isFile() ? Number(fileStats.size || 0) : 0,
      updatedAt: fileStats.isFile() ? fileStats.mtime.toISOString() : null,
    }
  } catch (error) {
    return {
      label,
      path: relativePath,
      ok: false,
      exists: false,
      size: 0,
      updatedAt: null,
      error: error instanceof Error ? error.message : 'Unknown storage error.',
    }
  }
}

const getDatabaseMonitor = async (data = null) => {
  const [jsonStore, sqliteStore] = await Promise.all([
    getStorageFileStatus(DATA_PATH, path.relative(REPO_DIR, DATA_PATH) || 'data.json', 'Node data.json'),
    getStorageFileStatus(
      SQLITE_DB_PATH,
      path.relative(REPO_DIR, SQLITE_DB_PATH) || 'db.sqlite3',
      'Django db.sqlite3',
    ),
  ])

  return {
    ok: jsonStore.ok,
    checkedAt: new Date().toISOString(),
    jsonStore: data
      ? {
          ...jsonStore,
          records: {
            users: data.users.length,
            categories: data.categories.length,
            books: data.books.length,
            comments: data.comments.length,
          },
        }
      : jsonStore,
    sqliteStore,
  }
}

const getToken = (request) => {
  const authHeader = request.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  return authHeader.slice('Bearer '.length)
}

const getSession = (request) => {
  const token = getToken(request)
  if (!token || !sessions.has(token)) {
    return null
  }

  return {
    token,
    ...sessions.get(token),
  }
}

const getUserById = (data, userId) => {
  if (userId === DEVELOPER_USER_ID) {
    return getDeveloperUser()
  }

  return data.users.find((user) => user.id === userId) || null
}

const getBookById = (data, bookId) => data.books.find((book) => book.id === bookId) || null
const getCommentById = (data, commentId) => data.comments.find((comment) => comment.id === commentId) || null
const getUserProgress = (data, userId, bookId) =>
  data.progress.find((item) => item.userId === userId && item.bookId === bookId) || null

const canAccessBook = (book, user) => {
  if (!book) {
    return false
  }

  if (isManagerRole(user?.role)) {
    return true
  }

  return Boolean(book.published)
}

const sendUnauthorized = (response) => {
  sendJson(response, 401, { message: 'Сначала войдите в систему.' })
}

const sendForbidden = (response, message) => {
  sendJson(response, 403, { message })
}

const ensureAuthenticated = (request, response, data) => {
  const session = getSession(request)
  if (!session) {
    sendUnauthorized(response)
    return null
  }

  const user = getUserById(data, session.userId)
  if (!user) {
    sessions.delete(session.token)
    sendUnauthorized(response)
    return null
  }

  return { session, user }
}

const ensureDeveloper = (request, response, data) => {
  const auth = ensureAuthenticated(request, response, data)
  if (!auth) {
    return null
  }

  if (auth.user.role !== 'developer') {
    sendForbidden(response, 'Доступ разрешён только разработчику.')
    return null
  }

  return auth
}

const ensureManager = (request, response, data) => {
  const auth = ensureAuthenticated(request, response, data)
  if (!auth) {
    return null
  }

  if (!isManagerRole(auth.user.role)) {
    sendForbidden(response, 'Доступ разрешён только преподавателю или разработчику.')
    return null
  }

  return auth
}

const ensureStudent = (request, response, data) => {
  const auth = ensureAuthenticated(request, response, data)
  if (!auth) {
    return null
  }

  if (auth.user.role !== 'student') {
    sendForbidden(response, 'Доступ разрешён только студенту.')
    return null
  }

  return auth
}

const getAccessibleBooks = (data, user) => data.books.filter((book) => canAccessBook(book, user))

const getCategoryMap = (categories) =>
  Object.fromEntries(categories.map((category) => [category.id, category.name]))

const getCategoryCounts = (data, user) => {
  const counts = {}

  for (const book of getAccessibleBooks(data, user)) {
    counts[book.categoryId] = (counts[book.categoryId] || 0) + 1
  }

  return counts
}

const normalizeBook = (book, data, userId, includeContent = false) => {
  const favorites = data.favorites.filter((favorite) => favorite.userId === userId)
  const progress = getUserProgress(data, userId, book.id)
  const categoryName = getCategoryMap(data.categories)[book.categoryId] ?? 'Без категории'
  const fileUrl = book.readerType === 'file' ? `/api/books/${book.id}/file` : ''
  const externalUrl = book.sourceKind === 'remote-file' ? book.sourceUrl || '' : ''
  const normalizedPublishDate = normalizePublishDate(book.publishDate)

  return {
    id: book.id,
    title: book.title,
    author: book.author,
    description: book.description,
    categoryId: book.categoryId,
    categoryName,
    theme: book.theme,
    published: Boolean(book.published),
    estimatedMinutes: Math.max(5, Number(book.estimatedMinutes || 10)),
    coverTone: book.coverTone || '#4F46E5',
    coverImage: normalizeCoverImage(book.coverImage),
    publishDate: normalizedPublishDate,
    publishYear: resolvePublishYear(normalizedPublishDate, book.publishYear),
    openCount: Math.max(0, Number(book.openCount || 0)),
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
    previewText: book.content?.[0] || '',
    sectionCount: book.readerType === 'text' ? book.content?.length || 0 : 0,
    isFavorite: favorites.some((favorite) => favorite.bookId === book.id),
    progressPercent: progress?.lastPercent || 0,
    lastPosition: progress?.lastPosition || 0,
    readerType: book.readerType,
    format: book.format,
    sourceKind: book.sourceKind,
    sourceLabel: book.sourceLabel,
    sourceUrl: book.sourceUrl || '',
    fileUrl,
    file_url: fileUrl,
    externalUrl,
    external_url: externalUrl,
    ...(includeContent ? { content: book.content || [] } : {}),
  }
}

const getCategoriesResponse = (data, user) => {
  const counts = getCategoryCounts(data, user)

  return data.categories.map((category) => ({
    ...category,
    bookCount: counts[category.id] || 0,
  }))
}

const getCommentMetrics = (comments) => ({
  commentCount: comments.filter((item) => !item.parentId).length,
  replyCount: comments.filter((item) => Boolean(item.parentId)).length,
  receivedLikesCount: comments.reduce((sum, item) => sum + item.likes.length, 0),
})

const getLastActivityAt = (data, userId) => {
  const timestamps = [
    ...data.views.filter((item) => item.userId === userId).map((item) => item.viewedAt),
    ...data.progress.filter((item) => item.userId === userId).map((item) => item.updatedAt),
    ...data.bookmarks.filter((item) => item.userId === userId).map((item) => item.createdAt),
    ...data.notes.filter((item) => item.userId === userId).map((item) => item.createdAt),
    ...data.comments.filter((item) => item.userId === userId).map((item) => item.createdAt),
  ].filter(Boolean)

  if (!timestamps.length) {
    return null
  }

  return timestamps.sort((left, right) => Date.parse(right) - Date.parse(left))[0]
}

const serializeComment = (comment, data, currentUserId) => {
  const author = sanitizeUser(getUserById(data, comment.userId))

  return {
    id: comment.id,
    bookId: comment.bookId,
    parentId: comment.parentId,
    body: comment.body,
    createdAt: comment.createdAt,
    likeCount: comment.likes.length,
    likedByCurrentUser: comment.likes.includes(currentUserId),
    author,
    replies: [],
  }
}

const getBookCommentsResponse = (data, bookId, currentUser) => {
  const comments = data.comments
    .filter((comment) => comment.bookId === bookId)
    .sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt))
  const nodes = new Map(comments.map((comment) => [comment.id, serializeComment(comment, data, currentUser.id)]))
  const roots = []

  comments.forEach((comment) => {
    const node = nodes.get(comment.id)

    if (comment.parentId && nodes.has(comment.parentId)) {
      nodes.get(comment.parentId).replies.push(node)
      return
    }

    roots.push(node)
  })

  return roots.sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
}

const getDeveloperUsersResponse = (data) =>
  data.users
    .map((user) => {
      const favorites = data.favorites.filter((item) => item.userId === user.id).length
      const notes = data.notes.filter((item) => item.userId === user.id).length
      const bookmarks = data.bookmarks.filter((item) => item.userId === user.id).length
      const views = data.views.filter((item) => item.userId === user.id).length
      const progressItems = data.progress.filter((item) => item.userId === user.id)
      const userComments = data.comments.filter((item) => item.userId === user.id)
      const managedBooks = data.books.filter((book) => book.createdBy === user.id)
      const activeBooks = progressItems.filter((item) => Number(item.lastPercent) > 0).length
      const completedBooks = progressItems.filter((item) => Number(item.lastPercent) >= 100).length
      const commentMetrics = getCommentMetrics(userComments)

      return {
        ...sanitizeUser(user),
        favoriteCount: favorites,
        noteCount: notes,
        bookmarkCount: bookmarks,
        viewCount: views,
        activeBooks,
        completedBooks,
        lastActivityAt: getLastActivityAt(data, user.id),
        managedBookCount: managedBooks.length,
        publishedBookCount: managedBooks.filter((book) => book.published).length,
        draftBookCount: managedBooks.filter((book) => !book.published).length,
        ...commentMetrics,
      }
    })
    .sort((left, right) => {
      if (left.role !== right.role) {
        return left.role.localeCompare(right.role, 'en')
      }

      return left.name.localeCompare(right.name, 'ru')
    })

const removeUserRecords = (data, userId) => {
  const removedCommentIds = new Set(
    data.comments.filter((comment) => comment.userId === userId).map((comment) => comment.id),
  )

  let hasNestedReplies = true
  while (hasNestedReplies) {
    hasNestedReplies = false

    data.comments.forEach((comment) => {
      if (comment.parentId && removedCommentIds.has(comment.parentId) && !removedCommentIds.has(comment.id)) {
        removedCommentIds.add(comment.id)
        hasNestedReplies = true
      }
    })
  }

  data.users = data.users.filter((user) => user.id !== userId)
  data.favorites = data.favorites.filter((item) => item.userId !== userId)
  data.views = data.views.filter((item) => item.userId !== userId)
  data.progress = data.progress.filter((item) => item.userId !== userId)
  data.bookmarks = data.bookmarks.filter((item) => item.userId !== userId)
  data.notes = data.notes.filter((item) => item.userId !== userId)
  data.comments = data.comments
    .filter((comment) => !removedCommentIds.has(comment.id))
    .map((comment) => ({
      ...comment,
      likes: comment.likes.filter((likeUserId) => likeUserId !== userId),
    }))
}

const getStats = async (data, user) => {
  const visibleBooks = getAccessibleBooks(data, user)
  const totalViews = visibleBooks.reduce((sum, book) => sum + Number(book.openCount || 0), 0)

  if (user.role === 'developer') {
    const teacherCount = data.users.filter((item) => item.role === 'teacher').length
    const studentCount = data.users.filter((item) => item.role === 'student').length
    const activeReaders = new Set(
      data.progress
        .filter((item) => Number(item.lastPercent) > 0)
        .map((item) => item.userId),
    )
    const database = await getDatabaseMonitor(data)

    return {
      profile: sanitizeUser(user),
      developerStats: {
        totalBooks: data.books.length,
        publishedCount: data.books.filter((book) => book.published).length,
        draftCount: data.books.filter((book) => !book.published).length,
        categoryCount: data.categories.length,
        totalUsers: data.users.length,
        developerCount: 1,
        teacherCount,
        studentCount,
        activeReaders: activeReaders.size,
        favoritesCount: data.favorites.length,
        noteCount: data.notes.length,
        commentCount: data.comments.filter((item) => !item.parentId).length,
        replyCount: data.comments.filter((item) => Boolean(item.parentId)).length,
        commentLikeCount: data.comments.reduce((sum, item) => sum + item.likes.length, 0),
        totalViews: data.books.reduce((sum, book) => sum + Number(book.openCount || 0), 0),
        database,
      },
    }
  }

  if (user.role === 'teacher') {
    const studentIds = data.users.filter((item) => item.role === 'student').map((item) => item.id)
    const activeReaders = new Set(
      data.progress
        .filter((item) => studentIds.includes(item.userId) && Number(item.lastPercent) > 0)
        .map((item) => item.userId),
    )

    return {
      profile: sanitizeUser(user),
      teacherStats: {
        totalBooks: data.books.length,
        publishedCount: data.books.filter((book) => book.published).length,
        draftCount: data.books.filter((book) => !book.published).length,
        categoryCount: data.categories.length,
        studentCount: studentIds.length,
        activeReaders: activeReaders.size,
        favoritesCount: data.favorites.length,
        commentCount: data.comments.filter((item) => !item.parentId).length,
        replyCount: data.comments.filter((item) => Boolean(item.parentId)).length,
        totalViews,
      },
    }
  }

  const userFavorites = data.favorites.filter((favorite) => favorite.userId === user.id)
  const userProgress = data.progress.filter((item) => item.userId === user.id)
  const userBookmarks = data.bookmarks.filter((item) => item.userId === user.id)
  const userNotes = data.notes.filter((item) => item.userId === user.id)
  const userComments = data.comments.filter((item) => item.userId === user.id)
  const activeBooks = userProgress.filter((item) => Number(item.lastPercent) > 0).length
  const completedBooks = userProgress.filter((item) => Number(item.lastPercent) >= 100).length
  const commentMetrics = getCommentMetrics(userComments)
  const readingMinutes = Math.round(
    userProgress.reduce((sum, item) => sum + Number(item.readingSeconds || 0), 0) / 60,
  )
  const averageProgressPercent = userProgress.length
    ? Math.round(
        userProgress.reduce((sum, item) => sum + Math.min(100, Math.max(0, Number(item.lastPercent) || 0)), 0) /
          userProgress.length,
      )
    : 0
  const savedBooks = userFavorites
    .map((favorite) => getBookById(data, favorite.bookId))
    .filter((book) => canAccessBook(book, user))
    .map((book) => normalizeBook(book, data, user.id))
    .sort((left, right) => {
      if (Number(right.progressPercent || 0) !== Number(left.progressPercent || 0)) {
        return Number(right.progressPercent || 0) - Number(left.progressPercent || 0)
      }

      return left.title.localeCompare(right.title, 'ru')
    })

  const recentBooks = [...data.views]
    .filter((view) => view.userId === user.id)
    .sort((left, right) => new Date(right.viewedAt) - new Date(left.viewedAt))
    .map((view) => getBookById(data, view.bookId))
    .filter((book) => canAccessBook(book, user))
    .slice(0, 4)
    .map((book) => normalizeBook(book, data, user.id))

  return {
    profile: sanitizeUser(user),
    userStats: {
      totalAvailableBooks: visibleBooks.length,
      favoriteCount: userFavorites.length,
      activeBooks,
      completedBooks,
      averageProgressPercent,
      bookmarkCount: userBookmarks.length,
      noteCount: userNotes.length,
      ...commentMetrics,
      readingMinutes,
      totalViews,
      recentBooks,
      savedBooks,
    },
  }
}

const validateManualBook = (body, categories) => {
  if (!body.title?.trim()) {
    return 'Введите название книги.'
  }

  if (!body.author?.trim()) {
    return 'Введите автора.'
  }

  if (!body.categoryId) {
    return 'Выберите категорию.'
  }

  if (!categories.some((category) => category.id === body.categoryId)) {
    return 'Категория не найдена.'
  }

  if (!splitTextSections(body.content || '').length) {
    return 'Добавьте текст книги.'
  }

  return null
}

const validateUploadedBookPayload = (body, categories) => {
  if (!body.title?.trim()) {
    return 'Введите название книги.'
  }

  if (!body.categoryId) {
    return 'Выберите категорию.'
  }

  if (!categories.some((category) => category.id === body.categoryId)) {
    return 'Категория не найдена.'
  }

  if (!body.sourceUrl?.trim()) {
    return 'Файл книги не найден.'
  }

  if (!['pdf', 'epub'].includes(String(body.format || '').toLowerCase())) {
    return 'Поддерживаются только PDF и EPUB.'
  }

  return null
}

const validateImportPayload = (body, categories) => {
  if (!body.categoryId) {
    return 'Выберите категорию.'
  }

  if (!categories.some((category) => category.id === body.categoryId)) {
    return 'Категория не найдена.'
  }

  return null
}

const createBookFromRemoteUrl = async (body, teacherId) => {
  const format = getUrlFormat(body.sourceUrl)

  if (format === 'pdf' || format === 'epub') {
    const pathname = new URL(body.sourceUrl).pathname
    const fallbackTitle = path.basename(pathname, path.extname(pathname)) || 'Р ВР СР С—Р С•РЎР‚РЎвЂљ Р С—Р С• РЎРѓРЎРѓРЎвЂ№Р В»Р С”Р Вµ'

    return createFileBook({
      teacherId,
      title: body.title || fallbackTitle,
      author: body.author || 'Р СњР ВµР С‘Р В·Р Р†Р ВµРЎРѓРЎвЂљР Р…РЎвЂ№Р в„– Р В°Р Р†РЎвЂљР С•РЎР‚',
      description: body.description || '',
      categoryId: body.categoryId,
      theme: body.theme || '',
      published: body.published,
      estimatedMinutes: body.estimatedMinutes,
      coverTone: body.coverTone,
      publishYear: body.publishYear,
      format,
      sourceKind: 'remote-file',
      sourceLabel: 'Р РЋРЎРѓРЎвЂ№Р В»Р С”Р В° Р Р…Р В° РЎвЂћР В°Р в„–Р В»',
      sourceUrl: body.sourceUrl,
    })
  }

  const remote = await fetch(body.sourceUrl)
  if (!remote.ok) {
    throw new Error('Р СњР Вµ РЎС“Р Т‘Р В°Р В»Р С•РЎРѓРЎРЉ Р С—Р С•Р В»РЎС“РЎвЂЎР С‘РЎвЂљРЎРЉ Р СР В°РЎвЂљР ВµРЎР‚Р С‘Р В°Р В» Р С—Р С• РЎРѓРЎРѓРЎвЂ№Р В»Р С”Р Вµ.')
  }

  const contentType = remote.headers.get('content-type') || ''
  const raw = await remote.text()
  const isHtml = format === 'html' || contentType.includes('text/html')
  const text = isHtml ? stripHtml(raw) : raw
  const title = body.title?.trim() || (isHtml ? extractHtmlTitle(raw, 'Р ВР СР С—Р С•РЎР‚РЎвЂљ Р С—Р С• РЎРѓРЎРѓРЎвЂ№Р В»Р С”Р Вµ') : 'Р ВР СР С—Р С•РЎР‚РЎвЂљ Р С—Р С• РЎРѓРЎРѓРЎвЂ№Р В»Р С”Р Вµ')
  const sections = splitTextSections(text)

  if (!sections.length) {
    throw new Error('Р СџР С• РЎРѓРЎРѓРЎвЂ№Р В»Р С”Р Вµ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р… РЎвЂЎР С‘РЎвЂљР В°Р ВµР СРЎвЂ№Р в„– РЎвЂљР ВµР С”РЎРѓРЎвЂљ.')
  }

  return createTextBook({
    teacherId,
    title,
    author: body.author || 'Р СњР ВµР С‘Р В·Р Р†Р ВµРЎРѓРЎвЂљР Р…РЎвЂ№Р в„– Р В°Р Р†РЎвЂљР С•РЎР‚',
    description: body.description || '',
    categoryId: body.categoryId,
    theme: body.theme || '',
    published: body.published,
    estimatedMinutes: body.estimatedMinutes,
    coverTone: body.coverTone,
    publishYear: body.publishYear,
    content: sections,
    sourceKind: 'remote-text',
    sourceLabel: 'Р ВР СР С—Р С•РЎР‚РЎвЂљ Р С—Р С• РЎРѓРЎРѓРЎвЂ№Р В»Р С”Р Вµ',
    sourceUrl: body.sourceUrl,
  })
}

const createBooksFromFolder = async (body, teacherId) => {
  const resolvedPath = path.resolve(body.folderPath)

  let folderStats
  try {
    folderStats = await stat(resolvedPath)
  } catch {
    throw new Error('Указанная папка не найдена.')
  }

  if (!folderStats.isDirectory()) {
    throw new Error('Нужно указать путь к папке.')
  }

  const entries = await readdir(resolvedPath, { withFileTypes: true })
  const created = []

  for (const entry of entries) {
    if (!entry.isFile()) {
      continue
    }

    const filePath = path.join(resolvedPath, entry.name)
    const format = getLocalFormat(filePath)

    if (!format) {
      continue
    }

    const baseTitle = path.basename(entry.name, path.extname(entry.name))

    if (format === 'pdf' || format === 'epub') {
      created.push(
        createFileBook({
          teacherId,
          title: baseTitle,
          author: body.author || 'Неизвестный автор',
          description: body.description || '',
          categoryId: body.categoryId,
          theme: body.theme || '',
          published: body.published,
          estimatedMinutes: body.estimatedMinutes,
          coverTone: body.coverTone,
          publishYear: body.publishYear,
          format,
          sourceKind: 'local-file',
          sourceLabel: 'Импорт из папки',
          sourcePath: filePath,
        }),
      )
      continue
    }

    const raw = await readFile(filePath, 'utf-8')
    const sections = toBookSections(raw, format)

    if (!sections.length) {
      continue
    }

    created.push(
      createTextBook({
        teacherId,
        title: baseTitle,
        author: body.author || 'Неизвестный автор',
        description: body.description || '',
        categoryId: body.categoryId,
        theme: body.theme || '',
        published: body.published,
        estimatedMinutes: body.estimatedMinutes,
        coverTone: body.coverTone,
        publishYear: body.publishYear,
        content: sections,
        sourceKind: 'local-text',
        sourceLabel: 'Импорт из папки',
      }),
    )
  }

  if (!created.length) {
    throw new Error('В папке не найдено поддерживаемых файлов.')
  }

  return created
}

const serveBookFile = async (request, response, data, user, book) => {
  if (!canAccessBook(book, user) || book.readerType !== 'file') {
    sendJson(response, 404, { message: 'Файл не найден.' })
    return
  }

  if (book.sourceKind === 'local-file') {
    if (!book.sourcePath || !existsSync(book.sourcePath)) {
      sendJson(response, 404, { message: 'Локальный файл не найден.' })
      return
    }

    response.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': CONTENT_TYPES[book.format] || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${path.basename(book.sourcePath)}"`,
    })

    createReadStream(book.sourcePath).pipe(response)
    return
  }

  if (book.sourceKind === 'remote-file') {
    try {
      const remote = await fetch(book.sourceUrl)
      if (!remote.ok) {
        sendJson(response, 502, { message: 'Не удалось получить удалённый файл.' })
        return
      }

      const buffer = Buffer.from(await remote.arrayBuffer())
      response.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Content-Type':
          remote.headers.get('content-type') ||
          CONTENT_TYPES[book.format] ||
          'application/octet-stream',
        'Content-Disposition': `inline; filename="${book.title}.${book.format}"`,
      })
      response.end(buffer)
      return
    } catch {
      sendJson(response, 502, { message: 'Не удалось получить удалённый файл.' })
      return
    }
  }

  if (book.sourceKind === 'uploaded-file') {
    const cachePath = getUploadedBookCachePath(book)
    if (existsSync(cachePath)) {
      response.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': CONTENT_TYPES[book.format] || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${path.basename(cachePath)}"`,
      })
      createReadStream(cachePath).pipe(response)
      return
    }

    const localPath = resolveUploadedBookLocalFile(book.sourceUrl)
    if (localPath) {
      let buffer
      try {
        buffer = await readFile(localPath)
      } catch {
        sendJson(response, 404, { message: 'Локальная копия файла недоступна.' })
        return
      }

      void saveUploadedBookCache(book, buffer).catch(() => {})
      response.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': CONTENT_TYPES[book.format] || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${path.basename(localPath)}"`,
      })
      response.end(buffer)
      return
    }

    const targetUrl = resolveUploadedBookSourceUrl(book.sourceUrl)
    if (!targetUrl) {
      sendJson(response, 404, {
        message:
          'Файл книги недоступен: нет пути к django (проверьте sourceUrl) или файла на диске. Запустите manage.py runserver и откройте книгу снова.',
      })
      return
    }

    try {
      const uploaded = await fetch(normalizeDjangoFetchUrl(targetUrl))
      if (!uploaded.ok) {
        sendJson(response, 502, {
          message:
            'Не удалось получить файл с django (код ' +
            uploaded.status +
            '). Запустите: python manage.py runserver 8000. Если файла нет в backend/media/books — загрузите книгу снова.',
        })
        return
      }

      const buffer = Buffer.from(await uploaded.arrayBuffer())
      void saveUploadedBookCache(book, buffer).catch(() => {})
      response.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Content-Type':
          uploaded.headers.get('content-type') ||
          CONTENT_TYPES[book.format] ||
          'application/octet-stream',
        'Content-Disposition': `inline; filename="${book.title}.${book.format}"`,
      })
      response.end(buffer)
      return
    } catch (error) {
      const hint =
        error instanceof Error && error.message ? error.message : 'ошибка сети'
      sendJson(response, 502, {
        message:
          'Не удалось связаться с django (' +
          hint +
          '). Запустите: python manage.py runserver 8000 (порт 8000).',
      })
      return
    }
  }

  sendJson(response, 404, { message: 'Файл не найден.' })
}

createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, jsonHeaders)
    response.end()
    return
  }

  const url = new URL(request.url, `http://${request.headers.host}`)
  const pathname = url.pathname
  const segments = pathname.split('/').filter(Boolean)

  try {
    if (pathname === '/django-api' || pathname.startsWith('/django-api/')) {
      await proxyDjangoRequest(request, response, url)
      return
    }

    if (pathname === '/api/health' && request.method === 'GET') {
      const database = await getDatabaseMonitor()
      sendJson(response, 200, {
        ok: database.ok,
        checkedAt: database.checkedAt,
        database,
      })
      return
    }

    if (pathname === '/api/dev-auth/login' && request.method === 'POST') {
      const body = await parseBody(request)
      const password = typeof body.password === 'string' ? body.password : ''

      if (!isDeveloperPasswordValid(password)) {
        sendJson(response, 401, { message: 'Неверный пароль разработчика.' })
        return
      }

      const developer = getDeveloperUser()
      const token = randomUUID()
      sessions.set(token, {
        userId: developer.id,
        role: developer.role,
        createdAt: Date.now(),
      })

      sendJson(response, 200, {
        token,
        user: sanitizeUser(developer),
      })
      return
    }

    if (pathname === '/api/auth/login' && request.method === 'POST') {
      const data = await loadData()
      const body = await parseBody(request)
      const email = body.email?.trim()?.toLowerCase()
      const password = body.password?.trim()
      const requestedRole =
        body.role === 'teacher' ? 'teacher' : body.role === 'student' ? 'student' : null

      const user = data.users.find((item) => item.email === email && item.password === password)
      if (!user) {
        sendJson(response, 401, { message: 'Неверный email или пароль.' })
        return
      }

      if (requestedRole && user.role !== requestedRole) {
        sendJson(response, 403, {
          message: requestedRole === 'teacher' ? 'Этот вход доступен только преподавателю.' : 'Этот вход доступен только студенту.',
        })
        return
      }

      const token = randomUUID()
      sessions.set(token, {
        userId: user.id,
        role: user.role,
        createdAt: Date.now(),
      })

      sendJson(response, 200, {
        token,
        user: sanitizeUser(user),
      })
      return
    }

    if (pathname === '/api/auth/register' && request.method === 'POST') {
      const data = await loadData()
      const body = await parseBody(request)
      const firstName = body.firstName?.trim()
      const lastName = body.lastName?.trim()
      const email = body.email?.trim()?.toLowerCase()
      const password = body.password?.trim()
      const role = body.role === 'teacher' ? 'teacher' : 'student'

      if (!firstName) {
        sendJson(response, 400, { message: 'Введите имя.' })
        return
      }

      if (!lastName) {
        sendJson(response, 400, { message: 'Введите фамилию.' })
        return
      }

      if (!email) {
        sendJson(response, 400, { message: 'Введите email.' })
        return
      }

      if (!password || password.length < 6) {
        sendJson(response, 400, { message: 'Пароль должен содержать минимум 6 символов.' })
        return
      }

      const emailTaken = data.users.some((user) => user.email === email)
      if (emailTaken) {
        sendJson(response, 409, { message: 'Пользователь с таким email уже существует.' })
        return
      }

      const user = normalizeUserRecord({
        id: `user-${randomUUID()}`,
        firstName,
        lastName,
        email,
        password,
        role,
        bio:
          role === 'teacher'
            ? 'Преподаватель электронной библиотеки.'
            : 'Студент электронной библиотеки.',
      })

      data.users.push(user)
      await saveData(data)

      const token = randomUUID()
      sessions.set(token, {
        userId: user.id,
        role: user.role,
        createdAt: Date.now(),
      })

      sendJson(response, 201, {
        token,
        user: sanitizeUser(user),
      })
      return
    }

    if (pathname === '/api/auth/session' && request.method === 'GET') {
      const data = await loadData()
      const session = getSession(request)

      if (!session) {
        sendJson(response, 200, { authenticated: false, user: null })
        return
      }

      const user = getUserById(data, session.userId)
      if (!user) {
        sessions.delete(session.token)
        sendJson(response, 200, { authenticated: false, user: null })
        return
      }

      sendJson(response, 200, { authenticated: true, user: sanitizeUser(user) })
      return
    }

    if (pathname === '/api/auth/logout' && request.method === 'POST') {
      const session = getSession(request)
      if (session) {
        sessions.delete(session.token)
      }

      sendJson(response, 200, { ok: true })
      return
    }

    if (pathname === '/api/me' && request.method === 'GET') {
      const data = await loadData()
      const auth = ensureAuthenticated(request, response, data)
      if (!auth) {
        return
      }

      sendJson(response, 200, sanitizeUser(auth.user))
      return
    }

    if (pathname === '/api/stats' && request.method === 'GET') {
      const data = await loadData()
      const auth = ensureAuthenticated(request, response, data)
      if (!auth) {
        return
      }

      sendJson(response, 200, await getStats(data, auth.user))
      return
    }

    if (pathname === '/api/dev/users' && request.method === 'GET') {
      const data = await loadData()
      const auth = ensureDeveloper(request, response, data)
      if (!auth) {
        return
      }

      sendJson(response, 200, getDeveloperUsersResponse(data))
      return
    }

    if (
      segments[0] === 'api' &&
      segments[1] === 'dev' &&
      segments[2] === 'users' &&
      segments[3] &&
      segments[4] === 'role' &&
      request.method === 'PATCH'
    ) {
      const data = await loadData()
      const auth = ensureDeveloper(request, response, data)
      if (!auth) {
        return
      }

      const body = await parseBody(request)
      const nextRole = body.role === 'teacher' ? 'teacher' : body.role === 'student' ? 'student' : null
      if (!nextRole) {
        sendJson(response, 400, { message: 'Выберите роль: преподаватель или студент.' })
        return
      }

      const user = getUserById(data, segments[3])
      if (!user || isDeveloperRole(user.role)) {
        sendJson(response, 404, { message: 'Пользователь не найден.' })
        return
      }

      user.role = nextRole
      await saveData(data)
      sendJson(response, 200, sanitizeUser(user))
      return
    }

    if (segments[0] === 'api' && segments[1] === 'dev' && segments[2] === 'users' && segments[3] && !segments[4] && request.method === 'DELETE') {
      const data = await loadData()
      const auth = ensureDeveloper(request, response, data)
      if (!auth) {
        return
      }

      const user = getUserById(data, segments[3])
      if (!user || isDeveloperRole(user.role)) {
        sendJson(response, 404, { message: 'Пользователь не найден.' })
        return
      }

      removeUserRecords(data, user.id)
      await saveData(data)
      sendJson(response, 200, { ok: true })
      return
    }

    if (pathname === '/api/categories' && request.method === 'GET') {
      const data = await loadData()
      const auth = ensureAuthenticated(request, response, data)
      if (!auth) {
        return
      }

      sendJson(response, 200, getCategoriesResponse(data, auth.user))
      return
    }

    if (pathname === '/api/categories' && request.method === 'POST') {
      const data = await loadData()
      const auth = ensureManager(request, response, data)
      if (!auth) {
        return
      }

      const body = await parseBody(request)
      if (!body.name?.trim()) {
        sendJson(response, 400, { message: 'Введите название категории.' })
        return
      }

      const category = {
        id: `cat-${randomUUID()}`,
        name: body.name.trim(),
      }

      data.categories.unshift(category)
      await saveData(data)
      sendJson(response, 201, category)
      return
    }

    if (segments[0] === 'api' && segments[1] === 'categories' && segments[2] && request.method === 'DELETE') {
      const data = await loadData()
      const auth = ensureManager(request, response, data)
      if (!auth) {
        return
      }

      const categoryId = segments[2]
      const hasBooks = data.books.some((book) => book.categoryId === categoryId)
      if (hasBooks) {
        sendJson(response, 400, { message: 'Нельзя удалить категорию, пока в ней есть книги.' })
        return
      }

      data.categories = data.categories.filter((category) => category.id !== categoryId)
      await saveData(data)
      sendJson(response, 200, { ok: true })
      return
    }

    if (pathname === '/api/books' && request.method === 'GET') {
      const data = await loadData()
      const auth = ensureAuthenticated(request, response, data)
      if (!auth) {
        return
      }

      const search = url.searchParams.get('search')?.trim().toLowerCase()
      const categoryId = url.searchParams.get('categoryId')
      const favoritesOnly = url.searchParams.get('favorites') === 'true'
      const sort = url.searchParams.get('sort') || 'new'

      let books = getAccessibleBooks(data, auth.user)

      if (categoryId && categoryId !== 'all') {
        books = books.filter((book) => book.categoryId === categoryId)
      }

      if (search) {
        books = books.filter((book) => {
          const haystack = `${book.title} ${book.author} ${book.theme} ${book.description}`.toLowerCase()
          return haystack.includes(search)
        })
      }

      if (sort === 'popular') {
        books = [...books].sort((left, right) => Number(right.openCount || 0) - Number(left.openCount || 0))
      } else if (sort === 'title') {
        books = [...books].sort((left, right) => left.title.localeCompare(right.title, 'ru'))
      } else {
        books = [...books].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
      }

      let result = books.map((book) => normalizeBook(book, data, auth.user.id))

      if (favoritesOnly) {
        result = result.filter((book) => book.isFavorite)
      }

      sendJson(response, 200, result)
      return
    }

    if (segments[0] === 'api' && segments[1] === 'books' && segments[2] && segments[3] === 'file' && request.method === 'GET') {
      const data = await loadData()
      const auth = ensureAuthenticated(request, response, data)
      if (!auth) {
        return
      }

      const book = getBookById(data, segments[2])
      await serveBookFile(request, response, data, auth.user, book)
      return
    }

    if (segments[0] === 'api' && segments[1] === 'books' && segments[2] && segments[3] === 'progress' && request.method === 'GET') {
      const data = await loadData()
      const auth = ensureAuthenticated(request, response, data)
      if (!auth) {
        return
      }

      const book = getBookById(data, segments[2])
      if (!canAccessBook(book, auth.user)) {
        sendJson(response, 404, { message: 'Р С™Р Р…Р С‘Р С–Р В° Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…Р В°.' })
        return
      }

      const progress =
        getUserProgress(data, auth.user.id, book.id) || {
          bookId: book.id,
          userId: auth.user.id,
          lastPercent: 0,
          lastPosition: 0,
          readingSeconds: 0,
          updatedAt: null,
        }

      sendJson(response, 200, progress)
      return
    }

    if (segments[0] === 'api' && segments[1] === 'books' && segments[2] && segments[3] === 'progress' && request.method === 'PUT') {
      const data = await loadData()
      const auth = ensureAuthenticated(request, response, data)
      if (!auth) {
        return
      }

      const book = getBookById(data, segments[2])
      if (!canAccessBook(book, auth.user)) {
        sendJson(response, 404, { message: 'Р С™Р Р…Р С‘Р С–Р В° Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…Р В°.' })
        return
      }

      const body = await parseBody(request)
      const position = Math.max(0, Number(body.lastPosition || 0))
      const percent = Math.max(0, Math.min(100, Number(body.lastPercent || 0)))
      const readingDelta = Math.max(0, Number(body.readingDelta || 0))
      const now = new Date().toISOString()

      const existing = getUserProgress(data, auth.user.id, book.id)
      if (existing) {
        existing.lastPosition = position
        existing.lastPercent = percent
        existing.readingSeconds = Number(existing.readingSeconds || 0) + readingDelta
        existing.updatedAt = now
      } else {
        data.progress.push({
          id: `progress-${randomUUID()}`,
          userId: auth.user.id,
          bookId: book.id,
          lastPosition: position,
          lastPercent: percent,
          readingSeconds: readingDelta,
          updatedAt: now,
        })
      }

      await saveData(data)
      sendJson(response, 200, { ok: true })
      return
    }

    if (segments[0] === 'api' && segments[1] === 'books' && segments[2] && segments[3] === 'bookmarks' && request.method === 'GET') {
      const data = await loadData()
      const auth = ensureAuthenticated(request, response, data)
      if (!auth) {
        return
      }

      const book = getBookById(data, segments[2])
      if (!canAccessBook(book, auth.user)) {
        sendJson(response, 404, { message: 'Р С™Р Р…Р С‘Р С–Р В° Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…Р В°.' })
        return
      }

      const items = data.bookmarks
        .filter((bookmark) => bookmark.userId === auth.user.id && bookmark.bookId === book.id)
        .sort((left, right) => Number(right.position) - Number(left.position))

      sendJson(response, 200, items)
      return
    }

    if (segments[0] === 'api' && segments[1] === 'books' && segments[2] && segments[3] === 'bookmarks' && request.method === 'POST') {
      const data = await loadData()
      const auth = ensureAuthenticated(request, response, data)
      if (!auth) {
        return
      }

      const book = getBookById(data, segments[2])
      if (!canAccessBook(book, auth.user)) {
        sendJson(response, 404, { message: 'Р С™Р Р…Р С‘Р С–Р В° Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…Р В°.' })
        return
      }

      const body = await parseBody(request)
      const bookmark = {
        id: `bookmark-${randomUUID()}`,
        userId: auth.user.id,
        bookId: book.id,
        title: body.title?.trim() || `Р В Р В°Р В·Р Т‘Р ВµР В» ${Number(body.position || 0) + 1}`,
        excerpt: body.excerpt?.trim() || '',
        position: Math.max(0, Number(body.position || 0)),
        createdAt: new Date().toISOString(),
      }

      data.bookmarks.unshift(bookmark)
      await saveData(data)
      sendJson(response, 201, bookmark)
      return
    }

    if (segments[0] === 'api' && segments[1] === 'books' && segments[2] && segments[3] === 'notes' && request.method === 'GET') {
      const data = await loadData()
      const auth = ensureAuthenticated(request, response, data)
      if (!auth) {
        return
      }

      const book = getBookById(data, segments[2])
      if (!canAccessBook(book, auth.user)) {
        sendJson(response, 404, { message: 'Р С™Р Р…Р С‘Р С–Р В° Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…Р В°.' })
        return
      }

      const items = data.notes
        .filter((note) => note.userId === auth.user.id && note.bookId === book.id)
        .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))

      sendJson(response, 200, items)
      return
    }

    if (segments[0] === 'api' && segments[1] === 'books' && segments[2] && segments[3] === 'notes' && request.method === 'POST') {
      const data = await loadData()
      const auth = ensureAuthenticated(request, response, data)
      if (!auth) {
        return
      }

      const book = getBookById(data, segments[2])
      if (!canAccessBook(book, auth.user)) {
        sendJson(response, 404, { message: 'Р С™Р Р…Р С‘Р С–Р В° Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…Р В°.' })
        return
      }

      const body = await parseBody(request)
      if (!body.body?.trim()) {
        sendJson(response, 400, { message: 'Р вЂ™Р Р†Р ВµР Т‘Р С‘РЎвЂљР Вµ РЎвЂљР ВµР С”РЎРѓРЎвЂљ Р В·Р В°Р СР ВµРЎвЂљР С”Р С‘.' })
        return
      }

      const note = {
        id: `note-${randomUUID()}`,
        userId: auth.user.id,
        bookId: book.id,
        position: Math.max(0, Number(body.position || 0)),
        selection: body.selection?.trim() || '',
        body: body.body.trim(),
        createdAt: new Date().toISOString(),
      }

      data.notes.unshift(note)
      await saveData(data)
      sendJson(response, 201, note)
      return
    }

    if (segments[0] === 'api' && segments[1] === 'books' && segments[2] && segments[3] === 'comments' && request.method === 'GET') {
      const data = await loadData()
      const auth = ensureAuthenticated(request, response, data)
      if (!auth) {
        return
      }

      const book = getBookById(data, segments[2])
      if (!canAccessBook(book, auth.user)) {
        sendJson(response, 404, { message: 'РљРЅРёРіР° РЅРµ РЅР°Р№РґРµРЅР°.' })
        return
      }

      sendJson(response, 200, getBookCommentsResponse(data, book.id, auth.user))
      return
    }

    if (segments[0] === 'api' && segments[1] === 'books' && segments[2] && segments[3] === 'comments' && request.method === 'POST') {
      const data = await loadData()
      const auth = ensureStudent(request, response, data)
      if (!auth) {
        return
      }

      const book = getBookById(data, segments[2])
      if (!canAccessBook(book, auth.user)) {
        sendJson(response, 404, { message: 'РљРЅРёРіР° РЅРµ РЅР°Р№РґРµРЅР°.' })
        return
      }

      const body = await parseBody(request)
      const commentBody = String(body.body || '').trim().slice(0, COMMENT_BODY_LIMIT)
      const parentId = typeof body.parentId === 'string' && body.parentId.trim() ? body.parentId.trim() : null

      if (!commentBody) {
        sendJson(response, 400, { message: 'Р’РІРµРґРёС‚Рµ С‚РµРєСЃС‚ РєРѕРјРјРµРЅС‚Р°СЂРёСЏ.' })
        return
      }

      if (containsBlockedCommentStem(commentBody)) {
        sendJson(response, 400, { message: 'РљРѕРјРјРµРЅС‚Р°СЂРёР№ СЃРѕРґРµСЂР¶РёС‚ РЅРµРґРѕРїСѓСЃС‚РёРјС‹Рµ СЃР»РѕРІР°.' })
        return
      }

      if (parentId) {
        const parentComment = getCommentById(data, parentId)

        if (!parentComment || parentComment.bookId !== book.id) {
          sendJson(response, 404, { message: 'РљРѕРјРјРµРЅС‚Р°СЂРёР№ РґР»СЏ РѕС‚РІРµС‚Р° РЅРµ РЅР°Р№РґРµРЅ.' })
          return
        }
      }

      data.comments.push({
        id: `comment-${randomUUID()}`,
        userId: auth.user.id,
        bookId: book.id,
        parentId,
        body: commentBody,
        likes: [],
        createdAt: new Date().toISOString(),
      })

      await saveData(data)
      sendJson(response, 201, getBookCommentsResponse(data, book.id, auth.user))
      return
    }

    if (segments[0] === 'api' && segments[1] === 'comments' && segments[2] && segments[3] === 'like' && request.method === 'POST') {
      const data = await loadData()
      const auth = ensureStudent(request, response, data)
      if (!auth) {
        return
      }

      const comment = getCommentById(data, segments[2])
      if (!comment) {
        sendJson(response, 404, { message: 'РљРѕРјРјРµРЅС‚Р°СЂРёР№ РЅРµ РЅР°Р№РґРµРЅ.' })
        return
      }

      const book = getBookById(data, comment.bookId)
      if (!canAccessBook(book, auth.user)) {
        sendJson(response, 404, { message: 'РљРЅРёРіР° РЅРµ РЅР°Р№РґРµРЅР°.' })
        return
      }

      if (comment.userId === auth.user.id) {
        sendJson(response, 400, { message: 'РќРµР»СЊР·СЏ Р»Р°Р№РєР°С‚СЊ СЃРІРѕР№ РєРѕРјРјРµРЅС‚Р°СЂРёР№.' })
        return
      }

      if (comment.likes.includes(auth.user.id)) {
        comment.likes = comment.likes.filter((userId) => userId !== auth.user.id)
      } else {
        comment.likes.push(auth.user.id)
      }

      await saveData(data)
      sendJson(response, 200, getBookCommentsResponse(data, book.id, auth.user))
      return
    }

    if (segments[0] === 'api' && segments[1] === 'books' && segments[2] && segments[3] === 'view' && request.method === 'POST') {
      const data = await loadData()
      const auth = ensureAuthenticated(request, response, data)
      if (!auth) {
        return
      }

      const book = getBookById(data, segments[2])
      if (!canAccessBook(book, auth.user)) {
        sendJson(response, 404, { message: 'Р С™Р Р…Р С‘Р С–Р В° Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…Р В°.' })
        return
      }

      const viewedAt = new Date().toISOString()
      const existingView = data.views.find(
        (view) => view.userId === auth.user.id && view.bookId === book.id,
      )

      if (existingView) {
        existingView.viewedAt = viewedAt
      } else {
        book.openCount = Number(book.openCount || 0) + 1
        data.views.unshift({
          id: `view-${randomUUID()}`,
          userId: auth.user.id,
          bookId: book.id,
          viewedAt,
        })
      }

      data.views = [...data.views].sort(
        (left, right) => Date.parse(right.viewedAt) - Date.parse(left.viewedAt),
      )

      await saveData(data)
      sendJson(response, 201, {
        ok: true,
        counted: !existingView,
        openCount: Number(book.openCount || 0),
      })
      return
    }

    if (segments[0] === 'api' && segments[1] === 'books' && segments[2] && !segments[3] && request.method === 'GET') {
      const data = await loadData()
      const auth = ensureAuthenticated(request, response, data)
      if (!auth) {
        return
      }

      const book = getBookById(data, segments[2])
      if (!canAccessBook(book, auth.user)) {
        sendJson(response, 404, { message: 'Р С™Р Р…Р С‘Р С–Р В° Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…Р В°.' })
        return
      }

      sendJson(response, 200, normalizeBook(book, data, auth.user.id, true))
      return
    }

    if (pathname === '/api/books' && request.method === 'POST') {
      const data = await loadData()
      const auth = ensureManager(request, response, data)
      if (!auth) {
        return
      }

      const body = await parseBody(request)
      const validationError = validateUploadedBookPayload(body, data.categories)
      if (validationError) {
        sendJson(response, 400, { message: validationError })
        return
      }

      const created = normalizeBookRecord(
        createFileBook({
          teacherId: auth.user.id,
          title: body.title,
          author: body.author || 'РїС—Р…РїС—Р…РїС—Р…РїС—Р…РїС—Р…РїС—Р…РїС—Р…РїС—Р…РїС—Р…РїС—Р…РїС—Р… РїС—Р…РїС—Р…РїС—Р…РїС—Р…РїС—Р…',
          description: body.description || '',
          categoryId: body.categoryId,
          theme: body.theme || '',
          published: body.published,
          estimatedMinutes: body.estimatedMinutes,
          coverTone: body.coverTone,
          coverImage: body.coverImage,
          publishDate: body.publishDate,
          publishYear: body.publishYear,
          format: String(body.format).toLowerCase(),
          sourceKind: body.sourceKind || 'uploaded-file',
          sourceLabel: body.sourceLabel || 'РїС—Р…РїС—Р…РїС—Р…РїС—Р…РїС—Р…РїС—Р…РїС—Р…РїС—Р…РїС—Р…РїС—Р…РїС—Р… РїС—Р…РїС—Р…РїС—Р…РїС—Р…',
          sourceUrl: body.sourceUrl.trim(),
        }),
        auth.user.id,
        data.categories,
      )

      data.books.unshift(created)
      try {
        const buf = await fetchUploadedBookFileBuffer(created)
        if (buf) {
          await saveUploadedBookCache(created, buf)
        }
      } catch {
        /* каталог уже сохраним; кэш догонит при первом get /file */
      }

      await saveData(data)

      sendJson(response, 201, normalizeBook(created, data, auth.user.id))
      return
    }

    if (pathname === '/api/books/import-link' && request.method === 'POST') {
      const data = await loadData()
      const auth = ensureManager(request, response, data)
      if (!auth) {
        return
      }

      sendJson(response, 410, {
        message: 'Р ВР СР С—Р С•РЎР‚РЎвЂљ Р С”Р Р…Р С‘Р С– Р С—Р С• РЎРѓРЎРѓРЎвЂ№Р В»Р С”Р Вµ Р С•РЎвЂљР С”Р В»РЎР‹РЎвЂЎР ВµР Р…. Р ВРЎРѓР С—Р С•Р В»РЎРЉР В·РЎС“Р в„–РЎвЂљР Вµ Р С‘Р СР С—Р С•РЎР‚РЎвЂљ Р С‘Р В· Р С—Р В°Р С—Р С”Р С‘.',
      })
      return
    }

    if (pathname === '/api/books/import-folder' && request.method === 'POST') {
      sendJson(response, 410, {
        message: 'РїС—Р…РїС—Р…РїС—Р…РїС—Р…РїС—Р…РїС—Р… РїС—Р…РїС—Р… РїС—Р…РїС—Р…РїС—Р…РїС—Р…РїС—Р… РїС—Р…РїС—Р…РїС—Р…РїС—Р…РїС—Р…РїС—Р…РїС—Р…РїС—Р…. РїС—Р…РїС—Р…РїС—Р…РїС—Р…РїС—Р…РїС—Р…РїС—Р…РїС—Р…РїС—Р…РїС—Р…РїС—Р… РїС—Р…РїС—Р…РїС—Р…РїС—Р…РїС—Р…РїС—Р…РїС—Р…РїС—Р… РїС—Р…РїС—Р…РїС—Р…РїС—Р…РїС—Р….',
      })
      return
    }

    if (segments[0] === 'api' && segments[1] === 'books' && segments[2] && !segments[3] && request.method === 'PUT') {
      const data = await loadData()
      const auth = ensureManager(request, response, data)
      if (!auth) {
        return
      }

      const body = await parseBody(request)
      const validationError = validateManualBook(body, data.categories)
      if (validationError) {
        sendJson(response, 400, { message: validationError })
        return
      }

      const book = getBookById(data, segments[2])
      if (!book) {
        sendJson(response, 404, { message: 'Р С™Р Р…Р С‘Р С–Р В° Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…Р В°.' })
        return
      }

      if (book.readerType === 'file') {
        sendJson(response, 400, { message: 'Р В¤Р В°Р в„–Р В»Р С•Р Р†РЎвЂ№Р Вµ Р С”Р Р…Р С‘Р С–Р С‘ РЎР‚Р ВµР Т‘Р В°Р С”РЎвЂљР С‘РЎР‚РЎС“РЎР‹РЎвЂљРЎРѓРЎРЏ РЎвЂљР С•Р В»РЎРЉР С”Р С• РЎвЂЎР ВµРЎР‚Р ВµР В· Р С—Р С•Р Р†РЎвЂљР С•РЎР‚Р Р…РЎвЂ№Р в„– Р С‘Р СР С—Р С•РЎР‚РЎвЂљ.' })
        return
      }

      book.title = body.title.trim()
      book.author = body.author.trim()
      book.description = body.description?.trim() || ''
      book.categoryId = body.categoryId
      book.theme = body.theme?.trim() || ''
      book.published = Boolean(body.published)
      book.estimatedMinutes = Math.max(5, Number(body.estimatedMinutes || 10))
      book.coverTone = body.coverTone?.trim() || '#4F46E5'
      book.publishYear = Number(body.publishYear || new Date().getFullYear())
      book.content = splitTextSections(body.content)
      book.updatedAt = new Date().toISOString()

      await saveData(data)
      sendJson(response, 200, normalizeBook(book, data, auth.user.id))
      return
    }

    if (segments[0] === 'api' && segments[1] === 'books' && segments[2] && segments[3] === 'publish' && request.method === 'PATCH') {
      const data = await loadData()
      const auth = ensureManager(request, response, data)
      if (!auth) {
        return
      }

      const body = await parseBody(request)
      const book = getBookById(data, segments[2])
      if (!book) {
        sendJson(response, 404, { message: 'Р С™Р Р…Р С‘Р С–Р В° Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…Р В°.' })
        return
      }

      book.published = Boolean(body.published)
      book.updatedAt = new Date().toISOString()
      await saveData(data)
      sendJson(response, 200, normalizeBook(book, data, auth.user.id))
      return
    }

    if (segments[0] === 'api' && segments[1] === 'books' && segments[2] && !segments[3] && request.method === 'DELETE') {
      const data = await loadData()
      const auth = ensureManager(request, response, data)
      if (!auth) {
        return
      }

      const bookId = segments[2]
      data.books = data.books.filter((book) => book.id !== bookId)
      data.favorites = data.favorites.filter((item) => item.bookId !== bookId)
      data.views = data.views.filter((item) => item.bookId !== bookId)
      data.progress = data.progress.filter((item) => item.bookId !== bookId)
      data.bookmarks = data.bookmarks.filter((item) => item.bookId !== bookId)
      data.notes = data.notes.filter((item) => item.bookId !== bookId)
      data.comments = data.comments.filter((item) => item.bookId !== bookId)

      await saveData(data)
      sendJson(response, 200, { ok: true })
      return
    }

    if (pathname === '/api/favorites' && request.method === 'GET') {
      const data = await loadData()
      const auth = ensureAuthenticated(request, response, data)
      if (!auth) {
        return
      }

      const favoriteIds = data.favorites
        .filter((favorite) => favorite.userId === auth.user.id)
        .map((favorite) => favorite.bookId)

      sendJson(response, 200, favoriteIds)
      return
    }

    if (pathname === '/api/favorites' && request.method === 'POST') {
      const data = await loadData()
      const auth = ensureAuthenticated(request, response, data)
      if (!auth) {
        return
      }

      const body = await parseBody(request)
      const book = getBookById(data, body.bookId)
      if (!canAccessBook(book, auth.user)) {
        sendJson(response, 404, { message: 'Р С™Р Р…Р С‘Р С–Р В° Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…Р В°.' })
        return
      }

      const exists = data.favorites.some(
        (favorite) => favorite.userId === auth.user.id && favorite.bookId === body.bookId,
      )

      if (!exists) {
        data.favorites.push({
          id: `favorite-${randomUUID()}`,
          userId: auth.user.id,
          bookId: body.bookId,
        })
        await saveData(data)
      }

      sendJson(response, 201, { ok: true })
      return
    }

    if (segments[0] === 'api' && segments[1] === 'favorites' && segments[2] && request.method === 'DELETE') {
      const data = await loadData()
      const auth = ensureAuthenticated(request, response, data)
      if (!auth) {
        return
      }

      data.favorites = data.favorites.filter(
        (favorite) => !(favorite.userId === auth.user.id && favorite.bookId === segments[2]),
      )
      await saveData(data)
      sendJson(response, 200, { ok: true })
      return
    }

    if (segments[0] === 'api' && segments[1] === 'bookmarks' && segments[2] && request.method === 'DELETE') {
      const data = await loadData()
      const auth = ensureAuthenticated(request, response, data)
      if (!auth) {
        return
      }

      data.bookmarks = data.bookmarks.filter(
        (bookmark) => !(bookmark.userId === auth.user.id && bookmark.id === segments[2]),
      )
      await saveData(data)
      sendJson(response, 200, { ok: true })
      return
    }

    if (segments[0] === 'api' && segments[1] === 'notes' && segments[2] && request.method === 'DELETE') {
      const data = await loadData()
      const auth = ensureAuthenticated(request, response, data)
      if (!auth) {
        return
      }

      data.notes = data.notes.filter(
        (note) => !(note.userId === auth.user.id && note.id === segments[2]),
      )
      await saveData(data)
      sendJson(response, 200, { ok: true })
      return
    }

    if (request.method === 'GET' || request.method === 'HEAD') {
      await serveFrontendApp(pathname, response, request.method)
      return
    }

    sendJson(response, 404, { message: 'Маршрут не найден.' })
  } catch (error) {
    const message =
      error instanceof SyntaxError
        ? 'Неверный формат JSON.'
        : error instanceof Error && error.message
          ? error.message
          : 'Внутренняя ошибка сервера.'
    sendJson(response, 500, { message })
  }
}).listen(PORT, HOST, () => {
  console.log(`LibHub backend running on http://${HOST}:${PORT}`)
})




