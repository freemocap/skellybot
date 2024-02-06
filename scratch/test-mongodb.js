const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://127.0.0.1:27017/skellybot-local';

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // You can perform any database operations here if necessary.

    // When done, close the connection
    await mongoose.connection.close();
    console.log('Connection closed');
  } catch (error) {
    console.error('Connection error:', error);
  }
}

run();
