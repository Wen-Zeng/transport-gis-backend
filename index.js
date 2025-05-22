const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());

// Your GitHub token
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = 'wen-zeng';
const REPO = 'ChinaTransport';
const BRANCH = 'master';

// Add a test route
app.get('/', (req, res) => {
  res.send('Backend is running!');
});

// Add a route to list repository contents
app.get('/api/list/*', async (req, res) => {
  try {
    // Get the path from the URL, removing the /api/list/ prefix
    const path = req.path.replace('/api/list/', '');
    console.log('Listing path:', path);

    const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`;
    console.log('GitHub API URL:', url);

    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GitHub API Error Response:', errorText);
      throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Error listing repository contents'
    });
  }
});

app.get('/api/geojson/*', async (req, res) => {
  try {
    // Get the path from the URL, removing the /api/geojson/ prefix
    const path = req.path.replace('/api/geojson/', '');
    console.log('Fetching path:', path);

    // First, try to list the contents of the parent directory
    const parentPath = path.split('/').slice(0, -1).join('/');
    console.log('Parent path:', parentPath);
    
    const listUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${parentPath}?ref=${BRANCH}`;
    console.log('Listing URL:', listUrl);
    
    const listResponse = await fetch(listUrl, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (listResponse.ok) {
      const files = await listResponse.json();
      console.log('Available files:', files.map(f => f.name));
    }

    // Get the raw content
    const rawUrl = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${path}`;
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
      const lfsUrl = `https://github.com/${OWNER}/${REPO}/raw/${BRANCH}/${path}`;
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