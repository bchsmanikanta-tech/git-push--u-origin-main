const mongoose = require('mongoose');

const connectDB = async () => {
    if (mongoose.connection.readyState >= 1) {
        return mongoose.connection;
    }

    const mongoURI = process.env.MONGO_URI || 'mongodb+srv://mani-64:w7vleVtcYtFqvIIk@cluster0.gxfiwno.mongodb.net/smartjobfinder?retryWrites=true&w=majority&appName=Cluster0';
    try {
        const conn = await mongoose.connect(mongoURI, {
            serverSelectionTimeoutMS: 3000,
            connectTimeoutMS: 3000,
            autoIndex: true
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
