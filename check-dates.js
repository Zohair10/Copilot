// Script to check all available dates in the database and API responses
import { MongoClient } from 'mongodb';
import { config } from 'dotenv';

config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/';

async function checkDates() {
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db("GitHubCopilotData");
    
    // Check GetMetricsData collection
    console.log('\n=== METRICS DATA DATES ===');
    const metricsCollection = db.collection("GetMetricsData");
    const metricsData = await metricsCollection.find({}, { 
      projection: { date: 1, _id: 0 } 
    }).sort({ date: 1 }).toArray();
    
    console.log(`Total metrics records: ${metricsData.length}`);
    console.log('Available dates:');
    metricsData.forEach((record, index) => {
      console.log(`${index + 1}. ${record.date}`);
    });
    
    // Check BillingSeats collection
    console.log('\n=== BILLING DATA DATES ===');
    const billingCollection = db.collection("BillingSeats");
    const billingData = await billingCollection.aggregate([
      {
        $group: {
          _id: { $substr: ["$created_at", 0, 10] },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]).toArray();
    
    console.log(`Total billing date groups: ${billingData.length}`);
    console.log('Available billing dates:');
    billingData.forEach((record, index) => {
      console.log(`${index + 1}. ${record._id} (${record.count} seats)`);
    });
    
    // Test API endpoints
    console.log('\n=== TESTING API ENDPOINTS ===');
    
    // Test organization endpoint
    try {
      const orgResponse = await fetch('http://localhost:3000/api/organization');
      const orgData = await orgResponse.json();
      
      console.log('\nOrganization API Response:');
      console.log(`- Daily data points: ${orgData.active_vs_engaged_daily?.data?.length || 0}`);
      console.log(`- Weekly data points: ${orgData.active_vs_engaged_weekly?.data?.length || 0}`);
      
      if (orgData.active_vs_engaged_daily?.data?.length > 0) {
        console.log('Daily dates:');
        orgData.active_vs_engaged_daily.data.forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.date} - Active: ${item.total_active_users}, Engaged: ${item.total_engaged_users}`);
        });
      }
      
      if (orgData.active_vs_engaged_weekly?.data?.length > 0) {
        console.log('Weekly dates:');
        orgData.active_vs_engaged_weekly.data.forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.week} - Active: ${item.total_active_users}, Engaged: ${item.total_engaged_users}`);
        });
      }
    } catch (error) {
      console.log('Organization API error:', error.message);
    }
    
    // Test languages endpoint
    try {
      const langResponse = await fetch('http://localhost:3000/api/languages');
      const langData = await langResponse.json();
      
      console.log('\nLanguages API Response:');
      console.log(`- Daily data points: ${langData.languages_daily?.data?.length || 0}`);
      console.log(`- Weekly data points: ${langData.languages_weekly?.data?.length || 0}`);
      console.log(`- Available languages: ${langData.available_languages?.length || 0}`);
      
      if (langData.available_languages?.length > 0) {
        console.log('Available languages:', langData.available_languages.join(', '));
      }
      
      // Show unique dates from language data
      if (langData.languages_daily?.data?.length > 0) {
        const uniqueDates = [...new Set(langData.languages_daily.data.map(item => item.date))].sort();
        console.log('Unique dates in language data:');
        uniqueDates.forEach((date, index) => {
          console.log(`  ${index + 1}. ${date}`);
        });
      }
    } catch (error) {
      console.log('Languages API error:', error.message);
    }
    
    // Test editors endpoint
    try {
      const editorsResponse = await fetch('http://localhost:3000/api/editors');
      const editorsData = await editorsResponse.json();
      
      console.log('\nEditors API Response:');
      console.log(`- Daily data points: ${editorsData.editors_daily?.data?.length || 0}`);
      console.log(`- Weekly data points: ${editorsData.editors_weekly?.data?.length || 0}`);
      console.log(`- Available editors: ${editorsData.available_editors?.length || 0}`);
      
      if (editorsData.available_editors?.length > 0) {
        console.log('Available editors:', editorsData.available_editors.join(', '));
      }
      
      // Show unique dates from editors data
      if (editorsData.editors_daily?.data?.length > 0) {
        const uniqueDates = [...new Set(editorsData.editors_daily.data.map(item => item.date))].sort();
        console.log('Unique dates in editor data:');
        uniqueDates.forEach((date, index) => {
          console.log(`  ${index + 1}. ${date}`);
        });
      }
    } catch (error) {
      console.log('Editors API error:', error.message);
    }
    
    // Test billing endpoint
    try {
      const billingResponse = await fetch('http://localhost:3000/api/billing');
      const billingApiData = await billingResponse.json();
      
      console.log('\nBilling API Response:');
      console.log(`- Chart data points: ${billingApiData.data?.length || 0}`);
      console.log(`- Total seats: ${billingApiData.seats?.length || 0}`);
      console.log(`- Plan types: ${billingApiData.plan_types?.length || 0}`);
      
      if (billingApiData.plan_types?.length > 0) {
        console.log('Plan types:', billingApiData.plan_types.join(', '));
      }
      
      if (billingApiData.data?.length > 0) {
        console.log('Billing chart dates:');
        billingApiData.data.forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.date}`);
        });
      }
    } catch (error) {
      console.log('Billing API error:', error.message);
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\nMongoDB connection closed');
  }
}

checkDates().catch(console.error);