import { Card, Input, Segmented, Space, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import BookList from '../components/BookList.jsx'
import { useLibrary } from '../hooks/useLibrary.js'

const sortOptions = [
  { label: 'Новые', value: 'new' },
  { label: 'Популярные', value: 'popular' },
  { label: 'По названию', value: 'title' },
]

const LibraryPage = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { categories, currentUser, favoriteIds, loadBooks, toggleFavorite, notifyError, openBook } =
    useLibrary()

  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [categoryId, setCategoryId] = useState(searchParams.get('categoryId') || 'all')
  const [sort, setSort] = useState(searchParams.get('sort') || 'new')

  const fetchBooks = async (next = {}) => {
    setLoading(true)

    const nextSearch = next.search ?? search
    const nextCategoryId = next.categoryId ?? categoryId
    const nextSort = next.sort ?? sort

    try {
      const data = await loadBooks({
        search: nextSearch || undefined,
        categoryId: nextCategoryId !== 'all' ? nextCategoryId : undefined,
        sort: nextSort,
      })
      setBooks(data)
      setSearchParams(
        {
          ...(nextSearch ? { search: nextSearch } : {}),
          ...(nextCategoryId !== 'all' ? { categoryId: nextCategoryId } : {}),
          ...(nextSort !== 'new' ? { sort: nextSort } : {}),
        },
        { replace: true },
      )
    } catch (error) {
      notifyError(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let disposed = false

    const bootstrap = async () => {
      try {
        const data = await loadBooks({
          search: search || undefined,
          categoryId: categoryId !== 'all' ? categoryId : undefined,
          sort,
        })
        if (!disposed) {
          setBooks(data)
        }
      } catch (error) {
        if (!disposed) {
          notifyError(error.message)
        }
      } finally {
        if (!disposed) {
          setLoading(false)
        }
      }
    }

    void bootstrap()

    return () => {
      disposed = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleToggleFavorite = async (book) => {
    try {
      await toggleFavorite(book)
    } catch (error) {
      notifyError(error.message)
    }
  }

  return (
    <div className="library-layout">
      <Card className="library-sidebar">
        <Typography.Title level={4} style={{ marginTop: 0 }}>
          Разделы
        </Typography.Title>
        <div className="category-stack">
          <button
            type="button"
            className={`category-filter${categoryId === 'all' ? ' category-filter-active' : ''}`}
            onClick={() => {
              setCategoryId('all')
              void fetchBooks({ categoryId: 'all' })
            }}
          >
            <span>Все книги</span>
            <strong>{categories.reduce((sum, item) => sum + (item.bookCount || 0), 0)}</strong>
          </button>

          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className={`category-filter${categoryId === category.id ? ' category-filter-active' : ''}`}
              onClick={() => {
                setCategoryId(category.id)
                void fetchBooks({ categoryId: category.id })
              }}
            >
              <span>{category.name}</span>
              <strong>{category.bookCount || 0}</strong>
            </button>
          ))}
        </div>
      </Card>

      <div className="library-results">
        <Card className="feature-surface">
          <div className="section-head library-toolbar">
            <div>
              <Typography.Title level={3} style={{ margin: 0 }}>
                Каталог
              </Typography.Title>
              <Typography.Text className="muted-copy">
                {currentUser?.role === 'teacher'
                  ? 'Опубликованные материалы и черновики'
                  : 'Опубликованные книги фонда'}
              </Typography.Text>
            </div>

            <Space wrap>
              <Input.Search
                allowClear
                size="large"
                value={search}
                placeholder="Поиск по названию, автору или теме"
                onChange={(event) => setSearch(event.target.value)}
                onSearch={(value) => {
                  setSearch(value)
                  void fetchBooks({ search: value })
                }}
                style={{ minWidth: 280 }}
              />
              <Segmented
                options={sortOptions}
                value={sort}
                onChange={(value) => {
                  setSort(value)
                  void fetchBooks({ sort: value })
                }}
              />
            </Space>
          </div>
        </Card>

        <BookList
          books={books}
          loading={loading}
          currentUser={currentUser}
          favoriteIds={favoriteIds}
          onOpenBook={(book) => void openBook(book)}
          onToggleFavorite={handleToggleFavorite}
          onManageBooks={() => navigate('/teacher')}
        />
      </div>
    </div>
  )
}

export default LibraryPage
