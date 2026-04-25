import { BookOutlined, FireOutlined, SearchOutlined, TagsOutlined } from '@ant-design/icons'
import { Button, Card, Col, Empty, Input, Row, Skeleton, Space, Tag, Typography } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLibrary } from '../hooks/useLibrary.js'
import { getBookCoverStyle, getBookPublicationLabel } from '../utils/formatters.js'

const STUDENT_GUIDE_KEY = 'libhub_show_student_guide'

const HomePage = () => {
  const navigate = useNavigate()
  const { categories, currentUser, loadBooks, stats, notifyError } = useLibrary()
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showStudentGuide, setShowStudentGuide] = useState(false)

  useEffect(() => {
    let disposed = false

    const bootstrap = async () => {
      try {
        const data = await loadBooks({ sort: 'new' })
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

  useEffect(() => {
    if (currentUser?.role === 'student' && window.sessionStorage.getItem(STUDENT_GUIDE_KEY) === '1') {
      setShowStudentGuide(true)
    }
  }, [currentUser?.role])

  const latestBooks = books.slice(0, 4)
  const popularBooks = useMemo(
    () => [...books].sort((left, right) => right.openCount - left.openCount).slice(0, 6),
    [books],
  )

  const totalBooks =
    currentUser?.role === 'teacher'
      ? stats?.teacherStats?.totalBooks || 0
      : stats?.userStats?.totalAvailableBooks || 0

  const totalViews =
    currentUser?.role === 'teacher'
      ? stats?.teacherStats?.totalViews || 0
      : stats?.userStats?.totalViews || 0

  const openSearch = () => {
    const trimmedSearch = search.trim()
    navigate(trimmedSearch ? `/library?search=${encodeURIComponent(trimmedSearch)}` : '/library')
  }

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      {showStudentGuide ? (
        <Card className="feature-surface student-guide-card">
          <div className="section-head">
            <div>
              <Tag color="blue">Подсказка для студента</Tag>
              <Typography.Title level={3} style={{ margin: '12px 0 6px' }}>
                Как пользоваться библиотекой
              </Typography.Title>
              <Typography.Paragraph className="muted-copy" style={{ marginBottom: 0 }}>
                Сначала откройте каталог, затем сохраните нужные книги и обсуждайте их в комментариях.
              </Typography.Paragraph>
            </div>
            <Button
              onClick={() => {
                window.sessionStorage.removeItem(STUDENT_GUIDE_KEY)
                setShowStudentGuide(false)
              }}
            >
              Понятно
            </Button>
          </div>

          <div className="student-guide-grid">
            <div className="student-guide-step">
              <strong>1. Откройте каталог</strong>
              <span>Ищите книги по названию, автору или разделу.</span>
            </div>
            <div className="student-guide-step">
              <strong>2. Сохраните книгу</strong>
              <span>После нажатия книга попадёт на страницу сохранённых книг.</span>
            </div>
            <div className="student-guide-step">
              <strong>3. Читайте с прогрессом</strong>
              <span>Система запомнит, где вы остановились, и покажет прогресс.</span>
            </div>
            <div className="student-guide-step">
              <strong>4. Пишите комментарии</strong>
              <span>Можно отвечать другим студентам, ставить лайки и обсуждать книгу.</span>
            </div>
          </div>
        </Card>
      ) : null}

      <Card className="library-hero">
        <div className="library-hero-grid">
          <div>
            <Tag className="section-chip">24/7 доступ</Tag>
            <Typography.Title className="hero-title">
              Электронная библиотека с новыми поступлениями, разделами и удобным чтением.
            </Typography.Title>
            <Typography.Paragraph className="hero-description">
              Каталог построен вокруг библиотечного фонда: новые книги, популярные материалы, быстрый
              поиск и переход к чтению без лишних шагов.
            </Typography.Paragraph>

            <div className="hero-search">
              <Input
                size="large"
                value={search}
                placeholder="Поиск книги, автора или темы"
                onChange={(event) => setSearch(event.target.value)}
                onPressEnter={openSearch}
              />
              <Button type="primary" size="large" icon={<SearchOutlined />} onClick={openSearch}>
                Найти
              </Button>
            </div>
          </div>

          <div className="hero-metrics">
            <div className="metric-card">
              <span>Книг в каталоге</span>
              <strong>{totalBooks}</strong>
            </div>
            <div className="metric-card">
              <span>Разделов</span>
              <strong>{categories.length}</strong>
            </div>
            <div className="metric-card">
              <span>Открытий</span>
              <strong>{totalViews}</strong>
            </div>
          </div>
        </div>
      </Card>

      <Card className="feature-surface">
        <div className="section-head">
          <Typography.Title level={3} style={{ margin: 0 }}>
            Новые поступления
          </Typography.Title>
          <Button onClick={() => navigate('/library')}>Все книги</Button>
        </div>

        {loading ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : latestBooks.length ? (
          <div className="catalog-grid">
            {latestBooks.map((book) => (
              <Card key={book.id} className="catalog-card">
                <div className="book-cover" style={getBookCoverStyle(book)}>
                  <span className="book-year">{getBookPublicationLabel(book)}</span>
                  <strong>{book.title}</strong>
                  <span>{book.author}</span>
                </div>
                <div className="catalog-card-body">
                  <Typography.Text strong>{book.title}</Typography.Text>
                  <Typography.Text className="muted-copy">{book.author}</Typography.Text>
                  <Typography.Paragraph className="muted-copy" ellipsis={{ rows: 2 }}>
                    {book.description}
                  </Typography.Paragraph>
                  <div className="book-inline-meta">
                    <Tag>{book.categoryName}</Tag>
                    <span>{book.openCount} открытий</span>
                  </div>
                  <Button type="primary" onClick={() => navigate(`/reader/${book.id}`)}>
                    Открыть
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Empty description="Книги пока не загружены" />
        )}
      </Card>

      <Row gutter={[20, 20]}>
        <Col xs={24} xl={15}>
          <Card className="feature-surface full-height-card">
            <div className="section-head">
              <Typography.Title level={3} style={{ margin: 0 }}>
                Популярные книги
              </Typography.Title>
              <FireOutlined className="section-icon" />
            </div>

            {loading ? (
              <Skeleton active paragraph={{ rows: 8 }} />
            ) : popularBooks.length ? (
              <div className="rank-list">
                {popularBooks.map((book, index) => (
                  <button
                    key={book.id}
                    type="button"
                    className="rank-item"
                    onClick={() => navigate(`/reader/${book.id}`)}
                  >
                    <span className="rank-number">{String(index + 1).padStart(2, '0')}</span>
                    <div className="rank-copy">
                      <strong>{book.title}</strong>
                      <span>
                        {book.author} • {getBookPublicationLabel(book)}
                      </span>
                    </div>
                    <span className="rank-meta">{book.openCount} открытий</span>
                  </button>
                ))}
              </div>
            ) : (
              <Empty description="Популярные книги появятся после первых открытий" />
            )}
          </Card>
        </Col>

        <Col xs={24} xl={9}>
          <Card className="feature-surface full-height-card">
            <div className="section-head">
              <Typography.Title level={3} style={{ margin: 0 }}>
                Разделы библиотеки
              </Typography.Title>
              <TagsOutlined className="section-icon" />
            </div>

            <div className="category-grid">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className="category-tile"
                  onClick={() => navigate(`/library?categoryId=${category.id}`)}
                >
                  <strong>{category.name}</strong>
                  <span>{category.bookCount || 0} книг</span>
                </button>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      <Card className="feature-surface">
        <div className="portal-strip">
          <div className="portal-cell">
            <BookOutlined />
            <div>
              <strong>Каталог фонда</strong>
              <span>Новые поступления, популярные книги и разделы библиотеки</span>
            </div>
          </div>
          <div className="portal-cell">
            <SearchOutlined />
            <div>
              <strong>Быстрый поиск</strong>
              <span>По названию, автору, теме и разделу</span>
            </div>
          </div>
          {currentUser?.role === 'teacher' ? (
            <Button type="primary" onClick={() => navigate('/teacher')}>
              Управлять фондом
            </Button>
          ) : (
            <Button type="primary" onClick={() => navigate('/library')}>
              Перейти в каталог
            </Button>
          )}
        </div>
      </Card>
    </Space>
  )
}

export default HomePage
