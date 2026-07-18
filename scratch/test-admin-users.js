const http = require('http');

async function apiPost(path, body) {
  return new Promise((resolve, reject) => {
    const dataString = JSON.stringify(body);
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataString)
      }
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, data: JSON.parse(responseBody) });
      });
    });

    req.on('error', (err) => { reject(err); });
    req.write(dataString);
    req.end();
  });
}

async function apiGet(path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, data: JSON.parse(responseBody) });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: responseBody });
        }
      });
    });

    req.on('error', (err) => { reject(err); });
    req.end();
  });
}

async function run() {
  console.log('Logging in to React Admin endpoint...');
  try {
    const loginRes = await apiPost('/api/auth/login', {
      email: 'admin@jobfinder.com',
      password: 'Admin@123'
    });
    console.log('Login Status:', loginRes.statusCode);
    
    if (loginRes.data && loginRes.data.success && loginRes.data.token) {
      const token = loginRes.data.token;
      console.log('Fetching users from /api/users...');
      const usersRes = await apiGet('/api/users', token);
      console.log('Users Status:', usersRes.statusCode);
      console.log('Users:', JSON.stringify(usersRes.data.users, null, 2));
    } else {
      console.log('Login failed:', loginRes.data);
    }
  } catch (err) {
    console.error('Error running test:', err);
  }
}

run();
