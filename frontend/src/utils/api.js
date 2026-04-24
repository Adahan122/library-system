const API_BASE = import.meta.env.VITE_API_URL || '/api'

const buildUrl = (path, query = {}) => {
  const url = new URL(path, window.location.origin)

  if (!path.startsWith('/api')) {
    url.pathname = `${API_BASE}${path}`
  }

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  })

  return url.toString()
}

const request = async (path, options = {}) => {
  let response

  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    })
  } catch {
    throw new Error('Backend недоступен. Запустите сервер в папке backend командой npm run dev.')
  }

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload.message || 'Ошибка запроса.')
  }

  return payload
}

export const api = {
  buildUrl,

  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  getSession: (token) => request('/auth/session', { token }),
  logout: (token) => request('/auth/logout', { method: 'POST', token }),
  getMe: (token) => request('/me', { token }),
  getStats: (token) => request('/stats', { token }),

  getCategories: (token) => request('/categories', { token }),
  createCategory: (body, token) => request('/categories', { method: 'POST', body, token }),
  deleteCategory: (categoryId, token) => request(`/categories/${categoryId}`, { method: 'DELETE', token }),

  getBooks: (query, token) => request('/books', { query, token }),
  getBook: (bookId, token) => request(`/books/${bookId}`, { token }),
  getBookFileUrl: (bookId) => buildUrl(`/books/${bookId}/file`),
  recordView: (bookId, token) => request(`/books/${bookId}/view`, { method: 'POST', token }),
  createBook: (body, token) => request('/books', { method: 'POST', body, token }),
  importBookByLink: (body, token) => request('/books/import-link', { method: 'POST', body, token }),
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
  createNote: (bookId, body, token) =>
    request(`/books/${bookId}/notes`, { method: 'POST', body, token }),
  deleteNote: (noteId, token) => request(`/notes/${noteId}`, { method: 'DELETE', token }),

  getFavorites: (token) => request('/favorites', { token }),
  addFavorite: (bookId, token) => request('/favorites', { method: 'POST', body: { bookId }, token }),
  removeFavorite: (bookId, token) => request(`/favorites/${bookId}`, { method: 'DELETE', token }),
}
