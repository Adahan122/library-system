import {
  BookOutlined,
  ClockCircleOutlined,
  PushpinOutlined,
  ReadOutlined,
  StarOutlined,
} from '@ant-design/icons'
import { Avatar, Button, Card, Col, Empty, Progress, Row, Space, Statistic, Typography } from 'antd'
import { getUserDisplayName, getUserInitial, getUserRoleLabel } from '../utils/formatters.js'

const Profile = ({ user, stats, onOpenBook, onOpenLibrary, onOpenFavorites, onOpenTeacher }) => {
  const isTeacher = user?.role === 'teacher'
  const userStats = stats?.userStats || {}
  const teacherStats = stats?.teacherStats || {}
  const recentBooks = userStats.recentBooks || []
  const savedBooks = userStats.savedBooks || []
  const averageProgressPercent = userStats.averageProgressPercent || 0
  const fullName = getUserDisplayName(user)

  const metricItems = isTeacher
    ? [
        {
          title: 'Книг в фонде',
          value: teacherStats.totalBooks || 0,
          prefix: <BookOutlined />,
        },
        {
          title: 'Опубликовано',
          value: teacherStats.publishedCount || 0,
          prefix: <StarOutlined />,
        },
        {
          title: 'Разделов',
          value: teacherStats.categoryCount || 0,
          prefix: <PushpinOutlined />,
        },
        {
          title: 'Просмотров',
          value: teacherStats.totalViews || 0,
          prefix: <ClockCircleOutlined />,
        },
      ]
    : [
        {
          title: 'Доступные книги',
          value: userStats.totalAvailableBooks || 0,
          prefix: <BookOutlined />,
        },
        {
          title: 'Минут чтения',
          value: userStats.readingMinutes || 0,
          prefix: <ClockCircleOutlined />,
        },
        {
          title: 'Сохранённые книги',
          value: userStats.favoriteCount || 0,
          prefix: <StarOutlined />,
        },
        {
          title: 'Средний прогресс',
          value: averageProgressPercent,
          suffix: '%',
          prefix: <ReadOutlined />,
        },
      ]

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <Row gutter={[20, 20]}>
        <Col xs={24} xl={8}>
          <Card className="feature-surface profile-card">
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Avatar size={72} className="profile-avatar">
                {getUserInitial(user)}
              </Avatar>
              <div>
                <Typography.Title level={3} style={{ marginBottom: 4 }}>
                  {fullName}
                </Typography.Title>
                <Typography.Paragraph className="muted-copy" style={{ marginBottom: 6 }}>
                  {user?.email}
                </Typography.Paragraph>
                <Typography.Text className="muted-copy">{getUserRoleLabel(user?.role)}</Typography.Text>
              </div>
              <div className="profile-meta-list">
                <div className="summary-row">
                  <span>Имя</span>
                  <strong>{user?.firstName || fullName}</strong>
                </div>
                <div className="summary-row">
                  <span>Фамилия</span>
                  <strong>{user?.lastName || 'Не указана'}</strong>
                </div>
              </div>
              <Typography.Paragraph className="muted-copy" style={{ marginBottom: 0 }}>
                {user?.bio || 'Пользователь библиотеки.'}
              </Typography.Paragraph>
            </Space>
          </Card>
        </Col>

        <Col xs={24} xl={16}>
          <Row gutter={[18, 18]}>
            {metricItems.map((item) => (
              <Col xs={24} md={12} key={item.title}>
                <Card className="feature-surface stat-card">
                  <Statistic
                    title={item.title}
                    value={item.value}
                    prefix={item.prefix}
                    suffix={item.suffix}
                  />
                </Card>
              </Col>
            ))}
          </Row>
        </Col>
      </Row>

      {isTeacher ? (
        <Row gutter={[20, 20]}>
          <Col xs={24} xl={12}>
            <Card className="feature-surface">
              <div className="section-head">
                <Typography.Title level={3} style={{ margin: 0 }}>
                  Профиль преподавателя
                </Typography.Title>
                <Button onClick={onOpenTeacher}>Открыть фонд</Button>
              </div>

              <div className="profile-meta-list">
                <div className="summary-row">
                  <span>Черновики</span>
                  <strong>{teacherStats.draftCount || 0}</strong>
                </div>
                <div className="summary-row">
                  <span>Студенты</span>
                  <strong>{teacherStats.studentCount || 0}</strong>
                </div>
                <div className="summary-row">
                  <span>Активные читатели</span>
                  <strong>{teacherStats.activeReaders || 0}</strong>
                </div>
              </div>
            </Card>
          </Col>

          <Col xs={24} xl={12}>
            <Card className="feature-surface">
              <Typography.Title level={3} style={{ marginTop: 0 }}>
                Аналитика фонда
              </Typography.Title>
              <div className="profile-meta-list">
                <div className="summary-row">
                  <span>Сохранений книг</span>
                  <strong>{teacherStats.favoritesCount || 0}</strong>
                </div>
                <div className="summary-row">
                  <span>Комментарии</span>
                  <strong>{teacherStats.commentCount || 0}</strong>
                </div>
                <div className="summary-row">
                  <span>Ответы</span>
                  <strong>{teacherStats.replyCount || 0}</strong>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      ) : (
        <Row gutter={[20, 20]}>
          <Col xs={24} xl={14}>
            <Card className="feature-surface profile-card">
              <div className="section-head">
                <Typography.Title level={3} style={{ margin: 0 }}>
                  Сохранённые книги
                </Typography.Title>
                <Button onClick={onOpenFavorites}>Открыть все</Button>
              </div>

              {savedBooks.length ? (
                <div className="profile-book-list">
                  {savedBooks.map((book) => {
                    const progressPercent = Number(book.progressPercent || 0)

                    return (
                      <button
                        key={book.id}
                        type="button"
                        className="saved-book-item"
                        onClick={() => onOpenBook(book)}
                      >
                        <div className="saved-book-copy">
                          <div className="saved-book-head">
                            <strong>{book.title}</strong>
                            <span>{progressPercent}%</span>
                          </div>
                          <span className="muted-copy">
                            {book.author || 'Автор не указан'} • {book.categoryName}
                          </span>
                          <Progress percent={progressPercent} showInfo={false} />
                          <div className="saved-book-footer">
                            <span>{progressPercent > 0 ? 'Продолжить чтение' : 'Начать чтение'}</span>
                            <span>{book.estimatedMinutes || 0} мин</span>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <Empty description="Сохранённых книг пока нет" />
              )}
            </Card>
          </Col>

          <Col xs={24} xl={10}>
            <Space direction="vertical" size={20} style={{ width: '100%' }}>
              <Card className="feature-surface profile-progress-card">
                <div className="section-head">
                  <Typography.Title level={3} style={{ margin: 0 }}>
                    Прогресс чтения
                  </Typography.Title>
                  <Button onClick={onOpenLibrary}>Найти книгу</Button>
                </div>

                <Space direction="vertical" size={18} style={{ width: '100%' }}>
                  <div>
                    <Typography.Text strong>Средний прогресс по книгам</Typography.Text>
                    <Progress percent={averageProgressPercent} strokeColor="var(--color-primary)" />
                  </div>

                  <div className="profile-meta-list">
                    <div className="summary-row">
                      <span>Читаю сейчас</span>
                      <strong>{userStats.activeBooks || 0}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Прочитано до конца</span>
                      <strong>{userStats.completedBooks || 0}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Закладки</span>
                      <strong>{userStats.bookmarkCount || 0}</strong>
                    </div>
                    <div className="summary-row">
                      <span>Заметки</span>
                      <strong>{userStats.noteCount || 0}</strong>
                    </div>
                  </div>

                  <div>
                    <Typography.Title level={4} style={{ marginTop: 0 }}>
                      Недавно открытые книги
                    </Typography.Title>

                    {recentBooks.length ? (
                      <div className="rank-list profile-rank-list">
                        {recentBooks.map((book) => (
                          <button
                            key={book.id}
                            type="button"
                            className="rank-item"
                            onClick={() => onOpenBook(book)}
                          >
                            <span className="rank-number">
                              {String(book.progressPercent || 0).padStart(2, '0')}%
                            </span>
                            <div className="rank-copy">
                              <strong>{book.title}</strong>
                              <span>
                                {book.author || 'Автор не указан'} • {book.categoryName}
                              </span>
                            </div>
                            <span className="rank-meta">Открыть</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <Empty description="История чтения пока пуста" />
                    )}
                  </div>
                </Space>
              </Card>

              <Card className="feature-surface">
                <Typography.Title level={3} style={{ marginTop: 0 }}>
                  Анализ активности
                </Typography.Title>
                <div className="profile-meta-list">
                  <div className="summary-row">
                    <span>Комментарии</span>
                    <strong>{userStats.commentCount || 0}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Ответы</span>
                    <strong>{userStats.replyCount || 0}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Лайков получено</span>
                    <strong>{userStats.receivedLikesCount || 0}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Сохранено книг</span>
                    <strong>{userStats.favoriteCount || 0}</strong>
                  </div>
                </div>
                <Typography.Paragraph className="muted-copy" style={{ margin: '12px 0 0' }}>
                  Комментарии, ответы и сохранённые книги помогают быстрее вернуться к нужным материалам.
                </Typography.Paragraph>
              </Card>
            </Space>
          </Col>
        </Row>
      )}
    </Space>
  )
}

export default Profile
