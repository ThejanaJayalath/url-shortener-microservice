'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

/* ================= DATABASE ================= */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

/* ================= SCHEMA ================= */
const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number
});

const Url = mongoose.model('Url', urlSchema);

/* ================= MIDDLEWARE ================= */
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use('/public', express.static(process.cwd() + '/public'));

/* ================= ROUTES ================= */
app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), '/views/index.html'));
});

app.get('/api/hello', (req, res) => {
  res.json({ greeting: 'hello API' });
});

/* ================= POST SHORT URL ================= */
app.post('/api/shorturl', async (req, res) => {
  const inputUrl = req.body.url;

  // 1️⃣ Must start with http:// or https://
  if (!/^(http|https):\/\//.test(inputUrl)) {
    return res.json({ error: 'invalid url' });
  }

  let parsed;
  try {
    parsed = new URL(inputUrl);
  } catch {
    return res.json({ error: 'invalid url' });
  }

  // 🔥 CRITICAL FIX:
  // Prevent FCC from shortening YOUR OWN SERVICE URL
  if (parsed.hostname === req.hostname) {
    return res.json({ error: 'invalid url' });
  }

  // Return existing entry if already saved
  const existing = await Url.findOne({ original_url: inputUrl });
  if (existing) {
    return res.json({
      original_url: existing.original_url,
      short_url: existing.short_url
    });
  }

  // Generate short_url
  const count = await Url.countDocuments();
  const shortUrl = count + 1;

  await new Url({
    original_url: inputUrl,
    short_url: shortUrl
  }).save();

  return res.json({
    original_url: inputUrl,
    short_url: shortUrl
  });
});

/* ================= REDIRECT ================= */
app.get('/api/shorturl/:short_url', async (req, res) => {
  const shortUrl = Number(req.params.short_url);

  const found = await Url.findOne({ short_url: shortUrl });
  if (!found) {
    return res.json({ error: 'invalid url' });
  }

  // FCC requires a simple 302 redirect
  return res.redirect(found.original_url);
});

/* ================= START ================= */
app.listen(port, () => {
  console.log('Listening on port ' + port);
});
