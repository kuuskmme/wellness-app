// config/passport.js - Passport OAuth Configuration (Optional)
const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const User = require('../models/User');

// JWT Strategy (always enabled)
passport.use(new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET
}, async (payload, done) => {
  try {
    const user = await User.findById(payload.userId);
    if (user) {
      return done(null, user);
    }
    return done(null, false);
  } catch (error) {
    return done(error, false);
  }
}));

// Google OAuth Strategy (only if configured)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  const GoogleStrategy = require('passport-google-oauth20').Strategy;
  
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback"
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user exists
      let user = await User.findOne({ email: profile.emails[0].value });
      
      if (user) {
        // User exists, check if Google ID is linked
        if (!user.googleId) {
          user.googleId = profile.id;
          user.isVerified = true; // Auto-verify OAuth users
          await user.save();
        }
        return done(null, user);
      }
      
      // Create new user
      user = new User({
        email: profile.emails[0].value,
        googleId: profile.id,
        isVerified: true, // OAuth users are automatically verified
        password: require('crypto').randomBytes(32).toString('hex'), // Random password for OAuth users
        dataConsent: {
          given: true,
          timestamp: new Date(),
          ipAddress: 'OAuth Registration'
        }
      });
      
      await user.save();
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
}

// GitHub OAuth Strategy (only if configured)
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  const GitHubStrategy = require('passport-github2').Strategy;
  
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: "/api/auth/github/callback"
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // GitHub might not provide email
      const email = profile.emails && profile.emails[0] ? profile.emails[0].value : `${profile.username}@github.local`;
      
      let user = await User.findOne({ 
        $or: [
          { email: email },
          { githubId: profile.id }
        ]
      });
      
      if (user) {
        // User exists, ensure GitHub ID is linked
        if (!user.githubId) {
          user.githubId = profile.id;
          user.isVerified = true;
          await user.save();
        }
        return done(null, user);
      }
      
      // Create new user
      user = new User({
        email: email,
        githubId: profile.id,
        isVerified: true,
        password: require('crypto').randomBytes(32).toString('hex'),
        dataConsent: {
          given: true,
          timestamp: new Date(),
          ipAddress: 'OAuth Registration'
        }
      });
      
      await user.save();
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }));
}

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;