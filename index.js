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

    // Get the raw content directly from GitHub
    const rawUrl = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/${path}`;
    console.log('Raw URL:', rawUrl);
    
    const response = await fetch(rawUrl, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GitHub API Error Response:', errorText);
      throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
    }

    const content = await response.text();
    
    // Check if it's an LFS pointer file
    if (content.startsWith('version https://git-lfs.github.com/spec/v1')) {
      // Extract the oid from the LFS pointer
      const oidMatch = content.match(/oid sha256:([a-f0-9]+)/);
      if (!oidMatch) {
        throw new Error('Invalid LFS pointer format');
      }
      const oid = oidMatch[1];
      
      // Fetch the actual content from GitHub LFS
      const lfsUrl = `https://github.com/${OWNER}/${REPO}/raw/main/${path}`;
      console.log('LFS URL:', lfsUrl);
      
      const lfsResponse = await fetch(lfsUrl, {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`
        }
      });

      if (!lfsResponse.ok) {
        throw new Error(`Failed to fetch LFS content: ${lfsResponse.status}`);
      }

      const lfsContent = await lfsResponse.text();
      try {
        const geoJSON = JSON.parse(lfsContent);
        res.json(geoJSON);
      } catch (e) {
        console.error('JSON Parse Error:', e);
        throw new Error('Invalid GeoJSON format');
      }
    } else {
      // Regular file, not LFS
      try {
        const geoJSON = JSON.parse(content);
        res.json(geoJSON);
      } catch (e) {
        console.error('JSON Parse Error:', e);
        throw new Error('Invalid GeoJSON format');
      }
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