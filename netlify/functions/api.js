const serverless = require('serverless-http');
const app = require('../../server');
const connectDB = require('../../db/connection');
const mongoose = require('mongoose');

let seedChecked = false;
const serverlessHandler = serverless(app);

// Wrapper to ensure DB is initialized before handling any requests
const handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  if (mongoose.connection.readyState !== 1) {
    await connectDB();
  }

  if (!seedChecked && mongoose.connection.readyState === 1) {
    try {
      const { Admin, Job } = require('../../db/models');
      const exists = await Admin.findOne({ email: 'admin@smartjob.com' });
      if (!exists) {
        await Admin.create({ name: 'Super Admin', email: 'admin@smartjob.com', password: 'Admin@123', role: 'Super Admin', status: 'Active' });
        console.log('[ADMIN] Default admin created → admin@smartjob.com / Admin@123');
      }

      const jobCount = await Job.countDocuments();
      if (jobCount === 0) {
        const seedJobs = [
          { id: 'job_seed_1', _id: 'job_seed_1', title: 'Senior Full Stack Engineer', companyName: 'TechCorp Solutions', companyEmail: 'hr@techcorp.com', location: 'Bangalore, India', salary: '₹18 - ₹25 LPA', type: 'Full Time', experience: '3-5 Years', skills: 'JavaScript, React, Node.js, MongoDB', description: 'We are seeking an experienced Full Stack Engineer to lead frontend and backend web development projects.', status: 'Active', createdAt: new Date().toISOString() },
          { id: 'job_seed_2', _id: 'job_seed_2', title: 'Frontend UI/UX Architect', companyName: 'InnovateX Labs', companyEmail: 'careers@innovatex.com', location: 'Remote', salary: '₹15 - ₹22 LPA', type: 'Remote', experience: '2-4 Years', skills: 'HTML5, CSS3, Bootstrap 5, Vue/React', description: 'Join our dynamic creative team to design and build stunning, intuitive web application user interfaces.', status: 'Active', createdAt: new Date().toISOString() },
          { id: 'job_seed_3', _id: 'job_seed_3', title: 'Data Analyst & Insights Lead', companyName: 'DataSphere Analytics', companyEmail: 'jobs@datasphere.io', location: 'Hyderabad, India', salary: '₹12 - ₹18 LPA', type: 'Hybrid', experience: '1-3 Years', skills: 'Python, SQL, Tableau, PowerBI', description: 'Analyze data trends, build interactive dashboards, and deliver key business insights to cross-functional executive teams.', status: 'Active', createdAt: new Date().toISOString() },
          { id: 'job_seed_4', _id: 'job_seed_4', title: 'Java Cloud Backend Developer', companyName: 'Apex Cloud Systems', companyEmail: 'recruitment@apexcloud.com', location: 'Pune, India', salary: '₹14 - ₹20 LPA', type: 'Full Time', experience: '2-5 Years', skills: 'Java, Spring Boot, Microservices, AWS', description: 'Build high-throughput backend microservices, REST APIs, and scalable cloud deployment pipelines.', status: 'Active', createdAt: new Date().toISOString() },
          { id: 'job_seed_5', _id: 'job_seed_5', title: 'Mobile Application Developer', companyName: 'AppWorks Studio', companyEmail: 'hiring@appworks.com', location: 'Mumbai, India', salary: '₹10 - ₹16 LPA', type: 'Full Time', experience: '1-3 Years', skills: 'React Native, Flutter, iOS, Android', description: 'Develop next-generation mobile applications for iOS and Android platforms with smooth native UI features.', status: 'Active', createdAt: new Date().toISOString() }
        ];
        await Job.insertMany(seedJobs, { ordered: false }).catch(() => null);
        console.log('[NETLIFY SEED] Initial vacancies created in MongoDB');
      }
      seedChecked = true;
    } catch (err) {
      console.warn('[NETLIFY SEED WARNING]', err.message);
    }
  }

  return serverlessHandler(event, context);
};

exports.handler = handler;
