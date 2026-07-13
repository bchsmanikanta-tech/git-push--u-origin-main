require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const vacancyRoutes = require('./routes/vacancyRoutes');
const smartDoorRoutes = require('./routes/smartDoorRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const { ensureDefaultAdmins } = require('./utils/sharedData');
const { initDatabase, testConnection } = require('../../../db/pool');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(helmet());
app.use(morgan('dev'));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/vacancies', vacancyRoutes);
app.use('/api/smart-doors', smartDoorRoutes);
app.use('/api/analytics', analyticsRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message });
});

// Database Connection
const PORT = process.env.PORT || 5001;

const startServer = async () => {
  try {
    await testConnection();
    console.log('Connected to PostgreSQL successfully');
  } catch (error) {
    console.error('PostgreSQL connection failed:', error.message);
    console.error('Make sure PostgreSQL is running and DATABASE_URL is configured in .env');
    process.exit(1);
  }

  try {
    await initDatabase();
  } catch (error) {
    console.error('Failed to initialize database schema:', error.message);
    process.exit(1);
  }

  try {
    await ensureDefaultAdmins();
    console.log('Ensured shared admin account credentials are current');
  } catch (error) {
    console.error('Failed to ensure default admin account:', error.message);
  }

  app.listen(PORT, () => console.log(`Admin module server running on port ${PORT}`));
};

startServer();
