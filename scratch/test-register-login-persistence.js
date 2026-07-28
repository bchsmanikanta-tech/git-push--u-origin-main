const http = require('http');

function post(path, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const req = http.request({
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        }, (res) => {
            let str = '';
            res.on('data', chunk => str += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(str) }));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function runTest() {
    const testEmail = `testuser_${Date.now()}@gmail.com`;
    const testPass = 'password123';
    console.log('--- Testing Registration ---');
    console.log('Email:', testEmail);
    
    const regRes = await post('/api/auth/register-seeker', { name: 'Test Seeker', email: testEmail, password: testPass });
    console.log('Register Response:', regRes);

    console.log('\n--- Testing Login after logout ---');
    const loginRes = await post('/api/auth/login-seeker', { email: testEmail, password: testPass });
    console.log('Login Response:', loginRes);

    if (loginRes.status === 200 && loginRes.data.success) {
        console.log('\nSUCCESS: Registration & Login persistence verified successfully!');
    } else {
        console.error('\nFAILURE: Login failed after registration.');
    }
}

runTest().catch(console.error);
