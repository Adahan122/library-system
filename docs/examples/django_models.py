from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.text import slugify


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class User(AbstractUser):
    class Role(models.TextChoices):
        STUDENT = "student", "Student"
        TEACHER = "teacher", "Teacher"
        ADMIN = "admin", "Admin"

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.STUDENT)
    avatar = models.ImageField(upload_to="users/avatars/", blank=True, null=True)
    bio = models.TextField(blank=True)
    is_email_verified = models.BooleanField(default=False)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]


class Course(TimeStampedModel):
    class Level(models.TextChoices):
        BEGINNER = "beginner", "Beginner"
        INTERMEDIATE = "intermediate", "Intermediate"
        ADVANCED = "advanced", "Advanced"

    instructor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="courses",
    )
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    short_description = models.CharField(max_length=320, blank=True)
    description = models.TextField()
    cover_image = models.ImageField(upload_to="courses/covers/", blank=True, null=True)
    level = models.CharField(max_length=20, choices=Level.choices, default=Level.BEGINNER)
    price_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency = models.CharField(max_length=8, default="USD")
    is_free = models.BooleanField(default=True)
    requires_subscription = models.BooleanField(default=False)
    is_published = models.BooleanField(default=False)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["title"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)


class Book(TimeStampedModel):
    class BookFormat(models.TextChoices):
        PDF = "pdf", "PDF"
        EPUB = "epub", "EPUB"

    class ProcessingStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        READY = "ready", "Ready"
        FAILED = "failed", "Failed"

    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="uploaded_books",
    )
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    author = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    file = models.FileField(upload_to="books/files/")
    cover_image = models.ImageField(upload_to="books/covers/", blank=True, null=True)
    format = models.CharField(max_length=12, choices=BookFormat.choices)
    language = models.CharField(max_length=16, default="en")
    page_count = models.PositiveIntegerField(default=0)
    file_size_bytes = models.BigIntegerField(default=0)
    checksum = models.CharField(max_length=128, blank=True)
    storage_provider = models.CharField(max_length=32, default="local")
    is_published = models.BooleanField(default=False)
    is_premium = models.BooleanField(default=False)
    processing_status = models.CharField(
        max_length=16,
        choices=ProcessingStatus.choices,
        default=ProcessingStatus.PENDING,
    )
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["title"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)


class Lesson(TimeStampedModel):
    class LessonType(models.TextChoices):
        TEXT = "text", "Text"
        VIDEO = "video", "Video"
        BOOK = "book", "Book"
        QUIZ = "quiz", "Quiz"

    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="lessons")
    book = models.ForeignKey(
        Book,
        on_delete=models.SET_NULL,
        related_name="lessons",
        blank=True,
        null=True,
    )
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, blank=True)
    summary = models.CharField(max_length=320, blank=True)
    content = models.TextField(blank=True)
    lesson_type = models.CharField(
        max_length=16,
        choices=LessonType.choices,
        default=LessonType.TEXT,
    )
    order = models.PositiveIntegerField(default=0)
    estimated_minutes = models.PositiveIntegerField(default=10)
    is_preview = models.BooleanField(default=False)
    is_published = models.BooleanField(default=False)

    class Meta:
        ordering = ["course_id", "order", "id"]
        unique_together = [("course", "slug")]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)


class CourseEnrollment(TimeStampedModel):
    class AccessType(models.TextChoices):
        FREE = "free", "Free"
        PURCHASE = "purchase", "Purchase"
        SUBSCRIPTION = "subscription", "Subscription"
        GRANT = "grant", "Grant"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"
        CANCELED = "canceled", "Canceled"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="enrollments",
    )
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="enrollments")
    access_type = models.CharField(max_length=20, choices=AccessType.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    started_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        unique_together = [("user", "course")]


class Progress(TimeStampedModel):
    class Status(models.TextChoices):
        NOT_STARTED = "not_started", "Not started"
        IN_PROGRESS = "in_progress", "In progress"
        COMPLETED = "completed", "Completed"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="progress_items",
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name="progress_items",
        blank=True,
        null=True,
    )
    lesson = models.ForeignKey(
        Lesson,
        on_delete=models.CASCADE,
        related_name="progress_items",
        blank=True,
        null=True,
    )
    book = models.ForeignKey(
        Book,
        on_delete=models.CASCADE,
        related_name="progress_items",
        blank=True,
        null=True,
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.NOT_STARTED)
    completion_percent = models.PositiveSmallIntegerField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    last_page = models.PositiveIntegerField(default=0)
    last_locator = models.JSONField(default=dict, blank=True)
    reading_seconds = models.PositiveIntegerField(default=0)
    synced_at = models.DateTimeField(blank=True, null=True)
    completed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "lesson"],
                name="unique_progress_per_user_lesson",
            ),
            models.UniqueConstraint(
                fields=["user", "book"],
                name="unique_progress_per_user_book",
            ),
        ]


class ReadingSession(TimeStampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reading_sessions",
    )
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name="reading_sessions")
    progress = models.ForeignKey(
        Progress,
        on_delete=models.SET_NULL,
        related_name="reading_sessions",
        blank=True,
        null=True,
    )
    device_id = models.CharField(max_length=128, blank=True)
    started_at = models.DateTimeField()
    ended_at = models.DateTimeField(blank=True, null=True)
    duration_seconds = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)


class Quiz(TimeStampedModel):
    lesson = models.OneToOneField(Lesson, on_delete=models.CASCADE, related_name="quiz")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    passing_score = models.PositiveSmallIntegerField(
        default=70,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    max_attempts = models.PositiveIntegerField(default=3)
    is_published = models.BooleanField(default=False)


class Question(TimeStampedModel):
    class QuestionType(models.TextChoices):
        SINGLE = "single", "Single choice"
        MULTIPLE = "multiple", "Multiple choice"
        TEXT = "text", "Text answer"

    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="questions")
    prompt = models.TextField()
    question_type = models.CharField(
        max_length=16,
        choices=QuestionType.choices,
        default=QuestionType.SINGLE,
    )
    order = models.PositiveIntegerField(default=0)
    points = models.PositiveIntegerField(default=1)
    explanation = models.TextField(blank=True)

    class Meta:
        ordering = ["quiz_id", "order", "id"]


class Answer(TimeStampedModel):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="answers")
    text = models.CharField(max_length=500)
    is_correct = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["question_id", "order", "id"]


class Bookmark(TimeStampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="bookmarks",
    )
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name="bookmarks")
    title = models.CharField(max_length=255, blank=True)
    page = models.PositiveIntegerField(default=0)
    locator = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-updated_at"]


class Note(TimeStampedModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notes",
    )
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name="notes")
    page = models.PositiveIntegerField(default=0)
    selected_text = models.TextField(blank=True)
    body = models.TextField()
    color = models.CharField(max_length=20, default="yellow")
    locator = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-updated_at"]


class Subscription(TimeStampedModel):
    class Plan(models.TextChoices):
        MONTHLY = "monthly", "Monthly"
        YEARLY = "yearly", "Yearly"

    class Status(models.TextChoices):
        TRIALING = "trialing", "Trialing"
        ACTIVE = "active", "Active"
        PAST_DUE = "past_due", "Past due"
        CANCELED = "canceled", "Canceled"
        EXPIRED = "expired", "Expired"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subscriptions",
    )
    plan = models.CharField(max_length=16, choices=Plan.choices)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    provider = models.CharField(max_length=32, default="stripe")
    external_id = models.CharField(max_length=255, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=8, default="USD")
    started_at = models.DateTimeField()
    renews_at = models.DateTimeField(blank=True, null=True)
    canceled_at = models.DateTimeField(blank=True, null=True)
    auto_renew = models.BooleanField(default=True)

    class Meta:
        ordering = ["-started_at"]


class Payment(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SUCCEEDED = "succeeded", "Succeeded"
        FAILED = "failed", "Failed"
        REFUNDED = "refunded", "Refunded"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="payments",
    )
    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.SET_NULL,
        related_name="payments",
        blank=True,
        null=True,
    )
    course = models.ForeignKey(
        Course,
        on_delete=models.SET_NULL,
        related_name="payments",
        blank=True,
        null=True,
    )
    provider = models.CharField(max_length=32, default="stripe")
    provider_payment_id = models.CharField(max_length=255, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=8, default="USD")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    paid_at = models.DateTimeField(blank=True, null=True)
    payload = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
