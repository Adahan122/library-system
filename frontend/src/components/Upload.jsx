import { UploadOutlined } from '@ant-design/icons'
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Switch,
  Typography,
} from 'antd'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLibrary } from '../hooks/useLibrary.js'
import { getBookCoverStyle, getBookPublicationLabel } from '../utils/formatters.js'

const today = () => new Date().toISOString().slice(0, 10)

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Не удалось прочитать файл обложки.'))
    reader.readAsDataURL(file)
  })

const Upload = ({ embedded = false, onUploaded }) => {
  const [form] = Form.useForm()
  const watchedTitle = Form.useWatch('title', form)
  const watchedAuthor = Form.useWatch('author', form)
  const watchedCoverTone = Form.useWatch('coverTone', form)
  const watchedPublishDate = Form.useWatch('publishDate', form)
  const navigate = useNavigate()
  const { categories, uploadBook, notifyError, notifySuccess } = useLibrary()
  const [bookFile, setBookFile] = useState(null)
  const [coverFileName, setCoverFileName] = useState('')
  const [coverPreview, setCoverPreview] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [uploadedBook, setUploadedBook] = useState(null)

  const handleCoverChange = async (event) => {
    const file = event.target.files?.[0] || null

    if (!file) {
      setCoverFileName('')
      setCoverPreview('')
      return
    }

    try {
      const preview = await readFileAsDataUrl(file)
      setCoverFileName(file.name)
      setCoverPreview(preview)
    } catch (error) {
      setCoverFileName('')
      setCoverPreview('')
      notifyError(error.message)
    }
  }

  const handleSubmit = async (values) => {
    if (!bookFile) {
      notifyError('Выберите PDF или EPUB файл.')
      return
    }

    setSubmitting(true)

    try {
      const nextBook = await uploadBook({
        file: bookFile,
        title: values.title || bookFile.name.replace(/\.[^.]+$/, ''),
        author: values.author || '',
        categoryId: values.categoryId,
        theme: values.theme || '',
        description: values.description || '',
        published: values.published,
        estimatedMinutes: values.estimatedMinutes,
        coverTone: values.coverTone,
        coverImage: coverPreview,
        publishDate: values.publishDate,
      })

      setUploadedBook(nextBook)
      notifySuccess('Книга загружена в фонд.')
      form.resetFields()
      form.setFieldsValue({
        estimatedMinutes: 15,
        coverTone: '#4F46E5',
        publishDate: today(),
        published: true,
      })
      setBookFile(null)
      setCoverFileName('')
      setCoverPreview('')
      await onUploaded?.(nextBook)
    } catch (error) {
      notifyError(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const previewBook = {
    title: watchedTitle || (bookFile ? bookFile.name.replace(/\.[^.]+$/, '') : 'Новая книга'),
    author: watchedAuthor || 'Автор книги',
    coverTone: watchedCoverTone || '#4F46E5',
    coverImage: coverPreview,
    publishDate: watchedPublishDate || '',
    publishYear: watchedPublishDate ? Number(watchedPublishDate.slice(0, 4)) : new Date().getFullYear(),
  }

  return (
    <Card className={`feature-surface upload-card${embedded ? ' upload-card-embedded' : ''}`}>
      <Space direction="vertical" size={20} style={{ width: '100%' }}>
        <div>
          <Typography.Title level={3} style={{ marginBottom: 8 }}>
            Загрузка книги
          </Typography.Title>
          <Typography.Paragraph className="muted-copy" style={{ marginBottom: 0 }}>
            Книга сразу добавляется в каталог фонда, а не только сохраняется как файл на сервере.
          </Typography.Paragraph>
        </div>

        <Row gutter={[20, 20]}>
          <Col xs={24} xl={16}>
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                estimatedMinutes: 15,
                coverTone: '#4F46E5',
                publishDate: today(),
                published: true,
              }}
              onFinish={handleSubmit}
            >
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item name="title" label="Название книги">
                    <Input placeholder="Например, История Кыргызстана" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="author" label="Автор">
                    <Input placeholder="Например, Чингиз Айтматов" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="categoryId"
                    label="Раздел"
                    rules={[{ required: true, message: 'Выберите раздел.' }]}
                  >
                    <Select
                      placeholder="Выберите раздел"
                      options={categories.map((category) => ({
                        value: category.id,
                        label: category.name,
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="theme" label="Тема">
                    <Input placeholder="Например, История" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="description" label="Описание">
                <Input.TextArea rows={4} placeholder="Краткое описание книги" />
              </Form.Item>

              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Form.Item
                    name="publishDate"
                    label="Дата публикации"
                    rules={[{ required: true, message: 'Укажите дату публикации.' }]}
                  >
                    <Input type="date" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="estimatedMinutes" label="Минут на чтение">
                    <InputNumber min={5} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="coverTone" label="Цвет фона">
                    <Input type="color" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="published" label="Опубликовать сразу" valuePropName="checked">
                <Switch />
              </Form.Item>

              <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                  <label className="upload-field">
                    <span className="upload-field-label">Файл книги</span>
                    <input
                      type="file"
                      accept=".pdf,.epub,application/pdf,application/epub+zip"
                      onChange={(event) => setBookFile(event.target.files?.[0] || null)}
                    />
                    {bookFile ? <Typography.Text className="muted-copy">{bookFile.name}</Typography.Text> : null}
                  </label>
                </Col>
                <Col xs={24} md={12}>
                  <label className="upload-field">
                    <span className="upload-field-label">Обложка книги</span>
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                      onChange={handleCoverChange}
                    />
                    {coverFileName ? (
                      <Typography.Text className="muted-copy">{coverFileName}</Typography.Text>
                    ) : null}
                  </label>
                </Col>
              </Row>

              <Space wrap style={{ marginTop: 20 }}>
                <Button type="primary" icon={<UploadOutlined />} htmlType="submit" loading={submitting}>
                  Загрузить книгу
                </Button>

                {uploadedBook?.id ? (
                  <Button onClick={() => navigate(`/reader/${uploadedBook.id}`)}>Открыть книгу</Button>
                ) : null}
              </Space>
            </Form>
          </Col>

          <Col xs={24} xl={8}>
            <div className="upload-preview-stack">
              <div className="upload-cover-preview" style={getBookCoverStyle(previewBook)}>
                <span className="book-year">{getBookPublicationLabel(previewBook)}</span>
                <strong>{previewBook.title}</strong>
                <span>{previewBook.author}</span>
              </div>
              <Typography.Text className="muted-copy">
                Превью обновляется сразу после выбора обложки и даты публикации.
              </Typography.Text>
            </div>
          </Col>
        </Row>

        {uploadedBook ? (
          <div className="upload-result">
            <Typography.Text strong>{uploadedBook.title}</Typography.Text>
            <Typography.Text className="muted-copy">
              Книга добавлена в каталог и доступна по адресу `/reader/{uploadedBook.id}`.
            </Typography.Text>
          </div>
        ) : null}
      </Space>
    </Card>
  )
}

export default Upload
