import { ConfigProvider } from 'antd'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './layouts/AdminLayout.jsx'
import UserLayout from './layouts/UserLayout.jsx'
import AdminPage from './pages/AdminPage.jsx'
import CatalogPage from './pages/CatalogPage.jsx'
import FavoritesPage from './pages/FavoritesPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import { LibraryProvider } from './store/LibraryContext.jsx'
import { appTheme } from './styles/theme.js'
import './App.css'

const App = () => {
  return (
    <ConfigProvider theme={appTheme}>
      <BrowserRouter>
        <LibraryProvider>
          <Routes>
            <Route element={<UserLayout />}>
              <Route path="/" element={<Navigate to="/profile" replace />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/catalog" element={<CatalogPage />} />
              <Route path="/favorites" element={<FavoritesPage />} />
            </Route>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminPage />} />
            </Route>
          </Routes>
        </LibraryProvider>
      </BrowserRouter>
    </ConfigProvider>
  )
}

export default App
