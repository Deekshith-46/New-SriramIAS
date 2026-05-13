# 🎓 Student Complete Profile API Documentation

## Overview

API endpoint to retrieve complete student details including personal information, parent details, and enrollment history.

---

## 📊 API Endpoint

### Get Complete Student Details

**Endpoint:** `GET /api/user/student-details`  
**Authentication:** ✅ Required (Student role only)  
**Description:** Returns complete student profile including user details, parent information, and enrollments

---

## 🔐 Authentication

**Required Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Access Control:**
- ✅ Only users with `role: 'student'` can access this endpoint
- ❌ Parents, admins, and other roles will receive 403 Forbidden error

---

## 📋 Response Structure

### Success Response (200)

```json
{
   "success": true,
   "student": {
      // User Account Details
      "user": {
         "id": "69eb85ac5d077777e13c3a37",
         "name": "Rahul Sharma",
         "email": "rahul@example.com",
         "mobile": "9876543210",
         "role": "student",
         "isActive": true,
         "createdAt": "2026-01-15T10:30:00.000Z",
         "updatedAt": "2026-05-10T14:20:00.000Z"
      },
      
      // Student Profile Details
      "profile": {
         "id": "69eb85ac5d077777e13c3a38",
         "parentName": "Suresh Sharma",
         "parentMobile": "9876543211",
         "parentEmail": "suresh@example.com",
         "parentMobileVerified": true,
         "parentEmailVerified": true,
         "createdAt": "2026-01-15T10:35:00.000Z",
         "updatedAt": "2026-05-10T14:20:00.000Z"
      },
      
      // Parent Account Information (if exists)
      "parent": {
         "userId": "69eb85ac5d077777e13c3a39",
         "name": "Suresh Sharma",
         "email": "suresh@example.com",
         "mobile": "9876543211",
         "isActive": true,
         "linkedAt": "2026-01-15T10:35:00.000Z"
      },
      
      // Enrollment History
      "enrollments": [
         {
            "_id": "...",
            "studentId": "...",
            "courseId": {
               "_id": "...",
               "name": "UPSC GS Foundation",
               "description": "..."
            },
            "status": "active",
            "enrolledAt": "2026-02-01T00:00:00.000Z",
            ...
         }
      ],
      "totalEnrollments": 1
   }
}
```

---

## 🧪 API Testing

### Test 1: Get Student Details (Authenticated)

```bash
GET http://localhost:5000/api/user/student-details
Authorization: Bearer YOUR_STUDENT_TOKEN
```

**Expected Response (200):**
```json
{
   "success": true,
   "student": {
      "user": {
         "id": "...",
         "name": "Rahul Sharma",
         "email": "rahul@example.com",
         "mobile": "9876543210",
         "role": "student",
         "isActive": true
      },
      "profile": {
         "parentName": "Suresh Sharma",
         "parentMobile": "9876543211",
         "parentEmail": "suresh@example.com",
         "parentMobileVerified": true,
         "parentEmailVerified": true
      },
      "parent": {
         "userId": "...",
         "name": "Suresh Sharma",
         "email": "suresh@example.com",
         "mobile": "9876543211",
         "isActive": true
      },
      "enrollments": [],
      "totalEnrollments": 0
   }
}
```

---

### Test 2: Access as Parent (Forbidden)

```bash
GET http://localhost:5000/api/user/student-details
Authorization: Bearer YOUR_PARENT_TOKEN
```

**Expected Response (403):**
```json
{
   "message": "Only students can access this endpoint"
}
```

---

### Test 3: Access as Admin (Forbidden)

```bash
GET http://localhost:5000/api/user/student-details
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Expected Response (403):**
```json
{
   "message": "Only students can access this endpoint"
}
```

---

### Test 4: Access Without Token (Unauthorized)

```bash
GET http://localhost:5000/api/user/student-details
```

**Expected Response (401):**
```json
{
   "message": "Not authorized, no token"
}
```

---

### Test 5: Student Without Parent Details

```bash
GET http://localhost:5000/api/user/student-details
Authorization: Bearer YOUR_STUDENT_TOKEN
```

**Expected Response (200):**
```json
{
   "success": true,
   "student": {
      "user": {
         "id": "...",
         "name": "Priya Singh",
         "email": "priya@example.com",
         "mobile": "9876543212",
         "role": "student",
         "isActive": true
      },
      "profile": {
         "parentName": null,
         "parentMobile": null,
         "parentEmail": null,
         "parentMobileVerified": false,
         "parentEmailVerified": false
      },
      "parent": null,
      "enrollments": [],
      "totalEnrollments": 0
   }
}
```

---

## 💻 Frontend Integration

### React + Axios Example

```javascript
import axios from 'axios';

const getStudentCompleteDetails = async () => {
   try {
      const token = localStorage.getItem('token');
      
      const response = await axios.get(
         'http://localhost:5000/api/user/student-details',
         {
            headers: {
               'Authorization': `Bearer ${token}`
            }
         }
      );
      
      return response.data.student;
   } catch (error) {
      console.error('Error fetching student details:', error);
      throw error;
   }
};

// Usage in component
const StudentProfile = () => {
   const [studentData, setStudentData] = useState(null);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      const fetchDetails = async () => {
         try {
            const data = await getStudentCompleteDetails();
            setStudentData(data);
         } catch (error) {
            if (error.response?.status === 403) {
               alert('Only students can access this page');
               navigate('/dashboard');
            }
         } finally {
            setLoading(false);
         }
      };

      fetchDetails();
   }, []);

   if (loading) return <div>Loading...</div>;
   if (!studentData) return <div>No data found</div>;

   return (
      <div className="student-profile">
         <h1>Student Profile</h1>
         
         {/* Student Information */}
         <section className="student-info">
            <h2>Student Information</h2>
            <p><strong>Name:</strong> {studentData.user.name}</p>
            <p><strong>Email:</strong> {studentData.user.email}</p>
            <p><strong>Mobile:</strong> {studentData.user.mobile}</p>
         </section>

         {/* Parent Information */}
         {studentData.profile.parentName && (
            <section className="parent-info">
               <h2>Parent Information</h2>
               <p><strong>Parent Name:</strong> {studentData.profile.parentName}</p>
               <p><strong>Parent Mobile:</strong> {studentData.profile.parentMobile}</p>
               <p><strong>Parent Email:</strong> {studentData.profile.parentEmail}</p>
               <p><strong>Mobile Verified:</strong> {studentData.profile.parentMobileVerified ? '✅' : '❌'}</p>
               <p><strong>Email Verified:</strong> {studentData.profile.parentEmailVerified ? '✅' : '❌'}</p>
            </section>
         )}

         {/* Parent Account (if linked) */}
         {studentData.parent && (
            <section className="parent-account">
               <h2>Parent Account (Linked)</h2>
               <p><strong>Name:</strong> {studentData.parent.name}</p>
               <p><strong>Email:</strong> {studentData.parent.email}</p>
               <p><strong>Mobile:</strong> {studentData.parent.mobile}</p>
               <p><strong>Account Active:</strong> {studentData.parent.isActive ? '✅' : '❌'}</p>
            </section>
         )}

         {/* Enrollments */}
         <section className="enrollments">
            <h2>Enrolled Courses ({studentData.totalEnrollments})</h2>
            {studentData.enrollments.length > 0 ? (
               studentData.enrollments.map(enrollment => (
                  <div key={enrollment._id} className="enrollment-card">
                     <h3>{enrollment.courseId.name}</h3>
                     <p>{enrollment.courseId.description}</p>
                     <p>Status: {enrollment.status}</p>
                  </div>
               ))
            ) : (
               <p>No enrollments yet</p>
            )}
         </section>
      </div>
   );
};

export default StudentProfile;
```

---

## 📊 Data Structure Explanation

### 1. **User Object**
Contains the student's own account information:
- `id`: User ID
- `name`: Student's full name
- `email`: Student's email
- `mobile`: Student's mobile number
- `role`: Always "student"
- `isActive`: Account status
- `createdAt`: Account creation date
- `updatedAt`: Last update date

### 2. **Profile Object**
Contains parent details added by the student:
- `id`: Student profile ID
- `parentName`: Parent's name
- `parentMobile`: Parent's mobile number
- `parentEmail`: Parent's email address
- `parentMobileVerified`: Whether parent mobile is verified
- `parentEmailVerified`: Whether parent email is verified

### 3. **Parent Object** (Optional)
Contains parent's account information (if parent has registered):
- `userId`: Parent's user ID
- `name`: Parent's name
- `email`: Parent's email
- `mobile`: Parent's mobile
- `isActive`: Parent account status
- `linkedAt`: When parent was linked to student

**Note:** This will be `null` if:
- Parent details not added by student
- Parent hasn't created an account yet
- Parent email/mobile doesn't match any parent user

### 4. **Enrollments Array**
List of courses the student is enrolled in:
- Complete enrollment details
- Populated course information
- Enrollment status
- Dates

---

## 🔍 Related Endpoints

### 1. Get Basic Profile
```bash
GET /api/user/profile
Authorization: Bearer TOKEN
```
Returns basic user info + role-specific data.

### 2. Update Parent Details
```bash
PUT /api/user/update-parent-details
Authorization: Bearer TOKEN
Content-Type: application/json

{
   "parentName": "Suresh Sharma",
   "parentMobile": "9876543211",
   "parentEmail": "suresh@example.com"
}
```

### 3. Update Student Profile
```bash
PUT /api/user/profile
Authorization: Bearer TOKEN
Content-Type: application/json

{
   "name": "Rahul Sharma",
   "email": "rahul@example.com",
   "mobile": "9876543210"
}
```

---

## ⚠️ Error Responses

### 401 Unauthorized
```json
{
   "message": "Not authorized, no token"
}
```
**Cause:** No token provided or invalid token

### 403 Forbidden
```json
{
   "message": "Only students can access this endpoint"
}
```
**Cause:** User role is not "student"

### 404 Not Found
```json
{
   "message": "User not found"
}
```
**Cause:** User ID doesn't exist in database

```json
{
   "message": "Student profile not found"
}
```
**Cause:** Student profile record doesn't exist

### 500 Server Error
```json
{
   "message": "Server error",
   "error": "Error details here"
}
```
**Cause:** Internal server error

---

## 📝 Implementation Details

### Backend Logic Flow:

1. **Authenticate User** → Verify JWT token
2. **Check Role** → Ensure user is a student
3. **Fetch User Data** → Get user details (excluding password)
4. **Fetch Student Profile** → Get parent details from Student model
5. **Find Parent Account** → Search for parent user by email/mobile
6. **Fetch Enrollments** → Get all course enrollments
7. **Return Complete Data** → Structured response with all details

### Security Features:
- ✅ JWT authentication required
- ✅ Role-based access control (student only)
- ✅ Password excluded from response
- ✅ Parent data only returned if exists
- ✅ Graceful handling of missing data

---

## 🎯 Use Cases

### 1. Student Dashboard
Display complete profile information on student dashboard.

### 2. Parent Verification
Check if parent has created an account and is verified.

### 3. Enrollment History
Show all courses the student has enrolled in.

### 4. Profile Completion
Check which fields are missing (parent details, verification status).

### 5. Admin Review
Admin can view student details (using separate admin endpoint).

---

**Last Updated:** May 12, 2026  
**Version:** 1.0  
**Status:** Production Ready ✅
