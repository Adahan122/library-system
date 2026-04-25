# Book Import API Examples

## Upload PDF or EPUB

```bash
curl -X POST http://localhost:8000/api/books/upload/ \
  -H "Authorization: Bearer <token>" \
  -F "title=Atomic Habits" \
  -F "author=James Clear" \
  -F "file=@C:/Books/atomic-habits.pdf"
```

## Import book from external URL

```bash
curl -X POST http://localhost:8000/api/books/import/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d "{\"url\": \"https://example.com/book.epub\", \"title\": \"Imported EPUB\"}"
```

## Get all books

```bash
curl http://localhost:8000/api/books/
```

## Get one book

```bash
curl http://localhost:8000/api/books/12/
```
