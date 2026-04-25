import { useEffect, useState } from 'react'
import { message } from 'antd'
import { api, normalizeUiMessage } from '../utils/api.js'
import { LibraryContext } from './library-context.js'

const SESSION_TOKEN_KEY = 'libhub_session_token'
const THEME_KEY = 'libhub_theme'
const STUDENT_GUIDE_KEY = 'libhub_show_student_guide'

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

  const notifySuccess = (content) =>
    messageApi.success(normalizeUiMessage(content, 'Готово.'))

  const notifyError = (content) =>
    messageApi.error(normalizeUiMessage(content))

  const markStudentGuide = (user) => {
    if (user?.role === 'student') {
      window.sessionStorage.setItem(STUDENT_GUIDE_KEY, '1')
    }
  }

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
        notifyError(error.message)
      } finally {
        setIsBootstrapping(false)
      }
    }

    void bootstrap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = async (email, password, role) => {
    const result = await api.login(email, password, role)
    window.localStorage.setItem(SESSION_TOKEN_KEY, result.token)
    setSessionToken(result.token)
    setCurrentUser(result.user)
    markStudentGuide(result.user)
    await refreshShared(result.token)
  }

  const loginDeveloper = async (password) => {
    const result = await api.developerLogin(password)
    window.localStorage.setItem(SESSION_TOKEN_KEY, result.token)
    setSessionToken(result.token)
    setCurrentUser(result.user)
    await refreshShared(result.token)
  }

  const register = async (payload) => {
    const result = await api.register(payload)
    window.localStorage.setItem(SESSION_TOKEN_KEY, result.token)
    setSessionToken(result.token)
    setCurrentUser(result.user)
    markStudentGuide(result.user)
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
  const loadUploadedBook = (bookId) => api.getUploadedBook(bookId)
  const uploadBook = async (payload) => {
    const result = await api.uploadBook(payload, sessionToken)
    await refreshShared()
    return result
  }
  const getBookFileUrl = (bookId) => api.getBookFileUrl(bookId)
  const trackView = (bookId) => api.recordView(bookId, sessionToken)

  const toggleFavorite = async (book) => {
    const isFavorite = favoriteIds.includes(book.id)

    if (isFavorite) {
      await api.removeFavorite(book.id, sessionToken)
      notifySuccess('Книга удалена из сохранённых.')
    } else {
      await api.addFavorite(book.id, sessionToken)
      notifySuccess('Книга сохранена.')
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

  const loadComments = (bookId) => api.getComments(bookId, sessionToken)
  const createComment = async (bookId, payload) => {
    const result = await api.createComment(bookId, payload, sessionToken)
    await refreshShared()
    return result
  }
  const toggleCommentLike = async (commentId) => {
    const result = await api.toggleCommentLike(commentId, sessionToken)
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

  const loadAdminUsers = () => api.getAdminUsers(sessionToken)

  const updateAdminUserRole = async (userId, role) => {
    const result = await api.updateAdminUserRole(userId, role, sessionToken)
    await refreshShared()
    return result
  }

  const deleteAdminUser = async (userId) => {
    await api.deleteAdminUser(userId, sessionToken)
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
    loginDeveloper,
    register,
    logout,
    loadBooks,
    loadBook,
    loadUploadedBook,
    uploadBook,
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
    loadComments,
    createComment,
    toggleCommentLike,
    importBooksFromFolder,
    deleteBook,
    togglePublish,
    createCategory,
    deleteCategory,
    loadAdminUsers,
    updateAdminUserRole,
    deleteAdminUser,
    switchTheme,
    notifySuccess,
    notifyError,
  }

  return (
    <LibraryContext.Provider value={value}>
      {contextHolder}
      {children}
    </LibraryContext.Provider>
  )
}
