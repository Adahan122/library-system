import uuid
from pathlib import Path

from django.core.exceptions import ValidationError
from django.db import models
from django.utils.text import slugify


ALLOWED_BOOK_EXTENSIONS = {'.pdf', '.epub'}


def book_upload_to(instance, filename):
    suffix = Path(filename).suffix.lower()
    stem = Path(filename).stem
    base_name = slugify(instance.title or stem, allow_unicode=True) or 'book'
    return f'books/{base_name}-{uuid.uuid4().hex[:12]}{suffix}'


class Book(models.Model):
    title = models.CharField(max_length=255)
    author = models.CharField(max_length=255, blank=True)
    file = models.FileField(upload_to=book_upload_to, blank=True, null=True)
    external_url = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def clean(self):
        super().clean()

        if not self.file and not self.external_url:
            raise ValidationError('Either file or external_url must exist.')

        if self.file:
            extension = Path(self.file.name).suffix.lower()
            if extension not in ALLOWED_BOOK_EXTENSIONS:
                raise ValidationError({'file': 'Only PDF and EPUB files are supported.'})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return self.title
