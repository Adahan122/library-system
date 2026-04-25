import { SafetyCertificateOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, Typography } from 'antd'
import { Navigate } from 'react-router-dom'
import { useLibrary } from '../hooks/useLibrary.js'

const DEV_ADMIN_ROUTE = '/__dev/libhub-admin'

const DeveloperLoginPage = () => {
  const [form] = Form.useForm()
  const { currentUser, loginDeveloper, notifyError } = useLibrary()

  if (currentUser?.role === 'developer') {
    return <Navigate to={DEV_ADMIN_ROUTE} replace />
  }

  if (currentUser) {
    return <Navigate to={currentUser.role === 'teacher' ? '/teacher' : '/'} replace />
  }

  return (
    <div className="auth-shell auth-shell-admin">
      <section className="auth-showcase">
        <div className="auth-badge">
          <SafetyCertificateOutlined />
          <span>Скрытый вход разработчика</span>
        </div>
        <Typography.Title className="auth-title">
          Закрытая developer-панель для полного управления LibHub.
        </Typography.Title>
        <Typography.Paragraph className="auth-description">
          Вход в эту зону скрыт из обычной навигации. Доступ открывается только по отдельному паролю
          разработчика, который проверяется на сервере по хешу.
        </Typography.Paragraph>
      </section>

      <Card className="auth-card">
        <div className="brand-inline">
          <span className="brand-mark">
            <SafetyCertificateOutlined />
          </span>
          <div>
            <Typography.Text strong>LibHub Dev Access</Typography.Text>
            <br />
            <Typography.Text className="muted-copy">Только для разработчика</Typography.Text>
          </div>
        </div>

        <Form
          form={form}
          layout="vertical"
          className="auth-form"
          onFinish={async ({ password }) => {
            try {
              await loginDeveloper(password)
            } catch (error) {
              notifyError(error.message)
            }
          }}
        >
          <Form.Item
            name="password"
            label="Пароль разработчика"
            rules={[{ required: true, message: 'Введите пароль.' }]}
          >
            <Input.Password size="large" placeholder="Введите пароль" />
          </Form.Item>

          <Button type="primary" htmlType="submit" size="large" block>
            Открыть dev-панель
          </Button>
        </Form>
      </Card>
    </div>
  )
}

export default DeveloperLoginPage
