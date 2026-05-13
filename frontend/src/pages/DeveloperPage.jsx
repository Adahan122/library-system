import {
  DeleteOutlined,
  LogoutOutlined,
  ReadOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
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
  Select,
  Skeleton,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd'
import { useEffect, useMemo, useState } from 'react'
import Upload from '../components/Upload.jsx'
import { useLibrary } from '../hooks/useLibrary.js'
import {
  formatDateTime,
  getBookPublicationLabel,
  getUserDisplayName,
  getUserRoleLabel,
} from '../utils/formatters.js'

const roleOptions = [
  { label: 'Студент', value: 'student' },
  { label: 'Преподаватель', value: 'teacher' },
]

const roleFilterOptions = [
  { label: 'Все', value: 'all' },
  { label: 'Студенты', value: 'student' },
  { label: 'Преподаватели', value: 'teacher' },
]

const DeveloperPage = () => {
  const [categoryForm] = Form.useForm()
  const {
    currentUser,
    categories,
    stats,
    isBootstrapping,
    refreshShared,
    logout,
    loadBooks,
    deleteBook,
    togglePublish,
    createCategory,
    deleteCategory,
    loadAdminUsers,
    updateAdminUserRole,
    deleteAdminUser,
    notifyError,
    notifySuccess,
    openBook,
  } = useLibrary()

  const [books, setBooks] = useState([])
  const [users, setUsers] = useState([])
  const [booksLoading, setBooksLoading] = useState(true)
  const [usersLoading, setUsersLoading] = useState(true)
  const [userSearch, setUserSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const fetchBooks = async () => {
    setBooksLoading(true)
    try {
      const data = await loadBooks({ sort: 'new' })
      setBooks(data)
    } catch (error) {
      notifyError(error.message)
    } finally {
      setBooksLoading(false)
    }
  }

  const fetchUsers = async () => {
    setUsersLoading(true)
    try {
      const data = await loadAdminUsers()
      setUsers(data)
    } catch (error) {
      notifyError(error.message)
    } finally {
      setUsersLoading(false)
    }
  }

  useEffect(() => {
    if (currentUser?.role !== 'developer') {
      return
    }

    void fetchBooks()
    void fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.role])

  const filteredUsers = useMemo(() => {
    const search = userSearch.trim().toLowerCase()

    return users.filter((user) => {
      if (roleFilter !== 'all' && user.role !== roleFilter) {
        return false
      }

      if (!search) {
        return true
      }

      const haystack = `${getUserDisplayName(user)} ${user.email} ${getUserRoleLabel(user.role)}`.toLowerCase()
      return haystack.includes(search)
    })
  }, [roleFilter, userSearch, users])

  const studentUsers = users.filter((user) => user.role === 'student')
  const teacherUsers = users.filter((user) => user.role === 'teacher')
  const activeStudents = studentUsers.filter((user) => user.activeBooks > 0).length
  const commentingStudents = studentUsers.filter((user) => user.commentCount > 0 || user.replyCount > 0).length
  const teachingAuthors = teacherUsers.filter((user) => user.publishedBookCount > 0).length
  const topStudent = [...studentUsers].sort(
    (left, right) => (right.commentCount || 0) + (right.replyCount || 0) - ((left.commentCount || 0) + (left.replyCount || 0)),
  )[0]
  const mostActiveUser = [...users].sort((left, right) => {
    if (!left.lastActivityAt && !right.lastActivityAt) {
      return 0
    }

    if (!left.lastActivityAt) {
      return 1
    }

    if (!right.lastActivityAt) {
      return -1
    }

    return new Date(right.lastActivityAt) - new Date(left.lastActivityAt)
  })[0]

  const developerStats = stats?.developerStats || {}
  const databaseMonitor = developerStats.database || {}

  const formatStorageSize = (value) => {
    const bytes = Number(value || 0)

    if (!Number.isFinite(bytes) || bytes <= 0) {
      return '0 Б'
    }

    if (bytes >= 1024 ** 3) {
      return `${(bytes / 1024 ** 3).toFixed(2)} ГБ`
    }

    if (bytes >= 1024 ** 2) {
      return `${(bytes / 1024 ** 2).toFixed(2)} МБ`
    }

    if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(1)} КБ`
    }

    return `${bytes} Б`
  }

  const getStorageStatusLabel = (store) => {
    if (store?.ok) {
      return 'Все окей'
    }

    return store?.exists === false ? 'Файл не найден' : 'Нужна проверка'
  }

  const databaseStores = [
    {
      key: 'jsonStore',
      title: 'Node data.json',
      description: 'Пользователи, роли, книги и история чтения.',
      data: databaseMonitor.jsonStore,
    },
    {
      key: 'sqliteStore',
      title: 'Django db.sqlite3',
      description: 'Локальная SQLite-база для PDF/EPUB и Django-сервиса.',
      data: databaseMonitor.sqliteStore,
    },
  ]

  const bookColumns = [
    {
      title: 'Книга',
      dataIndex: 'title',
      key: 'title',
      render: (value, record) => (
        <div>
          <Typography.Text strong>{value}</Typography.Text>
          <br />
          <Typography.Text className="muted-copy">
            {[record.author, record.categoryName].filter(Boolean).join(' • ')}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Публикация',
      dataIndex: 'publishDate',
      key: 'publishDate',
      render: (_, record) => getBookPublicationLabel(record),
    },
    {
      title: 'Статус',
      dataIndex: 'published',
      key: 'published',
      render: (value) => <Tag color={value ? 'green' : 'orange'}>{value ? 'Опубликовано' : 'Черновик'}</Tag>,
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
          <Button icon={<ReadOutlined />} onClick={() => void openBook(record)}>
            Открыть
          </Button>
          <Button
            onClick={async () => {
              try {
                await togglePublish(record)
                notifySuccess(record.published ? 'Книга снята с публикации.' : 'Книга опубликована.')
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
                content: 'Книга будет удалена из фонда для всех пользователей.',
                okText: 'Удалить',
                cancelText: 'Отмена',
                okButtonProps: { danger: true },
                onOk: async () => {
                  try {
                    await deleteBook(record.id)
                    notifySuccess('Книга удалена.')
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

  const userColumns = [
    {
      title: 'Пользователь',
      dataIndex: 'name',
      key: 'name',
      render: (_, record) => (
        <div>
          <Typography.Text strong>{getUserDisplayName(record)}</Typography.Text>
          <br />
          <Typography.Text className="muted-copy">{record.email}</Typography.Text>
          <br />
          <Typography.Text className="muted-copy">
            {record.lastActivityAt ? `Активность: ${formatDateTime(record.lastActivityAt)}` : 'Активность пока не зафиксирована'}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Роль',
      dataIndex: 'role',
      key: 'role',
      render: (value, record) => (
        <Select
          value={value}
          size="small"
          style={{ minWidth: 160 }}
          options={roleOptions}
          onChange={async (nextRole) => {
            try {
              await updateAdminUserRole(record.id, nextRole)
              notifySuccess('Роль обновлена.')
              await fetchUsers()
            } catch (error) {
              notifyError(error.message)
            }
          }}
        />
      ),
    },
    {
      title: 'Активность',
      key: 'activity',
      render: (_, record) => (
        <Space wrap>
          <Tag>{record.favoriteCount || 0} сохран.</Tag>
          <Tag>{record.activeBooks || 0} читают</Tag>
          <Tag>{record.completedBooks || 0} заверш.</Tag>
          <Tag>{record.viewCount || 0} открытий</Tag>
          <Tag>{record.commentCount || 0} комм.</Tag>
          <Tag>{record.replyCount || 0} ответов</Tag>
          {record.role === 'teacher' ? (
            <Tag color="blue">{record.publishedBookCount || 0} публикаций</Tag>
          ) : null}
        </Space>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      align: 'right',
      render: (_, record) => (
        <Button
          danger
          icon={<DeleteOutlined />}
          onClick={() => {
            Modal.confirm({
              title: 'Удалить пользователя?',
              content: `Будет удалён аккаунт ${getUserDisplayName(record)} и связанные данные чтения.`,
              okText: 'Удалить',
              cancelText: 'Отмена',
              okButtonProps: { danger: true },
              onOk: async () => {
                try {
                  await deleteAdminUser(record.id)
                  notifySuccess('Пользователь удалён.')
                  await fetchUsers()
                } catch (error) {
                  notifyError(error.message)
                }
              },
            })
          }}
        >
          Удалить
        </Button>
      ),
    },
  ]

  if (isBootstrapping) {
    return <Skeleton active paragraph={{ rows: 14 }} />
  }

  if (currentUser?.role !== 'developer') {
    return (
      <Result
        status="403"
        title="Нет доступа"
        subTitle="Эта dev-панель доступна только разработчику."
      />
    )
  }

  return (
    <Space direction="vertical" size={24} style={{ width: '100%', padding: '24px' }}>
      <Card className="feature-surface developer-hero">
        <div className="developer-topbar">
          <div>
            <Tag color="red">Hidden developer zone</Tag>
            <Typography.Title level={2} style={{ margin: '12px 0 8px' }}>
              Dev Admin Panel
            </Typography.Title>
            <Typography.Paragraph className="muted-copy" style={{ marginBottom: 0 }}>
              Полный контроль над пользователями, книгами, ролями, разделами и активностью библиотеки.
            </Typography.Paragraph>
          </div>
          <Space wrap>
            <Button icon={<ReloadOutlined />} onClick={() => void fetchUsers()}>
              Обновить пользователей
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => void fetchBooks()}>
              Обновить книги
            </Button>
            <Button icon={<LogoutOutlined />} onClick={() => void logout()}>
              Выйти
            </Button>
          </Space>
        </div>
      </Card>

      <Row gutter={[18, 18]}>
        <Col xs={24} md={12} xl={3}>
          <Card className="feature-surface stat-card">
            <Statistic title="Пользователи" value={developerStats.totalUsers || 0} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={3}>
          <Card className="feature-surface stat-card">
            <Statistic title="Админ" value={developerStats.developerCount || 1} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={3}>
          <Card className="feature-surface stat-card">
            <Statistic title="Студенты" value={developerStats.studentCount || 0} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={3}>
          <Card className="feature-surface stat-card">
            <Statistic title="Преподаватели" value={developerStats.teacherCount || 0} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={3}>
          <Card className="feature-surface stat-card">
            <Statistic title="Книги" value={developerStats.totalBooks || 0} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={3}>
          <Card className="feature-surface stat-card">
            <Statistic title="Комментарии" value={developerStats.commentCount || 0} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={3}>
          <Card className="feature-surface stat-card">
            <Statistic title="Ответы" value={developerStats.replyCount || 0} />
          </Card>
        </Col>
        <Col xs={24} md={12} xl={3}>
          <Card className="feature-surface stat-card">
            <Statistic title="Лайки" value={developerStats.commentLikeCount || 0} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[20, 20]}>
        <Col xs={24} xl={8}>
          <Card className="feature-surface developer-role-card">
            <Tag color="blue">Анализ студентов</Tag>
            <Typography.Title level={3} style={{ margin: '12px 0 10px' }}>
              Студенческая активность
            </Typography.Title>
            <div className="profile-meta-list">
              <div className="summary-row">
                <span>Всего студентов</span>
                <strong>{studentUsers.length}</strong>
              </div>
              <div className="summary-row">
                <span>Активно читают</span>
                <strong>{activeStudents}</strong>
              </div>
              <div className="summary-row">
                <span>Комментируют</span>
                <strong>{commentingStudents}</strong>
              </div>
              <div className="summary-row">
                <span>Лидер обсуждений</span>
                <strong>{topStudent ? getUserDisplayName(topStudent) : 'Пока нет'}</strong>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card className="feature-surface developer-role-card">
            <Tag color="green">Анализ преподавателей</Tag>
            <Typography.Title level={3} style={{ margin: '12px 0 10px' }}>
              Управление фондом
            </Typography.Title>
            <div className="profile-meta-list">
              <div className="summary-row">
                <span>Всего преподавателей</span>
                <strong>{teacherUsers.length}</strong>
              </div>
              <div className="summary-row">
                <span>С публикациями</span>
                <strong>{teachingAuthors}</strong>
              </div>
              <div className="summary-row">
                <span>Опубликовано книг</span>
                <strong>{developerStats.publishedCount || 0}</strong>
              </div>
              <div className="summary-row">
                <span>Черновиков</span>
                <strong>{developerStats.draftCount || 0}</strong>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card className="feature-surface developer-role-card">
            <Tag color="red">Анализ панели</Tag>
            <Typography.Title level={3} style={{ margin: '12px 0 10px' }}>
              Состояние dev-зоны
            </Typography.Title>
            <div className="profile-meta-list">
              <div className="summary-row">
                <span>Скрытый админ</span>
                <strong>{developerStats.developerCount || 1}</strong>
              </div>
              <div className="summary-row">
                <span>Активные читатели</span>
                <strong>{developerStats.activeReaders || 0}</strong>
              </div>
              <div className="summary-row">
                <span>Сохранений книг</span>
                <strong>{developerStats.favoritesCount || 0}</strong>
              </div>
              <div className="summary-row">
                <span>Последняя активность</span>
                <strong>{mostActiveUser ? getUserDisplayName(mostActiveUser) : 'Пока нет'}</strong>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card className="feature-surface">
        <div className="section-head">
          <div>
            <Tag color={databaseMonitor.ok ? 'green' : 'orange'}>
              {databaseMonitor.ok ? 'Все окей' : 'Нужна проверка'}
            </Tag>
            <Typography.Title level={3} style={{ margin: '12px 0 8px' }}>
              Мониторинг базы
            </Typography.Title>
            <Typography.Text className="muted-copy">
              {databaseMonitor.checkedAt
                ? `Последняя проверка: ${formatDateTime(databaseMonitor.checkedAt)}`
                : 'Последняя проверка появится после обновления статистики.'}
            </Typography.Text>
          </div>
          <Button icon={<ReloadOutlined />} onClick={() => void refreshShared()}>
            Обновить мониторинг
          </Button>
        </div>

        <Row gutter={[16, 16]}>
          {databaseStores.map(({ key, title, description, data: store }) => (
            <Col xs={24} lg={12} key={key}>
              <Card size="small" className="developer-role-card">
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <div>
                    <Space wrap>
                      <Tag color={store?.ok ? 'green' : 'orange'}>{getStorageStatusLabel(store)}</Tag>
                      <Typography.Text strong>{title}</Typography.Text>
                    </Space>
                    <Typography.Paragraph className="muted-copy" style={{ margin: '12px 0 0' }}>
                      {description}
                    </Typography.Paragraph>
                  </div>

                  <div className="profile-meta-list">
                    <div className="summary-row">
                      <span>Путь</span>
                      <strong>{store?.path || 'Нет данных'}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Размер</span>
                      <strong>{formatStorageSize(store?.size)}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Обновлён</span>
                      <strong>{store?.updatedAt ? formatDateTime(store.updatedAt) : 'Нет данных'}</strong>
                    </div>
                    {store?.records ? (
                      <>
                        <div className="summary-row">
                          <span>Пользователи</span>
                          <strong>{store.records.users || 0}</strong>
                        </div>
                        <div className="summary-row">
                          <span>Книги</span>
                          <strong>{store.records.books || 0}</strong>
                        </div>
                        <div className="summary-row">
                          <span>Комментарии</span>
                          <strong>{store.records.comments || 0}</strong>
                        </div>
                      </>
                    ) : (
                      <div className="summary-row">
                        <span>Состояние</span>
                        <strong>{store?.exists ? 'Подключено' : 'Нет файла'}</strong>
                      </div>
                    )}
                  </div>

                  {store?.error ? <Typography.Text type="danger">{`Ошибка: ${store.error}`}</Typography.Text> : null}
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

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
                        .then(() => {
                          notifySuccess('Раздел удалён.')
                        })
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
          <div>
            <Typography.Title level={3} style={{ margin: 0 }}>
              Пользователи
            </Typography.Title>
            <Typography.Text className="muted-copy">
              Поиск по имени, email и роли внутри скрытой панели разработчика.
            </Typography.Text>
          </div>
          <SafetyCertificateOutlined className="section-icon" />
        </div>

        <div className="admin-filter-row">
          <Input
            allowClear
            size="large"
            prefix={<SearchOutlined />}
            placeholder="Поиск по пользователям"
            value={userSearch}
            onChange={(event) => setUserSearch(event.target.value)}
          />
          <Select size="large" value={roleFilter} options={roleFilterOptions} onChange={setRoleFilter} />
        </div>

        <Table
          loading={usersLoading}
          rowKey="id"
          columns={userColumns}
          dataSource={filteredUsers}
          pagination={false}
          locale={{ emptyText: <Empty description="Пользователи не найдены" /> }}
        />
      </Card>

      <Card className="feature-surface">
        <div className="section-head">
          <Typography.Title level={3} style={{ margin: 0 }}>
            Все книги фонда
          </Typography.Title>
          <Button icon={<ReloadOutlined />} onClick={() => void fetchBooks()}>
            Обновить
          </Button>
        </div>
        <Table
          loading={booksLoading}
          rowKey="id"
          columns={bookColumns}
          dataSource={books}
          pagination={false}
          locale={{ emptyText: <Empty description="Книги пока не найдены" /> }}
        />
      </Card>
    </Space>
  )
}

export default DeveloperPage
