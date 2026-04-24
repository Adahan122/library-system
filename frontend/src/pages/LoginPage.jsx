import { BookOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, Typography } from 'antd'
import { Navigate } from 'react-router-dom'
import { useLibrary } from '../hooks/useLibrary.js'

const LoginPage = () => {
  const [form] = Form.useForm()
  const { currentUser, login, notifyError } = useLibrary()

  if (currentUser) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="auth-shell">
      <section className="auth-showcase">
        <div className="auth-badge">Электронная библиотека</div>
        <Typography.Title className="auth-title">
          Современная библиотека для чтения, поиска и управления учебным фондом.
        </Typography.Title>
        <Typography.Paragraph className="auth-description">
          Студент читает опубликованные материалы. Преподаватель управляет фондом, импортирует книги по ссылке и из папки.
        </Typography.Paragraph>
        <div className="auth-feature-strip">
          <div className="auth-feature-tile">
            <strong>Новые поступления</strong>
            <span>Каталог с быстрым поиском и разделами</span>
          </div>
          <div className="auth-feature-tile">
            <strong>Популярные книги</strong>
            <span>Открытие книг, избранное и история чтения</span>
          </div>
          <div className="auth-feature-tile">
            <strong>Фонд преподавателя</strong>
            <span>Импорт по URL и по локальной папке</span>
          </div>
        </div>
      </section>

      <Card className="auth-card">
        <div className="brand-inline">
          <span className="brand-mark">
            <BookOutlined />
          </span>
          <div>
            <Typography.Text strong>Вход в LibHub</Typography.Text>
            <br />
            <Typography.Text className="muted-copy">Авторизация по роли пользователя</Typography.Text>
          </div>
        </div>

        <Form
          form={form}
          layout="vertical"
          className="auth-form"
          onFinish={async ({ email, password }) => {
            try {
              await login(email, password)
            } catch (error) {
              notifyError(error.message)
            }
          }}
        >
          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: true, message: 'Введите email.' }]}
          >
            <Input size="large" placeholder="Введите email" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Пароль"
            rules={[{ required: true, message: 'Введите пароль.' }]}
          >
            <Input.Password size="large" placeholder="Введите пароль" />
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" block>
            Войти
          </Button>
        </Form>
      </Card>
    </div>
  )
}

export default LoginPage
