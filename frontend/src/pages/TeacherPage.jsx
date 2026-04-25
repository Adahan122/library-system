import { DeleteOutlined, EyeOutlined, ReadOutlined } from '@ant-design/icons'
import {
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  Modal,
  Result,
  Row,
  Skeleton,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Upload from '../components/Upload.jsx'
import { useLibrary } from '../hooks/useLibrary.js'
import { getBookPublicationLabel } from '../utils/formatters.js'

const TeacherPage = () => {
  const navigate = useNavigate()
  const [categoryForm] = Form.useForm()
  const {
    currentUser,
    categories,
    stats,
    isBootstrapping,
    loadBooks,
    deleteBook,
    togglePublish,
    createCategory,
    deleteCategory,
    notifyError,
    notifySuccess,
  } = useLibrary()

  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchBooks = async () => {
    setLoading(true)

    try {
      const data = await loadBooks({ sort: 'new' })
      setBooks(data)
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

    if (currentUser?.role === 'teacher') {
      void bootstrap()
    }

    return () => {
      disposed = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.role])

  const columns = [
    {
      title: 'Книга',
      dataIndex: 'title',
      key: 'title',
      render: (value, record) => (
        <div>
          <Typography.Text strong>{value}</Typography.Text>
          <br />
          <Typography.Text className="muted-copy">
            {record.author} • {record.categoryName}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Дата публикации',
      dataIndex: 'publishDate',
      key: 'publishDate',
      render: (_, record) => getBookPublicationLabel(record),
    },
    {
      title: 'Формат',
      dataIndex: 'readerType',
      key: 'readerType',
      render: (_, record) => (
        <Space wrap>
          <Tag color={record.readerType === 'file' ? 'blue' : 'purple'}>
            {record.readerType === 'file' ? String(record.format).toUpperCase() : 'Текст'}
          </Tag>
          <Tag>{record.sourceLabel}</Tag>
        </Space>
      ),
    },
    {
      title: 'Статус',
      dataIndex: 'published',
      key: 'published',
      render: (value) => (
        <Tag color={value ? 'green' : 'orange'}>{value ? 'Опубликовано' : 'Черновик'}</Tag>
      ),
    },
    {
      title: 'Просмотры',
      dataIndex: 'openCount',
      key: 'openCount',
    },
    {
      title: 'Действия',
      key: 'actions',
      align: 'right',
      render: (_, record) => (
        <Space wrap>
          <Button icon={<EyeOutlined />} onClick={() => navigate(`/reader/${record.id}`)}>
            Открыть
          </Button>
          <Button
            onClick={async () => {
              try {
                await togglePublish(record)
                await fetchBooks()
              } catch (error) {
                notifyError(error.message)
              }
            }}
          >
            {record.published ? 'Снять с публикации' : 'Опубликовать'}
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              Modal.confirm({
                title: 'Удалить книгу?',
                content: 'Книга будет удалена из фонда.',
                okText: 'Удалить',
                cancelText: 'Отмена',
                okButtonProps: { danger: true },
                onOk: async () => {
                  try {
                    await deleteBook(record.id)
                    await fetchBooks()
                  } catch (error) {
                    notifyError(error.message)
                  }
                },
              })
            }}
          />
        </Space>
      ),
    },
  ]

  if (isBootstrapping) {
    return <Skeleton active paragraph={{ rows: 12 }} />
  }

  if (currentUser?.role !== 'teacher') {
    return (
      <Result
        status="403"
        title="Нет доступа"
        subTitle="Студенты не могут заходить в фонд."
      />
    )
  }

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <Row gutter={[18, 18]}>
        <Col xs={24} md={8} xl={4}>
          <Card className="feature-surface stat-card">
            <Statistic title="Всего книг" value={stats?.teacherStats?.totalBooks || 0} />
          </Card>
        </Col>
        <Col xs={24} md={8} xl={4}>
          <Card className="feature-surface stat-card">
            <Statistic title="Опубликовано" value={stats?.teacherStats?.publishedCount || 0} />
          </Card>
        </Col>
        <Col xs={24} md={8} xl={4}>
          <Card className="feature-surface stat-card">
            <Statistic title="Черновики" value={stats?.teacherStats?.draftCount || 0} />
          </Card>
        </Col>
        <Col xs={24} md={8} xl={4}>
          <Card className="feature-surface stat-card">
            <Statistic title="Разделы" value={stats?.teacherStats?.categoryCount || 0} />
          </Card>
        </Col>
        <Col xs={24} md={8} xl={4}>
          <Card className="feature-surface stat-card">
            <Statistic title="Студенты" value={stats?.teacherStats?.studentCount || 0} />
          </Card>
        </Col>
        <Col xs={24} md={8} xl={4}>
          <Card className="feature-surface stat-card">
            <Statistic title="Просмотры" value={stats?.teacherStats?.totalViews || 0} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={16}>
          <Upload embedded onUploaded={fetchBooks} />
        </Col>

        <Col xs={24} lg={8}>
          <Card className="feature-surface">
            <Typography.Title level={4} style={{ marginTop: 0 }}>
              Разделы фонда
            </Typography.Title>
            <Form
              form={categoryForm}
              layout="vertical"
              onFinish={async ({ name }) => {
                try {
                  await createCategory(name)
                  notifySuccess('Раздел создан.')
                  categoryForm.resetFields()
                } catch (error) {
                  notifyError(error.message)
                }
              }}
            >
              <Form.Item
                name="name"
                label="Новый раздел"
                rules={[{ required: true, message: 'Введите название.' }]}
              >
                <Input />
              </Form.Item>
              <Button type="primary" htmlType="submit">
                Добавить раздел
              </Button>
            </Form>

            <div className="category-list">
              {categories.length ? (
                categories.map((category) => (
                  <Tag
                    key={category.id}
                    closable
                    onClose={(event) => {
                      event.preventDefault()
                      deleteCategory(category.id)
                        .then(() => notifySuccess('Раздел удален.'))
                        .catch((error) => notifyError(error.message))
                    }}
                  >
                    {category.name}
                  </Tag>
                ))
              ) : (
                <Empty description="Разделов пока нет" />
              )}
            </div>
          </Card>
        </Col>
      </Row>

      <Card className="feature-surface">
        <div className="section-head">
          <Typography.Title level={3} style={{ margin: 0 }}>
            Каталог фонда
          </Typography.Title>
          <Button icon={<ReadOutlined />} onClick={() => navigate('/library')}>
            Открыть каталог
          </Button>
        </div>
        <Table
          loading={loading}
          rowKey="id"
          columns={columns}
          dataSource={books}
          pagination={false}
          locale={{ emptyText: <Empty description="Книг пока нет" /> }}
        />
      </Card>
    </Space>
  )
}

export default TeacherPage
