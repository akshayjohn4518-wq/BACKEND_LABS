// Native Node.js HTTP Server
// BDF Lab 1 - Implementation A

const http = require('http');

// Use environment port or default to 3000
const PORT = process.env.PORT || 3000;

// Create HTTP server instance
const server = http.createServer((req, res) => {
  // Set response headers
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  // Return required text
  res.end('Hello');
});

// Start listening if run directly
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Native HTTP server is running at http://localhost:${PORT}/`);
  });
}

module.exports = server;

