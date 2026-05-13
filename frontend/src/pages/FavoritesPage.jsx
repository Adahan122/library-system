import { useEffect, useState } from 'react'
import { Avatar, Button, Card, Empty, Space, Tag, Typography } from 'antd'
import { BookOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons'
import { useLibrary } from '../hooks/useLibrary.js'

const FavoritesPage = () => {
  const { loadBooks, toggleFavorite, notifyError, openBook } = useLibrary()
  const [favorites, setFavorites] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchFavorites = async () => {
    setLoading(true)
    try {
      const data = await loadBooks({ favorites: true })
      setFavorites(data)
    } catch (error) {
      notifyError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveFavorite = async (book) => {
    try {
      await toggleFavorite(book)
      await fetchFavorites()
    } catch (error) {
      notifyError(error.message)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchFavorites()
    }, 0)

    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <Card className="glass-card hero-panel">
        <Tag className="hero-tag" variant="filled">
          Сохранённые
        </Tag>
        <Typography.Title level={2} style={{ margin: '16px 0 8px' }}>
          Ваши сохранённые книги
        </Typography.Title>
        <Typography.Paragraph className="section-description">
          Здесь собраны книги, которые вы сохранили и хотите быстро открыть позже.
        </Typography.Paragraph>
      </Card>

      <Card className="glass-card" loading={loading}>
        {favorites.length ? (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {favorites.map((item) => (
              <Card key={item.id} className="inner-highlight">
                <div className="team-member">
                  <Space>
                    <Avatar className="table-avatar" icon={<BookOutlined />} />
                    <div>
                      <Typography.Text strong>{item.title}</Typography.Text>
                      <br />
                      <Space wrap>
                        <Typography.Text type="secondary">{item.author}</Typography.Text>
                        <Tag>{item.categoryName}</Tag>
                        {item.theme ? <Tag color="blue">{item.theme}</Tag> : null}
                      </Space>
                    </div>
                  </Space>

                  <Space wrap>
                    <Button icon={<EyeOutlined />} onClick={() => void openBook(item)}>
                      Открыть
                    </Button>
                    <Button danger icon={<DeleteOutlined />} onClick={() => void handleRemoveFavorite(item)}>
                      Удалить
                    </Button>
                  </Space>
                </div>
              </Card>
            ))}
          </Space>
        ) : (
          <Empty description="В сохранённых книгах пока пусто" />
        )}
      </Card>
    </Space>
  )
}

export default FavoritesPage
