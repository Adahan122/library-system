import { Avatar, Button, Drawer, Space, Typography } from 'antd'
import {
  BookOutlined,
  HomeOutlined,
  LogoutOutlined,
  MenuOutlined,
  MoonOutlined,
  ReadOutlined,
  SunOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useLibrary } from '../hooks/useLibrary.js'

const navLinkClassName = ({ isActive }) => `nav-link${isActive ? ' nav-link-active' : ''}`

const UserLayout = () => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { currentUser, logout, uiTheme, switchTheme } = useLibrary()

  const navItems = useMemo(() => {
    const items = [
      { to: '/', label: 'Главная', icon: <HomeOutlined /> },
      { to: '/library', label: 'Каталог', icon: <BookOutlined /> },
      { to: '/profile', label: 'Профиль', icon: <UserOutlined /> },
    ]

    if (currentUser?.role === 'teacher') {
      items.push({ to: '/teacher', label: 'Фонд', icon: <ReadOutlined /> })
    }

    return items
  }, [currentUser?.role])

  const titleMap = {
    '/': 'Главная',
    '/library': 'Каталог библиотеки',
    '/profile': 'Профиль',
    '/teacher': 'Управление фондом',
  }

  const currentTitle = location.pathname.startsWith('/reader/')
    ? 'Чтение'
    : titleMap[location.pathname] || 'Раздел библиотеки'

  return (
    <div className="app-shell">
      <header className="app-header">
        <button className="brand-block" type="button" onClick={() => navigate('/')}>
          <span className="brand-mark">
            <BookOutlined />
          </span>
          <span>
            <Typography.Text strong className="brand-title">
              LibHub
            </Typography.Text>
            <Typography.Text className="brand-subtitle">
              Электронная библиотека
            </Typography.Text>
          </span>
        </button>

        <nav className="desktop-nav" aria-label="Навигация">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={navLinkClassName}>
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <Space size={10} className="header-actions">
          <Button
            type="text"
            className="theme-switch"
            icon={uiTheme === 'dark' ? <SunOutlined /> : <MoonOutlined />}
            onClick={() => switchTheme(uiTheme === 'dark' ? 'light' : 'dark')}
          />
          <div className="header-user">
            <Avatar className="header-avatar">
              {currentUser?.name?.charAt(0)?.toUpperCase() || 'L'}
            </Avatar>
            <div className="header-user-copy">
              <strong>{currentUser?.name}</strong>
              <span>{currentUser?.role === 'teacher' ? 'Преподаватель' : 'Студент'}</span>
            </div>
          </div>
          <Button className="desktop-logout" icon={<LogoutOutlined />} onClick={logout}>
            Выйти
          </Button>
          <Button
            type="text"
            shape="circle"
            icon={<MenuOutlined />}
            className="mobile-menu-button"
            onClick={() => setDrawerOpen(true)}
          />
        </Space>
      </header>

      <main className="app-main">
        <section className="page-intro">
          <Typography.Title level={2} className="page-title">
            {currentTitle}
          </Typography.Title>
        </section>

        <div className="page-frame">
          <Outlet />
        </div>
      </main>

      <Drawer title="Разделы" placement="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <div className="mobile-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={navLinkClassName}
              onClick={() => setDrawerOpen(false)}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
          <Button
            className="mobile-logout"
            icon={<LogoutOutlined />}
            onClick={() => {
              setDrawerOpen(false)
              void logout()
            }}
          >
            Выйти
          </Button>
        </div>
      </Drawer>
    </div>
  )
}

export default UserLayout
