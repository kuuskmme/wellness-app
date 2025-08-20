// fix-test23.js
const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://wellnessadmin:kood@wellness-platform.c26yste.mongodb.net/wellness-platform?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI);

const userSchema = new mongoose.Schema({
  email: String,
  isVerified: Boolean,
  emailVerificationToken: String,
  emailVerificationExpires: Date
}, {strict: false});

const User = mongoose.model('User', userSchema);

async function fixUser() {
  const user = await User.findOne({ email: 'test23@test.com' });
  
  if (user) {
    console.log('Fixing test23@test.com...');
    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();
    console.log('✅ User verified!');
  }
  
  process.exit(0);
}

fixUser();