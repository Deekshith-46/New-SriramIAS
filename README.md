# 🌐 Sriram IAS Backend API

RBAC (Role-Based Access Control) Backend System for Sriram IAS Academy.

[![Deploy to Render](https://img.shields.io/badge/Deploy%20to-Render-46E3B7?style=for-the-badge&logo=render)](https://render.com)

---

## 🚀 Quick Deploy

Click the button below to deploy to Render:

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/YOUR_USERNAME/YOUR_REPO)

---

## 📋 Features

- ✅ **Role-Based Access Control** (Super Admin, Center Admin, Employee, Parent, Student)
- ✅ **Course Management** with file uploads
- ✅ **Center & Category Management**
- ✅ **JWT Authentication**
- ✅ **OTP-based Login**
- ✅ **Cloudinary Integration** for media storage
- ✅ **MongoDB Database**
- ✅ **RESTful API**
- ✅ **Parallel File Uploads** for performance
- ✅ **Production Ready**

---

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT
- **File Upload**: Multer + Cloudinary
- **Validation**: Joi
- **Security**: Helmet, CORS, Rate Limiting

---

## 📦 Installation

### Local Development:

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Navigate to project
cd YOUR_REPO

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your credentials
# MONGODB_URI=mongodb://localhost:27017/sriram-ias
# JWT_SECRET=your-secret-key
# CLOUDINARY_CLOUD_NAME=your_cloud_name
# CLOUDINARY_API_KEY=your_api_key
# CLOUDINARY_API_SECRET=your_api_secret

# Start development server
npm run dev

# Start production server
npm start
```

---

## 🌍 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (development/production) | ✅ |
| `PORT` | Server port | ✅ |
| `MONGODB_URI` | MongoDB connection string | ✅ |
| `JWT_SECRET` | Secret key for JWT | ✅ |
| `JWT_EXPIRE` | JWT expiration time | ✅ |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | ✅ |
| `CLOUDINARY_API_KEY` | Cloudinary API key | ✅ |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | ✅ |
| `FRONTEND_URL` | Frontend URL for CORS | ✅ |

---

## 📚 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/send-otp` - Send OTP
- `POST /api/auth/verify-otp` - Verify OTP

### Courses (Public)
- `GET /api/courses` - Get all courses
- `GET /api/courses/:id` - Get course by ID
- `GET /api/courses/slug/:slug` - Get course by slug

### Courses (Protected)
- `POST /api/courses` - Create course
- `PUT /api/courses/:id` - Update course
- `DELETE /api/courses/:id` - Delete course

### Admin
- `GET /api/admin/centers` - List centers
- `POST /api/admin/centers` - Create center
- `PUT /api/admin/centers/:id` - Update center
- `DELETE /api/admin/centers/:id` - Delete center
- `GET /api/admin/categories` - List categories
- `POST /api/admin/categories` - Create category
- `PUT /api/admin/categories/:id` - Update category
- `DELETE /api/admin/categories/:id` - Delete category

### Health Check
- `GET /api/health` - API health status

---

## 🚀 Deploy to Render

See [RENDER_DEPLOYMENT_GUIDE.md](./RENDER_DEPLOYMENT_GUIDE.md) for complete deployment instructions.

### Quick Deploy:

1. Push code to GitHub
2. Connect GitHub to Render
3. Add environment variables
4. Deploy automatically!

---

## 📖 Documentation

- [Course Creation Guide](./COURSE_CREATION_GUIDE.md)
- [API Documentation](./API_DOCUMENTATION.md)
- [Render Deployment Guide](./RENDER_DEPLOYMENT_GUIDE.md)

---

## 🔒 Security

- Password hashing with bcrypt
- JWT-based authentication
- Role-based authorization
- Rate limiting
- Helmet for security headers
- CORS protection
- Input validation with Joi

---

## 📄 License

ISC

---

## 👥 Support

For issues or questions, please open an issue on GitHub.

---

**Built with ❤️ for Sriram IAS Academy**
