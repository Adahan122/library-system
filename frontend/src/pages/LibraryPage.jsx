import { BookOutlined, HeartFilled, HeartOutlined, ReadOutlined } from '@ant-design/icons'
import { Button, Card, Empty, Input, Segmented, Skeleton, Space, Tag, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useLibrary } from '../hooks/useLibrary.js'

const sortOptions = [
  { label: 'Новые', value: 'new' },
  { label: 'Популярные', value: 'popular' },
  { label: 'По названию', value: 'title' },
]

const LibraryPage = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { categories, currentUser, loadBooks, toggleFavorite, notifyError } = useLibrary()

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

        {loading ? (
          <Card className="feature-surface">
            <Skeleton active paragraph={{ rows: 12 }} />
          </Card>
        ) : books.length ? (
          <div className="library-list">
            {books.map((book) => (
              <Card key={book.id} className="library-row">
                <div className="library-row-cover" style={{ background: `linear-gradient(135deg, ${book.coverTone}, #0f172a)` }}>
                  <span>{book.publishYear}</span>
                </div>

                <div className="library-row-copy">
                  <div className="library-row-head">
                    <div>
                      <Typography.Title level={4} style={{ margin: 0 }}>
                        {book.title}
                      </Typography.Title>
                      <Typography.Text className="muted-copy">
                        {book.author} • {book.categoryName}
                      </Typography.Text>
                    </div>
                    <Space wrap>
                      <Tag>{book.theme || 'Без темы'}</Tag>
                      <Tag>{book.openCount} открытий</Tag>
                      <Tag color={book.readerType === 'file' ? 'blue' : 'purple'}>
                        {book.readerType === 'file' ? String(book.format).toUpperCase() : 'Текст'}
                      </Tag>
                      {currentUser?.role === 'teacher' ? (
                        <Tag color={book.published ? 'green' : 'orange'}>
                          {book.published ? 'Опубликовано' : 'Черновик'}
                        </Tag>
                      ) : null}
                    </Space>
                  </div>

                  <Typography.Paragraph className="muted-copy" style={{ marginBottom: 0 }}>
                    {book.description || book.previewText}
                  </Typography.Paragraph>

                  <div className="library-row-footer">
                    <div className="book-inline-meta">
                      <span>{book.progressPercent || 0}% прочитано</span>
                      <span>{book.estimatedMinutes} мин</span>
                      <span>{book.sourceLabel}</span>
                    </div>

                    <Space wrap>
                      <Button
                        type="primary"
                        icon={<ReadOutlined />}
                        onClick={() => navigate(`/reader/${book.id}`)}
                      >
                        Открыть
                      </Button>
                      <Button
                        icon={book.isFavorite ? <HeartFilled /> : <HeartOutlined />}
                        onClick={() => toggleFavorite(book)}
                      >
                        {book.isFavorite ? 'Сохранено' : 'Сохранить'}
                      </Button>
                      {currentUser?.role === 'teacher' ? (
                        <Button icon={<BookOutlined />} onClick={() => navigate('/teacher')}>
                          Управление
                        </Button>
                      ) : null}
                    </Space>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="feature-surface">
            <Empty description="Книги не найдены." />
          </Card>
        )}
      </div>
    </div>
  )
}

export default LibraryPage
