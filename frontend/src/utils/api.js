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
  getProfile: () => request('/profile'),
  getStats: (token) => request('/stats', { token }),
  getCategories: () => request('/categories'),
  createCategory: (body, token) => request('/categories', { method: 'POST', body, token }),
  deleteCategory: (categoryId, token) =>
    request(`/categories/${categoryId}`, { method: 'DELETE', token }),
  getBooks: (query, token) => request('/books', { query, token }),
  recordView: (bookId) => request(`/books/${bookId}/view`, { method: 'POST' }),
  createBook: (body, token) => request('/books', { method: 'POST', body, token }),
  updateBook: (bookId, body, token) => request(`/books/${bookId}`, { method: 'PUT', body, token }),
  deleteBook: (bookId, token) => request(`/books/${bookId}`, { method: 'DELETE', token }),
  publishBook: (bookId, published, token) =>
    request(`/books/${bookId}/publish`, { method: 'PATCH', body: { published }, token }),
  getFavorites: () => request('/favorites'),
  addFavorite: (bookId) => request('/favorites', { method: 'POST', body: { bookId } }),
  removeFavorite: (bookId) => request(`/favorites/${bookId}`, { method: 'DELETE' }),
  loginAdmin: (password) => request('/admin/login', { method: 'POST', body: { password } }),
  checkAdminSession: (token) => request('/admin/session', { token }),
}
