import { BookOutlined, HeartFilled, HeartOutlined, ReadOutlined } from '@ant-design/icons'
import { Button, Card, Empty, Skeleton, Space, Tag, Typography } from 'antd'
import { getBookCoverStyle, getBookPublicationLabel } from '../utils/formatters.js'

const BookList = ({
  books,
  loading = false,
  currentUser,
  favoriteIds = [],
  onOpenBook,
  onToggleFavorite,
  onManageBooks,
  emptyDescription = 'Книги не найдены.',
}) => {
  if (loading) {
    return (
      <Card className="feature-surface">
        <Skeleton active paragraph={{ rows: 12 }} />
      </Card>
    )
  }

  if (!books.length) {
    return (
      <Card className="feature-surface">
        <Empty description={emptyDescription} />
      </Card>
    )
  }

  return (
    <div className="library-list">
      {books.map((book) => {
        const isFavorite = favoriteIds.includes(book.id)

        return (
          <Card key={book.id} className="library-row">
            <div className="library-row-cover" style={getBookCoverStyle(book)}>
              <span>{getBookPublicationLabel(book)}</span>
            </div>

            <div className="library-row-copy">
              <div className="library-row-head">
                <div>
                  <Typography.Title level={4} style={{ margin: 0 }}>
                    {book.title}
                  </Typography.Title>
                  <Typography.Text className="muted-copy">
                    {[book.author, book.categoryName].filter(Boolean).join(' • ') || 'Файловая книга'}
                  </Typography.Text>
                </div>
                <Space wrap>
                  <Tag>{book.theme || 'Без темы'}</Tag>
                  <Tag>{Number(book.openCount || 0)} просмотров</Tag>
                  <Tag color={book.readerType === 'file' || book.file_url ? 'blue' : 'purple'}>
                    {book.readerType === 'file' || book.file_url
                      ? String(book.format || 'pdf').toUpperCase()
                      : 'Текст'}
                  </Tag>
                  {currentUser?.role === 'teacher' && typeof book.published === 'boolean' ? (
                    <Tag color={book.published ? 'green' : 'orange'}>
                      {book.published ? 'Опубликовано' : 'Черновик'}
                    </Tag>
                  ) : null}
                </Space>
              </div>

              <Typography.Paragraph className="muted-copy" style={{ marginBottom: 0 }}>
                {book.description || book.previewText || 'Файл готов к чтению во встроенном reader.'}
              </Typography.Paragraph>

              <div className="library-row-footer">
                <div className="book-inline-meta">
                  <span>{book.progressPercent || 0}% прочитано</span>
                  <span>{book.estimatedMinutes} мин</span>
                  <span>{getBookPublicationLabel(book)}</span>
                  <span>{book.sourceLabel}</span>
                </div>

                <Space wrap>
                  <Button type="primary" icon={<ReadOutlined />} onClick={() => onOpenBook?.(book)}>
                    Открыть
                  </Button>
                  {onToggleFavorite ? (
                    <Button
                      icon={isFavorite ? <HeartFilled /> : <HeartOutlined />}
                      onClick={() => void onToggleFavorite(book)}
                    >
                      {isFavorite ? 'Сохранено' : 'Сохранить'}
                    </Button>
                  ) : null}
                  {currentUser?.role === 'teacher' && onManageBooks ? (
                    <Button icon={<BookOutlined />} onClick={onManageBooks}>
                      Управление
                    </Button>
                  ) : null}
                </Space>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

export default BookList
