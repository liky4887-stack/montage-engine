const fs = require('fs');
const http = require('http');

// Read the JSON file you provided
const cookies = JSON.parse(fs.readFileSync('cookies.json', 'utf8'));

// Convert JSON array to standard Cookie header string
const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

const data = JSON.stringify({ 
  token: cookieString,
  cookie: cookieString 
});

const options = {
  hostname: '127.0.0.1',
  port: 8790,
  path: '/deepseek/credentials', // We will try this endpoint first
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Response: ${body}`);
  });
});

req.on('error', (e) => console.error(`Problem: ${e.message}`));
req.write(data);
req.end();
