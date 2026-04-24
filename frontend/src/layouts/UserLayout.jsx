import { Avatar, Badge, Breadcrumb, Button, Drawer, Layout, Menu, Space, Typography } from 'antd'
import { BookOutlined, HeartOutlined, MenuOutlined, NotificationOutlined, UserOutlined } from '@ant-design/icons'
import { useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'

const { Header, Content, Footer } = Layout

const items = [
  { key: '/profile', icon: <UserOutlined />, label: 'Профиль' },
  { key: '/catalog', icon: <BookOutlined />, label: 'Каталог' },
  { key: '/favorites', icon: <HeartOutlined />, label: 'Избранное' },
]

const titleMap = {
  '/profile': 'Профиль',
  '/catalog': 'Каталог',
  '/favorites': 'Избранное',
}

const UserLayout = () => {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const breadcrumbItems = useMemo(
    () => [{ title: 'Пользователь' }, { title: titleMap[location.pathname] ?? 'Раздел' }],
    [location.pathname],
  )

  const handleSelect = ({ key }) => {
    setOpen(false)
    navigate(key)
  }

  return (
    <Layout className="app-shell">
      <Header className="app-header">
        <div className="header-brand">
          <div className="brand-mark">
            <BookOutlined />
          </div>
          <div>
            <Typography.Text strong className="brand-title">
              LibHub Reader
            </Typography.Text>
            <Typography.Text type="secondary" className="brand-subtitle">
              Личный кабинет читателя
            </Typography.Text>
          </div>
        </div>

        <Menu
          className="desktop-menu"
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={items}
          onClick={handleSelect}
        />

        <Space size={12} className="header-actions">
          <Badge dot>
            <Button type="text" shape="circle" icon={<NotificationOutlined />} />
          </Badge>
          <Button type="default" className="desktop-action" onClick={() => navigate('/favorites')}>
            К избранному
          </Button>
          <Button type="primary" className="desktop-action" onClick={() => navigate('/admin')}>
            Админка
          </Button>
          <Avatar className="header-avatar">A</Avatar>
          <Button
            type="text"
            shape="circle"
            icon={<MenuOutlined />}
            className="mobile-menu-button"
            onClick={() => setOpen(true)}
          />
        </Space>
      </Header>

      <Content className="app-content">
        <div className="page-frame">
          <Breadcrumb items={breadcrumbItems} className="page-breadcrumb" />
          <Outlet />
        </div>
      </Content>

      <Footer className="app-footer">
        <Typography.Text type="secondary">
          Читательская зона: просмотр, статистика и избранные книги
        </Typography.Text>
      </Footer>

      <Drawer title="Разделы" placement="right" open={open} onClose={() => setOpen(false)}>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={items.map((item) => ({
            ...item,
            label: <NavLink to={item.key}>{item.label}</NavLink>,
          }))}
          onClick={handleSelect}
        />
      </Drawer>
    </Layout>
  )
}

export default UserLayout
