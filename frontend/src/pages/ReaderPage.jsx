import {
  BookOutlined,
  DeleteOutlined,
  LeftOutlined,
  LikeOutlined,
  MessageOutlined,
  MinusOutlined,
  PlusOutlined,
  PushpinOutlined,
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
import BookReader from '../components/BookReader.jsx'
import { useLibrary } from '../hooks/useLibrary.js'
import {
  formatDateTime,
  getBookPublicationLabel,
  getUserDisplayName,
} from '../utils/formatters.js'

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const UPLOADED_BOOK_PREFIX = 'file-'

const ReaderPage = () => {
  const navigate = useNavigate()
  const { bookId } = useParams()
  const {
    currentUser,
    loadBook,
    loadUploadedBook,
    trackView,
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
    notifyError,
    notifySuccess,
  } = useLibrary()

  const [book, setBook] = useState(null)
  const [progress, setProgress] = useState(null)
  const [bookmarks, setBookmarks] = useState([])
  const [notes, setNotes] = useState([])
  const [comments, setComments] = useState([])
  const [currentPosition, setCurrentPosition] = useState(0)
  const [fontScale, setFontScale] = useState(100)
  const [readerMode, setReaderMode] = useState('paper')
  const [noteBody, setNoteBody] = useState('')
  const [commentBody, setCommentBody] = useState('')
  const [replyTargetId, setReplyTargetId] = useState('')
  const [replyDrafts, setReplyDrafts] = useState({})
  const [loading, setLoading] = useState(true)
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)
  const [readerError, setReaderError] = useState('')
  const isUploadedFileBook = bookId?.startsWith(UPLOADED_BOOK_PREFIX)
  const resolvedBookId = isUploadedFileBook ? bookId.slice(UPLOADED_BOOK_PREFIX.length) : bookId
  const commentsEnabled = !isUploadedFileBook
  const studentCanInteractWithComments = currentUser?.role === 'student'

  const sections = book?.content || []
  const currentSection = sections[currentPosition] || ''
  const fileUrl = book?.file_url || book?.fileUrl || ''
  const externalUrl = book?.external_url || book?.externalUrl || book?.sourceUrl || ''
  const hasEmbeddedReader = Boolean(book?.readerType === 'file' || fileUrl || externalUrl)

  const percent = useMemo(() => {
    if (!sections.length) {
      return 0
    }

    return Math.round(((currentPosition + 1) / sections.length) * 100)
  }, [currentPosition, sections.length])

  const totalCommentCount = useMemo(() => {
    const countItems = (items) =>
      items.reduce((sum, item) => sum + 1 + countItems(item.replies || []), 0)

    return countItems(comments)
  }, [comments])

  useEffect(() => {
    let disposed = false

    const bootstrap = async () => {
      try {
        const bookData = isUploadedFileBook
          ? await loadUploadedBook(resolvedBookId)
          : await loadBook(bookId)

        if (disposed) {
          return
        }

        const normalizedBook = isUploadedFileBook
          ? {
              ...bookData,
              readerType: 'file',
              format: bookData?.file_url?.toLowerCase().endsWith('.epub') ? 'epub' : 'pdf',
              openCount: Number(bookData?.openCount || 0),
              sourceLabel: bookData?.file_url ? 'Локальный файл' : 'Внешняя ссылка',
            }
          : bookData

        const hasDirectReaderSource = Boolean(
          normalizedBook?.readerType === 'file' ||
            normalizedBook?.file_url ||
            normalizedBook?.fileUrl ||
            normalizedBook?.external_url ||
            normalizedBook?.externalUrl,
        )

        setReaderError('')
        setBook(normalizedBook)
        setHasInteracted(false)
        setCurrentPosition(0)
        setProgress(null)
        setBookmarks([])
        setNotes([])
        setComments([])
        setReplyTargetId('')
        setReplyDrafts({})

        if (commentsEnabled) {
          setCommentsLoading(true)
          try {
            const commentsData = await loadComments(bookId)
            if (!disposed) {
              setComments(commentsData)
            }
          } finally {
            if (!disposed) {
              setCommentsLoading(false)
            }
          }
        }

        if (!isUploadedFileBook) {
          const viewResult = await trackView(bookId)
          if (!disposed && typeof viewResult?.openCount === 'number') {
            setBook((current) =>
              current
                ? {
                    ...current,
                    openCount: viewResult.openCount,
                  }
                : current,
            )
          }
        }

        if (hasDirectReaderSource) {
          return
        }

        const progressData = await loadProgress(bookId)

        if (disposed) {
          return
        }

        setProgress(progressData)
        setCurrentPosition(
          clamp(progressData?.lastPosition || 0, 0, Math.max((normalizedBook.content?.length || 1) - 1, 0)),
        )

        if (normalizedBook.readerType === 'text') {
          const [bookmarksData, notesData] = await Promise.all([loadBookmarks(bookId), loadNotes(bookId)])

          if (!disposed) {
            setBookmarks(bookmarksData)
            setNotes(notesData)
          }
        }
      } catch (error) {
        if (!disposed) {
          notifyError(error.message)
          setReaderError(error.message)
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
  }, [bookId, isUploadedFileBook, resolvedBookId])

  useEffect(() => {
    if (!book || book.readerType !== 'text' || !sections.length || isUploadedFileBook) {
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
  }, [book, bookId, currentPosition, percent, hasInteracted, sections.length, isUploadedFileBook])

  const handleCreateComment = async (parentId = null) => {
    const draft = parentId ? replyDrafts[parentId] || '' : commentBody
    const trimmedBody = draft.trim()

    if (!trimmedBody) {
      return
    }

    try {
      const nextComments = await createComment(bookId, {
        body: trimmedBody,
        ...(parentId ? { parentId } : {}),
      })

      setComments(nextComments)

      if (parentId) {
        setReplyDrafts((current) => ({ ...current, [parentId]: '' }))
        setReplyTargetId('')
        notifySuccess('Ответ опубликован.')
      } else {
        setCommentBody('')
        notifySuccess('Комментарий опубликован.')
      }
    } catch (error) {
      notifyError(error.message)
    }
  }

  const handleToggleCommentLike = async (comment) => {
    try {
      const nextComments = await toggleCommentLike(comment.id)
      setComments(nextComments)
    } catch (error) {
      notifyError(error.message)
    }
  }

  const renderCommentItems = (items, depth = 0) =>
    items.map((comment) => (
      <div
        key={comment.id}
        className={`comment-card${depth > 0 ? ' comment-card-reply' : ''}`}
      >
        <div className="comment-head">
          <div className="comment-author">
            <strong>{getUserDisplayName(comment.author)}</strong>
            <span className="muted-copy">{comment.author?.role === 'teacher' ? 'преподаватель' : 'студент'}</span>
          </div>
          <span className="muted-copy">{formatDateTime(comment.createdAt)}</span>
        </div>

        <Typography.Paragraph className="comment-body">{comment.body}</Typography.Paragraph>

        <Space wrap>
          {studentCanInteractWithComments ? (
            <Button
              size="small"
              icon={<LikeOutlined />}
              type={comment.likedByCurrentUser ? 'primary' : 'default'}
              disabled={comment.author?.id === currentUser?.id}
              onClick={() => void handleToggleCommentLike(comment)}
            >
              {comment.likeCount}
            </Button>
          ) : (
            <Tag>{comment.likeCount} лайков</Tag>
          )}

          {studentCanInteractWithComments ? (
            <Button
              size="small"
              icon={<MessageOutlined />}
              onClick={() =>
                setReplyTargetId((current) => (current === comment.id ? '' : comment.id))
              }
            >
              Ответить
            </Button>
          ) : null}
        </Space>

        {studentCanInteractWithComments && replyTargetId === comment.id ? (
          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            <Input.TextArea
              rows={3}
              value={replyDrafts[comment.id] || ''}
              placeholder="Напишите ответ"
              onChange={(event) =>
                setReplyDrafts((current) => ({
                  ...current,
                  [comment.id]: event.target.value,
                }))
              }
            />
            <Space wrap>
              <Button type="primary" onClick={() => void handleCreateComment(comment.id)}>
                Отправить ответ
              </Button>
              <Button onClick={() => setReplyTargetId('')}>Отмена</Button>
            </Space>
          </Space>
        ) : null}

        {comment.replies?.length ? (
          <div className="comment-replies">{renderCommentItems(comment.replies, depth + 1)}</div>
        ) : null}
      </div>
    ))

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

  const commentsCard = commentsEnabled ? (
    <Card className="feature-surface">
        <div className="section-head">
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Комментарии к книге
          </Typography.Title>
          <Typography.Text className="muted-copy">
            Студенты могут обсуждать книгу, отвечать друг другу и ставить лайки.
          </Typography.Text>
        </div>
        <Tag>{totalCommentCount} комментариев</Tag>
      </div>

      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {studentCanInteractWithComments ? (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Input.TextArea
              rows={4}
              value={commentBody}
              placeholder="Напишите комментарий к книге"
              onChange={(event) => setCommentBody(event.target.value)}
            />
            <Button type="primary" disabled={!commentBody.trim()} onClick={() => void handleCreateComment()}>
              Опубликовать комментарий
            </Button>
          </Space>
        ) : (
          <Typography.Paragraph className="muted-copy" style={{ marginBottom: 0 }}>
            Писать комментарии и ставить лайки могут только студенты. Просмотр обсуждения доступен всем, у
            кого есть доступ к книге.
          </Typography.Paragraph>
        )}

        {commentsLoading ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : comments.length ? (
          <div className="comment-list">{renderCommentItems(comments)}</div>
        ) : (
          <Empty description="Комментариев пока нет" />
        )}
      </Space>
    </Card>
  ) : null

  if (hasEmbeddedReader) {
    return (
      <Space direction="vertical" size={24} style={{ width: '100%' }}>
        <Card className="feature-surface reader-topbar">
          <div className="reader-topbar-row">
            <Space wrap>
              <Button icon={<LeftOutlined />} onClick={() => navigate('/library')}>
                Назад к каталогу
              </Button>
              {book.categoryName ? <Tag>{book.categoryName}</Tag> : null}
              <Tag>{String(book.format || 'file').toUpperCase()}</Tag>
              {book.publishDate || book.publishYear ? <Tag>{getBookPublicationLabel(book)}</Tag> : null}
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
                    <Typography.Text className="muted-copy">
                      {book.author || 'Автор не указан'}
                    </Typography.Text>
                  </div>
                </div>
                <Typography.Paragraph className="muted-copy" style={{ marginBottom: 0 }}>
                  {book.description || 'Книга доступна для чтения во встроенном viewer.'}
                </Typography.Paragraph>
                <div className="meta-stack">
                  <div className="summary-row">
                    <span>Источник</span>
                    <strong>{book.sourceLabel || (fileUrl ? 'Локальный файл' : 'Внешняя ссылка')}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Просмотры</span>
                    <strong>{Number(book.openCount || 0)}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Дата</span>
                    <strong>{getBookPublicationLabel(book)}</strong>
                  </div>
                </div>
              </Space>
            </Card>
          </Col>

          <Col xs={24} xl={18}>
            <Card className="reader-file-card">
              <BookReader book={book} fileUrl={fileUrl} error={readerError} />
            </Card>
          </Col>
        </Row>

        {commentsCard}
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
            <Tag>{getBookPublicationLabel(book)}</Tag>
            <Tag>{book.openCount} открытий</Tag>
          </Space>
          <Space wrap>
            <Segmented
              value={readerMode}
              onChange={setReaderMode}
              options={[
                { label: 'Светлый', value: 'paper' },
                { label: 'Тёмный', value: 'night' },
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
                  <strong>{progress?.lastPercent || percent}%</strong>
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
                  disabled={!noteBody.trim()}
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
              <Button
                onClick={() => {
                  setHasInteracted(true)
                  setCurrentPosition((value) => clamp(value - 1, 0, sections.length - 1))
                }}
              >
                Предыдущий раздел
              </Button>
              <Button
                type="primary"
                onClick={() => {
                  setHasInteracted(true)
                  setCurrentPosition((value) => clamp(value + 1, 0, sections.length - 1))
                }}
              >
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

      {commentsCard}
    </Space>
  )
}

export default ReaderPage
