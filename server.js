// Root entrypoint for Render and cloud hosting platforms
const app = require('./lab-01/server.js');

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Express server is running on http://0.0.0.0:${PORT}/`);
  });
}

module.exports = app;
