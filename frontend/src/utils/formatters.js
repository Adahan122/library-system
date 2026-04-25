export const getUserDisplayName = (user) =>
  [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || user?.name || 'Пользователь'

export const getUserInitial = (user) => getUserDisplayName(user).charAt(0)?.toUpperCase() || 'L'

export const getUserRoleLabel = (role) => {
  if (role === 'teacher') {
    return 'Преподаватель'
  }

  if (role === 'developer') {
    return 'Разработчик'
  }

  return 'Студент'
}

export const getBookPublicationLabel = (book) => {
  if (book?.publishDate) {
    const date = new Date(`${book.publishDate}T00:00:00`)
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }).format(date)
    }

    return book.publishDate
  }

  if (book?.publishYear) {
    return String(book.publishYear)
  }

  return 'Дата не указана'
}

export const formatDateTime = (value) => {
  if (!value) {
    return 'Нет данных'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export const getBookCoverStyle = (book) => {
  if (book?.coverImage) {
    return {
      backgroundImage: `linear-gradient(180deg, rgba(15, 23, 42, 0.08), rgba(15, 23, 42, 0.78)), url("${book.coverImage}")`,
      backgroundPosition: 'center',
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
      backgroundColor: book?.coverTone || '#4F46E5',
    }
  }

  return {
    background: `linear-gradient(135deg, ${book?.coverTone || '#4F46E5'}, #0f172a)`,
  }
}
