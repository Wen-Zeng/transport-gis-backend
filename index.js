const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());

// Your GitHub token
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

app.get('/api/geojson/:path', async (req, res) => {
  try {
    const path = req.params.path;
    const response = await fetch(
      `https://api.github.com/repos/wen-zeng/ChinaTransport/contents/${path}`,
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3.raw'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});