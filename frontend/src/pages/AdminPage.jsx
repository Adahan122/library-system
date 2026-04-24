import { useEffect, useState } from 'react'
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
  Select,
  Skeleton,
  Space,
  Statistic,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import { DeleteOutlined, EditOutlined, LockOutlined, PlusOutlined } from '@ant-design/icons'
import { useLibrary } from '../hooks/useLibrary.js'

const AdminPage = () => {
  const {
    categories,
    stats,
    isAdmin,
    isBootstrapping,
    loginAdmin,
    loadBooks,
    saveBook,
    deleteBook,
    togglePublish,
    createCategory,
    deleteCategory,
    notifyError,
  } = useLibrary()
  const [loginForm] = Form.useForm()
  const [bookForm] = Form.useForm()
  const [categoryForm] = Form.useForm()
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingBookId, setEditingBookId] = useState(null)
  const [savedTitle, setSavedTitle] = useState('')
  const [isSavedOpen, setIsSavedOpen] = useState(false)

  const fetchAdminBooks = async () => {
    setLoading(true)
    try {
      const data = await loadBooks()
      setBooks(data)
    } catch (error) {
      notifyError(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (isAdmin) {
        void fetchAdminBooks()
      } else {
        setLoading(false)
      }
    }, 0)

    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  const handleBookSubmit = async (values) => {
    try {
      await saveBook(
        {
          title: values.title,
          author: values.author,
          categoryId: values.categoryId,
          theme: values.theme,
          description: values.description,
          published: Boolean(values.published),
        },
        editingBookId,
      )
      setSavedTitle(values.title)
      setIsSavedOpen(true)
      setEditingBookId(null)
      bookForm.resetFields()
      await fetchAdminBooks()
    } catch (error) {
      notifyError(error.message)
    }
  }

  const handleCategorySubmit = async ({ name }) => {
    try {
      await createCategory(name)
      categoryForm.resetFields()
    } catch (error) {
      notifyError(error.message)
    }
  }

  const columns = [
    {
      title: 'Книга',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: 'Автор',
      dataIndex: 'author',
      key: 'author',
    },
    {
      title: 'Категория',
      dataIndex: 'categoryName',
      key: 'categoryName',
      render: (value) => <Tag>{value}</Tag>,
    },
    {
      title: 'Статус',
      dataIndex: 'published',
      key: 'published',
      render: (value) => <Tag color={value ? 'green' : 'orange'}>{value ? 'Опубликована' : 'Черновик'}</Tag>,
    },
    {
      title: 'Действия',
      key: 'actions',
      align: 'right',
      render: (_, record) => (
        <Space wrap>
          <Tooltip title="Редактировать">
            <Button
              icon={<EditOutlined />}
              onClick={() => {
                setEditingBookId(record.id)
                bookForm.setFieldsValue({
                  title: record.title,
                  author: record.author,
                  categoryId: record.categoryId,
                  theme: record.theme,
                  description: record.description,
                  published: record.published,
                })
              }}
            />
          </Tooltip>
          <Button
            onClick={async () => {
              await togglePublish(record)
              await fetchAdminBooks()
            }}
          >
            {record.published ? 'В черновик' : 'Опубликовать'}
          </Button>
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => {
              Modal.confirm({
                title: 'Удалить книгу?',
                content: 'Книга будет удалена из каталога.',
                okText: 'Удалить',
                cancelText: 'Отмена',
                okButtonProps: { danger: true },
                onOk: async () => {
                  await deleteBook(record.id)
                  await fetchAdminBooks()
                },
              })
            }}
          />
        </Space>
      ),
    },
  ]

  if (isBootstrapping) {
    return <Skeleton active paragraph={{ rows: 10 }} />
  }

  if (!isAdmin) {
    return (
      <Card className="glass-card form-card">
        <Space orientation="vertical" size={12} style={{ width: '100%' }}>
          <Tag className="section-tag">Администратор</Tag>
          <Typography.Title level={2} style={{ margin: 0 }}>
            Вход в админ-панель
          </Typography.Title>
          <Typography.Paragraph className="section-description">
            Только администратор может добавлять, редактировать, удалять и публиковать книги.
          </Typography.Paragraph>
        </Space>

        <Form
          form={loginForm}
          layout="vertical"
          className="premium-form"
          onFinish={async ({ password }) => {
            try {
              await loginAdmin(password)
            } catch (error) {
              notifyError(error.message)
            }
          }}
        >
          <Form.Item
            label="Пароль"
            name="password"
            rules={[{ required: true, message: 'Введите пароль администратора' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Введите пароль"
              autoComplete="current-password"
            />
          </Form.Item>
          <Button type="primary" htmlType="submit">
            Войти
          </Button>
        </Form>
      </Card>
    )
  }

  return (
    <Space orientation="vertical" size={24} style={{ width: '100%' }}>
      <Row gutter={[20, 20]}>
        <Col xs={24} md={6}>
          <Card className="glass-card insight-card">
            <Statistic title="Всего книг" value={stats?.adminStats?.totalBooks || 0} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card className="glass-card insight-card">
            <Statistic title="Опубликовано" value={stats?.adminStats?.publishedCount || 0} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card className="glass-card insight-card">
            <Statistic title="Черновики" value={stats?.adminStats?.draftCount || 0} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card className="glass-card insight-card">
            <Statistic title="Категории" value={stats?.adminStats?.categoryCount || 0} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={14}>
          <Card className="glass-card form-card">
            <Typography.Title level={3} style={{ marginTop: 0 }}>
              {editingBookId ? 'Редактирование публикации' : 'Новая публикация'}
            </Typography.Title>
            <Form
              form={bookForm}
              layout="vertical"
              className="premium-form"
              onFinish={handleBookSubmit}
              initialValues={{ published: true }}
            >
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Название книги"
                    name="title"
                    rules={[{ required: true, message: 'Введите название' }]}
                  >
                    <Input placeholder="Например, Маленький принц" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Автор"
                    name="author"
                    rules={[{ required: true, message: 'Введите автора' }]}
                  >
                    <Input placeholder="Например, Антуан де Сент-Экзюпери" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label="Категория"
                    name="categoryId"
                    rules={[{ required: true, message: 'Выберите категорию' }]}
                  >
                    <Select
                      placeholder="Выберите категорию"
                      options={categories.map((category) => ({ value: category.id, label: category.name }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label="Тема" name="theme">
                    <Input placeholder="Например, Приключения" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="Описание" name="description">
                <Input.TextArea rows={4} placeholder="Короткое описание книги" />
              </Form.Item>
              <Form.Item label="Опубликовать сразу" name="published" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Space wrap>
                <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
                  {editingBookId ? 'Сохранить изменения' : 'Добавить публикацию'}
                </Button>
                <Button
                  onClick={() => {
                    setEditingBookId(null)
                    bookForm.resetFields()
                  }}
                >
                  Очистить
                </Button>
              </Space>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card className="glass-card">
            <Typography.Title level={4} style={{ marginTop: 0 }}>
              Категории
            </Typography.Title>
            <Form form={categoryForm} layout="vertical" onFinish={handleCategorySubmit}>
              <Form.Item
                label="Новая категория"
                name="name"
                rules={[{ required: true, message: 'Введите название категории' }]}
              >
                <Input placeholder="Например, Детектив" />
              </Form.Item>
              <Button type="primary" htmlType="submit">
                Добавить категорию
              </Button>
            </Form>
            <Space wrap style={{ marginTop: 16 }}>
              {categories.length ? (
                categories.map((category) => (
                  <Tag
                    key={category.id}
                    closeIcon={<DeleteOutlined />}
                    onClose={(event) => {
                      event.preventDefault()
                      deleteCategory(category.id).catch((error) => notifyError(error.message))
                    }}
                  >
                    {category.name}
                  </Tag>
                ))
              ) : (
                <Empty description="Категорий пока нет" />
              )}
            </Space>
          </Card>
        </Col>
      </Row>

      <Card className="glass-card table-card">
        <Table
          loading={loading}
          columns={columns}
          dataSource={books}
          rowKey="id"
          pagination={false}
          locale={{ emptyText: <Empty description="Публикации не найдены" /> }}
          rowClassName={() => 'premium-table-row'}
        />
      </Card>

      <Modal open={isSavedOpen} footer={null} onCancel={() => setIsSavedOpen(false)} title="Сохранено">
        <Result
          status="success"
          title={savedTitle ? `Публикация "${savedTitle}" сохранена` : 'Изменения сохранены'}
          subTitle="Данные обновились, книга появилась в нужном разделе."
          extra={[
            <Button type="primary" key="close" onClick={() => setIsSavedOpen(false)}>
              Закрыть
            </Button>,
          ]}
        />
      </Modal>
    </Space>
  )
}

export default AdminPage
