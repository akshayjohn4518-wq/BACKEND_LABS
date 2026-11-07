// Express Server with SQLite Database, REST API, Query Parameters & Validation
// BDF Lab 3 Implementation
const express = require('express');
const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const dbPath = path.join(__dirname, 'database', 'books.db');

let db = null;

// Function to initialize SQLite database connection and start Express server
const initializeDBAndServer = async (port = (process.env.PORT || 3000)) => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    console.log(`Connected to SQLite database at: ${dbPath}`);

    // Ensure book table exists
    await db.exec(`
      CREATE TABLE IF NOT EXISTS book (
        id INTEGER PRIMARY KEY,
        title TEXT,
        author TEXT,
        price INTEGER,
        pages INTEGER
      );
    `);

    // Start Express server only after DB connection succeeds
    return new Promise((resolve) => {
      const server = app.listen(port, () => {
        console.log(`Server is running at http://localhost:${port}/`);
        resolve(server);
      });
    });
  } catch (error) {
    console.error(`Database Initialization Error: ${error.message}`);
    process.exit(1);
  }
};

// Root endpoint: Welcome message
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to BDF Lab 3: REST API, Query Parameters, Validation & Debugging API'
  });
});

// Endpoint 1: Get all books with Search, Filtering, Sorting, and Pagination
// GET /books/
app.get('/books/', async (req, res) => {
  try {
    const {
      search_q,
      order_by = 'id',
      order = 'ASC',
      limit = '10',
      offset = '0',
      min_price,
      max_price
    } = req.query;

    const conditions = [];
    const params = [];

    // 1. Search Query (search_q) - partial title match
    if (search_q !== undefined) {
      if (typeof search_q !== 'string') {
        return res.status(400).json({ message: 'Invalid search_q parameter' });
      }
      conditions.push('title LIKE ?');
      params.push(`%${search_q.trim()}%`);
    }

    // 2. Price Range (min_price, max_price)
    let parsedMin = null;
    let parsedMax = null;

    if (min_price !== undefined) {
      const numMin = Number(min_price);
      if (isNaN(numMin) || numMin < 0 || typeof min_price === 'boolean' || min_price === '') {
        return res.status(400).json({ message: 'min_price must be a valid non-negative number' });
      }
      parsedMin = numMin;
    }

    if (max_price !== undefined) {
      const numMax = Number(max_price);
      if (isNaN(numMax) || numMax < 0 || typeof max_price === 'boolean' || max_price === '') {
        return res.status(400).json({ message: 'max_price must be a valid non-negative number' });
      }
      parsedMax = numMax;
    }

    if (parsedMin !== null && parsedMax !== null && parsedMin > parsedMax) {
      return res.status(400).json({ message: 'min_price cannot be greater than max_price' });
    }

    if (parsedMin !== null) {
      conditions.push('price >= ?');
      params.push(parsedMin);
    }

    if (parsedMax !== null) {
      conditions.push('price <= ?');
      params.push(parsedMax);
    }

    // 3. Sorting (order_by, order) - Strict Allowlist validation
    const allowedColumns = ['id', 'title', 'author', 'price', 'pages'];
    const normalizedOrderBy = String(order_by).toLowerCase();
    if (!allowedColumns.includes(normalizedOrderBy)) {
      return res.status(400).json({
        message: `Invalid order_by column. Allowed columns: ${allowedColumns.join(', ')}`
      });
    }

    const normalizedOrder = String(order).toUpperCase();
    if (normalizedOrder !== 'ASC' && normalizedOrder !== 'DESC') {
      return res.status(400).json({
        message: 'Invalid order direction. Allowed values: ASC, DESC'
      });
    }

    // 4. Pagination (limit, offset)
    const parsedLimit = Number(limit);
    if (!Number.isInteger(parsedLimit) || parsedLimit <= 0 || parsedLimit > 100) {
      return res.status(400).json({
        message: 'Invalid limit. Must be a positive integer between 1 and 100'
      });
    }

    const parsedOffset = Number(offset);
    if (!Number.isInteger(parsedOffset) || parsedOffset < 0) {
      return res.status(400).json({
        message: 'Invalid offset. Must be a non-negative integer'
      });
    }

    // Construct SQL Query safely
    let getBooksQuery = 'SELECT * FROM book';
    if (conditions.length > 0) {
      getBooksQuery += ' WHERE ' + conditions.join(' AND ');
    }

    // Append allowlisted ORDER BY and parameterized LIMIT / OFFSET
    getBooksQuery += ` ORDER BY ${normalizedOrderBy} ${normalizedOrder} LIMIT ? OFFSET ?;`;
    params.push(parsedLimit, parsedOffset);

    const books = await db.all(getBooksQuery, params);
    res.status(200).json({ books });
  } catch (error) {
    console.error('Error fetching books:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Endpoint 2: Get one book by ID
// GET /books/:bookId/
app.get('/books/:bookId/', async (req, res) => {
  const { bookId } = req.params;
  const parsedId = Number(bookId);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return res.status(400).json({
      message: 'Invalid bookId format. Must be a positive integer'
    });
  }

  try {
    const getBookQuery = 'SELECT * FROM book WHERE id = ?;';
    const book = await db.get(getBookQuery, [parsedId]);

    if (!book) {
      return res.status(404).json({
        message: 'Book not found'
      });
    }

    res.status(200).json({ book });
  } catch (error) {
    console.error('Error fetching book:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Endpoint 3: Add a new book
// POST /books/
app.post('/books/', async (req, res) => {
  const { title, author, price, pages } = req.body;

  // Title validation
  if (title === undefined || title === null) {
    return res.status(400).json({ message: 'Title is required' });
  }
  if (typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ message: 'Title cannot be empty' });
  }

  // Author validation
  if (author === undefined || author === null) {
    return res.status(400).json({ message: 'Author is required' });
  }
  if (typeof author !== 'string' || author.trim() === '') {
    return res.status(400).json({ message: 'Author cannot be empty' });
  }

  // Price validation
  if (price === undefined || price === null) {
    return res.status(400).json({ message: 'Price is required' });
  }
  if (typeof price !== 'number' || isNaN(price) || !isFinite(price) || price < 0) {
    return res.status(400).json({ message: 'Price must be a valid non-negative number' });
  }

  // Pages validation (optional, but if provided must be positive integer)
  let parsedPages = null;
  if (pages !== undefined && pages !== null) {
    if (typeof pages !== 'number' || !Number.isInteger(pages) || pages <= 0) {
      return res.status(400).json({ message: 'Pages must be a positive integer' });
    }
    parsedPages = pages;
  }

  try {
    const addBookQuery = `
      INSERT INTO book (title, author, price, pages)
      VALUES (?, ?, ?, ?);
    `;
    const dbResponse = await db.run(addBookQuery, [
      title.trim(),
      author.trim(),
      Math.round(price),
      parsedPages
    ]);

    const createdBook = {
      id: dbResponse.lastID,
      title: title.trim(),
      author: author.trim(),
      price: Math.round(price),
      pages: parsedPages
    };

    res.status(201).json({
      message: 'Book created successfully',
      book: createdBook
    });
  } catch (error) {
    console.error('Error adding book:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Endpoint 4: Update a book by ID (Full update)
// PUT /books/:bookId/
app.put('/books/:bookId/', async (req, res) => {
  const { bookId } = req.params;
  const parsedId = Number(bookId);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return res.status(400).json({
      message: 'Invalid bookId format. Must be a positive integer'
    });
  }

  const { title, author, price, pages } = req.body;

  // Title validation
  if (title === undefined || title === null) {
    return res.status(400).json({ message: 'Title is required' });
  }
  if (typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ message: 'Title cannot be empty' });
  }

  // Author validation
  if (author === undefined || author === null) {
    return res.status(400).json({ message: 'Author is required' });
  }
  if (typeof author !== 'string' || author.trim() === '') {
    return res.status(400).json({ message: 'Author cannot be empty' });
  }

  // Price validation
  if (price === undefined || price === null) {
    return res.status(400).json({ message: 'Price is required' });
  }
  if (typeof price !== 'number' || isNaN(price) || !isFinite(price) || price < 0) {
    return res.status(400).json({ message: 'Price must be a valid non-negative number' });
  }

  // Pages validation
  let parsedPages = null;
  if (pages !== undefined && pages !== null) {
    if (typeof pages !== 'number' || !Number.isInteger(pages) || pages <= 0) {
      return res.status(400).json({ message: 'Pages must be a positive integer' });
    }
    parsedPages = pages;
  }

  try {
    const checkQuery = 'SELECT * FROM book WHERE id = ?;';
    const existingBook = await db.get(checkQuery, [parsedId]);

    if (!existingBook) {
      return res.status(404).json({ message: 'Book not found' });
    }

    const updateQuery = `
      UPDATE book
      SET title = ?, author = ?, price = ?, pages = ?
      WHERE id = ?;
    `;
    await db.run(updateQuery, [
      title.trim(),
      author.trim(),
      Math.round(price),
      parsedPages,
      parsedId
    ]);

    const updatedBook = {
      id: parsedId,
      title: title.trim(),
      author: author.trim(),
      price: Math.round(price),
      pages: parsedPages
    };

    res.status(200).json({
      message: 'Book updated successfully',
      book: updatedBook
    });
  } catch (error) {
    console.error('Error updating book:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Endpoint 5: Delete a book by ID
// DELETE /books/:bookId/
app.delete('/books/:bookId/', async (req, res) => {
  const { bookId } = req.params;
  const parsedId = Number(bookId);

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return res.status(400).json({
      message: 'Invalid bookId format. Must be a positive integer'
    });
  }

  try {
    const checkQuery = 'SELECT * FROM book WHERE id = ?;';
    const existingBook = await db.get(checkQuery, [parsedId]);

    if (!existingBook) {
      return res.status(404).json({ message: 'Book not found' });
    }

    const deleteQuery = 'DELETE FROM book WHERE id = ?;';
    await db.run(deleteQuery, [parsedId]);

    res.status(200).json({
      message: 'Book deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting book:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Catch-all 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    message: `The requested path '${req.originalUrl}' does not exist on this server`
  });
});

// Start server if executed directly
if (require.main === module) {
  initializeDBAndServer();
}

module.exports = { app, initializeDBAndServer, getDb: () => db };

