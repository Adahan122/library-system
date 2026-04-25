import { Avatar, Button, Space, Typography } from 'antd'
import {
  BookOutlined,
  LogoutOutlined,
  MenuOutlined,
  MoonOutlined,
  SunOutlined,
} from '@ant-design/icons'
import { NavLink, useNavigate } from 'react-router-dom'
import { getUserDisplayName, getUserInitial, getUserRoleLabel } from '../utils/formatters.js'

const navLinkClassName = ({ isActive }) => `nav-link${isActive ? ' nav-link-active' : ''}`

const Header = ({ navItems, currentUser, uiTheme, onToggleTheme, onLogout, onOpenMenu }) => {
  const navigate = useNavigate()

  return (
    <header className="app-header">
      <button className="brand-block" type="button" onClick={() => navigate('/')}>
        <span className="brand-mark">
          <BookOutlined />
        </span>
        <span>
          <Typography.Text strong className="brand-title">
            LibHub
          </Typography.Text>
          <Typography.Text className="brand-subtitle">Электронная библиотека</Typography.Text>
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
          onClick={onToggleTheme}
        />

        <button
          type="button"
          className="header-user-button"
          onClick={() => navigate('/profile')}
          aria-label="Открыть профиль"
        >
          <div className="header-user">
            <Avatar className="header-avatar">{getUserInitial(currentUser)}</Avatar>
            <div className="header-user-copy">
              <strong>{getUserDisplayName(currentUser)}</strong>
              <span>{getUserRoleLabel(currentUser?.role)}</span>
            </div>
          </div>
        </button>

        <Button className="desktop-logout" icon={<LogoutOutlined />} onClick={() => void onLogout?.()}>
          Выйти
        </Button>
        <Button
          type="text"
          shape="circle"
          icon={<MenuOutlined />}
          className="mobile-menu-button"
          onClick={onOpenMenu}
        />
      </Space>
    </header>
  )
}

export default Header
