import { useEffect, useState } from 'react'
import { message } from 'antd'
import { api } from '../utils/api.js'
import { LibraryContext } from './library-context.js'

const SESSION_TOKEN_KEY = 'libhub_session_token'
const THEME_KEY = 'libhub_theme'

export const LibraryProvider = ({ children }) => {
  const [messageApi, contextHolder] = message.useMessage()
  const [sessionToken, setSessionToken] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const [categories, setCategories] = useState([])
  const [favoriteIds, setFavoriteIds] = useState([])
  const [stats, setStats] = useState(null)
  const [uiTheme, setUiTheme] = useState(() => {
    if (typeof window === 'undefined') {
      return 'light'
    }

    const savedTheme = window.localStorage.getItem(THEME_KEY)
    return savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : 'light'
  })
  const [isBootstrapping, setIsBootstrapping] = useState(true)

  const resetSession = () => {
    setSessionToken('')
    setCurrentUser(null)
    setCategories([])
    setFavoriteIds([])
    setStats(null)
    window.localStorage.removeItem(SESSION_TOKEN_KEY)
  }

  const refreshShared = async (token = sessionToken) => {
    if (!token) {
      resetSession()
      return
    }

    const [profileData, categoriesData, favoritesData, statsData] = await Promise.all([
      api.getMe(token),
      api.getCategories(token),
      api.getFavorites(token),
      api.getStats(token),
    ])

    setCurrentUser(profileData)
    setCategories(categoriesData)
    setFavoriteIds(favoritesData)
    setStats(statsData)
  }

  useEffect(() => {
    document.body.dataset.theme = uiTheme
    window.localStorage.setItem(THEME_KEY, uiTheme)
  }, [uiTheme])

  useEffect(() => {
    const bootstrap = async () => {
      const storedToken = window.localStorage.getItem(SESSION_TOKEN_KEY)

      if (!storedToken) {
        setIsBootstrapping(false)
        return
      }

      try {
        const session = await api.getSession(storedToken)
        if (session.authenticated && session.user) {
          setSessionToken(storedToken)
          setCurrentUser(session.user)
          await refreshShared(storedToken)
        } else {
          resetSession()
        }
      } catch (error) {
        resetSession()
        messageApi.error(error.message)
      } finally {
        setIsBootstrapping(false)
      }
    }

    void bootstrap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = async (email, password) => {
    const result = await api.login(email, password)
    window.localStorage.setItem(SESSION_TOKEN_KEY, result.token)
    setSessionToken(result.token)
    setCurrentUser(result.user)
    await refreshShared(result.token)
  }

  const logout = async () => {
    const token = sessionToken
    resetSession()

    try {
      if (token) {
        await api.logout(token)
      }
    } catch {
      // noop for local development
    }
  }

  const loadBooks = (query = {}) => api.getBooks(query, sessionToken)
  const loadBook = (bookId) => api.getBook(bookId, sessionToken)
  const getBookFileUrl = (bookId) => api.getBookFileUrl(bookId)
  const trackView = (bookId) => api.recordView(bookId, sessionToken)

  const toggleFavorite = async (book) => {
    if (book.isFavorite) {
      await api.removeFavorite(book.id, sessionToken)
    } else {
      await api.addFavorite(book.id, sessionToken)
    }

    await refreshShared()
  }

  const loadProgress = (bookId) => api.getBookProgress(bookId, sessionToken)

  const saveProgress = async (bookId, payload) => {
    await api.saveBookProgress(bookId, payload, sessionToken)
  }

  const loadBookmarks = (bookId) => api.getBookmarks(bookId, sessionToken)
  const createBookmark = async (bookId, payload) => {
    const result = await api.createBookmark(bookId, payload, sessionToken)
    await refreshShared()
    return result
  }

  const deleteBookmark = async (bookmarkId) => {
    await api.deleteBookmark(bookmarkId, sessionToken)
    await refreshShared()
  }

  const loadNotes = (bookId) => api.getNotes(bookId, sessionToken)
  const createNote = async (bookId, payload) => {
    const result = await api.createNote(bookId, payload, sessionToken)
    await refreshShared()
    return result
  }

  const deleteNote = async (noteId) => {
    await api.deleteNote(noteId, sessionToken)
    await refreshShared()
  }

  const saveBook = async (payload, editingBookId) => {
    if (editingBookId) {
      const result = await api.updateBook(editingBookId, payload, sessionToken)
      await refreshShared()
      return result
    }

    const result = await api.createBook(payload, sessionToken)
    await refreshShared()
    return result
  }

  const importBookByLink = async (payload) => {
    const result = await api.importBookByLink(payload, sessionToken)
    await refreshShared()
    return result
  }

  const importBooksFromFolder = async (payload) => {
    const result = await api.importBooksFromFolder(payload, sessionToken)
    await refreshShared()
    return result
  }

  const deleteBook = async (bookId) => {
    await api.deleteBook(bookId, sessionToken)
    await refreshShared()
  }

  const togglePublish = async (book) => {
    await api.publishBook(book.id, !book.published, sessionToken)
    await refreshShared()
  }

  const createCategory = async (name) => {
    const result = await api.createCategory({ name }, sessionToken)
    await refreshShared()
    return result
  }

  const deleteCategory = async (categoryId) => {
    await api.deleteCategory(categoryId, sessionToken)
    await refreshShared()
  }

  const switchTheme = (nextTheme) => {
    setUiTheme(nextTheme)
  }

  const value = {
    sessionToken,
    currentUser,
    categories,
    favoriteIds,
    stats,
    uiTheme,
    isBootstrapping,
    refreshShared,
    login,
    logout,
    loadBooks,
    loadBook,
    getBookFileUrl,
    trackView,
    toggleFavorite,
    loadProgress,
    saveProgress,
    loadBookmarks,
    createBookmark,
    deleteBookmark,
    loadNotes,
    createNote,
    deleteNote,
    saveBook,
    importBookByLink,
    importBooksFromFolder,
    deleteBook,
    togglePublish,
    createCategory,
    deleteCategory,
    switchTheme,
    notifySuccess: messageApi.success,
    notifyError: messageApi.error,
  }

  return (
    <LibraryContext.Provider value={value}>
      {contextHolder}
      {children}
    </LibraryContext.Provider>
  )
}
