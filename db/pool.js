require('dotenv').config();
const mongoose = require('mongoose');

const connectionString = process.env.MONGO_URI || 'mongodb://localhost:27017/smartjobfinder';

let isConnected = false;

async function testConnection() {
  if (isConnected) return true;
  try {
    await mongoose.connect(connectionString, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4 // Force IPv4 to bypass slow IPv6 lookups
    });
    isConnected = true;
    console.log('[DB] MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('[DB] MongoDB connection error:', error.message);
    return false;
  }
}

// Dummy for pool.query where it might be inadvertently called, though we will refactor them
const pool = {
  query: async () => { throw new Error('pool.query is deprecated. Use Mongoose models.'); }
};
async function query(text, params) {
  throw new Error('query is deprecated. Use Mongoose models.');
}

const DEFAULT_ADMINS = [
  { name: 'Super Admin', email: 'admin@smartdoor.com', password: 'Admin@123' },
  { name: 'Super Admin', email: 'admin@jobfinder.com', password: 'Admin@123' }
];

async function initDatabase() {
  await testConnection();
  const { Admin } = require('./models');
  
  // Seed default admins
  for (const admin of DEFAULT_ADMINS) {
    try {
      const existing = await Admin.findOne({ email: admin.email.toLowerCase() });
      if (!existing) {
        await Admin.create({
          name: admin.name,
          email: admin.email.toLowerCase(),
          password: admin.password,
          role: 'Super Admin',
          status: 'Active'
        });
      }
    } catch (e) {
      console.error('Failed to seed admin:', e.message);
    }
  }
  console.log('[DB] MongoDB initialized');
}

module.exports = { pool, query, testConnection, initDatabase, DEFAULT_ADMINS, mongoose };
