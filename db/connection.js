const mongoose = require('mongoose');

const connectDB = async () => {
    const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smartjobfinder';
    try {
        const conn = await mongoose.connect(mongoURI, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 8000
        });
        console.log(`[DB] MongoDB Connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        console.error(`[DB] MongoDB Connection Warning (${error.message}).`);
        console.warn('[DB] Platform operating with resilient in-memory & fallback state.');
        return null;
    }
};

mongoose.connection.on('disconnected', () => {
    console.warn('[DB] MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
    console.log('[DB] MongoDB reconnected');
});

module.exports = connectDB;
