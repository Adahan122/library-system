const API_BASE = import.meta.env.VITE_API_URL || '/api'
const DJANGO_API_BASE = import.meta.env.VITE_DJANGO_API_URL || '/django-api'

const NODE_BACKEND_ERROR =
  'Node backend недоступен. Запустите сервер в папке backend командой npm run dev.'
const DJANGO_BACKEND_ERROR =
  'Сервис PDF/EPUB недоступен. Запустите Django сервер в папке backend командой python manage.py runserver 8000.'

const MESSAGE_MAP = new Map([
  ['Choose teacher or student role.', 'Выберите роль: преподаватель или студент.'],
  ['User not found.', 'Пользователь не найден.'],
  ['Р вЂ™Р Р†Р ВµР Т‘Р С‘РЎвЂљР Вµ Р С‘Р СРЎРЏ.', 'Введите имя.'],
  ['Р вЂ™Р Р†Р ВµР Т‘Р С‘РЎвЂљР Вµ РЎвЂћР В°Р СР С‘Р В»Р С‘РЎР‹.', 'Введите фамилию.'],
  ['Р вЂ™Р Р†Р ВµР Т‘Р С‘РЎвЂљР Вµ email.', 'Введите email.'],
  [
    'Р СџР В°РЎР‚Р С•Р В»РЎРЉ Р Т‘Р С•Р В»Р В¶Р ВµР Р… РЎРѓР С•Р Т‘Р ВµРЎР‚Р В¶Р В°РЎвЂљРЎРЉ Р СР С‘Р Р…Р С‘Р СРЎС“Р С 6 РЎРѓР С‘Р СР Р†Р С•Р В»Р С•Р Р†.',
    'Пароль должен содержать минимум 6 символов.',
  ],
  [
    'Р СџР С•Р В»РЎРЉР В·Р С•Р Р†Р В°РЎвЂљР ВµР В»РЎРЉ РЎРѓ РЎвЂљР В°Р С”Р С‘Р С email РЎС“Р В¶Р Вµ РЎРѓРЎС“РЎвЂ°Р ВµРЎРѓРЎвЂљР Р†РЎС“Р ВµРЎвЂљ.',
    'Пользователь с таким email уже существует.',
  ],
  ['Р вЂ™Р Р†Р ВµР Т‘Р С‘РЎвЂљР Вµ Р Р…Р В°Р В·Р Р†Р В°Р Р…Р С‘Р Вµ Р С”Р В°РЎвЂљР ВµР С–Р С•РЎР‚Р С‘Р С‘.', 'Введите название категории.'],
  [
    'Р СњР ВµР В»РЎРЉР В·РЎРЏ РЎС“Р Т‘Р В°Р В»Р С‘РЎвЂљРЎРЉ Р С”Р В°РЎвЂљР ВµР С–Р С•РЎР‚Р С‘РЎР‹, Р С—Р С•Р С”Р В° Р Р† Р Р…Р ВµР в„– Р ВµРЎРѓРЎвЂљРЎРЉ Р С”Р Р…Р С‘Р С–Р С‘.',
    'Нельзя удалить категорию, пока в ней есть книги.',
  ],
  ['Р С™Р В°РЎвЂљР ВµР С–Р С•РЎР‚Р С‘РЎРЏ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…Р В°.', 'Категория не найдена.'],
  ['Р вЂ™Р Р†Р ВµР Т‘Р С‘РЎвЂљР Вµ Р Р…Р В°Р В·Р Р†Р В°Р Р…Р С‘Р Вµ Р С”Р Р…Р С‘Р С–Р С‘.', 'Введите название книги.'],
  ['Р вЂ™Р Р†Р ВµР Т‘Р С‘РЎвЂљР Вµ Р В°Р Р†РЎвЂљР С•РЎР‚Р В°.', 'Введите автора.'],
  ['Р вЂ™РЎвЂ№Р В±Р ВµРЎР‚Р С‘РЎвЂљР Вµ Р С”Р В°РЎвЂљР ВµР С–Р С•РЎР‚Р С‘РЎР‹.', 'Выберите категорию.'],
  ['Р вЂќР С•Р В±Р В°Р Р†РЎРЉРЎвЂљР Вµ РЎвЂљР ВµР С”РЎРѓРЎвЂљ Р С”Р Р…Р С‘Р С–Р С‘.', 'Добавьте текст книги.'],
  ['Р В¤Р В°Р в„–Р В» Р С”Р Р…Р С‘Р С–Р С‘ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р….', 'Файл книги не найден.'],
  ['Р СџР С•Р Т‘Р Т‘Р ВµРЎР‚Р В¶Р С‘Р Р†Р В°РЎР‹РЎвЂљРЎРѓРЎРЏ РЎвЂљР С•Р В»РЎРЉР С”Р С• PDF Р С‘ EPUB.', 'Поддерживаются только PDF и EPUB.'],
  ['Р С™Р Р…Р С‘Р С–Р В° Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р…Р В°.', 'Книга не найдена.'],
  ['РљРЅРёРіР° РЅРµ РЅР°Р№РґРµРЅР°.', 'Книга не найдена.'],
  ['Р’РІРµРґРёС‚Рµ С‚РµРєСЃС‚ РєРѕРјРјРµРЅС‚Р°СЂРёСЏ.', 'Введите текст комментария.'],
  ['РљРѕРјРјРµРЅС‚Р°СЂРёР№ СЃРѕРґРµСЂР¶РёС‚ РЅРµРґРѕРїСѓСЃС‚РёРјС‹Рµ СЃР»РѕРІР°.', 'Комментарий содержит недопустимые слова.'],
  ['РљРѕРјРјРµРЅС‚Р°СЂРёР№ РґР»СЏ РѕС‚РІРµС‚Р° РЅРµ РЅР°Р№РґРµРЅ.', 'Комментарий для ответа не найден.'],
  ['РљРѕРјРјРµРЅС‚Р°СЂРёР№ РЅРµ РЅР°Р№РґРµРЅ.', 'Комментарий не найден.'],
  ['РќРµР»СЊР·СЏ Р»Р°Р№РєР°С‚СЊ СЃРІРѕР№ РєРѕРјРјРµРЅС‚Р°СЂРёР№.', 'Нельзя лайкать свой комментарий.'],
  ['Р СљР В°РЎР‚РЎв‚¬РЎР‚РЎС“РЎвЂљ Р Р…Р Вµ Р Р…Р В°Р в„–Р Т‘Р ВµР Р….', 'Маршрут не найден.'],
  ['Р СњР ВµР Р†Р ВµРЎР‚Р Р…РЎвЂ№Р в„– РЎвЂћР С•РЎР‚Р СР В°РЎвЂљ JSON.', 'Неверный формат JSON.'],
  ['Р вЂ™Р Р…РЎС“РЎвЂљРЎР‚Р ВµР Р…Р Р…РЎРЏРЎРЏ Р С•РЎв‚¬Р С‘Р В±Р С”Р В° РЎРѓР ВµРЎР‚Р Р†Р ВµРЎР‚Р В°.', 'Внутренняя ошибка сервера.'],
])

export const normalizeUiMessage = (message, fallback = 'Ошибка запроса.') => {
  const normalized = typeof message === 'string' && message.trim() ? message.trim() : fallback
  return MESSAGE_MAP.get(normalized) || normalized
}

const buildBaseUrl = (basePath, path, query = {}) => {
  const url = new URL(path, window.location.origin)

  if (!path.startsWith('/api') && !path.startsWith('/django-api')) {
    url.pathname = `${basePath}${path}`
  }

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  })

  return url.toString()
}

const buildUrl = (path, query = {}) => buildBaseUrl(API_BASE, path, query)
const buildDjangoUrl = (path, query = {}) => buildBaseUrl(DJANGO_API_BASE, path, query)

const extractErrorMessage = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return normalizeUiMessage('')
  }

  if (typeof payload.message === 'string' && payload.message.trim()) {
    return normalizeUiMessage(payload.message)
  }

  if (typeof payload.detail === 'string' && payload.detail.trim()) {
    return normalizeUiMessage(payload.detail)
  }

  const fieldError = Object.values(payload).find((value) => {
    if (typeof value === 'string' && value.trim()) {
      return true
    }

    return Array.isArray(value) && value.length && typeof value[0] === 'string'
  })

  if (typeof fieldError === 'string') {
    return normalizeUiMessage(fieldError)
  }

  if (Array.isArray(fieldError) && fieldError.length) {
    return normalizeUiMessage(fieldError[0])
  }

  return normalizeUiMessage('')
}

const request = async (path, options = {}) => {
  let response

  try {
    const base = options.base || API_BASE
    const buildRequestUrl = base === DJANGO_API_BASE ? buildDjangoUrl : buildUrl

    response = await fetch(buildRequestUrl(path, options.query), {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    })
  } catch {
    throw new Error(normalizeUiMessage(options.networkErrorMessage || NODE_BACKEND_ERROR))
  }

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(extractErrorMessage(payload))
  }

  return payload
}

const uploadFormData = async (path, formData, token, options = {}) => {
  let response

  try {
    const base = options.base || API_BASE
    const buildRequestUrl = base === DJANGO_API_BASE ? buildDjangoUrl : buildUrl

    response = await fetch(buildRequestUrl(path), {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    })
  } catch {
    throw new Error(normalizeUiMessage(options.networkErrorMessage || NODE_BACKEND_ERROR))
  }

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(extractErrorMessage(payload))
  }

  return payload
}

export const isNodeFileBook = (book) =>
  Boolean(book && (book.readerType === 'file' || book.file_url || book.fileUrl))

export const openNodeBookFileInNewTab = async (bookId, token) => {
  let response
  try {
    response = await fetch(buildUrl(`/books/${bookId}/file`), {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
  } catch {
    throw new Error(normalizeUiMessage(NODE_BACKEND_ERROR))
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(extractErrorMessage(payload))
  }

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const win = window.open(objectUrl, '_blank', 'noopener,noreferrer')
  if (!win) {
    URL.revokeObjectURL(objectUrl)
    throw new Error('Разрешите всплывающие окна для этого сайта.')
  }
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 120000)
}

export const api = {
  buildUrl,
  buildDjangoUrl,

  developerLogin: (password) => request('/dev-auth/login', { method: 'POST', body: { password } }),
  login: (email, password, role) =>
    request('/auth/login', { method: 'POST', body: { email, password, role } }),
  register: (body) => request('/auth/register', { method: 'POST', body }),
  getSession: (token) => request('/auth/session', { token }),
  logout: (token) => request('/auth/logout', { method: 'POST', token }),
  getMe: (token) => request('/me', { token }),
  getStats: (token) => request('/stats', { token }),
  getAdminUsers: (token) => request('/dev/users', { token }),
  updateAdminUserRole: (userId, role, token) =>
    request(`/dev/users/${userId}/role`, { method: 'PATCH', body: { role }, token }),
  deleteAdminUser: (userId, token) => request(`/dev/users/${userId}`, { method: 'DELETE', token }),

  getCategories: (token) => request('/categories', { token }),
  createCategory: (body, token) => request('/categories', { method: 'POST', body, token }),
  deleteCategory: (categoryId, token) => request(`/categories/${categoryId}`, { method: 'DELETE', token }),

  getBooks: (query, token) => request('/books', { query, token }),
  getBook: (bookId, token) => request(`/books/${bookId}`, { token }),
  createBook: (body, token) => request('/books', { method: 'POST', body, token }),
  getUploadedBook: (bookId) =>
    request(`/books/${bookId}/`, {
      base: DJANGO_API_BASE,
      networkErrorMessage: DJANGO_BACKEND_ERROR,
    }),
  uploadBook: async (payload, token) => {
    const formData = new FormData()
    formData.append('file', payload.file)
    if (payload.title?.trim()) {
      formData.append('title', payload.title.trim())
    }
    if (payload.author?.trim()) {
      formData.append('author', payload.author.trim())
    }

    const uploadResponse = await uploadFormData('/books/upload/', formData, token, {
      base: DJANGO_API_BASE,
      networkErrorMessage: DJANGO_BACKEND_ERROR,
    })

    const uploadedBook = uploadResponse?.book || {}
    const sourceUrl = uploadedBook.file_url || uploadedBook.external_url || ''
    const format = String(payload.file?.name || sourceUrl).toLowerCase().endsWith('.epub') ? 'epub' : 'pdf'

    return request('/books', {
      method: 'POST',
      token,
      body: {
        title: payload.title?.trim() || uploadedBook.title || 'Без названия',
        author: payload.author?.trim() || uploadedBook.author || '',
        description: payload.description?.trim() || '',
        categoryId: payload.categoryId,
        theme: payload.theme?.trim() || '',
        published: Boolean(payload.published),
        estimatedMinutes: payload.estimatedMinutes,
        coverTone: payload.coverTone?.trim() || '#4F46E5',
        coverImage: payload.coverImage || '',
        publishDate: payload.publishDate || '',
        publishYear: payload.publishDate ? Number(payload.publishDate.slice(0, 4)) : undefined,
        format,
        sourceKind: 'uploaded-file',
        sourceLabel: 'Загруженный файл',
        sourceUrl,
      },
    })
  },
  getBookFileUrl: (bookId) => buildUrl(`/books/${bookId}/file`),
  recordView: (bookId, token) => request(`/books/${bookId}/view`, { method: 'POST', token }),
  importBooksFromFolder: (body, token) =>
    request('/books/import-folder', { method: 'POST', body, token }),
  updateBook: (bookId, body, token) => request(`/books/${bookId}`, { method: 'PUT', body, token }),
  deleteBook: (bookId, token) => request(`/books/${bookId}`, { method: 'DELETE', token }),
  publishBook: (bookId, published, token) =>
    request(`/books/${bookId}/publish`, { method: 'PATCH', body: { published }, token }),

  getBookProgress: (bookId, token) => request(`/books/${bookId}/progress`, { token }),
  saveBookProgress: (bookId, body, token) =>
    request(`/books/${bookId}/progress`, { method: 'PUT', body, token }),

  getBookmarks: (bookId, token) => request(`/books/${bookId}/bookmarks`, { token }),
  createBookmark: (bookId, body, token) =>
    request(`/books/${bookId}/bookmarks`, { method: 'POST', body, token }),
  deleteBookmark: (bookmarkId, token) =>
    request(`/bookmarks/${bookmarkId}`, { method: 'DELETE', token }),

  getNotes: (bookId, token) => request(`/books/${bookId}/notes`, { token }),
  createNote: (bookId, body, token) => request(`/books/${bookId}/notes`, { method: 'POST', body, token }),
  deleteNote: (noteId, token) => request(`/notes/${noteId}`, { method: 'DELETE', token }),

  getComments: (bookId, token) => request(`/books/${bookId}/comments`, { token }),
  createComment: (bookId, body, token) =>
    request(`/books/${bookId}/comments`, { method: 'POST', body, token }),
  toggleCommentLike: (commentId, token) =>
    request(`/comments/${commentId}/like`, { method: 'POST', token }),

  getFavorites: (token) => request('/favorites', { token }),
  addFavorite: (bookId, token) => request('/favorites', { method: 'POST', body: { bookId }, token }),
  removeFavorite: (bookId, token) => request(`/favorites/${bookId}`, { method: 'DELETE', token }),
}
