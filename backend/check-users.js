// check-users.js
const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://wellnessadmin:kood@wellness-platform.c26yste.mongodb.net/wellness-platform?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI);

const userSchema = new mongoose.Schema({
  email: String,
  isVerified: Boolean
}, {strict: false});

const User = mongoose.model('User', userSchema);

async function checkUsers() {
  console.log('Checking all users...');
  
  const users = await User.find({}).select('email isVerified');
  
  if (users.length === 0) {
    console.log('No users found in database');
  } else {
    console.log(`Found ${users.length} users:`);
    users.forEach(u => {
      console.log(`- ${u.email} (verified: ${u.isVerified})`);
    });
  }
  
  process.exit(0);
}

checkUsers();