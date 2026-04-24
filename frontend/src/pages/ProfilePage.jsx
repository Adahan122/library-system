import { Avatar, Card, Col, Empty, Row, Space, Statistic, Tag, Typography } from 'antd'
import { BookOutlined, EyeOutlined, HeartOutlined, UserOutlined } from '@ant-design/icons'
import About from '../components/About.jsx'
import { useLibrary } from '../hooks/useLibrary.js'

const ProfilePage = () => {
  const { profile, stats } = useLibrary()
  const recentViewed = stats?.userStats?.recentViewed || []

  return (
    <Space orientation="vertical" size={24} style={{ width: '100%' }}>
      <section className="hero-section">
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={16}>
            <Card className="glass-card hero-panel">
              <Space orientation="vertical" size={16} style={{ width: '100%' }}>
                <Tag className="hero-tag" variant="filled">
                  Профиль
                </Tag>
                <Typography.Title className="hero-title">
                  Статистика читателя и история просмотров
                </Typography.Title>
                <Typography.Paragraph className="hero-description">
                  Здесь собрана ваша активность: сколько книг доступно, что вы добавили в избранное и какие книги уже открывали.
                </Typography.Paragraph>
              </Space>
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card className="glass-card inner-highlight">
              <Space orientation="vertical" size={12} style={{ width: '100%' }}>
                <Avatar size={64} className="star-avatar" icon={<UserOutlined />} />
                <div>
                  <Typography.Text strong>{profile?.name || 'Пользователь'}</Typography.Text>
                  <br />
                  <Typography.Text type="secondary">{profile?.email || 'reader@mail.com'}</Typography.Text>
                </div>
                <div className="signal-row">
                  <span>Роль</span>
                  <strong>Читатель</strong>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>
      </section>

      <Row gutter={[20, 20]}>
        <Col xs={24} md={8}>
          <Card className="glass-card insight-card">
            <Statistic
              title="Доступно книг"
              value={stats?.userStats?.totalAvailableBooks || 0}
              prefix={<BookOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="glass-card insight-card">
            <Statistic
              title="В избранном"
              value={stats?.userStats?.favoriteCount || 0}
              prefix={<HeartOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="glass-card insight-card">
            <Statistic
              title="Просмотров"
              value={stats?.userStats?.viewedCount || 0}
              prefix={<EyeOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card className="glass-card">
        <Space orientation="vertical" size={16} style={{ width: '100%' }}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Недавно просмотренные книги
          </Typography.Title>

          {recentViewed.length ? (
            <Space orientation="vertical" size={12} style={{ width: '100%' }}>
              {recentViewed.map((item) => (
                <Card key={`${item.id}-${item.viewedAt}`} className="inner-highlight">
                  <div className="team-member">
                    <Space>
                      <Avatar className="table-avatar" icon={<BookOutlined />} />
                      <div>
                        <Typography.Text strong>{item.title}</Typography.Text>
                        <br />
                        <Typography.Text type="secondary">
                          {item.author} · {item.categoryName}
                        </Typography.Text>
                      </div>
                    </Space>
                    <Typography.Text type="secondary">
                      {new Date(item.viewedAt).toLocaleString('ru-RU')}
                    </Typography.Text>
                  </div>
                </Card>
              ))}
            </Space>
          ) : (
            <Empty description="Вы еще не открывали книги." />
          )}
        </Space>
      </Card>

      <About stats={stats} profile={profile} />
    </Space>
  )
}

export default ProfilePage
