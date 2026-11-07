# Lab 2: SQLite database and CRUD routes

**Course:** Backend Development Frameworks (BDF)  
**Deployment Status:** Not deployed yet  
**Live Deployment URL:** `[Not deployed yet - Local verification complete]`

---

## Student Details

- **Name:** G. AKSHAY
- **Registration Number:** 252U1R8025
- **Section:** S-14

---

## Project Description

This project implements the foundational requirements for **BDF Lab 2: SQLite Database and CRUD Routes**. It demonstrates how to integrate an Express web application with a local file-based SQLite database using the asynchronous `sqlite` wrapper and the `sqlite3` driver.

Key capabilities include:
1. **Asynchronous Server & DB Startup:** Ensures the SQLite database connection opens and verifies successfully via `initializeDBAndServer()` before Express begins listening for HTTP requests.
2. **Safe SQL Execution:** Uses parameterized SQL queries with `?` placeholders for all client inputs to prevent SQL injection vulnerabilities.
3. **Full CRUD Operations:** Five RESTful endpoints covering Read (All & Single), Create, Full Update, and Delete with proper HTTP status codes and JSON responses.

---

## Requirements & Prerequisites

- **Node.js:** v18.0.0 or higher (Verified on `v24.18.0`)
- **npm:** v9.0.0 or higher (Verified on `v12.0.2`)
- **SQLite CLI:** `sqlite3` v3.35.0 or higher (Verified on `v3.53.4`)
- **Key Dependencies:**
  - `express`: ^5.3.0
  - `sqlite`: ^5.1.1
  - `sqlite3`: ^6.0.1
  - `nodemon`: ^3.1.14 (Developer dependency for auto-reloading)

---

## How to Install and Run

### 1. Installation
Navigate into the `lab-02` directory and install project dependencies:
```bash
cd lab-02
npm install
```

### 2. Running in Development Mode (Nodemon)
Starts the Express server with Nodemon so it restarts automatically on code modifications:
```bash
npm run dev
```

### 3. Running in Production Mode
Starts the Express server directly using Node:
```bash
npm start
```

### 4. Running Automated Verification Tests
Executes the comprehensive 23-point automated test suite:
```bash
npm test
```

### 5. Environment Variables
- **Required:** None. All configuration has sensible defaults.
- **Optional:** `PORT` (defaults to `3000` if not set).

---

## Database

- **File Location:** `database/books.db`
- **Initialization Script:** `database/init.sql`

### Schema (`book` table)
```sql
CREATE TABLE book (
    id INTEGER PRIMARY KEY,
    title TEXT,
    author TEXT,
    price INTEGER,
    pages INTEGER
);
```

### Seed Data
The database is initialized with 10 sample technical books inserted via the SQLite CLI and reproducible via `database/init.sql`.

### Inspecting via SQLite CLI
To view tables, schema, and current records:
```bash
sqlite3 database/books.db
```
Inside the interactive SQLite CLI prompt:
```sql
.tables
.schema book
SELECT * FROM book;
.exit
```

---

## API Endpoints

| HTTP Method | Endpoint | Purpose / Description | Success Status | Error Statuses |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/books/` | Retrieve all book records from database | `200 OK` | `500 Internal Server Error` |
| `GET` | `/books/:bookId/` | Retrieve a single book record by ID | `200 OK` | `400 Bad Request`<br>`404 Not Found`<br>`500 Internal Server Error` |
| `POST` | `/books/` | Add a new book to the database | `201 Created` | `400 Bad Request`<br>`500 Internal Server Error` |
| `PUT` | `/books/:bookId/` | Full update of existing book details | `200 OK` | `400 Bad Request`<br>`404 Not Found`<br>`500 Internal Server Error` |
| `DELETE` | `/books/:bookId/` | Remove a book record by ID | `200 OK` | `400 Bad Request`<br>`404 Not Found`<br>`500 Internal Server Error` |

---

## Screenshots

> *Placeholder: Postman request/response screenshots and SQLite CLI query outputs will be embedded here after manual capture.*

- **GET All Books:** `screenshots/get-all-books.png`
- **GET Single Book:** `screenshots/get-single-book.png`
- **POST Book:** `screenshots/post-book.png`
- **PUT Book:** `screenshots/put-book.png`
- **DELETE Book:** `screenshots/delete-book.png`
- **404 Not Found Check:** `screenshots/invalid-book-404.png`
- **Postman Input Validation:** `screenshots/postman-invalid-input.png`
- **SQLite CLI Verification:** `screenshots/sqlite-database.png`

---

## Notes

### Problems Faced and Solutions

1. **npm 12 Native Addon Script Security Blocking (`sqlite3`):**
   - *Problem:* In npm v12.0.2, install lifecycle scripts are blocked by default for security, preventing `sqlite3` prebuild/node-gyp compilation from completing.
   - *Solution:* Approved the script via `npm install-scripts approve sqlite3` and executed `npm rebuild sqlite3`, ensuring native bindings load cleanly.

2. **Asynchronous Port Binding in Test Environments:**
   - *Problem:* When running integration tests alongside the server, static evaluation of `process.env.PORT` caused port conflicts or connection timeouts.
   - *Solution:* Refactored `initializeDBAndServer(port)` to accept an explicit port parameter while defaulting to `process.env.PORT || 3000` for standard execution, ensuring complete test isolation.

3. **Preserving Initial Seed Records During Testing:**
   - *Problem:* Running destructive operations (PUT, DELETE) during verification risked deleting the 10 core seed records required for grading.
   - *Solution:* Implemented test isolation where POST creates a temporary disposable record, PUT and DELETE operate strictly on that dynamic ID, and a final test asserts that all 10 original seed records (IDs 1–10) remain intact.

