import { ConfigProvider, Result, Spin } from 'antd'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Upload from './components/Upload.jsx'
import { useLibrary } from './hooks/useLibrary.js'
import UserLayout from './layouts/UserLayout.jsx'
import DeveloperLoginPage from './pages/DeveloperLoginPage.jsx'
import DeveloperPage from './pages/DeveloperPage.jsx'
import ForbiddenPage from './pages/ForbiddenPage.jsx'
import FavoritesPage from './pages/FavoritesPage.jsx'
import HomePage from './pages/HomePage.jsx'
import LibraryPage from './pages/LibraryPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import ReaderPage from './pages/ReaderPage.jsx'
import TeacherPage from './pages/TeacherPage.jsx'
import { LibraryProvider } from './store/LibraryContext.jsx'
import { getAppTheme } from './styles/theme.js'
import './App.css'

const DEV_ADMIN_LOGIN_ROUTE = '/__dev/libhub-access'
const DEV_ADMIN_ROUTE = '/__dev/libhub-admin'

const FullscreenLoader = () => (
  <div className="screen-center">
    <Spin size="large" />
  </div>
)

const getDefaultPath = (user) =>
  user?.role === 'developer' ? DEV_ADMIN_ROUTE : user?.role === 'teacher' ? '/teacher' : '/'

const ProtectedLayout = () => {
  const { currentUser, isBootstrapping } = useLibrary()

  if (isBootstrapping) {
    return <FullscreenLoader />
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  if (currentUser.role === 'developer') {
    return <Navigate to={DEV_ADMIN_ROUTE} replace />
  }

  return <UserLayout />
}

const TeacherOnly = ({ children }) => {
  const { currentUser, isBootstrapping } = useLibrary()

  if (isBootstrapping) {
    return <FullscreenLoader />
  }

  if (!currentUser) {
    return <Navigate to="/ladmin" replace />
  }

  if (currentUser.role !== 'teacher') {
    return <ForbiddenPage />
  }

  return children
}

const DeveloperOnly = ({ children }) => {
  const { currentUser, isBootstrapping } = useLibrary()

  if (isBootstrapping) {
    return <FullscreenLoader />
  }

  if (!currentUser) {
    return <Navigate to={DEV_ADMIN_LOGIN_ROUTE} replace />
  }

  if (currentUser.role !== 'developer') {
    return <ForbiddenPage />
  }

  return children
}

const AuthRoute = ({ allowedRole }) => {
  const { currentUser, isBootstrapping } = useLibrary()

  if (isBootstrapping) {
    return <FullscreenLoader />
  }

  if (currentUser) {
    return <Navigate to={getDefaultPath(currentUser)} replace />
  }

  return <LoginPage allowedRole={allowedRole} />
}

const DeveloperAuthRoute = () => {
  const { currentUser, isBootstrapping } = useLibrary()

  if (isBootstrapping) {
    return <FullscreenLoader />
  }

  if (currentUser?.role === 'developer') {
    return <Navigate to={DEV_ADMIN_ROUTE} replace />
  }

  if (currentUser) {
    return <Navigate to={getDefaultPath(currentUser)} replace />
  }

  return <DeveloperLoginPage />
}

const AppRoutes = () => {
  const { uiTheme } = useLibrary()

  return (
    <ConfigProvider theme={getAppTheme(uiTheme)}>
      <Routes>
        <Route path={DEV_ADMIN_LOGIN_ROUTE} element={<DeveloperAuthRoute />} />
        <Route
          path={DEV_ADMIN_ROUTE}
          element={
            <DeveloperOnly>
              <DeveloperPage />
            </DeveloperOnly>
          }
        />
        <Route path="/login" element={<AuthRoute allowedRole="student" />} />
        <Route path="/ladmin" element={<AuthRoute allowedRole="teacher" />} />
        <Route element={<ProtectedLayout />}>
          <Route index element={<HomePage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/reader/:bookId" element={<ReaderPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route
            path="/upload"
            element={
              <TeacherOnly>
                <Upload />
              </TeacherOnly>
            }
          />
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
