const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config();
const mongoose = require('mongoose');

const NEW_PASSWORD = 'SmartJob#2026@Secure!';
const ADMIN_EMAIL  = 'admin@smartjob.com';

const adminSchema = new mongoose.Schema({
    name:     String,
    email:    String,
    password: String,
    role:     String,
    status:   String
}, { timestamps: true });

const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);

async function updateAdminPassword() {
    try {
        console.log('[DB] Connecting to MongoDB Atlas...');
        await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
        console.log('[DB] Connected!');

        const result = await Admin.findOneAndUpdate(
            { email: ADMIN_EMAIL },
            { password: NEW_PASSWORD },
            { new: true, upsert: true }
        );

        if (result) {
            console.log('SUCCESS: Admin password updated!');
            console.log('   Email   :', result.email);
            console.log('   Password:', NEW_PASSWORD);
            console.log('   Role    :', result.role);
        } else {
            console.log('FAIL: Admin not found.');
        }
    } catch (err) {
        console.error('ERROR:', err.message);
    } finally {
        await mongoose.disconnect();
        console.log('[DB] Disconnected.');
        process.exit(0);
    }
}

updateAdminPassword();
