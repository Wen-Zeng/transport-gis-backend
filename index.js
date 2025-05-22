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

    const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;
    console.log('GitHub API URL:', url);

    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3.raw'
      }
    });

    console.log('GitHub API Response Status:', response.status);
    console.log('GitHub API Response Headers:', response.headers);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GitHub API Error Response:', errorText);
      throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
    }

    const contentType = response.headers.get('content-type');
    console.log('Response Content-Type:', contentType);

    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      console.log('Response Text:', text);
      throw new Error('Invalid response format from GitHub');
    }

    // Check if the response is base64 encoded
    if (data.content) {
      res.json(data);
    } else {
      console.error('Invalid data structure:', data);
      throw new Error('Invalid data structure from GitHub');
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