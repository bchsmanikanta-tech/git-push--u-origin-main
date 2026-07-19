const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config();
const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    name: String, email: String, password: String, role: String, status: String
}, { timestamps: true });

const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);

async function checkAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
        console.log('[DB] Connected!');
        const admins = await Admin.find({}).lean();
        console.log('All admins in DB:', JSON.stringify(admins, null, 2));
    } catch (err) {
        console.error('ERROR:', err.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}
checkAdmin();
