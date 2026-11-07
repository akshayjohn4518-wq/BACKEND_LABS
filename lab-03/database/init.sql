-- SQLite Database Initialization Script for Lab 3
-- Table schema for 'book'
CREATE TABLE IF NOT EXISTS book (
    id INTEGER PRIMARY KEY,
    title TEXT,
    author TEXT,
    price INTEGER,
    pages INTEGER
);

-- Insert 10 initial sample book records safely (idempotent)
INSERT OR IGNORE INTO book (id, title, author, price, pages) VALUES
(1, 'Node.js Design Patterns', 'Mario Casciaro', 650, 660),
(2, 'Eloquent JavaScript', 'Marijn Haverbeke', 450, 472),
(3, 'Clean Code', 'Robert C. Martin', 599, 464),
(4, 'You Don''t Know JS Yet', 'Kyle Simpson', 399, 142),
(5, 'Designing Data-Intensive Applications', 'Martin Kleppmann', 850, 616),
(6, 'Express in Action', 'Evan M. Hahn', 520, 256),
(7, 'JavaScript: The Good Parts', 'Douglas Crockford', 350, 176),
(8, 'Python Crash Course', 'Eric Matthes', 480, 544),
(9, 'Database System Concepts', 'Abraham Silberschatz', 780, 1376),
(10, 'Learning SQL', 'Alan Beaulieu', 420, 380);

