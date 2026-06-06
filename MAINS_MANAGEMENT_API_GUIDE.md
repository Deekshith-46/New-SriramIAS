# Mains Management API (Super Admin)

Super Admin oversight for **Test Management → Mains Management**.  
Auth: `Authorization: Bearer <token>` from `POST /api/auth/login-super-admin`.

Base path: `/api/mains-management`

---

## Data model (reused collections)

| Collection | Role |
|------------|------|
| `FacultySubject` | `categories` includes `MAINS_ANSWER_WRITING` |
| `Topic` | Linked on `FacultySubject.topics[]` |
| `SubjectMainsAnswerWriting` | Mains test + PDF |
| `MainsAnswerWritingSubmission` | Student answer + evaluation |
| `MainsAnswerWritingPdfDownload` | **New** — unique PDF download per student/test |
| `Batch` | `facultySubjects[]` defines assignment |
| `BatchEnrollment` | ACTIVE enrollments → assigned students |
| `Student` | `studentId` (register no.), `userId` for submissions |

**Assigned students** = distinct `Student.userId` from ACTIVE enrollments in batches that include the test’s `facultySubjectId`.

**Pass marks** = `SubjectMainsAnswerWriting.passMarks` if set, else **40% of `totalMarks`**.

---

## Level 1 — Dashboard

### Evaluation progress cards

`GET /api/mains-management/dashboard?progressLimit=5`

```json
{
  "success": true,
  "data": {
    "evaluationProgress": [
      {
        "testId": "...",
        "testName": "Indian Economy Grand Test",
        "facultyName": "Economy by Suresh",
        "studentsAssigned": 226,
        "uploadedAnswerSheets": 200,
        "evaluatedCount": 174,
        "pendingCount": 26,
        "evaluationPercentage": 87
      }
    ]
  }
}
```

`evaluationPercentage = evaluatedCount / uploadedAnswerSheets * 100` (0 if no uploads).

### Faculty subjects table

`GET /api/mains-management/faculty-subjects?search=&page=1&limit=20&sort=lastUpdated`

| sort | Values |
|------|--------|
| `sort` | `lastUpdated` (default), `subjectName`, `topicsCount` |

```json
{
  "success": true,
  "total": 10,
  "page": 1,
  "limit": 20,
  "data": [
    {
      "facultySubjectId": "...",
      "facultySubject": "Economy by Suresh",
      "subjectName": "Economy",
      "teacherName": "Suresh",
      "topicsCount": 1,
      "testsPdfCount": 1,
      "lastUpdated": "2026-05-27T..."
    }
  ]
}
```

---

## Level 2 — Faculty subject details

`GET /api/mains-management/faculty-subjects/:facultySubjectId`

```json
{
  "success": true,
  "data": {
    "facultySubjectName": "Economy by Suresh",
    "cards": { "topics": 1, "testsPdfs": 1, "subject": "Economy" },
    "topics": [
      {
        "topicId": "...",
        "topicName": "Macroeconomics",
        "testsPdfCount": 1,
        "tests": [{ "testId": "...", "testName": "Indian Economy Grand Test", "uploadedDate": "..." }]
      }
    ]
  }
}
```

Tests are grouped under a topic when `SubjectMainsAnswerWriting.topicId` matches the topic `_id`, **or** when `topicId` is null/missing and the topic is listed on the faculty subject’s `topics[]` (legacy CMS rows).

---

## Level 3 — Topic tests

`GET /api/mains-management/topics/:topicId/tests?search=&page=1&limit=10`

```json
{
  "success": true,
  "topic": { "topicName": "Macroeconomics", "facultySubjectName": "Economy by Suresh" },
  "data": [
    {
      "testId": "...",
      "testName": "Indian Economy Grand Test",
      "uploadedDate": "2026-05-27T...",
      "studentsAssigned": 226,
      "pdfDownloads": 218,
      "answerSheetsUploaded": 200,
      "answerSheetUploads": 200,
      "evaluatedCount": 174,
      "pendingCount": 26,
      "evaluationStatus": "In Progress"
    }
  ]
}
```

`evaluationStatus`: `Not Started` | `In Progress` | `Completed` (from assigned students’ uploads/evaluations).

`pdfDownloads` = rows in `MainsAnswerWritingPdfDownload` for the test (unique per student via track-pdf-download), scoped to assigned students.

---

## Level 4 — Test results

`GET /api/mains-management/tests/:testId/results?search=&status=all&page=1&limit=20`

| status filter | Meaning |
|---------------|---------|
| `all` | All assigned students |
| `uploaded` | Has submission |
| `not_uploaded` | No submission |
| `passed` | Evaluated, marks ≥ passMarks |
| `failed` | Evaluated, marks < passMarks |
| `pending` / `pending_evaluation` | Submitted, not evaluated |

Response includes `evaluationSummary` (counts only — no progress bar percentages), `resultCards`, `analytics`, paginated `students` with rank (ties handled: same marks → same rank).

All submission/download/evaluation counts are scoped to **assigned students** (distinct `Student.userId` from ACTIVE batch enrollments). Duplicate batch enrollments are collapsed to one row per student.

---

## Student — PDF download tracking

`POST /api/mains-answer-writing/published/:testId/track-pdf-download`  
Auth: student JWT.

Call when the student downloads/opens the test PDF. Counts **unique** students per test.

---

## Frontend

This repository is **API-only**. Implement UI in the separate admin app at `FRONTEND_URL`, using the endpoints above and existing table/card/pagination components there.

---

## CMS note

Create/edit tests remains at `/api/mains-answer-writing` (Super Admin CMS).  
Optional field `passMarks` on test create/update (number).
