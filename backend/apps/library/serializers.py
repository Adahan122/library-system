from pathlib import Path
from urllib.parse import urlparse

from rest_framework import serializers

from .models import ALLOWED_BOOK_EXTENSIONS, Book


class BookSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Book
        fields = [
            'id',
            'title',
            'author',
            'file_url',
            'external_url',
            'created_at',
        ]

    def get_file_url(self, book):
        if not book.file:
            return None

        request = self.context.get('request')
        if request is None:
            return book.file.url

        return request.build_absolute_uri(book.file.url)


class BookUploadSerializer(serializers.Serializer):
    title = serializers.CharField(required=False, allow_blank=True, max_length=255)
    author = serializers.CharField(required=False, allow_blank=True, max_length=255)
    file = serializers.FileField()

    def validate_file(self, uploaded_file):
        extension = Path(uploaded_file.name).suffix.lower()
        if extension not in ALLOWED_BOOK_EXTENSIONS:
            raise serializers.ValidationError('Only PDF and EPUB files are supported.')

        return uploaded_file

    def create(self, validated_data):
        uploaded_file = validated_data['file']
        title = validated_data.get('title') or Path(uploaded_file.name).stem.replace('_', ' ').strip()

        return Book.objects.create(
            title=title or 'Untitled book',
            author=validated_data.get('author', '').strip(),
            file=uploaded_file,
        )


class BookImportSerializer(serializers.Serializer):
    url = serializers.URLField()
    title = serializers.CharField(required=False, allow_blank=True, max_length=255)
    author = serializers.CharField(required=False, allow_blank=True, max_length=255)

    def validate_url(self, value):
        parsed = urlparse(value)
        if parsed.scheme not in {'http', 'https'}:
            raise serializers.ValidationError('Only http and https URLs are supported.')

        return value
