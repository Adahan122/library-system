import { Avatar, Card, Col, Row, Space, Tag, Typography } from 'antd'
import { BookOutlined, EyeOutlined, HeartOutlined } from '@ant-design/icons'

const About = ({ stats, profile }) => {
  const items = [
    {
      icon: <BookOutlined />,
      title: 'Доступно книг',
      value: `${stats?.userStats?.totalAvailableBooks || 0}`,
      description: 'Опубликованные книги, которые доступны для чтения.',
    },
    {
      icon: <HeartOutlined />,
      title: 'В избранном',
      value: `${stats?.userStats?.favoriteCount || 0}`,
      description: 'Книги, которые пользователь сохранил в избранное.',
    },
    {
      icon: <EyeOutlined />,
      title: 'Просмотров',
      value: `${stats?.userStats?.viewedCount || 0}`,
      description: 'Сколько раз пользователь открывал книги.',
    },
  ]

  return (
    <section className="section-block">
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Tag color="default" className="section-tag">
          Обзор
        </Tag>
        <Typography.Title level={2} style={{ margin: 0 }}>
          Что есть в личном кабинете
        </Typography.Title>
      </Space>

      <Row gutter={[20, 20]}>
        {items.map((item) => (
          <Col xs={24} md={8} key={item.title}>
            <Card className="glass-card feature-card">
              <Space orientation="vertical" size={14}>
                <div className="feature-icon">{item.icon}</div>
                <Typography.Title level={4} style={{ margin: 0 }}>
                  {item.title}
                </Typography.Title>
                <Typography.Text strong>{item.value}</Typography.Text>
                <Typography.Paragraph style={{ margin: 0 }}>
                  {item.description}
                </Typography.Paragraph>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      <Card className="glass-card team-card">
        <div className="team-member">
          <Avatar size={52} className="member-avatar">
            {profile?.name?.charAt(0) || 'A'}
          </Avatar>
          <div>
            <Typography.Text strong>{profile?.name || 'Пользователь'}</Typography.Text>
            <br />
            <Typography.Text type="secondary">{profile?.email || 'reader@mail.com'}</Typography.Text>
          </div>
        </div>
      </Card>
    </section>
  )
}

export default About
