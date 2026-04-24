import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  LinkOutlined,
  ReadOutlined,
  UploadOutlined,
} from '@ant-design/icons'
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
  Segmented,
  Select,
  Skeleton,
  Space,
  Statistic,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLibrary } from '../hooks/useLibrary.js'

const importModes = [
  { label: 'Вручную', value: 'manual', icon: <FileTextOutlined /> },
  { label: 'По ссылке', value: 'link', icon: <LinkOutlined /> },
  { label: 'Из папки', value: 'folder', icon: <FolderOpenOutlined /> },
]

const TeacherPage = () => {
  const navigate = useNavigate()
  const [manualForm] = Form.useForm()
  const [linkForm] = Form.useForm()
  const [folderForm] = Form.useForm()
  const [categoryForm] = Form.useForm()
  const {
    currentUser,
    categories,
    stats,
    isBootstrapping,
    loadBooks,
    loadBook,
    saveBook,
    importBookByLink,
    importBooksFromFolder,
    deleteBook,
    togglePublish,
    createCategory,
    deleteCategory,
    notifyError,
    notifySuccess,
  } = useLibrary()

  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingBookId, setEditingBookId] = useState(null)
  const [importMode, setImportMode] = useState('manual')

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
      title: 'Открытия',
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
          {record.readerType === 'text' ? (
            <Button
              icon={<EditOutlined />}
              onClick={async () => {
                try {
                  const fullBook = await loadBook(record.id)
                  setEditingBookId(record.id)
                  setImportMode('manual')
                  manualForm.setFieldsValue({
                    title: fullBook.title,
                    author: fullBook.author,
                    categoryId: fullBook.categoryId,
                    theme: fullBook.theme,
                    description: fullBook.description,
                    estimatedMinutes: fullBook.estimatedMinutes,
                    coverTone: fullBook.coverTone,
                    publishYear: fullBook.publishYear,
                    content: fullBook.content?.join('\n\n') || '',
                    published: fullBook.published,
                  })
                } catch (error) {
                  notifyError(error.message)
                }
              }}
            >
              Редактировать
            </Button>
          ) : null}
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
    return <Result status="403" title="Нет доступа" subTitle="Студенты не могут заходить в фонд." />
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
            <Statistic title="Открытия" value={stats?.teacherStats?.totalViews || 0} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={16}>
          <Card className="feature-surface">
            <div className="section-head">
              <Typography.Title level={3} style={{ margin: 0 }}>
                Загрузка фонда
              </Typography.Title>
              <Segmented
                options={importModes.map((item) => ({
                  label: (
                    <span className="segmented-label">
                      {item.icon}
                      {item.label}
                    </span>
                  ),
                  value: item.value,
                }))}
                value={importMode}
                onChange={setImportMode}
              />
            </div>

            {importMode === 'manual' ? (
              <Form
                form={manualForm}
                layout="vertical"
                initialValues={{
                  published: false,
                  estimatedMinutes: 12,
                  coverTone: '#4F46E5',
                  publishYear: new Date().getFullYear(),
                }}
                onFinish={async (values) => {
                  try {
                    await saveBook(
                      {
                        title: values.title,
                        author: values.author,
                        categoryId: values.categoryId,
                        theme: values.theme,
                        description: values.description,
                        content: values.content,
                        published: Boolean(values.published),
                        estimatedMinutes: values.estimatedMinutes,
                        coverTone: values.coverTone,
                        publishYear: values.publishYear,
                      },
                      editingBookId,
                    )
                    notifySuccess(editingBookId ? 'Книга обновлена.' : 'Книга добавлена.')
                    setEditingBookId(null)
                    manualForm.resetFields()
                    await fetchBooks()
                  } catch (error) {
                    notifyError(error.message)
                  }
                }}
              >
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item name="title" label="Название" rules={[{ required: true, message: 'Введите название.' }]}>
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name="author" label="Автор" rules={[{ required: true, message: 'Введите автора.' }]}>
                      <Input />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col xs={24} md={8}>
                    <Form.Item name="categoryId" label="Раздел" rules={[{ required: true, message: 'Выберите раздел.' }]}>
                      <Select options={categories.map((category) => ({ value: category.id, label: category.name }))} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item name="theme" label="Тема">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={4}>
                    <Form.Item name="publishYear" label="Год">
                      <Input type="number" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={4}>
                    <Form.Item name="estimatedMinutes" label="Минуты">
                      <Input type="number" min={5} />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item name="coverTone" label="Цвет">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name="description" label="Описание">
                      <Input />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item name="content" label="Текст книги" rules={[{ required: true, message: 'Добавьте текст.' }]}>
                  <Input.TextArea rows={10} placeholder={'Первый раздел...\n\nВторой раздел...'} />
                </Form.Item>
                <Form.Item name="published" label="Опубликовать" valuePropName="checked">
                  <Switch />
                </Form.Item>
                <Space wrap>
                  <Button type="primary" htmlType="submit" icon={<UploadOutlined />}>
                    {editingBookId ? 'Сохранить' : 'Добавить'}
                  </Button>
                  {editingBookId ? (
                    <Button onClick={() => {
                      setEditingBookId(null)
                      manualForm.resetFields()
                    }}>
                      Отменить редактирование
                    </Button>
                  ) : null}
                </Space>
              </Form>
            ) : null}

            {importMode === 'link' ? (
              <Form
                form={linkForm}
                layout="vertical"
                initialValues={{
                  published: true,
                  estimatedMinutes: 12,
                  coverTone: '#0F172A',
                  publishYear: new Date().getFullYear(),
                }}
                onFinish={async (values) => {
                  try {
                    await importBookByLink(values)
                    notifySuccess('Книга импортирована по ссылке.')
                    linkForm.resetFields()
                    await fetchBooks()
                  } catch (error) {
                    notifyError(error.message)
                  }
                }}
              >
                <Row gutter={16}>
                  <Col xs={24} md={16}>
                    <Form.Item name="sourceUrl" label="Ссылка" rules={[{ required: true, message: 'Введите ссылку.' }]}>
                      <Input placeholder="https://example.com/book.pdf" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item name="categoryId" label="Раздел" rules={[{ required: true, message: 'Выберите раздел.' }]}>
                      <Select options={categories.map((category) => ({ value: category.id, label: category.name }))} />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col xs={24} md={8}>
                    <Form.Item name="title" label="Название">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item name="author" label="Автор">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item name="theme" label="Тема">
                      <Input />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col xs={24} md={8}>
                    <Form.Item name="publishYear" label="Год">
                      <Input type="number" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item name="estimatedMinutes" label="Минуты">
                      <Input type="number" min={5} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item name="coverTone" label="Цвет">
                      <Input />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item name="description" label="Описание">
                  <Input />
                </Form.Item>
                <Form.Item name="published" label="Опубликовать" valuePropName="checked">
                  <Switch />
                </Form.Item>
                <Button type="primary" htmlType="submit" icon={<LinkOutlined />}>
                  Импортировать по ссылке
                </Button>
              </Form>
            ) : null}

            {importMode === 'folder' ? (
              <Form
                form={folderForm}
                layout="vertical"
                initialValues={{
                  published: false,
                  estimatedMinutes: 15,
                  coverTone: '#0EA5E9',
                  publishYear: new Date().getFullYear(),
                }}
                onFinish={async (values) => {
                  try {
                    const result = await importBooksFromFolder(values)
                    notifySuccess(`Импортировано книг: ${result.createdCount}`)
                    folderForm.resetFields()
                    await fetchBooks()
                  } catch (error) {
                    notifyError(error.message)
                  }
                }}
              >
                <Form.Item name="folderPath" label="Путь к папке" rules={[{ required: true, message: 'Введите путь к папке.' }]}>
                  <Input placeholder="C:\\Books\\School" />
                </Form.Item>
                <Row gutter={16}>
                  <Col xs={24} md={8}>
                    <Form.Item name="categoryId" label="Раздел" rules={[{ required: true, message: 'Выберите раздел.' }]}>
                      <Select options={categories.map((category) => ({ value: category.id, label: category.name }))} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item name="author" label="Автор по умолчанию">
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item name="theme" label="Тема">
                      <Input />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col xs={24} md={8}>
                    <Form.Item name="publishYear" label="Год">
                      <Input type="number" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item name="estimatedMinutes" label="Минуты">
                      <Input type="number" min={5} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item name="coverTone" label="Цвет">
                      <Input />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item name="description" label="Описание">
                  <Input />
                </Form.Item>
                <Form.Item name="published" label="Опубликовать" valuePropName="checked">
                  <Switch />
                </Form.Item>
                <Button type="primary" htmlType="submit" icon={<FolderOpenOutlined />}>
                  Импортировать папку
                </Button>
              </Form>
            ) : null}
          </Card>
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
              <Form.Item name="name" label="Новый раздел" rules={[{ required: true, message: 'Введите название.' }]}>
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
