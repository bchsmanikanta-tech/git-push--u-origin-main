const fetch = require('node-fetch');

async function test() {
    try {
        const res = await fetch('http://localhost:5000/api/admin/dashboard/stats');
        const json = await res.json();
        console.log('STATUS:', res.status);
        console.log('RESPONSE:', JSON.stringify(json, null, 2));
    } catch (err) {
        console.error('ERROR:', err.message);
    }
}

test();
