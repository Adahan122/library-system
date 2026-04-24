import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { URL } from 'node:url'

const PORT = Number(process.env.PORT || 4000)
const HOST = process.env.HOST || '0.0.0.0'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'
const DATA_PATH = new URL('./data.json', import.meta.url)

const sessions = new Map()

const defaultData = {
  profile: {
    id: 'reader-1',
    name: 'Айдана',
    email: 'reader@mail.com',
    role: 'reader',
  },
  categories: [],
  books: [],
  favorites: [],
  views: [],
}

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
}

const send = (response, statusCode, payload) => {
  response.writeHead(statusCode, headers)
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

const loadData = async () => {
  if (!existsSync(DATA_PATH)) {
    await writeFile(DATA_PATH, JSON.stringify(defaultData, null, 2))
    return structuredClone(defaultData)
  }

  const raw = await readFile(DATA_PATH, 'utf-8')
  return JSON.parse(raw)
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

const isAdmin = (request) => {
  const token = getToken(request)
  return token ? sessions.has(token) : false
}

const getCategoryMap = (categories) =>
  Object.fromEntries(categories.map((category) => [category.id, category.name]))

const normalizeBook = (book, categories, favorites) => ({
  ...book,
  categoryName: getCategoryMap(categories)[book.categoryId] ?? 'Без категории',
  isFavorite: favorites.some((favorite) => favorite.bookId === book.id),
})

const validateBook = (body, categories) => {
  if (!body.title?.trim()) {
    return 'Введите название книги.'
  }

  if (!body.author?.trim()) {
    return 'Введите автора.'
  }

  if (!body.categoryId) {
    return 'Выберите категорию.'
  }

  const categoryExists = categories.some((category) => category.id === body.categoryId)
  if (!categoryExists) {
    return 'Категория не найдена.'
  }

  return null
}

const getStats = (data, request) => {
  const profileId = data.profile.id
  const userFavorites = data.favorites.filter((favorite) => favorite.userId === profileId)
  const userViews = data.views.filter((view) => view.userId === profileId)
  const publishedBooks = data.books.filter((book) => book.published)
  const categoryMap = getCategoryMap(data.categories)

  const recentViewed = [...userViews]
    .sort((left, right) => new Date(right.viewedAt) - new Date(left.viewedAt))
    .slice(0, 5)
    .map((view) => {
      const book = data.books.find((item) => item.id === view.bookId)
      if (!book) {
        return null
      }

      return {
        id: book.id,
        title: book.title,
        author: book.author,
        categoryName: categoryMap[book.categoryId] ?? 'Без категории',
        viewedAt: view.viewedAt,
      }
    })
    .filter(Boolean)

  return {
    profile: data.profile,
    userStats: {
      totalAvailableBooks: publishedBooks.length,
      favoriteCount: userFavorites.length,
      viewedCount: userViews.length,
      recentViewed,
    },
    adminStats: isAdmin(request)
      ? {
          totalBooks: data.books.length,
          publishedCount: data.books.filter((book) => book.published).length,
          draftCount: data.books.filter((book) => !book.published).length,
          categoryCount: data.categories.length,
        }
      : null,
  }
}

createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, headers)
    response.end()
    return
  }

  const url = new URL(request.url, `http://${request.headers.host}`)
  const pathname = url.pathname

  try {
    if (pathname === '/api/health' && request.method === 'GET') {
      send(response, 200, { ok: true })
      return
    }

    if (pathname === '/api/admin/login' && request.method === 'POST') {
      const body = await parseBody(request)

      if (body.password !== ADMIN_PASSWORD) {
        send(response, 401, { message: 'Неверный пароль администратора.' })
        return
      }

      const token = randomUUID()
      sessions.set(token, { role: 'admin', createdAt: Date.now() })
      send(response, 200, { token, role: 'admin' })
      return
    }

    if (pathname === '/api/admin/session' && request.method === 'GET') {
      send(response, 200, { isAdmin: isAdmin(request) })
      return
    }

    if (pathname === '/api/profile' && request.method === 'GET') {
      const data = await loadData()
      send(response, 200, data.profile)
      return
    }

    if (pathname === '/api/stats' && request.method === 'GET') {
      const data = await loadData()
      send(response, 200, getStats(data, request))
      return
    }

    if (pathname === '/api/categories' && request.method === 'GET') {
      const data = await loadData()
      send(response, 200, data.categories)
      return
    }

    if (pathname === '/api/categories' && request.method === 'POST') {
      if (!isAdmin(request)) {
        send(response, 403, { message: 'Только администратор может добавлять категории.' })
        return
      }

      const data = await loadData()
      const body = await parseBody(request)

      if (!body.name?.trim()) {
        send(response, 400, { message: 'Введите название категории.' })
        return
      }

      const category = {
        id: `cat-${randomUUID()}`,
        name: body.name.trim(),
      }

      data.categories.unshift(category)
      await saveData(data)
      send(response, 201, category)
      return
    }

    if (pathname.startsWith('/api/categories/') && request.method === 'DELETE') {
      if (!isAdmin(request)) {
        send(response, 403, { message: 'Только администратор может удалять категории.' })
        return
      }

      const categoryId = pathname.split('/').pop()
      const data = await loadData()
      const hasBooks = data.books.some((book) => book.categoryId === categoryId)

      if (hasBooks) {
        send(response, 400, { message: 'Нельзя удалить категорию, пока в ней есть книги.' })
        return
      }

      data.categories = data.categories.filter((category) => category.id !== categoryId)
      await saveData(data)
      send(response, 200, { ok: true })
      return
    }

    if (pathname === '/api/books' && request.method === 'GET') {
      const data = await loadData()
      const favorites = data.favorites.filter((favorite) => favorite.userId === data.profile.id)
      const adminView = isAdmin(request)
      const search = url.searchParams.get('search')?.trim().toLowerCase()
      const categoryId = url.searchParams.get('categoryId')
      const favoritesOnly = url.searchParams.get('favorites') === 'true'

      let books = data.books.filter((book) => adminView || book.published)

      if (categoryId && categoryId !== 'all') {
        books = books.filter((book) => book.categoryId === categoryId)
      }

      if (search) {
        books = books.filter((book) => {
          const haystack = `${book.title} ${book.author} ${book.theme} ${book.description}`.toLowerCase()
          return haystack.includes(search)
        })
      }

      let result = books.map((book) => normalizeBook(book, data.categories, favorites))

      if (favoritesOnly) {
        result = result.filter((book) => book.isFavorite)
      }

      send(response, 200, result)
      return
    }

    if (pathname.startsWith('/api/books/') && pathname.endsWith('/view') && request.method === 'POST') {
      const bookId = pathname.split('/').at(-2)
      const data = await loadData()
      const book = data.books.find((item) => item.id === bookId && item.published)

      if (!book) {
        send(response, 404, { message: 'Книга не найдена.' })
        return
      }

      data.views.unshift({
        id: `view-${randomUUID()}`,
        userId: data.profile.id,
        bookId,
        viewedAt: new Date().toISOString(),
      })

      await saveData(data)
      send(response, 201, { ok: true })
      return
    }

    if (pathname === '/api/books' && request.method === 'POST') {
      if (!isAdmin(request)) {
        send(response, 403, { message: 'Только администратор может добавлять книги.' })
        return
      }

      const data = await loadData()
      const body = await parseBody(request)
      const validationError = validateBook(body, data.categories)

      if (validationError) {
        send(response, 400, { message: validationError })
        return
      }

      const now = new Date().toISOString()
      const book = {
        id: `book-${randomUUID()}`,
        title: body.title.trim(),
        author: body.author.trim(),
        description: body.description?.trim() ?? '',
        categoryId: body.categoryId,
        theme: body.theme?.trim() ?? '',
        published: Boolean(body.published),
        createdAt: now,
        updatedAt: now,
        createdBy: 'admin',
      }

      data.books.unshift(book)
      await saveData(data)
      send(response, 201, normalizeBook(book, data.categories, data.favorites))
      return
    }

    if (pathname.startsWith('/api/books/') && request.method === 'PUT') {
      if (!isAdmin(request)) {
        send(response, 403, { message: 'Только администратор может редактировать книги.' })
        return
      }

      const bookId = pathname.split('/').pop()
      const data = await loadData()
      const body = await parseBody(request)
      const validationError = validateBook(body, data.categories)

      if (validationError) {
        send(response, 400, { message: validationError })
        return
      }

      const index = data.books.findIndex((book) => book.id === bookId)
      if (index === -1) {
        send(response, 404, { message: 'Книга не найдена.' })
        return
      }

      data.books[index] = {
        ...data.books[index],
        title: body.title.trim(),
        author: body.author.trim(),
        description: body.description?.trim() ?? '',
        categoryId: body.categoryId,
        theme: body.theme?.trim() ?? '',
        published: Boolean(body.published),
        updatedAt: new Date().toISOString(),
      }

      await saveData(data)
      send(response, 200, normalizeBook(data.books[index], data.categories, data.favorites))
      return
    }

    if (pathname.startsWith('/api/books/') && pathname.endsWith('/publish') && request.method === 'PATCH') {
      if (!isAdmin(request)) {
        send(response, 403, { message: 'Только администратор может менять статус публикации.' })
        return
      }

      const bookId = pathname.split('/').at(-2)
      const data = await loadData()
      const body = await parseBody(request)
      const book = data.books.find((item) => item.id === bookId)

      if (!book) {
        send(response, 404, { message: 'Книга не найдена.' })
        return
      }

      book.published = Boolean(body.published)
      book.updatedAt = new Date().toISOString()
      await saveData(data)
      send(response, 200, normalizeBook(book, data.categories, data.favorites))
      return
    }

    if (pathname.startsWith('/api/books/') && request.method === 'DELETE') {
      if (!isAdmin(request)) {
        send(response, 403, { message: 'Только администратор может удалять книги.' })
        return
      }

      const bookId = pathname.split('/').pop()
      const data = await loadData()
      data.books = data.books.filter((book) => book.id !== bookId)
      data.favorites = data.favorites.filter((favorite) => favorite.bookId !== bookId)
      data.views = data.views.filter((view) => view.bookId !== bookId)
      await saveData(data)
      send(response, 200, { ok: true })
      return
    }

    if (pathname === '/api/favorites' && request.method === 'GET') {
      const data = await loadData()
      const favoriteIds = data.favorites
        .filter((favorite) => favorite.userId === data.profile.id)
        .map((favorite) => favorite.bookId)
      send(response, 200, favoriteIds)
      return
    }

    if (pathname === '/api/favorites' && request.method === 'POST') {
      const data = await loadData()
      const body = await parseBody(request)
      const book = data.books.find((item) => item.id === body.bookId && item.published)

      if (!book) {
        send(response, 404, { message: 'Книга не найдена или не опубликована.' })
        return
      }

      const exists = data.favorites.some(
        (favorite) => favorite.userId === data.profile.id && favorite.bookId === body.bookId,
      )

      if (!exists) {
        data.favorites.push({
          id: `fav-${randomUUID()}`,
          userId: data.profile.id,
          bookId: body.bookId,
        })
        await saveData(data)
      }

      send(response, 201, { ok: true })
      return
    }

    if (pathname.startsWith('/api/favorites/') && request.method === 'DELETE') {
      const bookId = pathname.split('/').pop()
      const data = await loadData()
      data.favorites = data.favorites.filter(
        (favorite) => !(favorite.userId === data.profile.id && favorite.bookId === bookId),
      )
      await saveData(data)
      send(response, 200, { ok: true })
      return
    }

    send(response, 404, { message: 'Маршрут не найден.' })
  } catch (error) {
    const message = error instanceof SyntaxError ? 'Неверный формат JSON.' : 'Внутренняя ошибка сервера.'
    send(response, 500, { message })
  }
}).listen(PORT, HOST, () => {
  console.log(`LibHub backend running on http://${HOST}:${PORT}`)
})
