import { useEffect, useState } from 'react'
import { Avatar, Button, Card, Empty, Space, Tag, Typography } from 'antd'
import { BookOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons'
import { useLibrary } from '../hooks/useLibrary.js'

const FavoritesPage = () => {
  const { loadBooks, toggleFavorite, trackView, notifyError } = useLibrary()
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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchFavorites()
    }, 0)

    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Space orientation="vertical" size={24} style={{ width: '100%' }}>
      <Card className="glass-card hero-panel">
        <Tag className="hero-tag" variant="filled">
          Избранное
        </Tag>
        <Typography.Title level={2} style={{ margin: '16px 0 8px' }}>
          Ваши любимые книги
        </Typography.Title>
        <Typography.Paragraph className="section-description">
          Здесь собраны публикации, которые вы отметили как понравившиеся.
        </Typography.Paragraph>
      </Card>

      <Card className="glass-card" loading={loading}>
        {favorites.length ? (
          <Space orientation="vertical" size={12} style={{ width: '100%' }}>
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
                    <Button
                      icon={<EyeOutlined />}
                      onClick={async () => {
                        await trackView(item.id)
                      }}
                    >
                      Открыть
                    </Button>
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      onClick={async () => {
                        await toggleFavorite(item)
                        await fetchFavorites()
                      }}
                    >
                      Удалить
                    </Button>
                  </Space>
                </div>
              </Card>
            ))}
          </Space>
        ) : (
          <Empty description="В избранном пока пусто" />
        )}
      </Card>
    </Space>
  )
}

export default FavoritesPage
