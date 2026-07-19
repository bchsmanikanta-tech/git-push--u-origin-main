const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config();
const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    name: String, email: String, password: String, role: String, status: String
}, { timestamps: true });

const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);

async function testLogin() {
    try {
        await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
        console.log('[DB] Connected!');

        const email = 'admin@smartjob.com';
        const password = 'SmartJob#2026@Secure!';

        const admin = await Admin.findOne({ email: email.toLowerCase() }).lean();
        if (!admin) {
            console.log('RESULT: Admin NOT FOUND in DB');
        } else {
            console.log('Admin found:', admin.email);
            console.log('DB password   :', JSON.stringify(admin.password));
            console.log('Input password:', JSON.stringify(password));
            console.log('Match:', admin.password === password);
        }
    } catch (err) {
        console.error('ERROR:', err.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}
testLogin();
