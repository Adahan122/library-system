import { Avatar, Breadcrumb, Button, Layout, Space, Typography } from 'antd'
import { LockOutlined, LogoutOutlined } from '@ant-design/icons'
import { Outlet, useNavigate } from 'react-router-dom'
import { useLibrary } from '../hooks/useLibrary.js'

const { Header, Content } = Layout

const AdminLayout = () => {
  const navigate = useNavigate()
  const { isAdmin, logoutAdmin } = useLibrary()

  return (
    <Layout className="app-shell">
      <Header className="app-header">
        <div className="header-brand">
          <div className="brand-mark">
            <LockOutlined />
          </div>
          <div>
            <Typography.Text strong className="brand-title">
              Админ-панель
            </Typography.Text>
            <Typography.Text type="secondary" className="brand-subtitle">
              Управление публикациями и категориями
            </Typography.Text>
          </div>
        </div>

        <Space size={12}>
          <Button onClick={() => navigate('/catalog')}>К каталогу</Button>
          {isAdmin && (
            <>
              <Avatar className="header-avatar">AD</Avatar>
              <Button icon={<LogoutOutlined />} onClick={logoutAdmin}>
                Выйти
              </Button>
            </>
          )}
        </Space>
      </Header>

      <Content className="app-content">
        <div className="page-frame">
          <Breadcrumb
            items={[{ title: 'Администратор' }, { title: 'Панель управления' }]}
            className="page-breadcrumb"
          />
          <Outlet />
        </div>
      </Content>
    </Layout>
  )
}

export default AdminLayout
