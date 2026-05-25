# Sriram-IAS — Complete Code Documentation

> **239 JavaScript files** — each included in exactly one volume below.  
> **Regenerate:** `node scripts/generate-complete-code-docs.js`

## Architecture diagram

**[ARCHITECTURE_INTERCONNECTION_FLOW.md](./ARCHITECTURE_INTERCONNECTION_FLOW.md)** — Mermaid flowcharts: request flow, module domains, student journey, portal vs CMS, admin hierarchy.

## Volumes (full source code)

| # | Document | Contents |
|---|----------|----------|
| 0 | [DOC_0_CORE_INFRASTRUCTURE_COMPLETE.md](./DOC_0_CORE_INFRASTRUCTURE_COMPLETE.md) | `server.js`, `app.js`, `config/`, all `middleware/`, all `utils/`, maintenance scripts |
| 1 | [DOC_1_COURSE_ENROLLMENT_TEST_SERIES_COMPLETE.md](./DOC_1_COURSE_ENROLLMENT_TEST_SERIES_COMPLETE.md) | Courses, enrollment, payments, subjects, **Test Series** |
| 2 | [DOC_2_MY_COURSES_LMS_COMPLETE.md](./DOC_2_MY_COURSES_LMS_COMPLETE.md) | Recordings, LMS tests, progress, answer writing, attendance |
| 3 | [DOC_3_PORTAL_FREE_RESOURCES_COMPLETE.md](./DOC_3_PORTAL_FREE_RESOURCES_COMPLETE.md) | Portal tabs + `/api/resources/*` + test CMS for current affairs |
| 4 | [DOC_4_AUTH_COMMERCE_CONTENT_COMPLETE.md](./DOC_4_AUTH_COMMERCE_CONTENT_COMPLETE.md) | Auth, signup, admin, homepage, books, cart, blog, enquiries, center pages |

## Quick lookup

| Feature | Volume |
|---------|--------|
| Signup / OTP / login | DOC_4 + DOC_0 (otp utils) |
| Create center admin | DOC_4 (`adminController`) |
| Homepage / toppers / videos | DOC_4 |
| Course purchase | DOC_1 |
| Test schedule & submit | DOC_1 |
| Recorded lectures | DOC_2 |
| Weekly/daily LMS tests | DOC_2 |
| Free resources portal | DOC_3 |
| Current affairs portal | DOC_3 |
| Cloudinary uploads | DOC_0 (`uploadToCloudinary`, `config/cloudinary`) |
| Razorpay | DOC_0 (`config/razorpay`) + DOC_1 (`paymentController`) |

## Legacy focused guides (optional)

`COURSE_SYSTEM_API_GUIDE.md`, `LMS_TEST_API_GUIDE.md`, `PORTAL_UI_API_GUIDE.md`, `FREE_RESOURCES_COMPLETE_CODE.md`, etc.

