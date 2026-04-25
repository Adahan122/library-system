import { useEffect, useState } from 'react'
import { Avatar, Button, Card, Empty, Input, Select, Space, Table, Tag, Tooltip, Typography } from 'antd'
import { BookOutlined, EyeOutlined, HeartFilled, HeartOutlined } from '@ant-design/icons'
import { useLibrary } from '../hooks/useLibrary.js'

const CatalogPage = () => {
  const { categories, favoriteIds, loadBooks, toggleFavorite, trackView, notifyError } = useLibrary()
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [categoryId, setCategoryId] = useState('all')
  const [search, setSearch] = useState('')

  const fetchBooks = async (nextCategoryId = categoryId, nextSearch = search) => {
    setLoading(true)
    try {
      const data = await loadBooks({
        categoryId: nextCategoryId !== 'all' ? nextCategoryId : undefined,
        search: nextSearch || undefined,
      })
      setBooks(data)
    } catch (error) {
      notifyError(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchBooks('all', '')
    }, 0)

    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleToggleFavorite = async (book) => {
    try {
      await toggleFavorite(book)
    } catch (error) {
      notifyError(error.message)
    }
  }

  const columns = [
    {
      title: 'Книга',
      dataIndex: 'title',
      key: 'title',
      render: (value, record) => (
        <Space>
          <Avatar shape="square" className="table-avatar" icon={<BookOutlined />} />
          <div>
            <Typography.Text strong>{value}</Typography.Text>
            <br />
            <Typography.Text type="secondary">{record.author}</Typography.Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Категория',
      dataIndex: 'categoryName',
      key: 'categoryName',
      render: (value) => <Tag>{value}</Tag>,
    },
    {
      title: 'Тема',
      dataIndex: 'theme',
      key: 'theme',
    },
    {
      title: 'Действия',
      key: 'actions',
      align: 'right',
      render: (_, record) => {
        const isFavorite = favoriteIds.includes(record.id)

        return (
          <Space>
            <Tooltip title={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}>
              <Button
                type={isFavorite ? 'primary' : 'default'}
                icon={isFavorite ? <HeartFilled /> : <HeartOutlined />}
                onClick={() => void handleToggleFavorite(record)}
              />
            </Tooltip>
            <Tooltip title="Отметить просмотр">
              <Button
                icon={<EyeOutlined />}
                onClick={async () => {
                  await trackView(record.id)
                }}
              >
                Открыть
              </Button>
            </Tooltip>
          </Space>
        )
      },
    },
  ]

  return (
    <Space orientation="vertical" size={24} style={{ width: '100%' }}>
      <div className="section-heading">
        <div>
          <Tag color="default" className="section-tag">
            Каталог
          </Tag>
          <Typography.Title level={2} style={{ margin: '12px 0 8px' }}>
            Все опубликованные книги
          </Typography.Title>
          <Typography.Paragraph className="section-description">
            Можно фильтровать книги по категориям, искать по темам и добавлять понравившиеся в избранное.
          </Typography.Paragraph>
        </div>
        <Space wrap>
          <Select
            value={categoryId}
            onChange={async (value) => {
              setCategoryId(value)
              await fetchBooks(value, search)
            }}
            style={{ minWidth: 220 }}
            options={[
              { value: 'all', label: 'Все категории' },
              ...categories.map((category) => ({ value: category.id, label: category.name })),
            ]}
          />
          <Input.Search
            placeholder="Поиск по названию, автору или теме"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onSearch={(value) => fetchBooks(categoryId, value)}
            style={{ minWidth: 280 }}
          />
        </Space>
      </div>

      <Card className="glass-card table-card">
        <Table
          loading={loading}
          columns={columns}
          dataSource={books}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: <Empty description="Книги не найдены" /> }}
          rowClassName={() => 'premium-table-row'}
        />
      </Card>
    </Space>
  )
}

export default CatalogPage
