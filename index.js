const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const app = express();
const ingestRoutes = require('./routes/ingest');

dotenv.config(); 
app.use(express.json());

app.use('/', ingestRoutes);

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('Connected to MongoDB');
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
})
.catch((err) => {
  console.error('MongoDB connection error:', err);
});
