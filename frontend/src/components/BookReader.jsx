import { ExportOutlined, ReadOutlined } from '@ant-design/icons'
import { Button, Result, Space, Spin, Typography } from 'antd'

const BookReader = ({ book, fileUrl = '', loading = false, error = '' }) => {
  const resolvedFileUrl = fileUrl || book?.file_url || book?.fileUrl || ''
  const resolvedExternalUrl = book?.external_url || book?.externalUrl || ''
  const embedUrl = resolvedFileUrl || resolvedExternalUrl

  if (loading) {
    return (
      <div className="book-reader-state">
        <Spin size="large" />
      </div>
    )
  }

  if (error) {
    return <Result status="error" title="Не удалось открыть книгу" subTitle={error} />
  }

  if (!book) {
    return <Result status="404" title="Книга не найдена" />
  }

  if (!embedUrl) {
    return (
      <Result
        status="warning"
        icon={<ReadOutlined />}
        title="Источник книги пока недоступен"
        subTitle="Для этой книги не найден файл или внешняя ссылка."
      />
    )
  }

  return (
    <div className="book-reader-shell">
      <iframe className="book-reader-iframe" src={embedUrl} title={book.title} />

      {resolvedExternalUrl ? (
        <div className="book-reader-note">
          <Typography.Text className="muted-copy">
            Если внешний сайт запрещает встраивание, откройте книгу в новой вкладке.
          </Typography.Text>
          <Space wrap>
            <Button
              type="primary"
              icon={<ExportOutlined />}
              onClick={() => window.open(resolvedExternalUrl, '_blank', 'noopener,noreferrer')}
            >
              Открыть источник
            </Button>
            {resolvedFileUrl ? (
              <Button
                icon={<ReadOutlined />}
                onClick={() => window.open(resolvedFileUrl, '_blank', 'noopener,noreferrer')}
              >
                Открыть файл
              </Button>
            ) : null}
          </Space>
        </div>
      ) : null}
    </div>
  )
}

export default BookReader
