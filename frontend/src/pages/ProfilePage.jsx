import { BookOutlined, ClockCircleOutlined, PushpinOutlined, StarOutlined } from '@ant-design/icons'
import { Avatar, Button, Card, Col, Empty, Row, Space, Statistic, Typography } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useLibrary } from '../hooks/useLibrary.js'

const ProfilePage = () => {
  const navigate = useNavigate()
  const { currentUser, stats } = useLibrary()

  const recentBooks = stats?.userStats?.recentBooks || []

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <Row gutter={[20, 20]}>
        <Col xs={24} xl={8}>
          <Card className="feature-surface profile-card">
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Avatar size={72} className="profile-avatar">
                {currentUser?.name?.charAt(0)?.toUpperCase() || 'L'}
              </Avatar>
              <div>
                <Typography.Title level={3} style={{ marginBottom: 4 }}>
                  {currentUser?.name}
                </Typography.Title>
                <Typography.Paragraph className="muted-copy" style={{ marginBottom: 6 }}>
                  {currentUser?.email}
                </Typography.Paragraph>
                <Typography.Text className="muted-copy">
                  {currentUser?.role === 'teacher' ? 'Преподаватель' : 'Студент'}
                </Typography.Text>
              </div>
              <Typography.Paragraph className="muted-copy" style={{ marginBottom: 0 }}>
                {currentUser?.bio || 'Пользователь библиотеки.'}
              </Typography.Paragraph>
            </Space>
          </Card>
        </Col>

        <Col xs={24} xl={16}>
          <Row gutter={[18, 18]}>
            <Col xs={24} md={12}>
              <Card className="feature-surface stat-card">
                <Statistic title="Доступные книги" value={stats?.userStats?.totalAvailableBooks || 0} prefix={<BookOutlined />} />
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card className="feature-surface stat-card">
                <Statistic title="Минут чтения" value={stats?.userStats?.readingMinutes || 0} prefix={<ClockCircleOutlined />} />
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card className="feature-surface stat-card">
                <Statistic title="Сохраненные книги" value={stats?.userStats?.favoriteCount || 0} prefix={<StarOutlined />} />
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card className="feature-surface stat-card">
                <Statistic title="Закладки" value={stats?.userStats?.bookmarkCount || 0} prefix={<PushpinOutlined />} />
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>

      <Card className="feature-surface">
        <div className="section-head">
          <Typography.Title level={3} style={{ margin: 0 }}>
            Недавно открытые книги
          </Typography.Title>
          <Button onClick={() => navigate('/library')}>Каталог</Button>
        </div>

        {recentBooks.length ? (
          <div className="rank-list">
            {recentBooks.map((book) => (
              <button
                key={book.id}
                type="button"
                className="rank-item"
                onClick={() => navigate(`/reader/${book.id}`)}
              >
                <span className="rank-number">{String(book.progressPercent || 0).padStart(2, '0')}%</span>
                <div className="rank-copy">
                  <strong>{book.title}</strong>
                  <span>
                    {book.author} • {book.categoryName}
                  </span>
                </div>
                <span className="rank-meta">Открыть</span>
              </button>
            ))}
          </div>
        ) : (
          <Empty description="История чтения пока пуста" />
        )}
      </Card>
    </Space>
  )
}

export default ProfilePage
