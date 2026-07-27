const connectDB = require('../db/connection');
const { Application, Jobseeker, Job } = require('../db/models');

async function testDB() {
    console.log("Connecting to MongoDB...");
    const conn = await connectDB();
    if (!conn) {
        console.error("DB connection returned null (offline/fallback mode)");
        return;
    }
    console.log("DB Connected!");

    try {
        console.log("Testing Jobseeker query...");
        const seekerCount = await Jobseeker.countDocuments();
        console.log("Seekers count:", seekerCount);

        console.log("Testing Job query...");
        const jobCount = await Job.countDocuments();
        console.log("Jobs count:", jobCount);

        console.log("Testing Application query...");
        const appCount = await Application.countDocuments();
        console.log("Applications count:", appCount);

    } catch (err) {
        console.error("Database error during operation:", err);
    } finally {
        process.exit(0);
    }
}

testDB();
