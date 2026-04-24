import {
  BookOutlined,
  DeleteOutlined,
  ExportOutlined,
  LeftOutlined,
  MinusOutlined,
  PlusOutlined,
  PushpinOutlined,
  ReadOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Col,
  Empty,
  Input,
  Progress,
  Result,
  Row,
  Segmented,
  Skeleton,
  Space,
  Tag,
  Typography,
} from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLibrary } from '../hooks/useLibrary.js'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const ReaderPage = () => {
  const navigate = useNavigate()
  const { bookId } = useParams()
  const {
    loadBook,
    getBookFileUrl,
    trackView,
    loadProgress,
    saveProgress,
    loadBookmarks,
    createBookmark,
    deleteBookmark,
    loadNotes,
    createNote,
    deleteNote,
    notifyError,
  } = useLibrary()

  const [book, setBook] = useState(null)
  const [progress, setProgress] = useState(null)
  const [bookmarks, setBookmarks] = useState([])
  const [notes, setNotes] = useState([])
  const [currentPosition, setCurrentPosition] = useState(0)
  const [fontScale, setFontScale] = useState(100)
  const [readerMode, setReaderMode] = useState('paper')
  const [noteBody, setNoteBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [hasInteracted, setHasInteracted] = useState(false)

  const sections = book?.content || []
  const currentSection = sections[currentPosition] || ''
  const fileUrl = book?.readerType === 'file' ? getBookFileUrl(book.id) : ''
  const isPdf = book?.format === 'pdf'

  const percent = useMemo(() => {
    if (!sections.length) {
      return 0
    }

    return Math.round(((currentPosition + 1) / sections.length) * 100)
  }, [currentPosition, sections.length])

  useEffect(() => {
    let disposed = false

    const bootstrap = async () => {
      try {
        const bookData = await loadBook(bookId)
        const progressData = await loadProgress(bookId)

        if (disposed) {
          return
        }

        setBook(bookData)
        setProgress(progressData)
        setHasInteracted(false)
        setCurrentPosition(
          clamp(progressData?.lastPosition || 0, 0, Math.max((bookData.content?.length || 1) - 1, 0)),
        )

        if (bookData.readerType === 'text') {
          const [bookmarksData, notesData] = await Promise.all([
            loadBookmarks(bookId),
            loadNotes(bookId),
          ])

          if (!disposed) {
            setBookmarks(bookmarksData)
            setNotes(notesData)
          }
        } else if (!disposed) {
          setBookmarks([])
          setNotes([])
        }

        await trackView(bookId)
      } catch (error) {
        if (!disposed) {
          notifyError(error.message)
          setBook(null)
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
  }, [bookId])

  useEffect(() => {
    if (!book || book.readerType !== 'text' || !sections.length) {
      return undefined
    }

    const timer = window.setTimeout(async () => {
      try {
        await saveProgress(bookId, {
          lastPosition: currentPosition,
          lastPercent: percent,
          readingDelta: hasInteracted ? 45 : 0,
        })

        setProgress((current) => ({
          ...(current || {}),
          lastPosition: currentPosition,
          lastPercent: percent,
        }))
      } catch (error) {
        notifyError(error.message)
      }
    }, 350)

    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book, bookId, currentPosition, percent, hasInteracted, sections.length])

  if (loading) {
    return (
      <Card className="feature-surface">
        <Skeleton active paragraph={{ rows: 16 }} />
      </Card>
    )
  }

  if (!book) {
    return <Result status="404" title="Книга не найдена" subTitle="Проверьте доступ к материалу." />
  }

  if (book.readerType === 'file') {
    return (
      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        <Card className="feature-surface reader-topbar">
          <div className="reader-topbar-row">
            <Space wrap>
              <Button icon={<LeftOutlined />} onClick={() => navigate('/library')}>
                Назад к каталогу
              </Button>
              <Tag>{book.categoryName}</Tag>
              <Tag>{String(book.format).toUpperCase()}</Tag>
              <Tag>{book.publishYear}</Tag>
            </Space>
            <Space wrap>
              {book.sourceUrl ? (
                <Button icon={<ExportOutlined />} onClick={() => window.open(book.sourceUrl, '_blank', 'noopener,noreferrer')}>
                  Оригинальная ссылка
                </Button>
              ) : null}
              <Button type="primary" icon={<ExportOutlined />} onClick={() => window.open(fileUrl, '_blank', 'noopener,noreferrer')}>
                Открыть файл
              </Button>
            </Space>
          </div>
        </Card>

        <Row gutter={[20, 20]}>
          <Col xs={24} xl={6}>
            <Card className="feature-surface">
              <Space direction="vertical" size={14} style={{ width: '100%' }}>
                <div className="reader-book-header">
                  <div className="feature-icon">
                    <BookOutlined />
                  </div>
                  <div>
                    <Typography.Title level={4} style={{ margin: 0 }}>
                      {book.title}
                    </Typography.Title>
                    <Typography.Text className="muted-copy">{book.author}</Typography.Text>
                  </div>
                </div>
                <Typography.Paragraph className="muted-copy" style={{ marginBottom: 0 }}>
                  {book.description}
                </Typography.Paragraph>
                <div className="meta-stack">
                  <div className="summary-row">
                    <span>Источник</span>
                    <strong>{book.sourceLabel}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Открытий</span>
                    <strong>{book.openCount}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Год</span>
                    <strong>{book.publishYear}</strong>
                  </div>
                </div>
              </Space>
            </Card>
          </Col>

          <Col xs={24} xl={18}>
            <Card className="reader-file-card">
              {isPdf ? (
                <iframe className="reader-iframe" src={fileUrl} title={book.title} />
              ) : (
                <Result
                  icon={<ReadOutlined />}
                  title="Файл готов к открытию"
                  subTitle="Для этого формата удобнее открыть источник в новой вкладке."
                  extra={[
                    <Button type="primary" key="open-file" onClick={() => window.open(fileUrl, '_blank', 'noopener,noreferrer')}>
                      Открыть файл
                    </Button>,
                  ]}
                />
              )}
            </Card>
          </Col>
        </Row>
      </Space>
    )
  }

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <Card className="feature-surface reader-topbar">
        <div className="reader-topbar-row">
          <Space wrap>
            <Button icon={<LeftOutlined />} onClick={() => navigate('/library')}>
              Назад к каталогу
            </Button>
            <Tag>{book.categoryName}</Tag>
            <Tag>{book.publishYear}</Tag>
            <Tag>{book.openCount} открытий</Tag>
          </Space>
          <Space wrap>
            <Segmented
              value={readerMode}
              onChange={setReaderMode}
              options={[
                { label: 'Светлый', value: 'paper' },
                { label: 'Темный', value: 'night' },
              ]}
            />
            <Space.Compact>
              <Button icon={<MinusOutlined />} onClick={() => setFontScale((value) => clamp(value - 10, 90, 140))} />
              <Button disabled>{fontScale}%</Button>
              <Button icon={<PlusOutlined />} onClick={() => setFontScale((value) => clamp(value + 10, 90, 140))} />
            </Space.Compact>
          </Space>
        </div>
      </Card>

      <Row gutter={[20, 20]}>
        <Col xs={24} xl={7}>
          <Space direction="vertical" size={20} style={{ width: '100%' }}>
            <Card className="feature-surface">
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <div className="reader-book-header">
                  <div className="feature-icon">
                    <BookOutlined />
                  </div>
                  <div>
                    <Typography.Title level={4} style={{ margin: 0 }}>
                      {book.title}
                    </Typography.Title>
                    <Typography.Text className="muted-copy">{book.author}</Typography.Text>
                  </div>
                </div>
                <Typography.Paragraph className="muted-copy" style={{ marginBottom: 0 }}>
                  {book.description}
                </Typography.Paragraph>
                <Progress percent={percent} />
                <div className="summary-row">
                  <span>Раздел</span>
                  <strong>{currentPosition + 1}</strong>
                </div>
                <div className="summary-row">
                  <span>Прогресс</span>
                  <strong>{progress?.lastPercent || 0}%</strong>
                </div>
              </Space>
            </Card>

            <Card className="feature-surface">
              <div className="section-head compact-head">
                <Typography.Title level={4} style={{ margin: 0 }}>
                  Закладки
                </Typography.Title>
                <Button
                  icon={<PushpinOutlined />}
                  onClick={async () => {
                    try {
                      const created = await createBookmark(bookId, {
                        title: `Раздел ${currentPosition + 1}`,
                        excerpt: currentSection.slice(0, 120),
                        position: currentPosition,
                      })
                      setBookmarks((current) => [created, ...current])
                    } catch (error) {
                      notifyError(error.message)
                    }
                  }}
                >
                  Добавить
                </Button>
              </div>

              {bookmarks.length ? (
                <div className="stack-list">
                  {bookmarks.map((bookmark) => (
                    <div key={bookmark.id} className="stack-item">
                      <button
                        type="button"
                        className="stack-item-main"
                        onClick={() => {
                          setHasInteracted(true)
                          setCurrentPosition(clamp(bookmark.position, 0, sections.length - 1))
                        }}
                      >
                        <strong>{bookmark.title}</strong>
                        <span>{bookmark.excerpt}</span>
                      </button>
                      <Button
                        type="text"
                        icon={<DeleteOutlined />}
                        onClick={async () => {
                          try {
                            await deleteBookmark(bookmark.id)
                            setBookmarks((current) => current.filter((item) => item.id !== bookmark.id))
                          } catch (error) {
                            notifyError(error.message)
                          }
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <Empty description="Закладок пока нет" />
              )}
            </Card>

            <Card className="feature-surface">
              <Typography.Title level={4} style={{ marginTop: 0 }}>
                Заметки
              </Typography.Title>
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                <Input.TextArea
                  rows={4}
                  value={noteBody}
                  placeholder="Новая заметка"
                  onChange={(event) => setNoteBody(event.target.value)}
                />
                <Button
                  type="primary"
                  onClick={async () => {
                    try {
                      const created = await createNote(bookId, {
                        position: currentPosition,
                        selection: currentSection.slice(0, 180),
                        body: noteBody,
                      })
                      setNotes((current) => [created, ...current])
                      setNoteBody('')
                    } catch (error) {
                      notifyError(error.message)
                    }
                  }}
                >
                  Сохранить
                </Button>

                {notes.length ? (
                  <div className="stack-list">
                    {notes.map((note) => (
                      <div key={note.id} className="note-card">
                        <strong>Раздел {note.position + 1}</strong>
                        <span className="muted-copy">{note.selection}</span>
                        <p>{note.body}</p>
                        <Button
                          danger
                          type="link"
                          icon={<DeleteOutlined />}
                          onClick={async () => {
                            try {
                              await deleteNote(note.id)
                              setNotes((current) => current.filter((item) => item.id !== note.id))
                            } catch (error) {
                              notifyError(error.message)
                            }
                          }}
                        >
                          Удалить
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty description="Заметок пока нет" />
                )}
              </Space>
            </Card>
          </Space>
        </Col>

        <Col xs={24} xl={17}>
          <Card className={`reader-surface reader-mode-${readerMode}`}>
            <div className="reader-actions">
              <Button onClick={() => {
                setHasInteracted(true)
                setCurrentPosition((value) => clamp(value - 1, 0, sections.length - 1))
              }}>
                Предыдущий раздел
              </Button>
              <Button type="primary" onClick={() => {
                setHasInteracted(true)
                setCurrentPosition((value) => clamp(value + 1, 0, sections.length - 1))
              }}>
                Следующий раздел
              </Button>
            </div>

            <div className="reader-section-label">
              <Tag color="blue">Раздел {currentPosition + 1}</Tag>
              <span>{percent}% книги</span>
            </div>

            <Typography.Title className="reader-heading">{book.title}</Typography.Title>
            <Typography.Paragraph className="reader-copy" style={{ fontSize: `${fontScale / 100}rem` }}>
              {currentSection}
            </Typography.Paragraph>

            <div className="reader-outline">
              <Typography.Title level={4} style={{ marginTop: 0 }}>
                Оглавление
              </Typography.Title>
              <div className="outline-grid">
                {sections.map((section, index) => (
                  <button
                    key={`${book.id}-${index}`}
                    type="button"
                    className={`outline-chip${index === currentPosition ? ' outline-chip-active' : ''}`}
                    onClick={() => {
                      setHasInteracted(true)
                      setCurrentPosition(index)
                    }}
                  >
                    <span>Раздел {index + 1}</span>
                    <small>{section.slice(0, 72)}...</small>
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </Space>
  )
}

export default ReaderPage
