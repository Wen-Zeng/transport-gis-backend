const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const compression = require('compression');
const { Transform } = require('stream');

const app = express();
app.use(cors());
app.use(compression()); // Enable compression

// Your GitHub token
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = 'wen-zeng';
const REPO = 'ChinaTransport';
const BRANCH = 'master';

// Increase timeout for large files
const TIMEOUT = 30000; // 30 seconds

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

app.get('/api/geojson/:path(*)', async (req, res) => {
  try {
    const path = req.params.path;
    console.log('Fetching:', path);

    // First get the file metadata
    const metadataUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`;
    console.log('Metadata URL:', metadataUrl);

    const metadataResponse = await fetch(metadataUrl, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!metadataResponse.ok) {
      const errorText = await metadataResponse.text();
      console.error('GitHub API Error Response:', errorText);
      throw new Error(`GitHub API error: ${metadataResponse.status} - ${errorText}`);
    }

    const metadata = await metadataResponse.json();
    console.log('File metadata:', metadata);

    // Use the download_url from the metadata
    const downloadUrl = metadata.download_url;
    console.log('Download URL:', downloadUrl);

    // Stream the response
    const contentResponse = await fetch(downloadUrl, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`
      }
    });

    if (!contentResponse.ok) {
      const errorText = await contentResponse.text();
      console.error('Content fetch error:', errorText);
      throw new Error(`Failed to fetch content: ${contentResponse.status}`);
    }

    // Set appropriate headers
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Create a transform stream to handle LFS pointers and encoding
    const transformStream = new Transform({
      async transform(chunk, encoding, callback) {
        try {
          const content = chunk.toString('utf8');
          
          // Check if it's an LFS pointer file
          if (content.startsWith('version https://git-lfs.github.com/spec/v1')) {
            // Extract the oid from the LFS pointer
            const oidMatch = content.match(/oid sha256:([a-f0-9]+)/);
            if (!oidMatch) {
              throw new Error('Invalid LFS pointer format');
            }
            
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

            // Stream the LFS content
            lfsResponse.body.pipe(res);
          } else {
            // Regular file, not LFS
            // Ensure proper UTF-8 encoding
            const buffer = Buffer.from(content, 'utf8');
            callback(null, buffer);
          }
        } catch (error) {
          callback(error);
        }
      }
    });

    // Pipe the response through our transform stream
    contentResponse.body.pipe(transformStream).pipe(res);

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: error.message,
      details: 'Error fetching data from GitHub'
    });
  }
});

// Add error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    details: err.message
  });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});