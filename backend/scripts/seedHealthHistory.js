// backend/scripts/seedHealthHistory.js
// Script to create realistic health history data for testing

const mongoose = require('mongoose');
const HealthHistory = require('../models/HealthHistory');
const HealthProfile = require('../models/HealthProfile');
require('dotenv').config({ path: '../.env' });

async function seedHealthHistory() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/wellness-platform');
    console.log('Connected to MongoDB');
    
    // Get a user profile to seed data for
    const profile = await HealthProfile.findOne().sort({ createdAt: -1 });
    
    if (!profile) {
      console.log('No health profile found. Please create a profile first.');
      process.exit(1);
    }
    
    const userId = profile.userId;
    const currentWeight = profile.physicalMetrics?.weight?.value || 73;
    const targetWeight = profile.fitnessGoals?.targetWeight || 70;
    const currentBMI = profile.physicalMetrics?.bmi?.value || 22.3;
    
    console.log(`Seeding data for user: ${userId}`);
    console.log(`Current weight: ${currentWeight} kg, Target: ${targetWeight} kg`);
    
    // Clear existing history for this user (optional)
    const clearExisting = process.argv.includes('--clear');
    if (clearExisting) {
      await HealthHistory.deleteMany({ userId });
      console.log('Cleared existing history');
    }
    
    // Generate realistic weight progression over 30 days
    const isLosingWeight = currentWeight > targetWeight;
    const totalChange = isLosingWeight ? -2.5 : 1.5; // Realistic monthly change
    const dailyChange = totalChange / 30;
    
    const historyEntries = [];
    const now = new Date();
    
    // Create entries for the past 30 days
    for (let daysAgo = 30; daysAgo >= 0; daysAgo -= 3) { // Entry every 3 days
      const date = new Date(now);
      date.setDate(date.getDate() - daysAgo);
      
      // Calculate weight for this date
      const progressRatio = (30 - daysAgo) / 30;
      const weightChange = totalChange * progressRatio;
      const weight = currentWeight - totalChange + weightChange;
      
      // Add some realistic daily variation (±0.3 kg)
      const variation = (Math.random() - 0.5) * 0.6;
      const finalWeight = Math.round((weight + variation) * 10) / 10;
      
      // Calculate BMI for this weight
      const height = profile.physicalMetrics?.height?.value || 170;
      const bmi = Math.round((finalWeight / Math.pow(height / 100, 2)) * 10) / 10;
      
      // Calculate wellness score with some variation
      const baseWellnessScore = profile.wellnessScore?.overall || 89;
      const wellnessVariation = Math.floor(Math.random() * 10) - 5;
      const wellnessScore = Math.max(0, Math.min(100, baseWellnessScore + wellnessVariation));
      
      const entry = {
        userId: userId,
        recordedAt: date,
        createdAt: date,
        period: {
          type: 'daily',
          startDate: date,
          endDate: date
        },
        metrics: {
          weight: {
            value: finalWeight,
            normalizedValue: finalWeight,
            unit: 'kg'
          },
          bmi: {
            value: bmi,
            category: bmi < 18.5 ? 'underweight' : 
                      bmi < 25 ? 'normal' : 
                      bmi < 30 ? 'overweight' : 'obese'
          },
          wellnessScore: {
            overall: wellnessScore,
            components: {
              bmi: Math.min(25, Math.round(25 * (1 - Math.abs(bmi - 22) / 10))),
              activity: 20 + Math.floor(Math.random() * 5),
              progress: 20 + Math.floor(Math.random() * 5),
              habits: 19 + Math.floor(Math.random() * 6)
            }
          }
        },
        activity: {
          weeklyFrequency: 3 + Math.floor(Math.random() * 3),
          averageDuration: 30 + Math.floor(Math.random() * 30),
          primaryTypes: ['cardio', 'strength']
        },
        lifestyle: {
          sleepHours: 7 + Math.random() * 2,
          stressLevel: 3 + Math.floor(Math.random() * 3),
          hydrationLevel: 'adequate'
        },
        goalsProgress: {
          primaryGoal: profile.fitnessGoals?.primary || 'weight_loss',
          targetWeight: targetWeight,
          currentWeight: finalWeight,
          progressPercentage: Math.round(((currentWeight - finalWeight) / (currentWeight - targetWeight)) * 100)
        },
        aggregates: {
          avgWeight: finalWeight,
          avgBMI: bmi,
          avgWellnessScore: wellnessScore,
          totalWorkouts: Math.floor((30 - daysAgo) / 7) * 3,
          avgSleepHours: 7.5,
          avgStressLevel: 4
        }
      };
      
      historyEntries.push(entry);
    }
    
    // Insert all entries
    const inserted = await HealthHistory.insertMany(historyEntries);
    console.log(`✅ Successfully created ${inserted.length} history entries`);
    
    // Show the trend
    const firstWeight = historyEntries[0].metrics.weight.value;
    const lastWeight = historyEntries[historyEntries.length - 1].metrics.weight.value;
    const change = lastWeight - firstWeight;
    
    console.log('\nCreated weight trend:');
    console.log(`  Start (30 days ago): ${firstWeight} kg`);
    console.log(`  Current: ${lastWeight} kg`);
    console.log(`  Total change: ${change > 0 ? '+' : ''}${change.toFixed(1)} kg`);
    console.log(`  Average weekly: ${(change / 4.3).toFixed(2)} kg/week`);
    
    // Display sample of created data
    console.log('\nSample data points:');
    historyEntries.slice(0, 5).forEach(entry => {
      console.log(`  ${entry.recordedAt.toISOString().split('T')[0]}: ${entry.metrics.weight.value} kg`);
    });
    
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

// Run the script
seedHealthHistory();

/**
 * Usage:
 * 
 * # Add to existing history
 * node scripts/seedHealthHistory.js
 * 
 * # Clear existing and create new
 * node scripts/seedHealthHistory.js --clear
 * 
 * This creates realistic weight progression data:
 * - Entries every 3 days for the past 30 days
 * - Gradual weight change (2.5 kg loss or 1.5 kg gain per month)
 * - Daily variations (±0.3 kg) for realism
 * - Corresponding BMI calculations
 * - Wellness score variations
 * - Activity and lifestyle metrics
 */