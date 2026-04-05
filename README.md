# Finance Backend Development

A RESTful backend API for managing financial records (income & expense), built with Node.js, Express, and MongoDB.

---

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express 5
- **Database:** MongoDB (Mongoose ODM)
- **Authentication:** JWT (JSON Web Token)
- **Password Hashing:** bcryptjs
- **Input Validation:** express-validator

---

## Project Structure

```
finance-backendDevelopment/
├── server.js                   # Entry point - starts the server
├── package.json
├── .env                        # Environment variables
└── src/
    ├── app.js                  # Express app setup & route mounting
    ├── config/
    │   └── db.js               # MongoDB connection
    ├── controllers/
    │   ├── auth.controller.js      # Register & Login
    │   ├── user.controller.js      # User CRUD (admin only)
    │   ├── record.controller.js    # Financial record CRUD
    │   └── dashboard.controller.js # Income/Expense summary
    ├── middleware/
    │   ├── auth.middleware.js       # JWT verification
    │   ├── role.middleware.js       # Role-based access control
    │   └── validate.middleware.js   # Validation error handler
    ├── models/
    │   ├── user.model.js       # User schema
    │   └── record.model.js     # Record schema
    ├── validators/
    │   ├── auth.validator.js       # Register & Login validation
    │   ├── record.validator.js     # Record CRUD validation
    │   └── user.validator.js       # User update/delete validation
    └── routes/
        ├── auth.routes.js
        ├── user.routes.js
        ├── record.routes.js
        └── dashboard.routes.js
```

---

## Environment Variables

Create a `.env` file in the root directory:

```
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017/financeDatabase
JWT_SECRET=your_jwt_secret_here
```

---

## Installation & Setup

```bash
# Clone the repository
git clone <repo-url>
cd finance-backendDevelopment

# Install dependencies
npm install

# Start development server (with nodemon)
npm run dev

# Start production server
npm start
```

---

## User Roles

| Role        | Permissions                                                                 |
| ----------- | --------------------------------------------------------------------------- |
| **admin**   | Full access – manage users, create/read/update/delete records               |
| **analyst** | Can view/search all records and view dashboard summary (all users' data)    |
| **viewer**  | Can only view/search their own records and view their own dashboard summary |

---

## API Endpoints

### Authentication

| Method | Endpoint             | Description         | Access |
| ------ | -------------------- | ------------------- | ------ |
| POST   | `/api/auth/register` | Register a new user | Public |
| POST   | `/api/auth/login`    | Login & get JWT     | Public |

**Register** – Request Body:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "your_password",
  "role": "viewer"
}
```

**Login** – Request Body:

```json
{
  "email": "john@example.com",
  "password": "your_password"
}
```

**Login** – Response:

```json
{
  "message": "login successful",
  "token": "<jwt_token>"
}
```

---

### Users (Admin Only)

| Method | Endpoint         | Description   | Access |
| ------ | ---------------- | ------------- | ------ |
| GET    | `/api/users`     | Get all users | Admin  |
| PUT    | `/api/users/:id` | Update a user | Admin  |
| DELETE | `/api/users/:id` | Delete a user | Admin  |

---

### Financial Records

| Method | Endpoint           | Description         | Access        |
| ------ | ------------------ | ------------------- | ------------- |
| POST   | `/api/records`     | Create a new record | Admin         |
| GET    | `/api/records`     | Get records         | Authenticated |
| PUT    | `/api/records/:id` | Update a record     | Admin         |
| DELETE | `/api/records/:id` | Delete a record     | Admin         |

**Create Record** – Request Body:

```json
{
  "userId": "mongo_user_id",
  "amount": 5000,
  "type": "income",
  "category": "salary",
  "date": "2026-04-01",
  "notes": "April salary"
}
```

**Get Records** – Query Parameters:
| Parameter | Type | Description |
| ----------- | ------ | ------------------------------------ |
| `type` | String | Filter by `income` or `expense` |
| `category` | String | Filter by category name |
| `startDate` | String | Filter from date (ISO 8601) |
| `endDate` | String | Filter to date (ISO 8601) |
| `search` | String | Search in category, notes & type |
| `page` | Number | Page number (default: 1) |
| `limit` | Number | Records per page (default: 10) |

**Example – Date filtering:**

```
GET /api/records?startDate=2026-01-01&endDate=2026-03-31&type=income
```

> **Note:** Viewer can only see their own records. Admin and Analyst can see all records.

---

### Dashboard

| Method | Endpoint                 | Description                               | Access        |
| ------ | ------------------------ | ----------------------------------------- | ------------- |
| GET    | `/api/dashboard/summary` | Get income, expense & balance summary     | Authenticated |
| GET    | `/api/dashboard/trends`  | Get monthly income/expense/balance trends | Authenticated |

**Summary Response:**

```json
{
  "totalIncome": 15000,
  "totalExpense": 7000,
  "balance": 8000
}
```

**Trends Response:**

```json
[
  { "month": "2026-01", "income": 5000, "expense": 2000, "balance": 3000 },
  { "month": "2026-02", "income": 6000, "expense": 3000, "balance": 3000 },
  { "month": "2026-03", "income": 4000, "expense": 2000, "balance": 2000 }
]
```

> Admin & Analyst see trends across all users. Viewer sees only their own trends.

---

## Input Validation

All incoming request data is validated at the route level using `express-validator` before reaching controllers or the database.

### Validated Fields

| Route                     | Validated Fields                                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/auth/register` | `name` (2-50 chars), `email` (valid format), `password` (min 6 chars), `role` (optional, enum)                                        |
| `POST /api/auth/login`    | `email` (valid format), `password` (required)                                                                                         |
| `POST /api/records`       | `userId` (MongoId), `amount` (numeric), `type` (income/expense), `category` (max 100), `date` (ISO 8601), `notes` (optional, max 500) |
| `GET /api/records`        | `type` (optional, enum), `startDate`/`endDate` (optional, ISO 8601), `page` (positive int), `limit` (1-100)                           |
| `PUT /api/records/:id`    | `id` (MongoId), all body fields optional with same rules as create                                                                    |
| `DELETE /api/records/:id` | `id` (MongoId)                                                                                                                        |
| `PUT /api/users/:id`      | `id` (MongoId), `name`, `email`, `role`, `status` (all optional with format checks)                                                   |
| `DELETE /api/users/:id`   | `id` (MongoId)                                                                                                                        |

### Validation Error Response

When validation fails, the API returns `400` with error details:

```json
{
  "errors": [
    {
      "type": "field",
      "msg": "Invalid email format",
      "path": "email",
      "location": "body"
    },
    {
      "type": "field",
      "msg": "Password must be at least 6 characters",
      "path": "password",
      "location": "body"
    }
  ]
}
```

---

## Authentication

All protected routes require a JWT token in the `Authorization` header:

```
Authorization: Bearer <your_jwt_token>
```

---

## Models

### User

| Field      | Type   | Details                                |
| ---------- | ------ | -------------------------------------- |
| `name`     | String | Required                               |
| `email`    | String | Required, Unique                       |
| `password` | String | Required (hashed with bcryptjs)        |
| `role`     | String | `viewer` (default), `admin`, `analyst` |
| `status`   | String | `active` (default), `inactive`         |

### Record

| Field       | Type     | Details                          |
| ----------- | -------- | -------------------------------- |
| `amount`    | Number   | Required                         |
| `type`      | String   | Required – `income` or `expense` |
| `category`  | String   | Required                         |
| `date`      | Date     | Required                         |
| `notes`     | String   | Optional                         |
| `userId`    | ObjectId | Ref → User, Required             |
| `createdBy` | ObjectId | Ref → User                       |

Both models include automatic `createdAt` and `updatedAt` timestamps.

---

## Scripts

| Command               | Description                                       |
| --------------------- | ------------------------------------------------- |
| `npm start`           | Start server with Node                            |
| `npm run dev`         | Start server with Nodemon (dev)                   |
| `node test-all.js`    | Run full test suite (validation + roles + search) |
| `node test-roles.js`  | Run role-based access tests                       |
| `node test-search.js` | Run search role-scoping tests                     |

---

## Comprehensive Test Report

All **76 tests passed** across 3 suites — input validation, role-based access, and search scoping.

### Suite Summary

| Suite              | Passed | Failed | Total |
| ------------------ | ------ | ------ | ----- |
| **Validation**     | 30     | 0      | 30    |
| **Role-Based**     | 40     | 0      | 40    |
| **Search Scoping** | 6      | 0      | 6     |

---

### 1. Input Validation Tests (30/30 Passed)

#### Register Validation

| Test Case      | Input                   | Expected | Actual | Status |
| -------------- | ----------------------- | -------- | ------ | ------ |
| Empty body     | `{}`                    | 400      | 400    | ✅     |
| Invalid email  | `email: "not-an-email"` | 400      | 400    | ✅     |
| Short password | `password: "12"`        | 400      | 400    | ✅     |
| Short name     | `name: "A"`             | 400      | 400    | ✅     |
| Invalid role   | `role: "superadmin"`    | 400      | 400    | ✅     |
| Valid data     | All fields correct      | 201      | 201    | ✅     |

#### Login Validation

| Test Case        | Input                    | Expected | Actual | Status |
| ---------------- | ------------------------ | -------- | ------ | ------ |
| Missing email    | `{ password }`           | 400      | 400    | ✅     |
| Missing password | `{ email }`              | 400      | 400    | ✅     |
| Invalid email    | `email: "bad-email"`     | 400      | 400    | ✅     |
| Valid data       | Correct email & password | 200      | 200    | ✅     |

#### Record Validation

| Test Case           | Input                                | Expected | Actual | Status |
| ------------------- | ------------------------------------ | -------- | ------ | ------ |
| Empty body          | `{}`                                 | 400      | 400    | ✅     |
| Invalid userId      | `userId: "not-a-mongo-id"`           | 400      | 400    | ✅     |
| Invalid type        | `type: "refund"`                     | 400      | 400    | ✅     |
| Invalid date        | `date: "not-a-date"`                 | 400      | 400    | ✅     |
| Non-numeric amount  | `amount: "abc"`                      | 400      | 400    | ✅     |
| Valid data          | All fields correct                   | 201      | 201    | ✅     |
| Invalid param ID    | `PUT /api/records/not-a-valid-id`    | 400      | 400    | ✅     |
| Invalid type update | `type: "refund"` on PUT              | 400      | 400    | ✅     |
| Invalid delete ID   | `DELETE /api/records/not-a-valid-id` | 400      | 400    | ✅     |

#### GET Records Query Validation

| Test Case         | Input                     | Expected | Actual | Status |
| ----------------- | ------------------------- | -------- | ------ | ------ |
| Invalid startDate | `startDate: "not-a-date"` | 400      | 400    | ✅     |
| Invalid endDate   | `endDate: "not-a-date"`   | 400      | 400    | ✅     |
| Invalid type      | `type: "refund"`          | 400      | 400    | ✅     |
| Negative page     | `page: "-1"`              | 400      | 400    | ✅     |
| Limit too high    | `limit: "200"`            | 400      | 400    | ✅     |

#### User Validation

| Test Case         | Input                              | Expected | Actual | Status |
| ----------------- | ---------------------------------- | -------- | ------ | ------ |
| Invalid param ID  | `PUT /api/users/not-a-valid-id`    | 400      | 400    | ✅     |
| Invalid role      | `role: "superadmin"`               | 400      | 400    | ✅     |
| Invalid status    | `status: "banned"`                 | 400      | 400    | ✅     |
| Invalid email     | `email: "not-an-email"`            | 400      | 400    | ✅     |
| Valid data        | `name: "UpdatedViewer"`            | 200      | 200    | ✅     |
| Invalid delete ID | `DELETE /api/users/not-a-valid-id` | 400      | 400    | ✅     |

---

### 2. Role-Based Access Tests (40/40 Passed)

#### Results Matrix

| Route                            | Method | Admin  | Analyst | Viewer | No Token |
| -------------------------------- | ------ | ------ | ------- | ------ | -------- |
| `/api/auth/register`             | POST   | —      | —       | —      | ✅ 201   |
| `/api/auth/login`                | POST   | —      | —       | —      | ✅ 200   |
| `/api/users`                     | GET    | ✅ 200 | ❌ 403  | ❌ 403 | ❌ 401   |
| `/api/users/:id`                 | PUT    | ✅ 200 | ❌ 403  | ❌ 403 | —        |
| `/api/users/:id`                 | DELETE | ✅ 200 | ❌ 403  | ❌ 403 | —        |
| `/api/records`                   | POST   | ✅ 201 | ❌ 403  | ❌ 403 | ❌ 401   |
| `/api/records`                   | GET    | ✅ 200 | ✅ 200  | ✅ 200 | ❌ 401   |
| `/api/records?type=income`       | GET    | ✅ 200 | ✅ 200  | ✅ 200 | —        |
| `/api/records?startDate&endDate` | GET    | ✅ 200 | —       | —      | —        |
| `/api/records?search=salary`     | GET    | ✅ 200 | —       | —      | —        |
| `/api/records?page=1&limit=5`    | GET    | ✅ 200 | —       | —      | —        |
| `/api/records/:id`               | PUT    | ✅ 200 | ❌ 403  | ❌ 403 | —        |
| `/api/records/:id`               | DELETE | ✅ 200 | ❌ 403  | ❌ 403 | —        |
| `/api/dashboard/summary`         | GET    | ✅ 200 | ✅ 200  | ✅ 200 | ❌ 401   |
| `/api/dashboard/trends`          | GET    | ✅ 200 | ✅ 200  | ✅ 200 | ❌ 401   |

> ✅ = Allowed &nbsp; ❌ = Correctly Denied

#### Summary Per Role

| Role                | Passed | Failed | Total |
| ------------------- | ------ | ------ | ----- |
| **public**          | 12     | 0      | 12    |
| **admin**           | 35     | 0      | 35    |
| **analyst**         | 12     | 0      | 12    |
| **viewer**          | 12     | 0      | 12    |
| **unauthenticated** | 5      | 0      | 5     |

---

### 3. Search Role-Scoping Tests (6/6 Passed)

| Search keyword                | Admin    | Analyst  | Viewer                 |
| ----------------------------- | -------- | -------- | ---------------------- |
| `bonus` (admin's record)      | ✅ Found | ✅ Found | ✅ Not found (correct) |
| `groceries` (viewer's record) | ✅ Found | ✅ Found | ✅ Found (own data)    |

> Admin & Analyst can search across all records. Viewer search is scoped to their own records only.

---

### Key Observations

- **Input Validation** rejects malformed data (bad emails, invalid IDs, wrong enums, short passwords, invalid dates, out-of-range pagination) with `400` before it reaches the database.
- **Date Filtering** supports `startDate` and `endDate` query params for filtering records by date range.
- **Monthly Trends** API provides income/expense/balance breakdown per month, with role-based scoping.
- **Admin** has full CRUD access to users, records, and dashboard.
- **Analyst** can view/search all records and view dashboard summary & trends (all users' data). Cannot create, update, or delete records.
- **Viewer** can only view/search their own records and view their own dashboard summary & trends.
- **Unauthenticated** requests are correctly rejected with `401` on all protected routes.
- `POST /api/records` route middleware allows `admin` and `analyst`, but the controller has an additional `admin`-only check — effectively only admin can create records.
- Search, filter (`type`, `category`, `date`), and pagination (`page`, `limit`) work correctly with role-based scoping.
