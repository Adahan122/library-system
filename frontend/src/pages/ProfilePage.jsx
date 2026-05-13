import { useNavigate } from 'react-router-dom'
import Profile from '../components/Profile.jsx'
import { useLibrary } from '../hooks/useLibrary.js'

const ProfilePage = () => {
  const navigate = useNavigate()
  const { currentUser, stats, openBook } = useLibrary()

  return (
    <Profile
      user={currentUser}
      stats={stats}
      onOpenBook={(book) => void openBook(book)}
      onOpenLibrary={() => navigate('/library')}
      onOpenFavorites={() => navigate('/favorites')}
      onOpenTeacher={() => navigate('/teacher')}
    />
  )
}

export default ProfilePage
