const mongoose = require('mongoose');
require('dotenv').config();
const { Notification, Application } = require('../db/models');

async function run() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB!");

        const notifications = await Notification.find().limit(3).lean();
        console.log("SAMPLE NOTIFICATIONS:");
        console.log(JSON.stringify(notifications, null, 2));

        const applications = await Application.find().limit(3).lean();
        console.log("SAMPLE APPLICATIONS:");
        console.log(JSON.stringify(applications, null, 2));

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
