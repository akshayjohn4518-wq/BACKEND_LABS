
const express = require('express');
const path = require('path');
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const dbPath = path.join(__dirname, 'database', 'books.db');

let db = null;


const initializeDBAndServer = async (port = (process.env.PORT || 3000)) => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    console.log(`Connected to SQLite database at: ${dbPath}`);


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


app.get('/', (req, res) => {
  res.status(200).send('Welcome to BDF Lab 2: SQLite Database and CRUD Routes API!');
});


app.get('/books/', async (req, res) => {
  try {
    const getBooksQuery = 'SELECT * FROM book;';
    const booksArray = await db.all(getBooksQuery);
    res.status(200).json(booksArray);
  } catch (error) {
    console.error('Error fetching books:', error.message);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve books.' });
  }
});

app.get('/books/:bookId/', async (req, res) => {
  const { bookId } = req.params;
  const parsedId = parseInt(bookId, 10);

  if (isNaN(parsedId) || parsedId <= 0) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid bookId format. Must be a positive integer.'
    });
  }

  try {
    const getBookQuery = 'SELECT * FROM book WHERE id = ?;';
    const book = await db.get(getBookQuery, [parsedId]);

    if (!book) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Book with id ${parsedId} not found.`
      });
    }

    res.status(200).json(book);
  } catch (error) {
    console.error('Error fetching book:', error.message);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to retrieve book.' });
  }
});

app.post('/books/', async (req, res) => {
  const { title, author, price, pages } = req.body;


  if (
    !title || typeof title !== 'string' || title.trim() === '' ||
    !author || typeof author !== 'string' || author.trim() === '' ||
    price === undefined || typeof price !== 'number' || isNaN(price) || price < 0 ||
    pages === undefined || typeof pages !== 'number' || isNaN(pages) || pages <= 0
  ) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid request body. Fields "title" (string), "author" (string), "price" (non-negative number), and "pages" (positive number) are required.'
    });
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
      Math.round(pages)
    ]);

    const newBookId = dbResponse.lastID;
    res.status(201).json({
      message: 'Book Added Successfully',
      bookId: newBookId,
      book: {
        id: newBookId,
        title: title.trim(),
        author: author.trim(),
        price: Math.round(price),
        pages: Math.round(pages)
      }
    });
  } catch (error) {
    console.error('Error adding book:', error.message);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to add book.' });
  }
});

app.put('/books/:bookId/', async (req, res) => {
  const { bookId } = req.params;
  const parsedId = parseInt(bookId, 10);

  if (isNaN(parsedId) || parsedId <= 0) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid bookId format. Must be a positive integer.'
    });
  }

  const { title, author, price, pages } = req.body;

  if (
    !title || typeof title !== 'string' || title.trim() === '' ||
    !author || typeof author !== 'string' || author.trim() === '' ||
    price === undefined || typeof price !== 'number' || isNaN(price) || price < 0 ||
    pages === undefined || typeof pages !== 'number' || isNaN(pages) || pages <= 0
  ) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid request body. Fields "title" (string), "author" (string), "price" (non-negative number), and "pages" (positive number) are required.'
    });
  }

  try {

    const checkBookQuery = 'SELECT * FROM book WHERE id = ?;';
    const existingBook = await db.get(checkBookQuery, [parsedId]);

    if (!existingBook) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Book with id ${parsedId} not found.`
      });
    }

    const updateBookQuery = `
      UPDATE book
      SET title = ?, author = ?, price = ?, pages = ?
      WHERE id = ?;
    `;
    await db.run(updateBookQuery, [
      title.trim(),
      author.trim(),
      Math.round(price),
      Math.round(pages),
      parsedId
    ]);

    res.status(200).json({
      message: 'Book Updated Successfully',
      bookId: parsedId,
      updatedBook: {
        id: parsedId,
        title: title.trim(),
        author: author.trim(),
        price: Math.round(price),
        pages: Math.round(pages)
      }
    });
  } catch (error) {
    console.error('Error updating book:', error.message);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to update book.' });
  }
});


app.delete('/books/:bookId/', async (req, res) => {
  const { bookId } = req.params;
  const parsedId = parseInt(bookId, 10);

  if (isNaN(parsedId) || parsedId <= 0) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid bookId format. Must be a positive integer.'
    });
  }

  try {
    const checkBookQuery = 'SELECT * FROM book WHERE id = ?;';
    const existingBook = await db.get(checkBookQuery, [parsedId]);

    if (!existingBook) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Book with id ${parsedId} not found.`
      });
    }

    const deleteBookQuery = 'DELETE FROM book WHERE id = ?;';
    await db.run(deleteBookQuery, [parsedId]);

    res.status(200).json({
      message: 'Book Deleted Successfully',
      bookId: parsedId
    });
  } catch (error) {
    console.error('Error deleting book:', error.message);
    res.status(500).json({ error: 'Internal Server Error', message: 'Failed to delete book.' });
  }
});


app.use((req, res) => {
  res.status(404).json({
    error: '404 Not Found',
    message: `The requested path '${req.originalUrl}' does not exist on this server.`
  });
});


if (require.main === module) {
  initializeDBAndServer();
}

module.exports = { app, initializeDBAndServer, getDb: () => db };
