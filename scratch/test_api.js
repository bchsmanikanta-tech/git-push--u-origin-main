const http = require('http');

async function apiPost(path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const dataString = JSON.stringify(body);
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataString),
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: JSON.parse(responseBody)
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(dataString);
    req.end();
  });
}

async function apiGet(path, token, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: JSON.parse(responseBody)
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: responseBody
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

async function run() {
  console.log('Testing admin endpoints...');
  try {
    const loginRes = await apiPost('/api/admin/auth/login', {
      email: 'admin@jobfinder.com',
      password: 'Admin@123'
    }, {
      'Origin': 'null'
    });
    console.log('Login Status:', loginRes.statusCode);

    if (loginRes.data && loginRes.data.success && loginRes.data.token) {
      const token = loginRes.data.token;
      
      console.log('1. Testing GET /api/admin/users...');
      const usersRes = await apiGet('/api/admin/users', token, { 'Origin': 'null' });
      console.log('GET /api/admin/users Status:', usersRes.statusCode);
      console.log('GET /api/admin/users Data:', JSON.stringify(usersRes.data, null, 2));

      console.log('2. Testing GET /api/admin/jobs...');
      const jobsRes = await apiGet('/api/admin/jobs', token, { 'Origin': 'null' });
      console.log('GET /api/admin/jobs Status:', jobsRes.statusCode);
      console.log('GET /api/admin/jobs Data length:', jobsRes.data.jobs ? jobsRes.data.jobs.length : 'N/A');
    } else {
      console.error('Failed to log in.');
    }
  } catch (err) {
    console.error('Error running test:', err);
  }
}

run();
