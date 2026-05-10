/**
 * Express server for the SignUp service.
 *
 * Routes:
 *   GET  /api/health                      -> simple liveness check
 *   GET  /api/signups                     -> list all sign-ups
 *   GET  /api/signups/category/:category  -> list sign-ups in one category
 *   POST /api/signups                     -> create a sign-up (5 second delay)
 */
const express = require('express');
const cors = require('cors');
const {
  createSignup,
  getAllSignups,
  getSignupsByCategory,
} = require('./services/signupService');

const app = express();
app.use(cors());
app.use(express.json({ limit: '64kb' }));

const SUBMIT_DELAY_MS = Number(process.env.SUBMIT_DELAY_MS ?? 5000);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/signups', async (_req, res, next) => {
  try {
    const items = await getAllSignups();
    res.json(items);
  } catch (err) {
    next(err);
  }
});

app.get('/api/signups/category/:category', async (req, res, next) => {
  try {
    const items = await getSignupsByCategory(req.params.category);
    res.json(items);
  } catch (err) {
    next(err);
  }
});

app.post('/api/signups', async (req, res, next) => {
  try {
    // Intentional 5-second delay to demonstrate the SAVING UI state.
    await sleep(SUBMIT_DELAY_MS);
    const created = await createSignup(req.body);
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// Centralised error handler: maps service errors to JSON responses.
app.use((err, _req, res, _next) => {
  const status = err.statusCode || 500;
  const payload = { error: err.message || 'Internal server error' };
  if (err.fields) payload.fields = err.fields;
  if (status >= 500) console.error('[server] Unhandled error:', err);
  res.status(status).json(payload);
});

const PORT = Number(process.env.PORT || 3001);
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[server] SignUp API listening on port ${PORT}`);
  });
}

module.exports = app;
