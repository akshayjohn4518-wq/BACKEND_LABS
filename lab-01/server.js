const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());


app.get('/', (req, res) => {
  res.status(200).send('Welcome to BDF Lab 1: Node.js and Express Server!');
});


app.get('/about', (req, res) => {
  res.status(200).json({
    name: 'G. AKSHAY',
    registrationNumber: '252U1R8025',
    section: 'S-14'
  });
});


app.get('/time', (req, res) => {
  const now = new Date();
  res.status(200).json({
    currentTime: now.toISOString(),
    humanReadable: now.toString()
  });
});


app.use((req, res) => {
  res.status(404).json({
    error: '404 Not Found',
    message: `The requested path '${req.originalUrl}' does not exist on this server.`
  });
});


if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Express server is running at http://localhost:${PORT}/`);
  });
}

module.exports = app;

