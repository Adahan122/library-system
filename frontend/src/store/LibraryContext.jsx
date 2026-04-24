import { useEffect, useState } from 'react'
import { message } from 'antd'
import { api } from '../utils/api.js'
import { LibraryContext } from './library-context.js'

const ADMIN_TOKEN_KEY = 'libhub_admin_token'

export const LibraryProvider = ({ children }) => {
  const [messageApi, contextHolder] = message.useMessage()
  const [profile, setProfile] = useState(null)
  const [categories, setCategories] = useState([])
  const [favoriteIds, setFavoriteIds] = useState([])
  const [stats, setStats] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminToken, setAdminToken] = useState('')
  const [isBootstrapping, setIsBootstrapping] = useState(true)

  const refreshShared = async (token = adminToken) => {
    const [profileData, categoriesData, favoritesData, statsData] = await Promise.all([
      api.getProfile(),
      api.getCategories(),
      api.getFavorites(),
      api.getStats(token || undefined),
    ])

    setProfile(profileData)
    setCategories(categoriesData)
    setFavoriteIds(favoritesData)
    setStats(statsData)
  }

  useEffect(() => {
    const bootstrap = async () => {
      const storedToken = window.localStorage.getItem(ADMIN_TOKEN_KEY)

      try {
        if (storedToken) {
          const session = await api.checkAdminSession(storedToken)
          if (session.isAdmin) {
            setAdminToken(storedToken)
            setIsAdmin(true)
            await refreshShared(storedToken)
            return
          }
        }

        window.localStorage.removeItem(ADMIN_TOKEN_KEY)
        await refreshShared('')
      } catch (error) {
        messageApi.error(error.message)
      } finally {
        setIsBootstrapping(false)
      }
    }

    bootstrap()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loginAdmin = async (password) => {
    const result = await api.loginAdmin(password)
    window.localStorage.setItem(ADMIN_TOKEN_KEY, result.token)
    setAdminToken(result.token)
    setIsAdmin(true)
    await refreshShared(result.token)
    messageApi.success('Вход в админ-панель выполнен.')
  }

  const logoutAdmin = async () => {
    window.localStorage.removeItem(ADMIN_TOKEN_KEY)
    setAdminToken('')
    setIsAdmin(false)
    await refreshShared('')
    messageApi.success('Режим администратора выключен.')
  }

  const loadBooks = (query = {}) => api.getBooks(query, adminToken || undefined)

  const toggleFavorite = async (book) => {
    if (book.isFavorite) {
      await api.removeFavorite(book.id)
      messageApi.success('Книга удалена из избранного.')
    } else {
      await api.addFavorite(book.id)
      messageApi.success('Книга добавлена в избранное.')
    }

    await refreshShared()
  }

  const trackView = async (bookId) => {
    await api.recordView(bookId)
    await refreshShared()
  }

  const saveBook = async (payload, editingBookId) => {
    if (editingBookId) {
      const result = await api.updateBook(editingBookId, payload, adminToken)
      await refreshShared()
      messageApi.success('Книга обновлена.')
      return result
    }

    const result = await api.createBook(payload, adminToken)
    await refreshShared()
    messageApi.success('Публикация добавлена.')
    return result
  }

  const deleteBook = async (bookId) => {
    await api.deleteBook(bookId, adminToken)
    await refreshShared()
    messageApi.success('Книга удалена.')
  }

  const togglePublish = async (book) => {
    await api.publishBook(book.id, !book.published, adminToken)
    await refreshShared()
    messageApi.success(book.published ? 'Книга переведена в черновик.' : 'Книга опубликована.')
  }

  const createCategory = async (name) => {
    const result = await api.createCategory({ name }, adminToken)
    await refreshShared()
    messageApi.success('Категория добавлена.')
    return result
  }

  const deleteCategory = async (categoryId) => {
    await api.deleteCategory(categoryId, adminToken)
    await refreshShared()
    messageApi.success('Категория удалена.')
  }

  const value = {
    profile,
    categories,
    favoriteIds,
    stats,
    isAdmin,
    adminToken,
    isBootstrapping,
    refreshShared,
    loginAdmin,
    logoutAdmin,
    loadBooks,
    toggleFavorite,
    trackView,
    saveBook,
    deleteBook,
    togglePublish,
    createCategory,
    deleteCategory,
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
