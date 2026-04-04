# Finance Backend Development

A RESTful backend API for managing financial records (income & expense), built with Node.js, Express, and MongoDB.

---

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express 5
- **Database:** MongoDB (Mongoose ODM)
- **Authentication:** JWT (JSON Web Token)
- **Password Hashing:** bcryptjs

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
    │   ├── auth.middleware.js   # JWT verification
    │   └── role.middleware.js   # Role-based access control
    ├── models/
    │   ├── user.model.js       # User schema
    │   └── record.model.js     # Record schema
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
| ---------- | ------ | -------------------------------- |
| `type` | String | Filter by `income` or `expense` |
| `category` | String | Filter by category name |
| `search` | String | Search in category, notes & type |
| `page` | Number | Page number (default: 1) |
| `limit` | Number | Records per page (default: 10) |

> **Note:** Viewer can only see their own records. Admin and Analyst can see all records.

---

### Dashboard

| Method | Endpoint                 | Description                           | Access        |
| ------ | ------------------------ | ------------------------------------- | ------------- |
| GET    | `/api/dashboard/summary` | Get income, expense & balance summary | Authenticated |

**Response:**

```json
{
  "totalIncome": 15000,
  "totalExpense": 7000,
  "balance": 8000
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

| Command               | Description                     |
| --------------------- | ------------------------------- |
| `npm start`           | Start server with Node          |
| `npm run dev`         | Start server with Nodemon (dev) |
| `node test-roles.js`  | Run role-based access tests     |
| `node test-search.js` | Run search role-scoping tests   |

---

## Role-Based Access Test Report

All **35 tests passed** across 3 roles + unauthenticated access.

### Results Matrix

| Route                         | Method | Admin  | Analyst | Viewer | No Token |
| ----------------------------- | ------ | ------ | ------- | ------ | -------- |
| `/api/auth/register`          | POST   | —      | —       | —      | ✅ 201   |
| `/api/auth/login`             | POST   | —      | —       | —      | ✅ 200   |
| `/api/users`                  | GET    | ✅ 200 | ❌ 403  | ❌ 403 | ❌ 401   |
| `/api/users/:id`              | PUT    | ✅ 200 | ❌ 403  | ❌ 403 | —        |
| `/api/users/:id`              | DELETE | ✅ 200 | ❌ 403  | ❌ 403 | —        |
| `/api/records`                | POST   | ✅ 201 | ❌ 403  | ❌ 403 | ❌ 401   |
| `/api/records`                | GET    | ✅ 200 | ✅ 200  | ✅ 200 | ❌ 401   |
| `/api/records?type=income`    | GET    | ✅ 200 | ✅ 200  | ✅ 200 | —        |
| `/api/records?search=salary`  | GET    | ✅ 200 | —       | —      | —        |
| `/api/records?page=1&limit=5` | GET    | ✅ 200 | —       | —      | —        |
| `/api/records/:id`            | PUT    | ✅ 200 | ❌ 403  | ❌ 403 | —        |
| `/api/records/:id`            | DELETE | ✅ 200 | ❌ 403  | ❌ 403 | —        |
| `/api/dashboard/summary`      | GET    | ✅ 200 | ✅ 200  | ✅ 200 | ❌ 401   |

> ✅ = Allowed &nbsp; ❌ = Correctly Denied

### Search Role-Scoping Test

| Search keyword                | Admin    | Analyst  | Viewer                 |
| ----------------------------- | -------- | -------- | ---------------------- |
| `bonus` (admin's record)      | ✅ Found | ✅ Found | ✅ Not found (correct) |
| `groceries` (viewer's record) | ✅ Found | ✅ Found | ✅ Found (own data)    |

> Admin & Analyst can search across all records. Viewer search is scoped to their own records only.

### Summary Per Role

| Role                | Passed | Failed | Total |
| ------------------- | ------ | ------ | ----- |
| **public**          | 2      | 0      | 2     |
| **admin**           | 11     | 0      | 11    |
| **analyst**         | 9      | 0      | 9     |
| **viewer**          | 9      | 0      | 9     |
| **unauthenticated** | 4      | 0      | 4     |

### Key Observations

- **Admin** has full CRUD access to users, records, and dashboard.
- **Analyst** can view/search all records and view dashboard summary (all users' data). Cannot create, update, or delete records.
- **Viewer** can only view/search their own records and view their own dashboard summary.
- **Unauthenticated** requests are correctly rejected with `401` on all protected routes.
- `POST /api/records` route middleware allows `admin` and `analyst`, but the controller has an additional `admin`-only check — effectively only admin can create records.
- Search, filter (`type`, `category`), and pagination (`page`, `limit`) work correctly with role-based scoping.
