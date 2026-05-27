# City API Guide

**Base URL:** `{{BASE_URL}}` (e.g. `http://localhost:5000`)  
**Auth:** Super Admin — `Authorization: Bearer <token>`

Postman: **`CITY_POSTMAN_COLLECTION.json`**

---

## Overview

Each **City** record is linked to one **Center** (`centerId`).

| Field         | Type     | Required | Notes                    |
|---------------|----------|----------|--------------------------|
| `centerId`    | ObjectId | Yes      | Must be an active center |
| `cityAddress` | String   | Yes      | Full address text        |
| `status`      | String   | No       | `ACTIVE` or `INACTIVE` (default `ACTIVE`) |

---

## Authentication

```http
POST {{BASE_URL}}/api/auth/login-super-admin
Content-Type: application/json

{
  "email": "admin@sriram.com",
  "password": "admin123"
}
```

---

## Endpoints

| Method | Endpoint | Action |
|--------|----------|--------|
| POST | `{{BASE_URL}}/api/cities` | Create |
| GET | `{{BASE_URL}}/api/cities` | List + search + filters |
| GET | `{{BASE_URL}}/api/cities/:id` | View details |
| PUT | `{{BASE_URL}}/api/cities/:id` | Edit |
| PATCH | `{{BASE_URL}}/api/cities/status/:id` | Toggle status |
| DELETE | `{{BASE_URL}}/api/cities/:id` | Soft delete |

---

## 1. Create city

```http
POST {{BASE_URL}}/api/cities
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "centerId": "CENTER_MONGODB_OBJECT_ID",
  "cityAddress": "Plot 12, Road No 5, Banjara Hills, Hyderabad - 500034",
  "status": "ACTIVE"
}
```

**Response `201`**

```json
{
  "success": true,
  "message": "City created successfully",
  "data": {
    "_id": "...",
    "centerId": "...",
    "centerName": "Hyderabad Main Center",
    "cityAddress": "Plot 12, Road No 5, Banjara Hills, Hyderabad - 500034",
    "status": "ACTIVE",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

## 2. List cities (search + filters)

```http
GET {{BASE_URL}}/api/cities?page=1&limit=10&search=hyderabad&center=CENTER_OBJECT_ID&status=ACTIVE
Authorization: Bearer <token>
```

| Query    | Description |
|----------|-------------|
| `page`   | Default `1` |
| `limit`  | Default `10`, max `100` |
| `search` | Matches **city address** OR **center name** (case-insensitive) |
| `center` | Filter by `centerId` |
| `status` | `ACTIVE` or `INACTIVE` |
| `sortBy` | `createdAt`, `cityAddress`, `status`, `centerName` |
| `sortOrder` | `asc` or `desc` |

**Response `200`**

```json
{
  "success": true,
  "total": 15,
  "page": 1,
  "limit": 10,
  "totalPages": 2,
  "count": 10,
  "data": [
    {
      "_id": "...",
      "centerId": "...",
      "centerName": "Hyderabad Main Center",
      "cityAddress": "Plot 12, Banjara Hills, Hyderabad",
      "status": "ACTIVE",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

---

## 3. View city details

```http
GET {{BASE_URL}}/api/cities/:id
Authorization: Bearer <token>
```

---

## 4. Edit city

```http
PUT {{BASE_URL}}/api/cities/:id
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "centerId": "CENTER_OBJECT_ID",
  "cityAddress": "Updated address line",
  "status": "ACTIVE"
}
```

All fields are optional on update; send only what you want to change.

---

## 5. Toggle status

```http
PATCH {{BASE_URL}}/api/cities/status/:id
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "status": "INACTIVE"
}
```

---

## 6. Delete city

```http
DELETE {{BASE_URL}}/api/cities/:id
Authorization: Bearer <token>
```

Soft delete: sets `isDeleted: true` and `status: INACTIVE`.

---

## Errors

```json
{
  "success": false,
  "message": "centerId is required"
}
```

```json
{
  "success": false,
  "message": "Invalid or inactive center"
}
```
