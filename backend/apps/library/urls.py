from django.urls import path

from .views import BookDetailAPIView, BookImportAPIView, BookListAPIView, BookUploadAPIView


urlpatterns = [
    path('', BookListAPIView.as_view(), name='book-list'),
    path('upload/', BookUploadAPIView.as_view(), name='book-upload'),
    path('import/', BookImportAPIView.as_view(), name='book-import'),
    path('<int:pk>/', BookDetailAPIView.as_view(), name='book-detail'),
]
