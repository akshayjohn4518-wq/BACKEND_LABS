// Express Server
// BDF Lab 1 - Implementation B

const express = require('express');

const app = express();

// Use environment port or default to 3000
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies if needed
app.use(express.json());

// 1. GET / - Welcome message
app.get('/', (req, res) => {
  res.status(200).send('Welcome to BDF Lab 1: Node.js and Express Server!');
});

// 2. GET /about - Information containing name, registration number, and section
app.get('/about', (req, res) => {
  res.status(200).json({
    name: 'G. AKSHAY',
    registrationNumber: '252U1R8025',
    section: 'S-14'
  });
});

// 3. GET /time - Current date and time using new Date()
app.get('/time', (req, res) => {
  const now = new Date();
  res.status(200).json({
    currentTime: now.toISOString(),
    humanReadable: now.toString()
  });
});

// 4. Catch-all 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    error: '404 Not Found',
    message: `The requested path '${req.originalUrl}' does not exist on this server.`
  });
});

// Start listening if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Express server is running at http://localhost:${PORT}/`);
  });
}

module.exports = app;

