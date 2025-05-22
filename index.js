const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());

// Your GitHub token
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = 'wen-zeng';
const REPO = 'ChinaTransport';

// Add a test route
app.get('/', (req, res) => {
  res.send('Backend is running!');
});

app.get('/api/geojson/:path(*)', async (req, res) => {
  try {
    const path = req.params.path;
    console.log('Fetching:', path);

    const response = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`,
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3.raw'
        }
      }
    );

    if (!response.ok) {
      console.error('GitHub API error:', response.status, response.statusText);
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Check if the response is base64 encoded
    if (data.content) {
      res.json(data);
    } else {
      throw new Error('Invalid response format from GitHub');
    }
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Error fetching data from GitHub'
    });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});