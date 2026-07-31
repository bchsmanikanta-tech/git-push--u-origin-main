const connectDB = require('../db/connection');

async function testConnection() {
    console.log('Testing connectDB timeout...');
    const start = Date.now();
    const conn = await connectDB();
    const duration = Date.now() - start;
    console.log(`connectDB completed in ${duration}ms. Connected: ${!!conn}`);
}

testConnection().catch(err => console.error('Test error:', err));
