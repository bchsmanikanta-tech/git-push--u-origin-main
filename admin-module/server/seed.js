require('dotenv').config();
const mongoose = require('mongoose');
const AdminUser = require('./models/AdminUser');
const User = require('./models/User');
const Vacancy = require('./models/Vacancy');
const SmartDoor = require('./models/SmartDoor');
const Report = require('./models/Report');
const AuditLog = require('./models/AuditLog');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/smartdoor_admin';

const seedData = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing data
    await AdminUser.deleteMany();
    await User.deleteMany();
    await Vacancy.deleteMany();
    await SmartDoor.deleteMany();
    await Report.deleteMany();
    await AuditLog.deleteMany();

    console.log('Cleared existing database data.');

    // 1. Create Admins
    const superAdmin = await AdminUser.create({
      name: 'Super Admin',
      email: 'admin@smartdoor.com',
      password: 'Admin@123', // will be hashed automatically by pre-save middleware
      role: 'Super Admin',
      status: 'Active'
    });

    const standardAdmin = await AdminUser.create({
      name: 'Jane Doe',
      email: 'jane@smartdoor.com',
      password: 'Admin@123',
      role: 'Admin',
      status: 'Active'
    });

    console.log('Created Admin accounts.');

    // 2. Create standard system users
    const users = await User.create([
      { name: 'John Smith', email: 'john.smith@gmail.com', password: 'Password@123', role: 'Job Seeker', status: 'Active', phoneNumber: '123-456-7890' },
      { name: 'Alice Brown', email: 'alice.brown@outlook.com', password: 'Password@123', role: 'Tenant', status: 'Active', phoneNumber: '987-654-3210' },
      { name: 'Omega Properties', email: 'info@omega.com', password: 'Password@123', role: 'Property Owner', status: 'Active', phoneNumber: '555-019-2834' },
      { name: 'TechCorp Solutions', email: 'hr@techcorp.com', password: 'Password@123', role: 'Company', status: 'Suspended', phoneNumber: '444-239-1122' },
      { name: 'Bob Johnson', email: 'bob.j@yahoo.com', password: 'Password@123', role: 'Job Seeker', status: 'Blocked', phoneNumber: '111-222-3333' }
    ]);

    console.log('Created system users.');

    // 3. Create Smart Doors
    const doors = await SmartDoor.create([
      { doorId: 'SD-101', name: 'Conference Room Alpha Lock', status: 'Online', isEnabled: true },
      { doorId: 'SD-102', name: 'Executive Suite Lock', status: 'Online', isEnabled: true },
      { doorId: 'SD-201', name: 'Studio Apartment 201 Lock', status: 'Offline', isEnabled: true },
      { doorId: 'SD-202', name: 'Co-working HotDesk Area Lock', status: 'Online', isEnabled: false },
      { doorId: 'SD-305', name: 'Warehouse Main Door Lock', status: 'Offline', isEnabled: false }
    ]);

    console.log('Created Smart Doors.');

    // 4. Create Vacancies
    const vacancies = await Vacancy.create([
      {
        title: 'Premium Co-working Desk (Alpha Space)',
        description: 'Single desk space in a quiet, air-conditioned co-working area. High-speed internet included.',
        location: 'Downtown Silicon District, FL',
        rent: 250,
        status: 'Active',
        smartDoor: doors[0]._id,
        createdBy: users[2]._id, // Omega Properties
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      },
      {
        title: 'Studio Apartment 201 - Fully Furnished',
        description: 'Modern studio apartment close to transit, complete with smart door access and high-end security.',
        location: 'Midtown Express Avenue, NY',
        rent: 1400,
        status: 'Pending',
        smartDoor: doors[2]._id,
        createdBy: users[2]._id, // Omega Properties
        expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
      },
      {
        title: 'TechCorp HR Meeting Room vacancy',
        description: 'Large executive office meeting space, perfect for client presentations or board meetups.',
        location: 'Innovation Boulevard, CA',
        rent: 45,
        status: 'Expired',
        smartDoor: doors[1]._id,
        createdBy: users[3]._id, // TechCorp
        expiresAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // expired 5 days ago
      },
      {
        title: 'Shared Double Studio Room',
        description: 'Shared student double studio with high security smart lock access.',
        location: 'University Town, TX',
        rent: 450,
        status: 'Filled',
        smartDoor: doors[3]._id,
        createdBy: users[2]._id,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
      }
    ]);

    console.log('Created vacancies.');

    // 5. Create Reports
    await Report.create([
      {
        reporter: users[0]._id,
        type: 'Vacancy',
        targetId: vacancies[0]._id,
        description: 'The rent listed does not match the space layout. Description says desk, title says premium office.',
        status: 'Pending'
      },
      {
        reporter: users[1]._id,
        type: 'Smart Door',
        targetId: doors[2]._id,
        description: 'Studio Apartment lock status keeps showing Offline even after multiple restarts.',
        status: 'Resolved'
      }
    ]);

    console.log('Created report logs.');

    // 6. Create Audit Logs
    await AuditLog.create([
      { adminId: superAdmin._id, adminName: superAdmin.name, action: 'LOGIN_SUCCESS', details: 'Admin logged in successfully', ipAddress: '192.168.1.10' },
      { adminId: superAdmin._id, adminName: superAdmin.name, action: 'USER_BLOCK', details: 'Blocked user bob.j@yahoo.com due to multiple spam listings', ipAddress: '192.168.1.10' },
      { adminId: standardAdmin._id, adminName: standardAdmin.name, action: 'SMARTDOOR_UPDATE', details: 'Enabled smart lock SD-101', ipAddress: '192.168.1.12' }
    ]);

    console.log('Created audit logs.');
    console.log('Database Seeding Completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error.message);
    process.exit(1);
  }
};

seedData();
