import {
  BookOutlined,
  InfoCircleOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import { Button, Card, Form, Input, Segmented, Typography } from 'antd'
import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useLibrary } from '../hooks/useLibrary.js'

const authModeOptions = [
  { label: 'Вход', value: 'login' },
  { label: 'Регистрация', value: 'register' },
]

const portalContent = {
  student: {
    badge: 'Вход для студента',
    title: 'Личный вход в библиотеку для чтения, сохранения книг и обсуждения материалов.',
    description:
      'После входа студент получает доступ к каталогу, сохранённым книгам, прогрессу чтения и комментариям под книгами.',
    helper: 'Студенческий вход в LibHub',
    loginButton: 'Войти как студент',
    registerButton: 'Создать студенческий аккаунт',
    features: [
      {
        title: 'Сохранённые книги',
        text: 'Добавляйте нужные книги в сохранённые и возвращайтесь к ним в один клик.',
      },
      {
        title: 'Прогресс чтения',
        text: 'Система запоминает, где вы остановились, и показывает прогресс по книге.',
      },
      {
        title: 'Комментарии',
        text: 'Можно обсуждать книгу, отвечать другим студентам и ставить лайки.',
      },
    ],
    guideTitle: 'Как это работает',
    guideSteps: [
      'Войдите как студент и откройте нужную книгу.',
      'Сохраняйте книги, чтобы они появились на странице сохранённых.',
      'Оставляйте комментарии и отвечайте другим студентам.',
    ],
  },
  teacher: {
    badge: 'Служебный вход',
    title: 'Отдельный вход преподавателя для управления фондом и публикации книг.',
    description:
      'Этот маршрут скрыт из обычной навигации. Через него преподаватель загружает книги, публикует материалы и следит за библиотекой.',
    helper: 'Закрытый вход преподавателя',
    loginButton: 'Войти в кабинет',
    registerButton: 'Создать аккаунт преподавателя',
    features: [
      {
        title: 'Загрузка фонда',
        text: 'Добавляйте PDF и EPUB, публикуйте книги и держите каталог в порядке.',
      },
      {
        title: 'Отдельная роль',
        text: 'Преподавательский вход изолирован от обычного студенческого сценария.',
      },
      {
        title: 'Статистика',
        text: 'Смотрите просмотры, разделы и активность читателей в одном месте.',
      },
    ],
  },
}

const LoginPage = ({ allowedRole = 'student' }) => {
  const [loginForm] = Form.useForm()
  const [registerForm] = Form.useForm()
  const [authMode, setAuthMode] = useState('login')
  const { currentUser, login, register, notifyError } = useLibrary()

  const content = useMemo(
    () => portalContent[allowedRole === 'teacher' ? 'teacher' : 'student'],
    [allowedRole],
  )
  const redirectPath = currentUser?.role === 'teacher' ? '/teacher' : '/'

  if (currentUser) {
    return <Navigate to={redirectPath} replace />
  }

  return (
    <div className={`auth-shell${allowedRole === 'teacher' ? ' auth-shell-admin' : ''}`}>
      <section className="auth-showcase">
        <div className="auth-badge">
          {allowedRole === 'teacher' ? <SafetyCertificateOutlined /> : <BookOutlined />}
          <span>{content.badge}</span>
        </div>
        <Typography.Title className="auth-title">{content.title}</Typography.Title>
        <Typography.Paragraph className="auth-description">{content.description}</Typography.Paragraph>

        <div className="auth-feature-strip">
          {content.features.map((feature) => (
            <div className="auth-feature-tile" key={feature.title}>
              <strong>{feature.title}</strong>
              <span>{feature.text}</span>
            </div>
          ))}
        </div>

        {allowedRole === 'student' ? (
          <div className="auth-guide">
            <div className="auth-guide-head">
              <InfoCircleOutlined />
              <strong>{content.guideTitle}</strong>
            </div>
            <div className="auth-guide-list">
              {content.guideSteps.map((step, index) => (
                <div key={step} className="auth-guide-step">
                  <span>{index + 1}</span>
                  <p>{step}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <Card className="auth-card">
        <div className="brand-inline">
          <span className="brand-mark">
            <BookOutlined />
          </span>
          <div>
            <Typography.Text strong>LibHub</Typography.Text>
            <br />
            <Typography.Text className="muted-copy">{content.helper}</Typography.Text>
          </div>
        </div>

        <Segmented block options={authModeOptions} value={authMode} onChange={setAuthMode} />

        {authMode === 'login' ? (
          <Form
            form={loginForm}
            layout="vertical"
            className="auth-form"
            onFinish={async ({ email, password }) => {
              try {
                await login(email, password, allowedRole)
              } catch (error) {
                notifyError(error.message)
              }
            }}
          >
            <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Введите email.' }]}>
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
              {content.loginButton}
            </Button>
          </Form>
        ) : (
          <Form
            form={registerForm}
            layout="vertical"
            className="auth-form"
            onFinish={async (values) => {
              try {
                await register({
                  ...values,
                  role: allowedRole,
                })
              } catch (error) {
                notifyError(error.message)
              }
            }}
          >
            <Form.Item
              name="firstName"
              label="Имя"
              rules={[{ required: true, message: 'Введите имя.' }]}
            >
              <Input size="large" placeholder="Например, Айжан" />
            </Form.Item>
            <Form.Item
              name="lastName"
              label="Фамилия"
              rules={[{ required: true, message: 'Введите фамилию.' }]}
            >
              <Input size="large" placeholder="Например, Токтобаева" />
            </Form.Item>
            <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Введите email.' }]}>
              <Input size="large" placeholder="Введите email" />
            </Form.Item>
            <Form.Item
              name="password"
              label="Пароль"
              rules={[
                { required: true, message: 'Введите пароль.' },
                { min: 6, message: 'Минимум 6 символов.' },
              ]}
            >
              <Input.Password size="large" placeholder="Минимум 6 символов" />
            </Form.Item>
            <Button type="primary" htmlType="submit" size="large" block>
              {content.registerButton}
            </Button>
          </Form>
        )}
      </Card>
    </div>
  )
}

export default LoginPage
