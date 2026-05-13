import { ExportOutlined, ReadOutlined } from '@ant-design/icons'
import { Button, Result, Space, Spin, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { normalizeUiMessage } from '../utils/api.js'

const isNodeBookFileUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return false
  }

  try {
    const pathname = url.startsWith('http') ? new URL(url).pathname : url.split('?')[0]
    return /\/api\/books\/[^/]+\/file\/?$/.test(pathname)
  } catch {
    return false
  }
}

const toAbsoluteUrl = (url) => (url.startsWith('http') ? url : new URL(url, window.location.origin).href)

const BookReader = ({ book, fileUrl = '', loading = false, error = '', authToken = '' }) => {
  const resolvedFileUrl = fileUrl || book?.file_url || book?.fileUrl || ''
  const resolvedExternalUrl = book?.external_url || book?.externalUrl || ''
  const protectedFile = Boolean(resolvedFileUrl && isNodeBookFileUrl(resolvedFileUrl))
  const [blobUrl, setBlobUrl] = useState('')
  const [fetchError, setFetchError] = useState('')

  useEffect(() => {
    if (!protectedFile || !authToken) {
      setBlobUrl((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev)
        }
        return ''
      })
      setFetchError('')
      return undefined
    }

    let alive = true

    ;(async () => {
      try {
        setFetchError('')
        const res = await fetch(toAbsoluteUrl(resolvedFileUrl), {
          headers: { Authorization: `Bearer ${authToken}` },
        })

        if (!res.ok) {
          const payload = await res.json().catch(() => ({}))
          const raw =
            typeof payload.message === 'string' && payload.message.trim()
              ? payload.message
              : `ошибка ${res.status}`
          throw new Error(normalizeUiMessage(raw))
        }

        const blob = await res.blob()
        if (!alive) {
          return
        }

        const objectUrl = URL.createObjectURL(blob)
        setBlobUrl((prev) => {
          if (prev) {
            URL.revokeObjectURL(prev)
          }
          return objectUrl
        })
      } catch (e) {
        if (!alive) {
          return
        }
        const msg = e instanceof Error && e.message ? e.message : 'Не удалось загрузить файл.'
        setFetchError(msg)
        setBlobUrl((prev) => {
          if (prev) {
            URL.revokeObjectURL(prev)
          }
          return ''
        })
      }
    })()

    return () => {
      alive = false
      setBlobUrl((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev)
        }
        return ''
      })
    }
  }, [protectedFile, authToken, resolvedFileUrl])

  if (loading) {
    return (
      <div className="book-reader-state">
        <Spin size="large" />
      </div>
    )
  }

  if (!book) {
    return <Result status="404" title="Книга не найдена" />
  }

  if (protectedFile && !authToken) {
    return (
      <Result
        status="403"
        title="Нужен вход"
        subTitle="Войдите в систему, чтобы открыть файл книги."
      />
    )
  }

  const combinedError = error || fetchError
  if (combinedError) {
    return <Result status="error" title="Не удалось открыть книгу" subTitle={combinedError} />
  }

  if (protectedFile && authToken && !blobUrl) {
    return (
      <div className="book-reader-state">
        <Spin size="large" />
      </div>
    )
  }

  const iframeSrc = protectedFile && authToken ? blobUrl : resolvedFileUrl || resolvedExternalUrl

  if (!iframeSrc) {
    return (
      <Result
        status="warning"
        icon={<ReadOutlined />}
        title="Источник книги пока недоступен"
        subTitle="Для этой книги не найден файл или внешняя ссылка."
      />
    )
  }

  const openFileInTab = () => {
    const url = blobUrl || (!protectedFile ? resolvedFileUrl : '')
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="book-reader-shell">
      <iframe className="book-reader-iframe" src={iframeSrc} title={book.title} />

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
            {(blobUrl || (!protectedFile && resolvedFileUrl)) ? (
              <Button icon={<ReadOutlined />} onClick={openFileInTab}>
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
