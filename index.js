'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

/* ================= DATABASE ================= */
mongoose.connect(process.env.MONGO_URI);

/* ================= SCHEMA ================= */
const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number
});

const Url = mongoose.model('Url', urlSchema);

/* ================= MIDDLEWARE ================= */
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use('/public', express.static(process.cwd() + '/public'));

/* ================= ROUTES ================= */
app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), '/views/index.html'));
});

app.get('/api/hello', (req, res) => {
  res.json({ greeting: 'hello API' });
});

/* ================= POST ================= */
app.post('/api/shorturl', async (req, res) => {
  const inputUrl = req.body.url;

  // FCC validation: protocol only
  if (!/^(http|https):\/\//.test(inputUrl)) {
    return res.json({ error: 'invalid url' });
  }

  // Check existing
  const existing = await Url.findOne({ original_url: inputUrl });
  if (existing) {
    return res.json({
      original_url: existing.original_url,
      short_url: existing.short_url
    });
  }

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
  const doc = await Url.findOne({ short_url: Number(req.params.short_url) });

  if (!doc) {
    return res.json({ error: 'invalid url' });
  }

  // EXACTLY what FCC expects
  return res.redirect(doc.original_url);
});

/* ================= START ================= */
app.listen(port, () => {
  console.log('Listening on port ' + port);
});
