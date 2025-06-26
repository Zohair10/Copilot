// This script fetches GitHub Copilot billing data and stores it in MongoDB
// Run with: node scripts/fetch-billing.js

import { MongoClient } from 'mongodb';
import { config } from 'dotenv';

config();

const url = process.env.GITHUB_BILLING_URL;
const token = process.env.GITHUB_TOKEN;
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/';

if (!url || !token) {
  console.error('Please set GITHUB_BILLING_URL and GITHUB_TOKEN in your .env file');
  process.exit(1);
}

async function fetchBillingData() {
  const headers = {
    "Authorization": `Bearer ${token}`
  };

  try {
    console.log('Fetching billing data from GitHub API...');
    const response = await fetch(url, { headers });
    
    if (response.status !== 200) {
      throw new Error(`GitHub API returned ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    console.log("Total seats:", data.total_seats);
    
    const seats = data.seats || [];
    
    console.log('Connecting to MongoDB...');
    const client = new MongoClient(mongoUri);
    await client.connect();
    
    const db = client.db("GitHubCopilotData");
    const collection = db.collection("BillingSeats");

    let newCount = 0;
    let updateCount = 0;

    for (const seat of seats) {
      const createdAt = seat.created_at;
      const assignee = seat.assignee || {};
      const assigneeId = assignee.id;
      const updatedAt = seat.updated_at;
      const planType = seat.plan_type;
      const lastActivityAt = seat.last_activity_at;
      const lastActivityEditor = seat.last_activity_editor;

      // Check for existing record with same created_at and assignee.id
      const duplicate = await collection.findOne({
        "created_at": createdAt,
        "assignee.id": assigneeId
      });

      if (!duplicate) {
        // No record with same created_at and id, insert new
        await collection.insertOne(seat);
        console.log(`Inserted new seat with created_at: ${createdAt}, id: ${assigneeId}`);
        newCount++;
      } else {
        // Record exists, check if any relevant field has changed
        const needsUpdate = (
          duplicate.updated_at !== updatedAt ||
          duplicate.plan_type !== planType ||
          duplicate.last_activity_at !== lastActivityAt ||
          duplicate.last_activity_editor !== lastActivityEditor
        );

        if (needsUpdate) {
          await collection.updateOne(
            { "_id": duplicate._id },
            {
              "$set": {
                "updated_at": updatedAt,
                "plan_type": planType,
                "last_activity_at": lastActivityAt,
                "last_activity_editor": lastActivityEditor
              }
            }
          );
          console.log(`Updated seat for id: ${assigneeId} at created_at: ${createdAt}`);
          updateCount++;
        } else {
          console.log(`No change for seat with created_at: ${createdAt}, id: ${assigneeId}`);
        }
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

fetchBillingData();
