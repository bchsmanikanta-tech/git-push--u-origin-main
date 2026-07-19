const dns = require('dns');
try {
    dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
    console.warn('[DB] Warning: Failed to set DNS servers:', e.message);
}

const mongoose = require('mongoose');

const connectDB = async () => {
    const mongoURI = process.env.MONGO_URI || 'mongodb+srv://bhaihack333_db_user:kRTnlwlPdikPS4m8@smartjob.alq6c0s.mongodb.net/smartjobfinder?retryWrites=true&w=majority&appName=smartjob';
    try {
        const conn = await mongoose.connect(mongoURI, {
            serverSelectionTimeoutMS: 8000,
            connectTimeoutMS: 10000
        });
        console.log(`[DB] MongoDB Connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        console.error(`[DB] MongoDB Connection Failed: ${error.message}`);
        if (!process.env.NETLIFY) {
            process.exit(1);
        } else {
            throw error;
        }
    }
};

mongoose.connection.on('disconnected', () => {
    console.warn('[DB] MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
    console.log('[DB] MongoDB reconnected');
});

module.exports = connectDB;
