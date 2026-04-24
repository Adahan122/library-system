# LibHub Educational Platform Upgrade Blueprint

## 1. Current project audit

### What exists today

- `backend/server.js` is a single-file HTTP server with in-memory admin sessions.
- `backend/data.json` is the only persistence layer.
- `frontend/src` already has a clean Vite + React shell, routing, layouts, and admin/user views.
- The product currently behaves like a small digital library dashboard:
  - profile
  - catalog
  - favorites
  - admin CRUD for categories and books

### Main gaps against the target LMS product

1. The backend is not Django/PostgreSQL yet.
2. There is no relational data model for courses, lessons, quizzes, subscriptions, or payments.
3. Files are not uploaded or stored in object storage.
4. Authentication is a hard-coded admin password instead of JWT + role-based access.
5. There is no reader route, PDF/EPUB rendering, progress sync, bookmarks, or notes.
6. There is no monetization gate for premium books or paid courses.
7. There is no async processing layer for uploaded books, TTS, AI, or recommendations.
8. There is a visible text-encoding problem in current Russian seed data and UI strings.

### Reuse opportunities

- Keep the existing frontend app shell, routing mindset, and admin/user separation as product foundations.
- Keep Vite for frontend DX.
- Keep the notion of books, categories, favorites, and profile stats, but remap them to proper database-backed entities.
- Replace the current backend implementation instead of extending the JSON server further.

## 2. Recommended target architecture

### High-level stack

- Backend: Django 5 + Django REST Framework + SimpleJWT
- Database: PostgreSQL
- Cache/async: Redis + Celery
- File storage: local in dev, S3-compatible storage in staging/prod
- Frontend: React + Vite + Zustand + React Router
- Reader engines:
  - PDF: `react-pdf` or PDF.js wrapper
  - EPUB: `epub.js`
- Infra: Docker, Nginx, Gunicorn, PostgreSQL, HTTPS, GitHub Actions

### Service boundaries

- `accounts`: users, roles, auth, profile
- `courses`: courses, lessons, enrollments, comments
- `library`: books, file ingestion, bookmarks, notes, reader progress
- `learning`: quizzes, answers, attempts, achievements
- `billing`: subscriptions, payments, entitlements
- `ai`: explain text, translate selection, recommendations, TTS orchestration
- `common`: base models, storage helpers, permissions, audit logging

## 3. Target backend folder structure

```text
backend/
  manage.py
  requirements/
    base.txt
    dev.txt
    prod.txt
  config/
    __init__.py
    settings/
      __init__.py
      base.py
      dev.py
      prod.py
    urls.py
    asgi.py
    wsgi.py
    celery.py
  apps/
    common/
      models.py
      permissions.py
      storage.py
      pagination.py
    accounts/
      models.py
      admin.py
      serializers.py
      views.py
      urls.py
    courses/
      models.py
      serializers.py
      views.py
      urls.py
    library/
      models.py
      serializers.py
      readers/
        pdf.py
        epub.py
      tasks.py
      views.py
      urls.py
    learning/
      models.py
      serializers.py
      views.py
      urls.py
    billing/
      models.py
      providers/
        stripe.py
      webhooks.py
      urls.py
    ai/
      services.py
      tasks.py
      urls.py
  media/
  static/
  tests/
    integration/
    unit/
```

## 4. Domain model design

### Core entities

- `User`: student, teacher, admin roles
- `Course`: paid/free learning container
- `Lesson`: ordered learning unit, can reference a book or a quiz
- `Book`: uploaded PDF/EPUB asset with processing metadata
- `Progress`: sync source of truth for reading and lesson completion
- `Quiz / Question / Answer`: assessments
- `Bookmark`: stored reader positions
- `Note`: user annotations for selected text or page regions
- `Subscription / Payment`: billing and access control

### Supporting entities that should exist in production

- `CourseEnrollment`: purchase/subscription/free access per user
- `ReadingSession`: accurate reading-time aggregation
- `LessonComment`: discussion under lessons
- `Achievement`: gamification badges

## 5. Suggested Django models

The concrete model sample is in `docs/examples/django_models.py`.

Design notes:

- Use a custom user model from day one.
- Keep `Progress` unique per `user + lesson` and `user + book`.
- Store reader location in structured JSON (`locator`) so PDF pages and EPUB CFI can coexist.
- Put premium access logic on course/book + enrollment/subscription checks, not only on payment rows.
- Track `reading_seconds` from `ReadingSession`, then aggregate into `Progress`.

## 6. API surface

### Auth and profile

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/me`
- `PATCH /api/v1/me`

### Courses

- `GET /api/v1/courses`
- `GET /api/v1/courses/{slug}`
- `POST /api/v1/courses`
- `PATCH /api/v1/courses/{id}`
- `POST /api/v1/courses/{id}/publish`
- `POST /api/v1/courses/{id}/enroll`
- `GET /api/v1/courses/{id}/lessons`
- `GET /api/v1/courses/{id}/progress`

### Lessons

- `GET /api/v1/lessons/{id}`
- `PATCH /api/v1/lessons/{id}`
- `POST /api/v1/lessons/{id}/complete`
- `GET /api/v1/lessons/{id}/comments`
- `POST /api/v1/lessons/{id}/comments`

### Books and reader

- `GET /api/v1/books`
- `GET /api/v1/books/{id}`
- `POST /api/v1/books`
- `GET /api/v1/books/{id}/access`
- `GET /api/v1/books/{id}/file`
- `GET /api/v1/books/{id}/progress`
- `PUT /api/v1/books/{id}/progress`
- `POST /api/v1/books/{id}/sessions`
- `GET /api/v1/books/{id}/bookmarks`
- `POST /api/v1/books/{id}/bookmarks`
- `PATCH /api/v1/bookmarks/{id}`
- `DELETE /api/v1/bookmarks/{id}`
- `GET /api/v1/books/{id}/notes`
- `POST /api/v1/books/{id}/notes`
- `PATCH /api/v1/notes/{id}`
- `DELETE /api/v1/notes/{id}`

### Quizzes

- `GET /api/v1/quizzes/{id}`
- `POST /api/v1/quizzes/{id}/submit`
- `GET /api/v1/quizzes/{id}/attempts`

### Billing

- `GET /api/v1/plans`
- `POST /api/v1/checkout/subscription`
- `POST /api/v1/checkout/course`
- `GET /api/v1/billing/subscription`
- `GET /api/v1/billing/payments`
- `POST /api/v1/billing/webhooks/stripe`

### AI and accessibility

- `POST /api/v1/ai/explain-selection`
- `POST /api/v1/ai/translate-selection`
- `POST /api/v1/ai/recommend-books`
- `POST /api/v1/ai/tts`

## 7. Reader sync logic

### Source of truth

- `Progress.last_locator` stores:
  - `page` for PDF
  - `cfi` or section anchor for EPUB
  - viewport metadata if needed

### Sync flow

1. Reader opens a book and fetches `GET /books/{id}/progress`.
2. Frontend restores the latest locator.
3. Reader autosaves every 10-15 seconds and on major events:
   - page change
   - section change
   - app background
   - tab close
4. Backend updates `last_locator`, `last_page`, `reading_seconds`, and `synced_at`.
5. The latest `updated_at` wins for cross-device sync.

### Reading time

- Start a `ReadingSession` when a user opens the reader.
- Ping every 30-60 seconds only while the tab is active.
- Close the session on blur/unload/inactivity timeout.
- Aggregate session duration into `Progress.reading_seconds`.

## 8. Frontend target structure

```text
frontend/
  src/
    app/
      router.jsx
      providers.jsx
    pages/
      HomePage.jsx
      CoursesPage.jsx
      CourseDetailPage.jsx
      ReaderPage.jsx
      ProfilePage.jsx
      AdminDashboardPage.jsx
      AdminBooksPage.jsx
      AdminCoursesPage.jsx
      BillingPage.jsx
    features/
      auth/
        api.js
        store.js
        components/
      courses/
        api.js
        components/
          CourseCard.jsx
          CourseGrid.jsx
          LessonSidebar.jsx
      reader/
        api.js
        store.js
        components/
          ReaderShell.jsx
          ReaderToolbar.jsx
          ReaderViewport.jsx
          ReaderProgressBar.jsx
          BookmarkPanel.jsx
          NotesPanel.jsx
          ReaderSettingsDrawer.jsx
          SelectionPopover.jsx
      profile/
        api.js
        components/
      admin/
        api.js
        components/
          BookUploadForm.jsx
          CourseEditor.jsx
          LessonEditor.jsx
      billing/
        api.js
        components/
          PlanCard.jsx
          PaymentModal.jsx
          SubscriptionGate.jsx
    entities/
      user/
      course/
      lesson/
      book/
      quiz/
    shared/
      api/
        client.js
      ui/
      hooks/
      lib/
      config/
      styles/
        tokens.css
        theme.css
    store/
      ui-store.js
```

## 9. State management recommendation

Choose Zustand. The current app is still compact, and Zustand keeps the reader flow simpler than Redux Toolkit while remaining scalable.

### Suggested stores

- `authStore`: tokens, user, role, hydration
- `readerStore`: active book, locator, reading mode, font size, theme, bookmarks, notes
- `courseStore`: course catalog, course detail, enrollment status
- `uiStore`: theme, sidebar state, network status, toasts

### Example `readerStore` shape

```js
{
  activeBook: null,
  locator: null,
  progress: null,
  theme: "light",
  fontScale: 100,
  isSyncing: false,
  bookmarks: [],
  notes: [],
  setActiveBook: () => {},
  setLocator: () => {},
  syncProgress: async () => {},
  addBookmark: async () => {},
  addNote: async () => {}
}
```

## 10. Key React components

### Core pages

- `HomePage`: landing, featured courses, value proposition, pricing teaser
- `CoursesPage`: filters, search, category tabs, course cards
- `ReaderPage`: full reading workspace
- `ProfilePage`: progress, achievements, reading streak, subscriptions
- `AdminDashboardPage`: KPIs, uploads, moderation, content pipeline

### Reader component set

- `ReaderShell`: page frame with sidebar + content area
- `ReaderViewport`: PDF or EPUB renderer switch
- `ReaderToolbar`: theme, font, search, TTS, translate, AI helper
- `ReaderProgressBar`: page/section progress + completion percent
- `BookmarkPanel`: saved locations
- `NotesPanel`: annotations and highlights
- `ReaderSettingsDrawer`: line height, font family, brightness, width
- `SelectionPopover`: explain, translate, copy, create note
- `SubscriptionGate`: locked-content overlay for premium assets

## 11. UI/UX direction

### Keep

- The current product already has spacing discipline and decent layout composition.

### Change

- Move away from the current glass-heavy dashboard styling for the learning surface.
- The reader experience should feel calmer, flatter, and more editorial.
- Reserve stronger visual accents for CTAs, progress, and locked-content states.

### Design system

```css
:root {
  --color-primary: #4F46E5;
  --color-primary-strong: #4338CA;
  --color-bg-light: #FFFFFF;
  --color-bg-dark: #0F172A;
  --color-surface-light: #F8FAFC;
  --color-surface-dark: #111827;
  --color-text-light: #0F172A;
  --color-text-dark: #E5E7EB;
  --color-muted-light: #64748B;
  --color-muted-dark: #94A3B8;
  --color-border-light: #E2E8F0;
  --color-border-dark: #1E293B;
}
```

### Typography

- UI font: `Sora`
- Reading font: `Source Serif 4` or `Literata`
- Code/metadata font: `IBM Plex Mono`

### Motion and feedback

- Skeleton loaders for catalog, course detail, reader sidebar, and profile analytics
- 160-220ms transitions for hover/focus state changes
- Slight card lift on hover for course/book cards
- Progress bar animation on sync
- Staggered entrance on lesson lists and dashboard summaries

### Mobile-first rules

- Reader toolbar collapses into a bottom sheet on small screens
- Notes and bookmarks become tabs instead of side panels
- Tap targets stay at least 44px
- Reader width, line height, and brightness controls must be usable one-handed

## 12. Additional product features

### Must-have upgrades

- AI helper inside the reader with page-aware context and source citations
- Translation of selected text
- Text-to-speech for selected passages or full lesson mode
- Gamification: streaks, achievements, reading milestones
- Book and course recommendations
- Lesson comments and teacher replies
- Offline mode with PWA caching for purchased/free assets

### Smart extensions

- Teacher highlights shared with all enrolled students
- Vocabulary mode for language-learning books
- Weekly reading goals with reminder notifications
- Resume learning across devices from the exact reader position

## 13. Monetization model

### Recommended mix

- Free tier:
  - limited public books
  - preview lessons
  - basic progress tracking
- Subscription:
  - monthly plan
  - yearly plan with discount
  - premium reader features, AI, offline mode, full library access
- Paid courses:
  - one-time purchase
  - bundled with subscription upsell

### Access control rules

- `is_free = true` means public access
- premium books can be opened only with:
  - active subscription
  - course enrollment that includes the book
  - explicit purchase entitlement

## 14. DevOps and deployment

### Containers

- `frontend`: Vite build served by Nginx
- `backend`: Django + Gunicorn
- `db`: PostgreSQL
- `redis`: cache + Celery broker
- `worker`: Celery worker for file processing, recommendations, emails, TTS
- `nginx`: reverse proxy and static/media serving

### Production notes

- Use S3-compatible storage for books and covers
- Store secrets in environment variables, never in repo
- Add signed URLs for book delivery if the storage provider supports them
- Run DB backups daily
- Put webhook signature verification on payment callbacks

### GitHub Actions

- Backend lint + tests
- Frontend lint + build
- Docker image build
- Deploy on tagged releases or protected branch merges

## 15. Migration plan from the current MVP

### Phase 1

- Freeze the JSON-backed backend as legacy MVP
- Fix text encoding issues in seed data and UI copy
- Introduce the target schema in Django + PostgreSQL

### Phase 2

- Build JWT auth, user roles, courses, lessons, books, progress, bookmarks, notes
- Migrate current catalog data from `data.json` into PostgreSQL

### Phase 3

- Add reader page with PDF/EPUB support and sync
- Add quizzes and comments
- Add subscription billing and premium access gates

### Phase 4

- Add AI helper, translation, TTS, recommendations, achievements, PWA offline mode

## 16. Immediate next implementation priority

If this repository continues evolving from its current state, the best order is:

1. Replace `backend/server.js` with Django REST APIs.
2. Move persistence from `data.json` to PostgreSQL.
3. Replace `LibraryContext` with feature stores, starting with auth and reader state.
4. Add `ReaderPage` before expanding admin workflows further.
5. Introduce payments only after access control and enrollments are stable.
