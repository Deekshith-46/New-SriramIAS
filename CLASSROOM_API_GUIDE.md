# Classroom API Guide — Center → City → Classroom

**Base URL:** `{{BASE_URL}}`  
**Authorization:** `Bearer {{SuperAdminToken}}`

Postman: **`CLASSROOM_POSTMAN_COLLECTION.json`**

---

## Hierarchy

```text
Center
   ↓
City (branch / place — cityAddress)
   ↓
Classroom
```

Classrooms are **infrastructure** — not linked to courses, subjects, or teachers.

---

## Dependent dropdown flow

```text
1. GET {{BASE_URL}}/api/centers/dropdown
2. User selects center → GET {{BASE_URL}}/api/cities/by-center/:centerId
3. User selects city → POST classroom with center + city
```

---

## 1. Centers dropdown

```http
GET {{BASE_URL}}/api/centers/dropdown
Authorization: Bearer {{SuperAdminToken}}
```

```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "centerObjectId",
      "centerName": "Hyderabad Main Center",
      "centerCode": "HYD01",
      "city": "Hyderabad",
      "state": "Telangana"
    }
  ]
}
```

Also available at: `{{BASE_URL}}/api/admin/centers/dropdown`

---

## 2. Cities by center

```http
GET {{BASE_URL}}/api/cities/by-center/:centerId
Authorization: Bearer {{SuperAdminToken}}
```

```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "cityObjectId",
      "centerId": "centerObjectId",
      "cityAddress": "Ameerpet, Hyderabad",
      "cityName": "Ameerpet, Hyderabad"
    }
  ]
}
```

`cityName` is an alias of `cityAddress` for UI dropdowns.

---

## 3. Create classroom

```http
POST {{BASE_URL}}/api/classrooms
Authorization: Bearer {{SuperAdminToken}}
Content-Type: application/json
```

```json
{
  "center": "CENTER_OBJECT_ID",
  "city": "CITY_OBJECT_ID",
  "classroomName": "Class Room 1",
  "classroomCode": "CR-01",
  "capacity": 40,
  "status": "ACTIVE"
}
```

Aliases: `centerId`, `cityId` also accepted.

**Validations**

- `classroomCode` — globally unique (stored uppercase)
- `capacity` — must be `>= 0`
- `city` must belong to `center` and be ACTIVE

**Response `201`**

```json
{
  "success": true,
  "message": "Classroom created successfully",
  "data": {
    "_id": "...",
    "classroomId": "CLS001",
    "center": "...",
    "centerName": "Hyderabad Main Center",
    "city": "...",
    "cityAddress": "Ameerpet, Hyderabad",
    "classroomName": "Class Room 1",
    "classroomCode": "CR-01",
    "capacity": 40,
    "status": "ACTIVE",
    "usage": {
      "upcoming": 0,
      "totalBookings": 0
    },
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

## 4. List classrooms

```http
GET {{BASE_URL}}/api/classrooms?page=1&limit=10&search=room&center=CENTER_ID&city=CITY_ID&status=ACTIVE
Authorization: Bearer {{SuperAdminToken}}
```

| Query    | Description |
|----------|-------------|
| `search` | `classroomName`, `classroomCode`, center name, city address |
| `center` | Filter by center `_id` |
| `city`   | Filter by city `_id` |
| `status` | `ACTIVE` or `INACTIVE` |

---

## 5. View / edit / status / delete

| Action | Method | Endpoint |
|--------|--------|----------|
| Details | GET | `{{BASE_URL}}/api/classrooms/:id` |
| Edit | PUT | `{{BASE_URL}}/api/classrooms/:id` |
| Status | PATCH | `{{BASE_URL}}/api/classrooms/status/:id` |
| Delete | DELETE | `{{BASE_URL}}/api/classrooms/:id` |

**PATCH status body**

```json
{
  "status": "INACTIVE"
}
```

---

## Usage field (future)

List/detail includes:

```json
"usage": {
  "upcoming": 0,
  "totalBookings": 0
}
```

Reserved for batch schedules / live class timetables.

---

## Errors

```json
{
  "success": false,
  "message": "City does not belong to the selected center or is inactive"
}
```

```json
{
  "success": false,
  "message": "classroomCode already exists"
}
```

```json
{
  "success": false,
  "message": "Invalid capacity. Must be zero or a positive number."
}
```
