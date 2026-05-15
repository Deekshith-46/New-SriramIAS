# 📢 Announcement System API Documentation

Complete API guide for the Course-based Announcement System in Sriram IAS LMS.

---

## 📋 Table of Contents

- [Base URL](#base-url)
- [Authentication](#authentication)
- [Admin APIs](#admin-apis)
- [Student APIs](#student-apis)
- [Data Models](#data-models)
- [Error Handling](#error-handling)

---

## 🔗 Base URL

```
http://localhost:5000
```

---

## 🔐 Authentication

All endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

### Role Requirements

- **Admin endpoints**: `super_admin` or `center_admin`
- **Student endpoints**: Any authenticated user

---

# 🛠️ Admin APIs

## 1. Create Announcement

Create a new announcement with optional thumbnail and PDF attachments.

**Endpoint:** `POST /api/announcements`

**Access:** Private/Admin (super_admin, center_admin)

**Content-Type:** `multipart/form-data`

### Request Body (Form Data)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | String | ✅ | Announcement title |
| description | String | ✅ | Announcement description |
| courseId | ObjectId | ✅ | Course ID to link announcement |
| announcementType | String | ❌ | Type: `general`, `exam`, `result`, `important` (default: `general`) |
| categoryId | ObjectId | ❌ | Category ID |
| centerId | ObjectId | ❌ | Center ID |
| publishedAt | Date | ❌ | Publish date (default: now) |
| thumbnail | File | ❌ | Image file (jpg, png, etc.) |
| pdf | File | ❌ | PDF file attachment |

### Example Request

```bash
curl -X POST http://localhost:5000/api/announcements \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "title=Anubuthi III Results Announced" \
  -F "description=Results officially announced. Check your dashboard." \
  -F "courseId=6789abcdef1234567890abcd" \
  -F "announcementType=result" \
  -F "categoryId=6789abcdef1234567890abce" \
  -F "centerId=6789abcdef1234567890abcf" \
  -F "thumbnail=@/path/to/image.jpg" \
  -F "pdf=@/path/to/document.pdf"
```

### Success Response (201 Created)

```json
{
  "success": true,
  "message": "Announcement created successfully",
  "data": {
    "_id": "6789abcdef1234567890abc1",
    "title": "Anubuthi III Results Announced",
    "description": "Results officially announced. Check your dashboard.",
    "announcementType": "result",
    "courseId": "6789abcdef1234567890abcd",
    "categoryId": "6789abcdef1234567890abce",
    "centerId": "6789abcdef1234567890abcf",
    "thumbnail": {
      "url": "https://res.cloudinary.com/.../image.jpg",
      "public_id": "announcements/thumbnails/..."
    },
    "pdf": {
      "url": "https://res.cloudinary.com/.../document.pdf",
      "public_id": "announcements/pdfs/...",
      "originalName": "results.pdf"
    },
    "publishedAt": "2025-02-14T10:00:00.000Z",
    "createdBy": "6789abcdef1234567890abc0",
    "isActive": true,
    "createdAt": "2025-02-14T10:00:00.000Z",
    "updatedAt": "2025-02-14T10:00:00.000Z"
  }
}
```

### Error Responses

**400 Bad Request**
```json
{
  "success": false,
  "message": "Missing required fields: title, description, and courseId are required"
}
```

**403 Forbidden**
```json
{
  "success": false,
  "message": "You can only create announcements for your own center"
}
```

---

## 2. Get All Announcements

Retrieve all announcements with filtering and pagination.

**Endpoint:** `GET /api/announcements`

**Access:** Private/Admin (super_admin, center_admin)

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| courseId | String | ❌ | Filter by course ID |
| centerId | String | ❌ | Filter by center ID |
| categoryId | String | ❌ | Filter by category ID |
| announcementType | String | ❌ | Filter by type: `general`, `exam`, `result`, `important` |
| isActive | String | ❌ | Filter by active status: `true` or `false` |
| page | Number | ❌ | Page number (default: 1) |
| limit | Number | ❌ | Items per page (default: 20, max: 100) |

### Example Request

```bash
curl -X GET "http://localhost:5000/api/announcements?announcementType=result&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Success Response (200 OK)

```json
{
  "success": true,
  "count": 2,
  "total": 15,
  "pages": 2,
  "currentPage": 1,
  "data": [
    {
      "_id": "6789abcdef1234567890abc1",
      "title": "Anubuthi III Results Announced",
      "description": "Results officially announced.",
      "announcementType": "result",
      "courseId": {
        "_id": "6789abcdef1234567890abcd",
        "title": "UPSC CSE 2025",
        "slug": "upsc-cse-2025"
      },
      "centerId": {
        "_id": "6789abcdef1234567890abcf",
        "name": "Sriram IAS Chennai"
      },
      "categoryId": {
        "_id": "6789abcdef1234567890abce",
        "name": "Results"
      },
      "thumbnail": {
        "url": "https://res.cloudinary.com/.../image.jpg",
        "public_id": "announcements/thumbnails/..."
      },
      "pdf": null,
      "publishedAt": "2025-02-14T10:00:00.000Z",
      "isActive": true,
      "createdBy": {
        "_id": "6789abcdef1234567890abc0",
        "name": "Admin User",
        "email": "admin@sririamias.com"
      }
    }
  ]
}
```

---

## 3. Get Single Announcement

Retrieve details of a specific announcement.

**Endpoint:** `GET /api/announcements/:id`

**Access:** Private/Admin (super_admin, center_admin)

### Example Request

```bash
curl -X GET http://localhost:5000/api/announcements/6789abcdef1234567890abc1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "_id": "6789abcdef1234567890abc1",
    "title": "Anubuthi III Results Announced",
    "description": "Results officially announced.",
    "announcementType": "result",
    "courseId": {
      "_id": "6789abcdef1234567890abcd",
      "title": "UPSC CSE 2025",
      "slug": "upsc-cse-2025"
    },
    "centerId": {
      "_id": "6789abcdef1234567890abcf",
      "name": "Sriram IAS Chennai"
    },
    "categoryId": {
      "_id": "6789abcdef1234567890abce",
      "name": "Results"
    },
    "thumbnail": {
      "url": "https://res.cloudinary.com/.../image.jpg",
      "public_id": "announcements/thumbnails/..."
    },
    "pdf": {
      "url": "https://res.cloudinary.com/.../document.pdf",
      "public_id": "announcements/pdfs/...",
      "originalName": "results.pdf"
    },
    "publishedAt": "2025-02-14T10:00:00.000Z",
    "isActive": true,
    "createdBy": {
      "_id": "6789abcdef1234567890abc0",
      "name": "Admin User",
      "email": "admin@sririamias.com"
    },
    "createdAt": "2025-02-14T10:00:00.000Z",
    "updatedAt": "2025-02-14T10:00:00.000Z"
  }
}
```

### Error Response (404 Not Found)

```json
{
  "success": false,
  "message": "Announcement not found"
}
```

---

## 4. Update Announcement

Update an existing announcement.

**Endpoint:** `PUT /api/announcements/:id`

**Access:** Private/Admin (super_admin, center_admin)

**Content-Type:** `multipart/form-data`

### Request Body (Form Data)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | String | ❌ | Updated title |
| description | String | ❌ | Updated description |
| courseId | String | ❌ | Updated course ID |
| announcementType | String | ❌ | Updated type |
| categoryId | String | ❌ | Updated category ID |
| centerId | String | ❌ | Updated center ID |
| publishedAt | Date | ❌ | Updated publish date |
| thumbnail | File | ❌ | New thumbnail (replaces old) |
| pdf | File | ❌ | New PDF (replaces old) |

### Example Request

```bash
curl -X PUT http://localhost:5000/api/announcements/6789abcdef1234567890abc1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "title=Updated Results Announcement" \
  -F "description=Updated description with more details" \
  -F "thumbnail=@/path/to/new-image.jpg"
```

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Announcement updated successfully",
  "data": {
    "_id": "6789abcdef1234567890abc1",
    "title": "Updated Results Announcement",
    "description": "Updated description with more details",
    "announcementType": "result",
    "thumbnail": {
      "url": "https://res.cloudinary.com/.../new-image.jpg",
      "public_id": "announcements/thumbnails/..."
    },
    "updatedAt": "2025-02-14T11:00:00.000Z"
  }
}
```

---

## 5. Delete Announcement

Permanently delete an announcement from the database.

**Endpoint:** `DELETE /api/announcements/:id`

**Access:** Private/Admin (super_admin, center_admin)

### Example Request

```bash
curl -X DELETE http://localhost:5000/api/announcements/6789abcdef1234567890abc1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Announcement deleted permanently",
  "data": {
    "_id": "6789abcdef1234567890abc1",
    "title": "Anubuthi III Results Announced"
  }
}
```

### Notes

- This permanently removes the announcement from the database
- All associated read records are also deleted
- This action cannot be undone

---

# 👨‍🎓 Student APIs

## 6. Get Student Announcements

Fetch announcements for enrolled courses with read status.

**Endpoint:** `GET /api/announcements/student`

**Access:** Private (Any authenticated user)

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | Number | ❌ | Page number (default: 1) |
| limit | Number | ❌ | Items per page (default: 20, max: 100) |

### Example Request

```bash
curl -X GET "http://localhost:5000/api/announcements/student?page=1&limit=10" \
  -H "Authorization: Bearer STUDENT_TOKEN"
```

### Success Response (200 OK)

```json
{
  "success": true,
  "count": 2,
  "total": 5,
  "pages": 1,
  "currentPage": 1,
  "data": [
    {
      "_id": "6789abcdef1234567890abc1",
      "title": "Anubuthi III Results Announced",
      "description": "Results officially announced.",
      "announcementType": "result",
      "courseId": {
        "_id": "6789abcdef1234567890abcd",
        "title": "UPSC CSE 2025",
        "slug": "upsc-cse-2025"
      },
      "centerId": {
        "_id": "6789abcdef1234567890abcf",
        "name": "Sriram IAS Chennai"
      },
      "thumbnail": {
        "url": "https://res.cloudinary.com/.../image.jpg",
        "public_id": "announcements/thumbnails/..."
      },
      "pdf": {
        "url": "https://res.cloudinary.com/.../document.pdf",
        "public_id": "announcements/pdfs/...",
        "originalName": "results.pdf"
      },
      "publishedAt": "2025-02-14T10:00:00.000Z",
      "isRead": false,
      "createdAt": "2025-02-14T10:00:00.000Z"
    },
    {
      "_id": "6789abcdef1234567890abc2",
      "title": "Class Schedule Update",
      "description": "New schedule for next week.",
      "announcementType": "general",
      "courseId": {
        "_id": "6789abcdef1234567890abcd",
        "title": "UPSC CSE 2025",
        "slug": "upsc-cse-2025"
      },
      "thumbnail": null,
      "pdf": null,
      "publishedAt": "2025-02-13T10:00:00.000Z",
      "isRead": true,
      "createdAt": "2025-02-13T10:00:00.000Z"
    }
  ]
}
```

### No Enrollments Response (200 OK)

```json
{
  "success": true,
  "message": "No enrollments found",
  "data": [],
  "total": 0
}
```

---

## 7. Mark Announcement as Read

Mark a specific announcement as read by the student.

**Endpoint:** `POST /api/announcements/:id/read`

**Access:** Private (Any authenticated user)

### Example Request

```bash
curl -X POST http://localhost:5000/api/announcements/6789abcdef1234567890abc1/read \
  -H "Authorization: Bearer STUDENT_TOKEN"
```

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Announcement marked as read",
  "data": {
    "_id": "6789read1234567890abc1",
    "announcementId": "6789abcdef1234567890abc1",
    "userId": "6789student12345678",
    "readAt": "2025-02-14T10:30:00.000Z",
    "createdAt": "2025-02-14T10:30:00.000Z",
    "updatedAt": "2025-02-14T10:30:00.000Z"
  }
}
```

### Error Response (404 Not Found)

```json
{
  "success": false,
  "message": "Announcement not found"
}
```

---

## 8. Get Unread Count

Get the count of unread announcements for the student.

**Endpoint:** `GET /api/announcements/student/unread-count`

**Access:** Private (Any authenticated user)

### Example Request

```bash
curl -X GET http://localhost:5000/api/announcements/student/unread-count \
  -H "Authorization: Bearer STUDENT_TOKEN"
```

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "unreadCount": 3
  }
}
```

---

# 📊 Data Models

## Announcement Model

```javascript
{
  _id: ObjectId,
  title: String (required),
  description: String (required),
  thumbnail: {
    url: String,
    public_id: String
  },
  pdf: {
    url: String,
    public_id: String,
    originalName: String
  },
  announcementType: String (enum: "general", "exam", "result", "important"),
  courseId: ObjectId (ref: "Course", required),
  categoryId: ObjectId (ref: "Category"),
  centerId: ObjectId (ref: "Center"),
  publishedAt: Date,
  createdBy: ObjectId (ref: "User", required),
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

## AnnouncementRead Model

```javascript
{
  _id: ObjectId,
  announcementId: ObjectId (ref: "Announcement"),
  userId: ObjectId (ref: "User"),
  readAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

# ⚠️ Error Handling

## Common Error Responses

### 400 Bad Request

```json
{
  "success": false,
  "message": "Error message describing the issue"
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "message": "Not authorized to access this route"
}
```

### 403 Forbidden

```json
{
  "success": false,
  "message": "You can only create announcements for your own center"
}
```

### 404 Not Found

```json
{
  "success": false,
  "message": "Announcement not found"
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Failed to create announcement",
  "error": "Detailed error message (development only)"
}
```

---

# 🔒 Security Features

✅ **Authentication required** - All endpoints protected with JWT  
✅ **Role-based access** - Admin vs Student separation  
✅ **Center admin isolation** - Can only manage their center's announcements  
✅ **Soft delete** - Data preservation with `isActive` flag  
✅ **File upload validation** - Cloudinary integration with type checking  
✅ **Safe pagination** - Max limit of 100 per request  

---

# 📝 Notes

- **Announcement types**: `general`, `exam`, `result`, `important`
- **Default announcement type**: `general`
- **Default pagination**: 20 items per page
- **Maximum pagination limit**: 100 items per page
- **File uploads**: Supports images (thumbnail) and PDFs
- **Read status**: Tracked separately for scalability
- **Hard delete**: Announcements are permanently removed from database when deleted

---

# 🚀 Quick Start

1. **Admin creates announcement** → `POST /api/announcements`
2. **Student fetches announcements** → `GET /api/announcements/student`
3. **Student marks as read** → `POST /api/announcements/:id/read`
4. **Check unread count** → `GET /api/announcements/student/unread-count`
5. **Admin deletes announcement** → `DELETE /api/announcements/:id`

---

**Version:** 1.0.0  
**Last Updated:** 2025-02-14  
**Base URL:** http://localhost:5000
