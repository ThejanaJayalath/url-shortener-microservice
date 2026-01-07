'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dns = require('dns');

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

// 🔥 BOTH are REQUIRED for FCC
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use('/public', express.static(`${process.cwd()}/public`));

/* ================= ROUTES ================= */
app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

/* ================= POST ================= */
app.post('/api/shorturl', async function(req, res) {
  const inputUrl = req.body.url;

  // Basic check - must have http:// or https://
  if (!inputUrl || typeof inputUrl !== 'string') {
    return res.json({ error: 'invalid url' });
  }

  // More lenient regex - just check for http:// or https:// at the start
  if (!(/^https?:\/\//i).test(inputUrl)) {
    return res.json({ error: 'invalid url' });
  }

  // Parse URL to extract hostname
  let hostname;
  try {
    const urlObj = new URL(inputUrl);
    hostname = urlObj.hostname;
    
    // Must have a hostname
    if (!hostname) {
      return res.json({ error: 'invalid url' });
    }
  } catch (error) {
    return res.json({ error: 'invalid url' });
  }

  // Use dns.lookup to verify the hostname (as per FCC hint)
  // Wrap in promise to handle properly
  try {
    await new Promise((resolve, reject) => {
      dns.lookup(hostname, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  } catch (error) {
    return res.json({ error: 'invalid url' });
  }

  // URL is valid, check if it already exists
  const existing = await Url.findOne({ original_url: inputUrl });
  if (existing) {
    return res.json({
      original_url: existing.original_url,
      short_url: existing.short_url
    });
  }

  // Create new short URL
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
app.get('/api/shorturl/:short_url', async function(req, res) {
  const shortUrl = parseInt(req.params.short_url, 10);

  if (isNaN(shortUrl)) {
    return res.json({ error: 'invalid url' });
  }

  try {
    const found = await Url.findOne({ short_url: shortUrl });
    if (!found) {
      return res.json({ error: 'invalid url' });
    }

    // Explicit 302 redirect - some test frameworks require this
    return res.redirect(302, found.original_url);
  } catch (error) {
    return res.json({ error: 'invalid url' });
  }
});

/* ================= START ================= */
app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
