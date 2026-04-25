import { Button, Drawer, Typography } from 'antd'
import {
  BookOutlined,
  HeartOutlined,
  HomeOutlined,
  LogoutOutlined,
  ReadOutlined,
} from '@ant-design/icons'
import { useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import Header from '../components/Header.jsx'
import { useLibrary } from '../hooks/useLibrary.js'

const navLinkClassName = ({ isActive }) => `nav-link${isActive ? ' nav-link-active' : ''}`

const UserLayout = () => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()
  const { currentUser, logout, uiTheme, switchTheme } = useLibrary()

  const navItems = useMemo(() => {
    const items = [
      { to: '/', label: 'Главная', icon: <HomeOutlined /> },
      { to: '/library', label: 'Каталог', icon: <BookOutlined /> },
      { to: '/favorites', label: 'Сохранённые', icon: <HeartOutlined /> },
    ]

    if (currentUser?.role === 'teacher') {
      items.push({ to: '/teacher', label: 'Фонд', icon: <ReadOutlined /> })
    }

    return items
  }, [currentUser?.role])

  const titleMap = {
    '/': 'Главная',
    '/library': 'Каталог библиотеки',
    '/favorites': 'Сохранённые книги',
    '/profile': 'Профиль',
    '/upload': 'Загрузка книги',
    '/teacher': 'Управление фондом',
  }

  const currentTitle = location.pathname.startsWith('/reader/')
    ? 'Чтение'
    : titleMap[location.pathname] || 'Раздел библиотеки'

  return (
    <div className="app-shell">
      <Header
        navItems={navItems}
        currentUser={currentUser}
        uiTheme={uiTheme}
        onToggleTheme={() => switchTheme(uiTheme === 'dark' ? 'light' : 'dark')}
        onLogout={logout}
        onOpenMenu={() => setDrawerOpen(true)}
      />

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
