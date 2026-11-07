// Root Multi-Lab Server for Render Deployment
// Unified API Gateway for BDF Coursework (G. AKSHAY - 252U1R8025 - S-14)
const { app, initializeDBAndServer } = require('./lab-03/server.js');

const PORT = process.env.PORT || 3000;

// Redirect root '/' directly to '/books/' so opening the live Render link immediately displays Lab 3 output
app.get('/', (req, res) => {
  res.redirect('/books/');
});

// Lab 1 Compatibility Endpoints
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

app.get('/lab-01', (req, res) => {
  res.status(200).send('Welcome to BDF Lab 1: Node.js and Express Server!');
});

// Start server if run directly
if (require.main === module) {
  initializeDBAndServer(PORT).then(() => {
    console.log(`BDF Multi-Lab Gateway is running at http://0.0.0.0:${PORT}/`);
  });
}

module.exports = app;
