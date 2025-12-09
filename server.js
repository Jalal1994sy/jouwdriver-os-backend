require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const companyRoutes = require('./routes/company');
const vehicleRoutes = require('./routes/vehicles');
const tripRoutes = require('./routes/trips');
const chironRoutes = require('./routes/chiron');
const itsmeRoutes = require('./routes/itsme');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: '*',
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('JOUW TAXI OS 26 SaaS backend running');
});

app.use('/api/auth', authRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/chiron', chironRoutes);
app.use('/api/oauth/itsme', itsmeRoutes);

app.listen(PORT, () => {
  console.log('Backend listening on http://localhost:' + PORT);
});
