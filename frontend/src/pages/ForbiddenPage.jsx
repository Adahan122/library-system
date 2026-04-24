import { Button, Result } from 'antd'
import { useNavigate } from 'react-router-dom'

const ForbiddenPage = () => {
  const navigate = useNavigate()

  return (
    <Result
      status="403"
      title="Доступ запрещен"
      subTitle="Этот раздел доступен только преподавателю. Студент может читать материалы в библиотеке."
      extra={[
        <Button type="primary" key="library" onClick={() => navigate('/library')}>
          Перейти в библиотеку
        </Button>,
      ]}
    />
  )
}

export default ForbiddenPage
