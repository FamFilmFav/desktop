const path = require('path');
const express = require('express');

function startServer(app, port) {
  // Serve static files (the app UI)
  app.use(express.static(path.join(__dirname, '../public')));

  // API endpoint examples
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/version', (req, res) => {
    const packageJson = require('../package.json');
    res.json({ version: packageJson.version });
  });

  // Serve index.html for any unknown routes (SPA fallback)
  app.get('*path', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });

  const server = app.listen(port, 'localhost', () => {
    console.log(`Web server listening on http://localhost:${port}`);
  });

  return server;
}

module.exports = {
  startServer
};
