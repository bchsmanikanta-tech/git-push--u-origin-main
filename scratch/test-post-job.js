const connectDB = require('../db/connection');
const { Job } = require('../db/models');

async function test() {
    console.log('Connecting to DB...');
    const conn = await connectDB();
    if (!conn) {
        console.log('DB Connection failed or timed out.');
    } else {
        console.log('DB Connection successful!');
        const jobs = await Job.find({}).limit(5).lean();
        console.log('Jobs in DB:', jobs.length);
        console.log('Sample jobs:', jobs);
    }
    process.exit(0);
}

test();
