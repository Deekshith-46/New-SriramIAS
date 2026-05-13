# 📚 Complete Course System API Documentation

## Overview

Production-grade course management system with Cloudinary media uploads, category/center relations, installment plans, and enrollment tracking.

---

## 📑 Table of Contents

1. [Model Schema](#model-schema)
2. [API Endpoints](#api-endpoints)
3. [Step-by-Step API Testing](#step-by-step-api-testing)
4. [Public vs Admin Routes](#public-vs-admin-routes)
5. [Frontend Integration](#frontend-integration)

---

## 📊 Model Schema

### Course Model

**File:** `models/Course.js`

```javascript
{
   // Basic Info
   title: String (required),
   slug: String (auto-generated, unique),
   center: ObjectId (ref: Center, required),
   category: ObjectId (ref: Category, required),
   description: String,
   
   // Dates & Duration
   batchStartDate: Date,
   batchEndDate: Date,
   duration: String,                    // "1 Year", "6 Months"
   accessValidityInDays: Number,
   recordedContentValidityInDays: Number,
   
   // Fees with Auto-Calculated Pricing
   fees: {
      online: {
         actualPrice: Number,           // Required: ₹100,000
         discountPercent: Number,       // Optional: 20
         discountedPrice: Number,       // Auto-calculated: ₹80,000
         hasDiscount: Boolean,          // Auto-calculated: true
         offerText: String              // Optional: "Summer Offer"
      },
      offline: {
         actualPrice: Number,
         discountPercent: Number,
         discountedPrice: Number,
         hasDiscount: Boolean,
         offerText: String
      },
      description: String
   },
   
   // Modes
   modes: ['online', 'offline', 'hybrid'],
   
   // Media (Cloudinary)
   bannerImage: {                       // Required
      url: String,
      public_id: String
   },
   highlightImage: {                    // Optional
      url: String,
      public_id: String
   },
   sectionImage: {                      // Optional
      url: String,
      public_id: String
   },
   galleryImages: [{                    // Optional, max 5
      url: String,
      public_id: String
   }],
   promoVideo: {                        // Optional
      url: String,
      public_id: String
   },
   brochure: {                          // Optional (PDF)
      url: String,
      public_id: String
   },
   
   // Content Sections
   keyHighlights: {
      keyTitle: String,
      keyHighlightTexts: [String]
   },
   whyChoose: {
      whyChooseTitle: String,
      whyChooseItems: [{
         whyChooseText: String,
         whyChooseContent: String
      }]
   },
   howItHelps: {
      howItHelpsTitle: String,
      howItHelpsTexts: [String]
   },
   
   // Extra Fields (Flexible)
   extraFields: Mixed,                  // Category-specific data
   
   // Additional
   features: [String],
   isActive: Boolean (default: true),
   isFeatured: Boolean (default: false),
   createdBy: ObjectId (ref: User)
}
```

**Indexes:**
- `{ center: 1, category: 1 }`
- `{ isActive: 1 }`

---

## 🔌 API Endpoints

### Base URL: `http://localhost:5000/api/courses`

### Public Routes (No Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| **GET** | `/api/courses` | Get all courses (with filters) |
| **GET** | `/api/courses/enquiry` | Get course titles for enquiry forms |
| **GET** | `/api/courses/grouped` | Get courses grouped by center/category |
| **GET** | `/api/courses/slug/:slug` | Get course by slug |
| **GET** | `/api/courses/:id` | Get course by ID |
| **POST** | `/api/courses/find` | Get course by ID (POST method) |

### Admin Routes (Auth Required)

| Method | Endpoint | Access | Content-Type | Description |
|--------|----------|--------|--------------|-------------|
| **POST** | `/api/courses` | Super Admin, Center Admin | multipart/form-data | Create course |
| **PUT** | `/api/courses/:id` | Super Admin, Center Admin | multipart/form-data | Update course |
| **DELETE** | `/api/courses/:id` | Super Admin only | JSON | Delete course |

---

## 🧪 Step-by-Step API Testing

### Prerequisites

1. **Get Authentication Token (for admin routes):**
   ```bash
   POST http://localhost:5000/api/auth/login
   Body: { "email": "admin@example.com", "password": "yourpassword" }
   ```
   Save the `token` from response.

2. **Get Center ID:**
   ```bash
   GET http://localhost:5000/api/centers
   ```
   Save a center `_id`.

3. **Get Category ID:**
   ```bash
   GET http://localhost:5000/api/categories
   ```
   Save a category `_id`.

---

### Test 1: Create Course (Admin Only)

```bash
POST http://localhost:5000/api/courses
Authorization: Bearer YOUR_TOKEN
Content-Type: multipart/form-data
```

**Form Data:**
```
title: UPSC GS Foundation Course
center: YOUR_CENTER_ID
category: YOUR_CATEGORY_ID
description: Comprehensive GS Foundation course for UPSC CSE
duration: 2 Years
batchStartDate: 2026-06-01
batchEndDate: 2028-06-01
accessValidityInDays: 730
recordedContentValidityInDays: 365

// Fee Structure (NEW)
onlineActualPrice: 150000
onlineDiscountPercent: 20
onlineOfferText: Summer Sale 2026
offlineActualPrice: 200000
offlineDiscountPercent: 0
offlineOfferText:
feesDescription: Installment options available
modes: ["online", "offline"]

keyHighlights: {
   "keyTitle": "Key Highlights",
   "keyHighlightTexts": [
      "Live Interactive Classes",
      "Recorded Backup Sessions",
      "Personal Mentorship",
      "Daily Current Affairs"
   ]
}

whyChoose: {
   "whyChooseTitle": "Why Choose Us",
   "whyChooseItems": [
      {
         "whyChooseText": "Expert Faculty",
         "whyChooseContent": "Learn from retired IAS officers"
      },
      {
         "whyChooseText": "Proven Results",
         "whyChooseContent": "500+ selections in last 5 years"
      }
   ]
}

howItHelps: {
   "howItHelpsTitle": "How It Helps",
   "howItHelpsTexts": [
      "Complete syllabus coverage",
      "Answer writing practice",
      "Mock interviews"
   ]
}

features: ["Live Classes", "Recorded Videos", "Test Series", "Mentorship"]
isFeatured: true
isActive: true

// Files (Required & Optional)
banner: [Select Image File]          // REQUIRED
highlight: [Select Image File]       // Optional
section: [Select Image File]         // Optional
gallery: [Select up to 5 Images]     // Optional
video: [Select Video File]           // Optional
brochure: [Select PDF File]          // Optional
```

**Expected Response (201):**
```json
{
   "success": true,
   "message": "Course created successfully",
   "data": {
      "_id": "course_id_here",
      "title": "UPSC GS Foundation Course",
      "slug": "upsc-gs-foundation-course-1234567890",
      "center": "...",
      "category": "...",
      "bannerImage": {
         "url": "https://res.cloudinary.com/.../banner.jpg",
         "public_id": "courses/banners/xyz123"
      },
      "fees": {
         "online": {
            "actualPrice": 150000,
            "discountPercent": 20,
            "discountedPrice": 120000,
            "hasDiscount": true,
            "offerText": "Summer Sale 2026"
         },
         "offline": {
            "actualPrice": 200000,
            "discountPercent": 0,
            "discountedPrice": 200000,
            "hasDiscount": false,
            "offerText": ""
         },
         "description": "Installment options available"
      },
      ...
   }
}
```

**✅ Save the course `_id` for next tests.**

---

### Test 2: Get All Courses (Public)

```bash
GET http://localhost:5000/api/courses
```

**Expected Response (200):**
```json
{
   "success": true,
   "count": 5,
   "data": [
      {
         "_id": "...",
         "title": "UPSC GS Foundation Course",
         "slug": "...",
         "center": {
            "_id": "...",
            "name": "Pune Center"
         },
         "category": {
            "_id": "...",
            "name": "GS Foundation"
         },
         "bannerImage": {
            "url": "https://res.cloudinary.com/...",
            "public_id": "..."
         },
         "fees": {
            "online": 150000,
            "offline": 200000
         },
         "isActive": true,
         "isFeatured": true
      }
   ]
}
```

---

### Test 3: Filter Courses by Center & Category

```bash
GET http://localhost:5000/api/courses?centerName=Pune&categoryName=GS Foundation
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `centerName` | String | Filter by center name (case-insensitive) |
| `categoryName` | String | Filter by category name (case-insensitive) |
| `isActive` | Boolean | Filter by active status |

---

### Test 4: Get Courses for Enquiry Form (Public)

```bash
GET http://localhost:5000/api/courses/enquiry?centerName=Pune&categoryName=GS Foundation
```

**Expected Response (200):**
```json
{
   "success": true,
   "count": 3,
   "courses": [
      {
         "_id": "course_id_1",
         "title": "UPSC GS Foundation Course"
      },
      {
         "_id": "course_id_2",
         "title": "UPSC Optional Geography"
      },
      {
         "_id": "course_id_3",
         "title": "UPSC Test Series"
      }
   ]
}
```

**Purpose:** Returns only `_id` and `title` for dropdown in enquiry forms.

---

### Test 5: Get Courses Grouped (Public)

```bash
GET http://localhost:5000/api/courses/grouped
```

**Expected Response (200):**
```json
{
   "success": true,
   "data": {
      "Pune Center": {
         "GS Foundation": [
            { "_id": "...", "title": "UPSC GS Foundation" },
            { "_id": "...", "title": "GS Foundation Test Series" }
         ],
         "Optional Subjects": [
            { "_id": "...", "title": "Geography Optional" }
         ]
      },
      "Delhi Center": {
         "GS Foundation": [
            { "_id": "...", "title": "UPSC GS Foundation" }
         ]
      }
   }
}
```

---

### Test 6: Get Single Course by ID (Public)

```bash
GET http://localhost:5000/api/courses/COURSE_ID
```

**Expected Response (200):**
```json
{
   "success": true,
   "data": {
      "_id": "...",
      "title": "UPSC GS Foundation Course",
      "slug": "upsc-gs-foundation-course-1234567890",
      "center": {
         "_id": "...",
         "name": "Pune Center",
         "address": "Pune, Maharashtra"
      },
      "category": {
         "_id": "...",
         "name": "GS Foundation"
      },
      "description": "Comprehensive GS Foundation course...",
      "batchStartDate": "2026-06-01T00:00:00.000Z",
      "batchEndDate": "2028-06-01T00:00:00.000Z",
      "duration": "2 Years",
      "accessValidityInDays": 730,
      "recordedContentValidityInDays": 365,
      "fees": {
         "online": 150000,
         "offline": 200000,
         "description": "Installment options available"
      },
      "modes": ["online", "offline"],
      "bannerImage": {
         "url": "https://res.cloudinary.com/...",
         "public_id": "courses/banners/xyz123"
      },
      "highlightImage": { ... },
      "sectionImage": { ... },
      "galleryImages": [
         { "url": "...", "public_id": "..." },
         { "url": "...", "public_id": "..." }
      ],
      "promoVideo": { ... },
      "brochure": { ... },
      "keyHighlights": {
         "keyTitle": "Key Highlights",
         "keyHighlightTexts": [
            "Live Interactive Classes",
            "Recorded Backup Sessions"
         ]
      },
      "whyChoose": {
         "whyChooseTitle": "Why Choose Us",
         "whyChooseItems": [
            {
               "whyChooseText": "Expert Faculty",
               "whyChooseContent": "Learn from retired IAS officers"
            }
         ]
      },
      "howItHelps": {
         "howItHelpsTitle": "How It Helps",
         "howItHelpsTexts": [
            "Complete syllabus coverage",
            "Answer writing practice"
         ]
      },
      "features": ["Live Classes", "Recorded Videos"],
      "isActive": true,
      "isFeatured": true,
      "createdAt": "...",
      "updatedAt": "..."
   }
}
```

---

### Test 7: Get Course by Slug (Public)

```bash
GET http://localhost:5000/api/courses/slug/upsc-gs-foundation-course-1234567890
```

**Expected Response (200):** Same as Test 6

**Purpose:** SEO-friendly URLs for frontend routing.

---

### Test 8: Update Course (Admin Only)

```bash
PUT http://localhost:5000/api/courses/COURSE_ID
Authorization: Bearer YOUR_TOKEN
Content-Type: multipart/form-data
```

**Form Data (Partial Update - only send fields you want to update):**
```
title: UPSC GS Foundation Course 2026
onlineFees: 160000
offlineFees: 210000
isFeatured: true

// Optional: Replace images
banner: [New Image File]        // Replaces old banner
highlight: [New Image File]     // Replaces old highlight

// Optional: Add new gallery images
gallery: [New Image 1, New Image 2]

keyHighlights: {
   "keyTitle": "Updated Highlights",
   "keyHighlightTexts": [
      "New Feature 1",
      "New Feature 2"
   ]
}
```

**Expected Response (200):**
```json
{
   "success": true,
   "message": "Course updated successfully",
   "data": {
      "_id": "...",
      "title": "UPSC GS Foundation Course 2026",
      "fees": {
         "online": 160000,
         "offline": 210000
      },
      ...
   }
}
```

---

### Test 9: Delete Course (Super Admin Only)

```bash
DELETE http://localhost:5000/api/courses/COURSE_ID
Authorization: Bearer YOUR_TOKEN
```

**Expected Response (200):**
```json
{
   "success": true,
   "message": "Course deleted successfully"
}
```

**⚠️ Note:** Only `super_admin` can delete courses. `center_admin` cannot delete.

---

### Test 10: Create Course with All Media (Complete Example)

```bash
POST http://localhost:5000/api/courses
Authorization: Bearer YOUR_TOKEN
Content-Type: multipart/form-data
```

**Form Data:**
```
title: Complete UPSC Preparation
center: CENTER_ID
category: CATEGORY_ID
description: All-in-one UPSC preparation course
duration: 3 Years
batchStartDate: 2026-07-01
batchEndDate: 2029-07-01
onlineFees: 250000
offlineFees: 350000
modes: ["online", "offline", "hybrid"]

keyHighlights: {
   "keyTitle": "What You Get",
   "keyHighlightTexts": [
      "Prelims + Mains + Interview",
      "Optional Subject Included",
      "Daily Current Affairs",
      "Weekly Test Series",
      "Personal Mentorship"
   ]
}

whyChoose: {
   "whyChooseTitle": "Our Advantages",
   "whyChooseItems": [
      {
         "whyChooseText": "Top Faculty",
         "whyChooseContent": "Ex-IAS, retired professors"
      },
      {
         "whyChooseText": "Success Rate",
         "whyChooseContent": "30% selection rate"
      },
      {
         "whyChooseText": "Study Material",
         "whyChooseContent": "Comprehensive printed + digital notes"
      }
   ]
}

howItHelps: {
   "howItHelpsTitle": "Student Benefits",
   "howItHelpsTexts": [
      "Structured learning path",
      "Regular assessments",
      "Doubt clearing sessions",
      "Interview guidance"
   ]
}

features: ["Live Classes", "Recorded Videos", "Test Series", "Mentorship", "Study Material", "Interview Prep"]
isFeatured: true
isActive: true

// Files
banner: [High-quality banner image]
highlight: [Highlight section image]
section: [Section header image]
gallery: [Campus photo 1, Campus photo 2, Classroom photo, Library photo]
video: [Promotional video MP4]
brochure: [Course brochure PDF]
```

---

## 🔄 Public vs Admin Routes

### Public Routes (No Token Needed)

✅ **Anyone can access these:**

```bash
# Get all courses
GET /api/courses

# Filter courses
GET /api/courses?centerName=Pune&categoryName=GS Foundation

# Get for enquiry dropdown
GET /api/courses/enquiry?centerName=Pune

# Get grouped by center/category
GET /api/courses/grouped

# Get by ID
GET /api/courses/COURSE_ID

# Get by slug
GET /api/courses/slug/course-slug-here

# Find by ID (POST)
POST /api/courses/find
Body: { "courseId": "COURSE_ID" }
```

### Admin Routes (Token Required)

🔒 **Only Super Admin & Center Admin:**

```bash
# Create course
POST /api/courses
Headers: Authorization: Bearer TOKEN
Content-Type: multipart/form-data

# Update course
PUT /api/courses/COURSE_ID
Headers: Authorization: Bearer TOKEN
Content-Type: multipart/form-data

# Delete course (Super Admin only)
DELETE /api/courses/COURSE_ID
Headers: Authorization: Bearer TOKEN
```

---

## 💻 Frontend Integration

### 1. Create Course (React + Axios)

```javascript
const createCourse = async (formData) => {
   try {
      const response = await axios.post(
         'http://localhost:5000/api/courses',
         formData,
         {
            headers: {
               'Authorization': `Bearer ${token}`,
               'Content-Type': 'multipart/form-data'
            }
         }
      );
      
      console.log('Course created:', response.data);
      return response.data;
   } catch (error) {
      console.error('Error creating course:', error.response.data);
      throw error;
   }
};

// Usage
const formData = new FormData();
formData.append('title', 'UPSC GS Foundation');
formData.append('center', centerId);
formData.append('category', categoryId);
formData.append('onlineFees', 150000);
formData.append('banner', bannerFile);
formData.append('keyHighlights', JSON.stringify({
   keyTitle: 'Highlights',
   keyHighlightTexts: ['Live Classes', 'Recorded Videos']
}));

await createCourse(formData);
```

### 2. Get Courses (Public)

```javascript
const getCourses = async (filters = {}) => {
   try {
      const params = new URLSearchParams();
      
      if (filters.centerName) params.append('centerName', filters.centerName);
      if (filters.categoryName) params.append('categoryName', filters.categoryName);
      
      const response = await axios.get(
         `http://localhost:5000/api/courses?${params}`
      );
      
      return response.data.data;
   } catch (error) {
      console.error('Error fetching courses:', error);
      throw error;
   }
};

// Usage
const courses = await getCourses({
   centerName: 'Pune',
   categoryName: 'GS Foundation'
});
```

### 3. Get Courses for Enquiry Dropdown

```javascript
const getCoursesForEnquiry = async (centerName, categoryName) => {
   try {
      const params = new URLSearchParams();
      
      if (centerName) params.append('centerName', centerName);
      if (categoryName && categoryName !== 'All') {
         params.append('categoryName', categoryName);
      }
      
      const response = await axios.get(
         `http://localhost:5000/api/courses/enquiry?${params}`
      );
      
      return response.data.courses;
   } catch (error) {
      console.error('Error:', error);
      throw error;
   }
};

// Usage
const courseOptions = await getCoursesForEnquiry('Pune', 'GS Foundation');
// Returns: [{ _id: "...", title: "..." }, ...]
```

### 4. Get Single Course

```javascript
const getCourseById = async (courseId) => {
   try {
      const response = await axios.get(
         `http://localhost:5000/api/courses/${courseId}`
      );
      
      return response.data.data;
   } catch (error) {
      console.error('Error:', error);
      throw error;
   }
};
```

---

## 📝 Important Notes

### File Upload Limits
- **Banner Image:** Required (1 file)
- **Highlight Image:** Optional (1 file)
- **Section Image:** Optional (1 file)
- **Gallery Images:** Optional (max 5 files)
- **Promo Video:** Optional (1 file)
- **Brochure PDF:** Optional (1 file)

### Role-Based Access
- **Super Admin:** Can create, update, delete ANY course
- **Center Admin:** Can only create/update courses for THEIR center
- **Public:** Can view all active courses

### Auto-Generated Fields
- **slug:** Automatically generated from title + timestamp
- **createdAt/updatedAt:** Automatically managed by Mongoose

### Cloudinary Uploads
All media files are uploaded to Cloudinary in the following folders:
- `courses/banners/` - Banner images
- `courses/highlights/` - Highlight images
- `courses/sections/` - Section images
- `courses/gallery/` - Gallery images
- `courses/videos/` - Promo videos
- `courses/brochures/` - PDF brochures

### 💰 Auto-Calculated Pricing System

**IMPORTANT:** Backend always calculates `discountedPrice`. Never trust frontend calculations!

#### CREATE API - Fee Fields:
```
onlineActualPrice: 100000        // Required
onlineDiscountPercent: 20        // Optional (0 = no discount)
onlineOfferText: Summer Sale     // Optional

offlineActualPrice: 150000
offlineDiscountPercent: 0
offlineOfferText:
```

#### Backend Auto-Calculates:
```json
{
   "fees": {
      "online": {
         "actualPrice": 100000,
         "discountPercent": 20,
         "discountedPrice": 80000,      // ✅ Auto-calculated
         "hasDiscount": true,            // ✅ Auto-calculated
         "offerText": "Summer Sale"
      },
      "offline": {
         "actualPrice": 150000,
         "discountPercent": 0,
         "discountedPrice": 150000,     // ✅ Same as actual (no discount)
         "hasDiscount": false,           // ✅ Auto-calculated
         "offerText": ""
      }
   }
}
```

#### Frontend Display Logic:
```javascript
// Always show this price
₹{course.fees.online.discountedPrice}

// Show discount badge only if hasDiscount is true
{course.fees.online.hasDiscount && (
   <>
      <span>{course.fees.online.discountPercent}% OFF</span>
      <del>₹{course.fees.online.actualPrice}</del>
   </>
)}

// Show offer text if exists
{course.fees.online.offerText && (
   <p>{course.fees.online.offerText}</p>
)}
```

#### CASE 1: With Discount
**Admin Input:**
```
onlineActualPrice: 100000
onlineDiscountPercent: 20
```

**Frontend Shows:**
```
₹80,000   ₹1,00,000
20% OFF - Summer Sale
```

#### CASE 2: No Discount
**Admin Input:**
```
onlineActualPrice: 100000
onlineDiscountPercent: 0
```

**Frontend Shows:**
```
₹1,00,000
```
(NO strike price, NO OFF badge)

---

## 🎯 Common Use Cases

### 1. Course Listing Page (Public)
```bash
GET /api/courses?isActive=true
```

### 2. Course Detail Page (Public)
```bash
GET /api/courses/COURSE_ID
```

### 3. Enquiry Form Dropdown (Public)
```bash
GET /api/courses/enquiry?centerName=Pune&categoryName=GS Foundation
```

### 4. Admin Course Management
```bash
# Create
POST /api/courses (with token + files)

# Update
PUT /api/courses/COURSE_ID (with token + files)

# Delete
DELETE /api/courses/COURSE_ID (with token, super_admin only)
```

### 5. Center Dashboard (Grouped View)
```bash
GET /api/courses/grouped
```

---

## 🚀 Quick Testing Checklist

- [ ] Create course with all fields and files ✅
- [ ] Get all courses (public) ✅
- [ ] Filter by center & category ✅
- [ ] Get courses for enquiry form ✅
- [ ] Get single course by ID ✅
- [ ] Get course by slug ✅
- [ ] Update course (partial update) ✅
- [ ] Update course (replace images) ✅
- [ ] Delete course (super_admin only) ✅
- [ ] Get grouped courses ✅

---

**Last Updated:** May 12, 2026  
**Version:** 1.0  
**Status:** Production Ready ✅
