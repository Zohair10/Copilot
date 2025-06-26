// This script fetches GitHub Copilot metrics data and stores it in MongoDB
// Run with: node scripts/fetch-metrics.js

import { MongoClient } from 'mongodb';
import { config } from 'dotenv';

config();

const url = process.env.GITHUB_METRICS_URL;
const token = process.env.GITHUB_TOKEN;
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/';

if (!url || !token) {
  console.error('Please set GITHUB_BILLING_URL and GITHUB_TOKEN in your .env file');
  process.exit(1);
}

async function fetchMetricsData() {
  const headers = {
    "Authorization": `Bearer ${token}`
  };

  try {
    console.log('Fetching data from GitHub API...');
    const response = await fetch(url, { headers });
    
    if (response.status !== 200) {
      throw new Error(`GitHub API returned ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    
    console.log('Connecting to MongoDB...');
    const client = new MongoClient(mongoUri);
    await client.connect();
    
    const db = client.db("GitHubCopilotData");
    const collection = db.collection("GetMetricsData");

    // Ensure a unique index on 'date'
    await collection.createIndex("date", { unique: true });

    let newCount = 0;
    let updateCount = 0;

    if (Array.isArray(data)) {
      for (const record of data) {
        const result = await collection.updateOne(
          { date: record.date },
          { $set: record },
          { upsert: true }
        );
        
        if (result.upsertedCount > 0) {
          newCount++;
          console.log(`Inserted new record for date: ${record.date}`);
        } else if (result.modifiedCount > 0) {
          updateCount++;
          console.log(`Updated record for date: ${record.date}`);
        }
      }
    } else {
      const result = await collection.updateOne(
        { date: data.date },
        { $set: data },
        { upsert: true }
      );
      
      if (result.upsertedCount > 0) {
        newCount++;
        console.log(`Inserted new record for date: ${data.date}`);
      } else if (result.modifiedCount > 0) {
        updateCount++;
        console.log(`Updated record for date: ${data.date}`);
      }
    }

    console.log(`\nSummary:`);
    console.log(`- Inserted ${newCount} new records`);
    console.log(`- Updated ${updateCount} existing records`);
    
    await client.close();
    console.log('MongoDB connection closed');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

fetchMetricsData();
