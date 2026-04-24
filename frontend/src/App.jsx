import { ConfigProvider, Result, Spin } from 'antd'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import UserLayout from './layouts/UserLayout.jsx'
import ForbiddenPage from './pages/ForbiddenPage.jsx'
import HomePage from './pages/HomePage.jsx'
import LibraryPage from './pages/LibraryPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import ReaderPage from './pages/ReaderPage.jsx'
import TeacherPage from './pages/TeacherPage.jsx'
import { LibraryProvider } from './store/LibraryContext.jsx'
import { getAppTheme } from './styles/theme.js'
import { useLibrary } from './hooks/useLibrary.js'
import './App.css'

const FullscreenLoader = () => (
  <div className="screen-center">
    <Spin size="large" />
  </div>
)

const ProtectedLayout = () => {
  const { currentUser, isBootstrapping } = useLibrary()

  if (isBootstrapping) {
    return <FullscreenLoader />
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  return <UserLayout />
}

const TeacherOnly = ({ children }) => {
  const { currentUser, isBootstrapping } = useLibrary()

  if (isBootstrapping) {
    return <FullscreenLoader />
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  if (currentUser.role !== 'teacher') {
    return <ForbiddenPage />
  }

  return children
}

const LoginRoute = () => {
  const { currentUser, isBootstrapping } = useLibrary()

  if (isBootstrapping) {
    return <FullscreenLoader />
  }

  if (currentUser) {
    return <Navigate to="/" replace />
  }

  return <LoginPage />
}

const AppRoutes = () => {
  const { uiTheme } = useLibrary()

  return (
    <ConfigProvider theme={getAppTheme(uiTheme)}>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route element={<ProtectedLayout />}>
          <Route index element={<HomePage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/reader/:bookId" element={<ReaderPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route
            path="/teacher"
            element={
              <TeacherOnly>
                <TeacherPage />
              </TeacherOnly>
            }
          />
          <Route path="/forbidden" element={<ForbiddenPage />} />
          <Route
            path="*"
            element={<Result status="404" title="Страница не найдена" subTitle="Проверьте адрес маршрута." />}
          />
        </Route>
      </Routes>
    </ConfigProvider>
  )
}

const App = () => {
  return (
    <BrowserRouter>
      <LibraryProvider>
        <AppRoutes />
      </LibraryProvider>
    </BrowserRouter>
  )
}

export default App
