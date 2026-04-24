import { randomUUID } from 'node:crypto'
import { createReadStream, existsSync } from 'node:fs'
import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import path from 'node:path'
import { URL } from 'node:url'

const PORT = Number(process.env.PORT || 4000)
const HOST = process.env.HOST || '0.0.0.0'
const DATA_PATH = new URL('./data.json', import.meta.url)

const sessions = new Map()

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

const defaultData = {
  users: [
    {
      id: 'teacher-1',
      name: 'Айжан Токтобаева',
      email: 'teacher@libhub.dev',
      password: 'teach123',
      role: 'teacher',
      bio: 'Преподаватель и куратор фонда учебных материалов.',
    },
    {
      id: 'student-1',
      name: 'Айдана Нурбекова',
      email: 'student@libhub.dev',
      password: 'study123',
      role: 'student',
      bio: 'Студентка, которая использует платформу как личную электронную библиотеку.',
    },
  ],
  categories: [
    { id: 'cat-school', name: 'Школьникам КР' },
    { id: 'cat-history', name: 'Исторические науки' },
    { id: 'cat-design', name: 'Дизайн и цифровая среда' },
    { id: 'cat-productivity', name: 'Продуктивность' },
  ],
  books: [
    {
      id: 'book-focus-learning',
      title: 'Сосредоточенное обучение',
      author: 'Команда LibHub',
      description: 'Практическое руководство о том, как учиться глубже и читать осмысленно.',
      categoryId: 'cat-productivity',
      theme: 'Навыки обучения',
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
      sourceLabel: 'Ручное добавление',
      content: [
        'Хорошее обучение начинается не с количества часов, а с качества внимания. Если студент читает быстро и бессистемно, он получает ощущение занятости, но не реальное понимание.',
        'Первый шаг к глубокому чтению — создать ритм. Выделите короткий отрезок времени, уберите отвлекающие вкладки и заранее определите, что именно хотите понять к концу сессии.',
        'Во время чтения задавайте тексту вопросы. Почему автор формулирует мысль именно так? На какие проблемы он отвечает? Где можно применить эту идею в реальной учебе?',
        'После каждого смыслового блока полезно сделать короткую остановку. Перескажите прочитанное своими словами и попробуйте связать его с тем, что уже знаете.',
        'Запоминание усиливается, когда чтение сопровождается действием. Отмечайте ключевые места, создавайте закладки и фиксируйте собственные заметки рядом с теми абзацами, к которым хотите вернуться.',
        'Хорошая образовательная платформа не просто хранит книги, а помогает возвращаться в нужное место без трения. Поэтому синхронизация прогресса и истории чтения действительно влияет на результат.',
        'Если какой-то фрагмент кажется сложным, не нужно сразу перескакивать дальше. Лучше выделить идею, сформулировать вопрос и обсудить его с преподавателем.',
        'Регулярность важнее идеальной мотивации. Когда студент читает понемногу, но часто, понимание становится устойчивым, а учеба — предсказуемой и спокойной.',
      ],
    },
    {
      id: 'book-interface-basics',
      title: 'Читаемые интерфейсы',
      author: 'Команда LibHub',
      description: 'Небольшая книга о том, как проектировать интерфейсы, в которых удобно читать и учиться.',
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
      sourceLabel: 'Ручное добавление',
      content: [
        'Логичный интерфейс не перегружает пользователя решениями. Он подсказывает следующий шаг и убирает лишнее из поля зрения.',
        'Когда продукт связан с чтением, типографика становится частью функциональности. Размер шрифта, высота строки и ширина колонки напрямую влияют на усвоение материала.',
        'Учебный интерфейс должен быть спокойным. Сильные акценты стоит оставлять для целевых действий: продолжить чтение, открыть материал, сохранить в библиотеку.',
        'Если студент заходит с телефона, сценарий не должен ломаться. Навигация, заметки и переход к последнему месту чтения должны быть доступны одной рукой.',
        'Ночные и светлые режимы полезны не как декоративная опция, а как инструмент контроля над средой чтения.',
        'Хорошая teacher-панель отличается от student-интерфейса. Она помогает быстро загружать фонд, а не отвлекает сложной структурой.',
      ],
    },
    {
      id: 'book-kg-history',
      title: 'История Кыргызстана. Введение',
      author: 'Редакция LibHub',
      description: 'Вводный учебный материал по истории Кыргызстана для библиотечного каталога.',
      categoryId: 'cat-history',
      theme: 'История',
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
      sourceLabel: 'Ручное добавление',
      content: [
        'История помогает читать настоящее глубже. Учебный текст всегда выигрывает, когда он не перегружен датами, а показывает взаимосвязи событий.',
        'Для школьного материала важна ясная структура: короткие тематические блоки, понятные заголовки и возможность быстро вернуться к нужному месту.',
        'Электронная библиотека должна поддерживать именно такой ритм: открыл книгу, дочитал раздел, сохранил прогресс и вернулся позже.',
      ],
    },
    {
      id: 'book-reading-routine',
      title: 'Ритм чтения',
      author: 'Команда LibHub',
      description: 'Как встроить регулярное чтение в учебную неделю и не терять нить материала.',
      categoryId: 'cat-productivity',
      theme: 'Привычки',
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
      sourceLabel: 'Черновик',
      content: [
        'Чтение становится устойчивой привычкой, когда у него есть постоянное место в расписании.',
        'Помогает и ритуал запуска: одно и то же время дня, спокойный экран и понятная точка возврата.',
        'Прогресс-бар полезен не только как украшение. Он дает ощущение движения и помогает вернуться к книге без сопротивления.',
      ],
    },
  ],
  favorites: [],
  views: [],
  progress: [],
  bookmarks: [],
  notes: [],
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

const sanitizeUser = (user) => {
  if (!user) {
    return null
  }

  const { password, ...safeUser } = user
  return safeUser
}

const splitTextSections = (text) =>
  text
    .replace(/\r/g, '')
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean)

const stripHtml = (html) =>
  html
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

const extractHtmlTitle = (html, fallback) => {
  const match = html.match(/<title>(.*?)<\/title>/i)
  if (!match?.[1]) {
    return fallback
  }

  return match[1].replace(/\s+/g, ' ').trim()
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
  publishYear,
  content,
  sourceKind,
  sourceLabel,
  sourceUrl = '',
}) => ({
  id: `book-${randomUUID()}`,
  title: title?.trim() || 'Без названия',
  author: author?.trim() || 'Неизвестный автор',
  description: description?.trim() || '',
  categoryId,
  theme: theme?.trim() || '',
  published: Boolean(published),
  estimatedMinutes: Math.max(5, Number(estimatedMinutes || 10)),
  coverTone: coverTone?.trim() || '#4F46E5',
  publishYear: Number(publishYear || new Date().getFullYear()),
  openCount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: teacherId,
  readerType: 'text',
  sourceKind,
  sourceLabel,
  sourceUrl,
  format: 'text',
  content,
})

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
  publishYear,
  format,
  sourceKind,
  sourceLabel,
  sourceUrl = '',
  sourcePath = '',
}) => ({
  id: `book-${randomUUID()}`,
  title: title?.trim() || 'Без названия',
  author: author?.trim() || 'Неизвестный автор',
  description: description?.trim() || '',
  categoryId,
  theme: theme?.trim() || '',
  published: Boolean(published),
  estimatedMinutes: Math.max(5, Number(estimatedMinutes || 10)),
  coverTone: coverTone?.trim() || '#4F46E5',
  publishYear: Number(publishYear || new Date().getFullYear()),
  openCount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  createdBy: teacherId,
  readerType: 'file',
  sourceKind,
  sourceLabel,
  sourceUrl,
  sourcePath,
  format,
  content: [],
})

const normalizeBookRecord = (book, teacherId, categories) => {
  const categoryId = categories.some((item) => item.id === book.categoryId)
    ? book.categoryId
    : categories[0]?.id

  const content =
    Array.isArray(book.content) && book.content.length
      ? book.content.filter((item) => typeof item === 'string' && item.trim())
      : typeof book.content === 'string'
        ? splitTextSections(book.content)
        : []

  return {
    id: book.id || `book-${randomUUID()}`,
    title: book.title?.trim() || 'Без названия',
    author: book.author?.trim() || 'Неизвестный автор',
    description: book.description?.trim() || '',
    categoryId,
    theme: book.theme?.trim() || '',
    published: Boolean(book.published),
    estimatedMinutes: Math.max(5, Number(book.estimatedMinutes || 10)),
    coverTone: book.coverTone || '#4F46E5',
    publishYear: Number(book.publishYear || new Date().getFullYear()),
    openCount: Math.max(0, Number(book.openCount || 0)),
    createdAt: book.createdAt || new Date().toISOString(),
    updatedAt: book.updatedAt || new Date().toISOString(),
    createdBy: book.createdBy || teacherId,
    readerType: book.readerType === 'file' ? 'file' : 'text',
    sourceKind: book.sourceKind || 'manual',
    sourceLabel: book.sourceLabel || 'Источник не указан',
    sourceUrl: book.sourceUrl || '',
    sourcePath: book.sourcePath || '',
    format: book.format || (book.readerType === 'file' ? 'pdf' : 'text'),
    content: book.readerType === 'file' ? [] : content.length ? content : ['Материал пока не добавлен.'],
  }
}

const migrateData = (data) => {
  const source = data && typeof data === 'object' ? data : {}
  const teacherSeed = defaultData.users.find((user) => user.role === 'teacher')
  const studentSeed = defaultData.users.find((user) => user.role === 'student')

  let users = Array.isArray(source.users) ? source.users : []
  if (!users.length) {
    const legacyProfile = source.profile
      ? {
          id: source.profile.id || studentSeed.id,
          name: source.profile.name || studentSeed.name,
          email: source.profile.email || studentSeed.email,
          password: 'study123',
          role: source.profile.role === 'teacher' ? 'teacher' : 'student',
          bio: '',
        }
      : studentSeed

    users = [teacherSeed, legacyProfile]
  }

  const ensuredTeacher = users.some((user) => user.role === 'teacher')
    ? users
    : [teacherSeed, ...users]

  const categories =
    Array.isArray(source.categories) && source.categories.length
      ? source.categories.map((category) => ({
          id: category.id || `cat-${randomUUID()}`,
          name: category.name?.trim() || 'Без категории',
        }))
      : defaultData.categories

  const booksSource =
    Array.isArray(source.books) && source.books.length ? source.books : defaultData.books

  return {
    users: ensuredTeacher.map((user) => ({
      id: user.id || `user-${randomUUID()}`,
      name: user.name?.trim() || 'Пользователь',
      email: user.email?.trim()?.toLowerCase() || `user-${randomUUID()}@libhub.dev`,
      password: user.password || (user.role === 'teacher' ? 'teach123' : 'study123'),
      role: user.role === 'teacher' ? 'teacher' : 'student',
      bio: user.bio?.trim() || '',
    })),
    categories,
    books: booksSource.map((book) => normalizeBookRecord(book, teacherSeed.id, categories)),
    favorites: Array.isArray(source.favorites) ? source.favorites : [],
    views: Array.isArray(source.views) ? source.views : [],
    progress: Array.isArray(source.progress) ? source.progress : [],
    bookmarks: Array.isArray(source.bookmarks) ? source.bookmarks : [],
    notes: Array.isArray(source.notes) ? source.notes : [],
  }
}

const loadData = async () => {
  if (!existsSync(DATA_PATH)) {
    await writeFile(DATA_PATH, JSON.stringify(defaultData, null, 2))
    return structuredClone(defaultData)
  }

  const raw = await readFile(DATA_PATH, 'utf-8')
  const migrated = migrateData(JSON.parse(raw))
  await writeFile(DATA_PATH, JSON.stringify(migrated, null, 2))
  return migrated
}

const saveData = async (data) => {
  await writeFile(DATA_PATH, JSON.stringify(data, null, 2))
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

const getUserById = (data, userId) => data.users.find((user) => user.id === userId)
const getBookById = (data, bookId) => data.books.find((book) => book.id === bookId)
const getUserProgress = (data, userId, bookId) =>
  data.progress.find((item) => item.userId === userId && item.bookId === bookId)

const canAccessBook = (book, user) => {
  if (!book) {
    return false
  }

  if (user?.role === 'teacher') {
    return true
  }

  return Boolean(book.published)
}

const sendUnauthorized = (response) => {
  sendJson(response, 401, { message: 'Сначала войдите в систему.' })
}

const sendForbidden = (response) => {
  sendJson(response, 403, { message: 'Доступ разрешен только преподавателю.' })
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

const ensureTeacher = (request, response, data) => {
  const auth = ensureAuthenticated(request, response, data)
  if (!auth) {
    return null
  }

  if (auth.user.role !== 'teacher') {
    sendForbidden(response)
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
  const fileEndpoint = book.readerType === 'file' ? `/api/books/${book.id}/file` : null

  return {
    id: book.id,
    title: book.title,
    author: book.author,
    description: book.description,
    categoryId: book.categoryId,
    categoryName,
    theme: book.theme,
    published: book.published,
    estimatedMinutes: book.estimatedMinutes,
    coverTone: book.coverTone,
    publishYear: book.publishYear,
    openCount: Number(book.openCount || 0),
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
    fileEndpoint,
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

const getStats = (data, user) => {
  const visibleBooks = getAccessibleBooks(data, user)
  const totalViews = visibleBooks.reduce((sum, book) => sum + Number(book.openCount || 0), 0)

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
        totalViews,
      },
    }
  }

  const userFavorites = data.favorites.filter((favorite) => favorite.userId === user.id)
  const userProgress = data.progress.filter((item) => item.userId === user.id)
  const userBookmarks = data.bookmarks.filter((item) => item.userId === user.id)
  const userNotes = data.notes.filter((item) => item.userId === user.id)
  const readingMinutes = Math.round(
    userProgress.reduce((sum, item) => sum + Number(item.readingSeconds || 0), 0) / 60,
  )

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
      activeBooks: userProgress.filter((item) => Number(item.lastPercent) > 0).length,
      bookmarkCount: userBookmarks.length,
      noteCount: userNotes.length,
      readingMinutes,
      totalViews,
      recentBooks,
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
    const fallbackTitle = path.basename(pathname, path.extname(pathname)) || 'Импорт по ссылке'

    return createFileBook({
      teacherId,
      title: body.title || fallbackTitle,
      author: body.author || 'Неизвестный автор',
      description: body.description || '',
      categoryId: body.categoryId,
      theme: body.theme || '',
      published: body.published,
      estimatedMinutes: body.estimatedMinutes,
      coverTone: body.coverTone,
      publishYear: body.publishYear,
      format,
      sourceKind: 'remote-file',
      sourceLabel: 'Ссылка на файл',
      sourceUrl: body.sourceUrl,
    })
  }

  const remote = await fetch(body.sourceUrl)
  if (!remote.ok) {
    throw new Error('Не удалось получить материал по ссылке.')
  }

  const contentType = remote.headers.get('content-type') || ''
  const raw = await remote.text()
  const isHtml = format === 'html' || contentType.includes('text/html')
  const text = isHtml ? stripHtml(raw) : raw
  const title = body.title?.trim() || (isHtml ? extractHtmlTitle(raw, 'Импорт по ссылке') : 'Импорт по ссылке')
  const sections = splitTextSections(text)

  if (!sections.length) {
    throw new Error('По ссылке не найден читаемый текст.')
  }

  return createTextBook({
    teacherId,
    title,
    author: body.author || 'Неизвестный автор',
    description: body.description || '',
    categoryId: body.categoryId,
    theme: body.theme || '',
    published: body.published,
    estimatedMinutes: body.estimatedMinutes,
    coverTone: body.coverTone,
    publishYear: body.publishYear,
    content: sections,
    sourceKind: 'remote-text',
    sourceLabel: 'Импорт по ссылке',
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
        sendJson(response, 502, { message: 'Не удалось получить удаленный файл.' })
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
      sendJson(response, 502, { message: 'Не удалось получить удаленный файл.' })
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
    if (pathname === '/api/health' && request.method === 'GET') {
      sendJson(response, 200, { ok: true })
      return
    }

    if (pathname === '/api/auth/login' && request.method === 'POST') {
      const data = await loadData()
      const body = await parseBody(request)
      const email = body.email?.trim()?.toLowerCase()
      const password = body.password?.trim()

      const user = data.users.find((item) => item.email === email && item.password === password)
      if (!user) {
        sendJson(response, 401, { message: 'Неверный email или пароль.' })
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

      sendJson(response, 200, getStats(data, auth.user))
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
      const auth = ensureTeacher(request, response, data)
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
      const auth = ensureTeacher(request, response, data)
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
        sendJson(response, 404, { message: 'Книга не найдена.' })
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
        sendJson(response, 404, { message: 'Книга не найдена.' })
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
        sendJson(response, 404, { message: 'Книга не найдена.' })
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
        sendJson(response, 404, { message: 'Книга не найдена.' })
        return
      }

      const body = await parseBody(request)
      const bookmark = {
        id: `bookmark-${randomUUID()}`,
        userId: auth.user.id,
        bookId: book.id,
        title: body.title?.trim() || `Раздел ${Number(body.position || 0) + 1}`,
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
        sendJson(response, 404, { message: 'Книга не найдена.' })
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
        sendJson(response, 404, { message: 'Книга не найдена.' })
        return
      }

      const body = await parseBody(request)
      if (!body.body?.trim()) {
        sendJson(response, 400, { message: 'Введите текст заметки.' })
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

    if (segments[0] === 'api' && segments[1] === 'books' && segments[2] && segments[3] === 'view' && request.method === 'POST') {
      const data = await loadData()
      const auth = ensureAuthenticated(request, response, data)
      if (!auth) {
        return
      }

      const book = getBookById(data, segments[2])
      if (!canAccessBook(book, auth.user)) {
        sendJson(response, 404, { message: 'Книга не найдена.' })
        return
      }

      book.openCount = Number(book.openCount || 0) + 1
      data.views.unshift({
        id: `view-${randomUUID()}`,
        userId: auth.user.id,
        bookId: book.id,
        viewedAt: new Date().toISOString(),
      })

      await saveData(data)
      sendJson(response, 201, { ok: true })
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
        sendJson(response, 404, { message: 'Книга не найдена.' })
        return
      }

      sendJson(response, 200, normalizeBook(book, data, auth.user.id, true))
      return
    }

    if (pathname === '/api/books' && request.method === 'POST') {
      const data = await loadData()
      const auth = ensureTeacher(request, response, data)
      if (!auth) {
        return
      }

      const body = await parseBody(request)
      const validationError = validateManualBook(body, data.categories)
      if (validationError) {
        sendJson(response, 400, { message: validationError })
        return
      }

      const book = createTextBook({
        teacherId: auth.user.id,
        title: body.title,
        author: body.author,
        description: body.description,
        categoryId: body.categoryId,
        theme: body.theme,
        published: body.published,
        estimatedMinutes: body.estimatedMinutes,
        coverTone: body.coverTone,
        publishYear: body.publishYear,
        content: splitTextSections(body.content),
        sourceKind: 'manual',
        sourceLabel: 'Ручное добавление',
      })

      data.books.unshift(book)
      await saveData(data)
      sendJson(response, 201, normalizeBook(book, data, auth.user.id))
      return
    }

    if (pathname === '/api/books/import-link' && request.method === 'POST') {
      const data = await loadData()
      const auth = ensureTeacher(request, response, data)
      if (!auth) {
        return
      }

      const body = await parseBody(request)
      const validationError = validateImportPayload(body, data.categories)
      if (validationError) {
        sendJson(response, 400, { message: validationError })
        return
      }

      if (!body.sourceUrl?.trim()) {
        sendJson(response, 400, { message: 'Введите ссылку на книгу.' })
        return
      }

      const book = await createBookFromRemoteUrl(body, auth.user.id)
      data.books.unshift(normalizeBookRecord(book, auth.user.id, data.categories))
      await saveData(data)
      sendJson(response, 201, normalizeBook(data.books[0], data, auth.user.id))
      return
    }

    if (pathname === '/api/books/import-folder' && request.method === 'POST') {
      const data = await loadData()
      const auth = ensureTeacher(request, response, data)
      if (!auth) {
        return
      }

      const body = await parseBody(request)
      const validationError = validateImportPayload(body, data.categories)
      if (validationError) {
        sendJson(response, 400, { message: validationError })
        return
      }

      if (!body.folderPath?.trim()) {
        sendJson(response, 400, { message: 'Введите путь к папке.' })
        return
      }

      const created = await createBooksFromFolder(body, auth.user.id)
      data.books.unshift(...created.map((item) => normalizeBookRecord(item, auth.user.id, data.categories)))
      await saveData(data)

      sendJson(response, 201, {
        ok: true,
        createdCount: created.length,
        items: created.map((item) => normalizeBook(item, data, auth.user.id)),
      })
      return
    }

    if (segments[0] === 'api' && segments[1] === 'books' && segments[2] && !segments[3] && request.method === 'PUT') {
      const data = await loadData()
      const auth = ensureTeacher(request, response, data)
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
        sendJson(response, 404, { message: 'Книга не найдена.' })
        return
      }

      if (book.readerType === 'file') {
        sendJson(response, 400, { message: 'Файловые книги редактируются только через повторный импорт.' })
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
      const auth = ensureTeacher(request, response, data)
      if (!auth) {
        return
      }

      const body = await parseBody(request)
      const book = getBookById(data, segments[2])
      if (!book) {
        sendJson(response, 404, { message: 'Книга не найдена.' })
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
      const auth = ensureTeacher(request, response, data)
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
        sendJson(response, 404, { message: 'Книга не найдена.' })
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
