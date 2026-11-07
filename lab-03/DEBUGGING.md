# Lab 3: Debugging Exercise & Common Backend Errors

This document demonstrates the identification, diagnosis, root causes, and resolutions for the four common backend errors required by **BDF Lab 3**.

---

## Error 1: Port Collision (`EADDRINUSE`)

### 1. Problem Description & Symptom
When attempting to start the Express server, Node.js throws an uncaught exception:
```text
Error: listen EADDRINUSE: address already in use :::3000
    at Server.setupListenHandle [as _listen2] (node:net:1904:16)
    at listenInCluster (node:net:1961:12)
    at Server.listen (node:net:2063:7)
    at initializeDBAndServer (C:\...\lab-03\server.js:34:25)
Emitted 'error' event on Server instance at: ... {
  code: 'EADDRINUSE',
  errno: -4091,
  syscall: 'listen',
  address: '::',
  port: 3000
}
```

### 2. Root Cause
Another process (such as a previous Node.js instance, another server, or an orphaned background process) is already bound and actively listening on port `3000`. An operating system allows only one process to bind to a specific network port at a time.

### 3. Diagnosis & Identification
To inspect which process is utilizing port 3000:

#### On Windows (PowerShell / Command Prompt):
```powershell
netstat -ano | findstr :3000
```
*Sample Output:*
```text
  TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       14820
  TCP    [::]:3000              [::]:0                 LISTENING       14820
```
Here, `14820` is the Process ID (PID) occupying port 3000.

To view the process details for PID `14820`:
```powershell
tasklist /FI "PID eq 14820"
```

#### On Linux / macOS:
```bash
lsof -i :3000
# or
netstat -tulpn | grep :3000
```

### 4. Correct Fix & Best Practices

#### Immediate Fix (Terminating the blocking process):
```powershell
# Windows PowerShell / CMD:
taskkill /PID 14820 /F

# Linux / macOS:
kill -9 14820
```

#### Architectural Fix (Configurable Port Support):
Never hardcode port 3000. Use environment variable `process.env.PORT` with a fallback:
```javascript
// BEFORE (Vulnerable to conflict):
app.listen(3000);

// AFTER (Flexible & Deployable):
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

---

## Error 2: Wrong Import Path (`MODULE_NOT_FOUND`)

### 1. Problem Description & Symptom
When starting the application or requiring a module/file, Node.js crashes immediately during module evaluation:
```text
node:internal/modules/cjs/loader:1517
  throw err;
  ^

Error: Cannot find module '../server'
Require stack:
- C:\...\lab-03\test.js
    at Module._resolveFilename (node:internal/modules/cjs/loader:1514:15)
    at Module._load (node:internal/modules/cjs/loader:1294:5)
    at Module.require (node:internal/modules/cjs/loader:1617:12) {
  code: 'MODULE_NOT_FOUND',
  requireStack: [ 'C:\\...\\lab-03\\test.js' ]
}
```

### 2. Root Cause
An incorrect relative path was supplied to `require()`. For example, writing `require('../server')` when `server.js` is in the same directory (`./server`), or omitting `./` for local modules (which causes Node to search inside `node_modules` instead of the local file tree).

### 3. Diagnosis & Identification
1. Examine the `Require stack:` printed in the error trace.
2. Check the current working directory relative to the file doing the import.
3. Verify file extensions and relative directory traversal (`./` for same directory, `../` for parent directory).

### 4. Correct Fix & Best Practices

```javascript
// INCORRECT (Looking one directory too high):
const { app } = require('../server');

// INCORRECT (Treated as an npm package):
const { app } = require('server');

// CORRECT (Explicit relative path in same directory):
const { app } = require('./server');

// ROBUST PATH RESOLUTION FOR ASSETS/FILES:
const path = require('path');
const dbPath = path.join(__dirname, 'database', 'books.db');
```

---

## Error 3: Wrong Table Name (`SQLITE_ERROR: no such table`)

### 1. Problem Description & Symptom
An API request to `/books/` returns HTTP 500, and the console logs an unhandled database rejection:
```text
Error fetching books: SQLITE_ERROR: no such table: books
    at async C:\...\lab-03\server.js:68:19 {
  code: 'SQLITE_ERROR',
  errno: 1
}
```

### 2. Root Cause
- The SQL query refers to table `books` (plural), but the database schema defines the table as `book` (singular).
- Alternatively, the connection opened a fresh, empty SQLite file in a wrong working directory because a relative path like `'database/books.db'` was evaluated relative to `process.cwd()` instead of `__dirname`.

### 3. Diagnosis & Identification
Use the SQLite CLI to inspect the database file actually opened by the application:
```powershell
sqlite3 lab-03/database/books.db
```
Inside the interactive prompt:
```sql
.tables
-- Output: book
.schema book
-- Displays: CREATE TABLE book (id INTEGER PRIMARY KEY, title TEXT, ...);
```
Comparing `.tables` with the query string in `server.js` reveals the mismatch (`books` vs `book`).

### 4. Correct Fix & Best Practices

1. Use consistent singular/plural naming convention across schema and route queries.
2. Guard table existence during initialization via `CREATE TABLE IF NOT EXISTS book (...)`.
3. Use `path.join(__dirname, ...)` so the server always targets the intended `.db` file regardless of where `node` is launched.

```javascript
// BEFORE (Mismatch with schema):
const getBooksQuery = 'SELECT * FROM books;';

// AFTER (Exact match with CREATE TABLE book):
const getBooksQuery = 'SELECT * FROM book;';
```

---

## Error 4: Missing `await` in Asynchronous Database Operations

### 1. Problem Description & Symptom
When calling `GET /books/` or `POST /books/`, the route handler immediately sends an empty object or crashes:
```json
{
  "books": {}
}
```
Or in logs:
```text
UnhandledPromiseRejection: TypeError: Cannot read properties of undefined (reading 'lastID')
```
Or the client receives response headers before the database query finishes, resulting in premature or corrupt responses.

### 2. Root Cause
The `sqlite` package methods (`db.all()`, `db.get()`, `db.run()`) return `Promise` objects. When `await` is omitted:
- JavaScript does not pause execution of the async function.
- The variable receiving the result is assigned the pending `Promise` object rather than the resolved rows array or query result.
- Express executes `res.json({ books })` on the pending Promise, which serializes to `{ books: {} }`!

### 3. Demonstration & Comparison

#### INCORRECT (Missing `await`):
```javascript
app.get('/books/', async (req, res) => {
  // Bug: books is assigned Promise { <pending> }
  const books = db.all('SELECT * FROM book;');
  // Sends empty object before DB operation resolves!
  res.status(200).json({ books });
});
```

#### CORRECT (With `await` and error handling):
```javascript
app.get('/books/', async (req, res) => {
  try {
    // Correct: pauses until Promise resolves with array of book objects
    const books = await db.all('SELECT * FROM book;');
    res.status(200).json({ books });
  } catch (error) {
    console.error('Database query failed:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});
```

---

## Summary Matrix

| Error Code / Symptom | Root Cause | Diagnostic Tool / Command | Prevention Rule |
| :--- | :--- | :--- | :--- |
| `EADDRINUSE` | Port 3000 already bound | `netstat -ano \| findstr :3000` | Configurable `PORT = process.env.PORT \|\| 3000` |
| `MODULE_NOT_FOUND` | Incorrect relative import | Check `Require stack` & file tree | Use exact relative `./` and `path.join()` |
| `no such table` | Schema vs Query name mismatch | `sqlite3 database.db ".tables"` | Align table identifiers; `CREATE TABLE IF NOT EXISTS` |
| Missing `await` | Serializing pending Promise | Check route response format | Always `await` async DB I/O calls inside `try/catch` |

