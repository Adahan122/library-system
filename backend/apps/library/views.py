from pathlib import Path
from urllib.parse import urlparse

import requests
from django.core.files.base import ContentFile
from django.utils.text import slugify
from requests import RequestException
from rest_framework import generics, serializers, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ALLOWED_BOOK_EXTENSIONS, Book
from .serializers import BookImportSerializer, BookSerializer, BookUploadSerializer


CONTENT_TYPE_TO_EXTENSION = {
    'application/pdf': '.pdf',
    'application/epub+zip': '.epub',
}


def _infer_extension(source_url, response):
    candidates = [
        Path(urlparse(response.url).path).suffix.lower(),
        Path(urlparse(source_url).path).suffix.lower(),
    ]

    for candidate in candidates:
        if candidate in ALLOWED_BOOK_EXTENSIONS:
            return candidate

    content_type = response.headers.get('Content-Type', '').split(';', 1)[0].strip().lower()
    extension = CONTENT_TYPE_TO_EXTENSION.get(content_type)
    if extension:
        return extension

    raise serializers.ValidationError({'url': 'Supported file types are PDF and EPUB.'})


def _build_filename(source_url, response, provided_title, extension):
    if provided_title:
        base_name = slugify(provided_title)
    else:
        response_name = Path(urlparse(response.url).path).stem
        source_name = Path(urlparse(source_url).path).stem
        base_name = slugify(response_name or source_name or 'book')

    return f'{base_name or "book"}{extension}'


class BookListAPIView(generics.ListAPIView):
    queryset = Book.objects.all()
    serializer_class = BookSerializer
    permission_classes = [AllowAny]


class BookDetailAPIView(generics.RetrieveAPIView):
    queryset = Book.objects.all()
    serializer_class = BookSerializer
    permission_classes = [AllowAny]


class BookUploadAPIView(APIView):
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = BookUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        book = serializer.save()

        response_serializer = BookSerializer(book, context={'request': request})
        return Response(
            {
                'status': 'uploaded',
                'book': response_serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


class BookImportAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = BookImportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        source_url = serializer.validated_data['url']
        title = serializer.validated_data.get('title', '').strip()
        author = serializer.validated_data.get('author', '').strip()

        try:
            response = requests.get(source_url, timeout=30, stream=True)
            response.raise_for_status()
        except RequestException as exc:
            return Response(
                {'detail': f'Failed to download the book: {exc}'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        extension = _infer_extension(source_url, response)
        filename = _build_filename(source_url, response, title, extension)
        resolved_title = title or Path(filename).stem.replace('-', ' ').replace('_', ' ').strip()

        book = Book(
            title=resolved_title or 'Imported book',
            author=author,
            external_url=source_url,
        )
        book.file.save(filename, ContentFile(response.content), save=False)
        book.save()

        response_serializer = BookSerializer(book, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
