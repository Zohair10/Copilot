// Script to check copilot_ide_chat.editors data structure
import { MongoClient } from 'mongodb';
import { config } from 'dotenv';

config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/';

async function checkChatData() {
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db("GitHubCopilotData");
    const metricsCollection = db.collection("GetMetricsData");
    
    // Check the structure of a few records to understand copilot_ide_chat
    console.log('\n=== EXAMINING COPILOT IDE CHAT DATA STRUCTURE ===');
    const sampleRecords = await metricsCollection.find({}).limit(3).toArray();
    
    sampleRecords.forEach((record, index) => {
      console.log(`\n--- Record ${index + 1} (Date: ${record.date}) ---`);
      
      if (record.copilot_ide_chat) {
        console.log('copilot_ide_chat structure:');
        console.log('Keys:', Object.keys(record.copilot_ide_chat));
        
        if (record.copilot_ide_chat.editors) {
          console.log('\nEditors data:');
          console.log('Editors available:', Object.keys(record.copilot_ide_chat.editors));
          
          // Show structure for each editor
          Object.entries(record.copilot_ide_chat.editors).forEach(([editorName, editorData]) => {
            console.log(`\n${editorName}:`, editorData);
          });
        } else {
          console.log('No editors data found in copilot_ide_chat');
        }
      } else {
        console.log('No copilot_ide_chat data found');
      }
    });
    
    // Count records with copilot_ide_chat.editors data
    console.log('\n=== AVAILABILITY ANALYSIS ===');
    const totalRecords = await metricsCollection.countDocuments({});
    const recordsWithChatData = await metricsCollection.countDocuments({ 
      "copilot_ide_chat.editors": { $exists: true, $ne: null } 
    });
    
    console.log(`Total records: ${totalRecords}`);
    console.log(`Records with copilot_ide_chat.editors: ${recordsWithChatData}`);
    
    // Get all dates with chat data
    const chatDataRecords = await metricsCollection.find({ 
      "copilot_ide_chat.editors": { $exists: true, $ne: null } 
    }, { 
      projection: { date: 1, "copilot_ide_chat.editors": 1, _id: 0 } 
    }).sort({ date: 1 }).toArray();
    
    console.log('\nDates with chat data:');
    chatDataRecords.forEach((record, index) => {
      const editorsCount = Object.keys(record.copilot_ide_chat.editors).length;
      console.log(`${index + 1}. ${record.date} (${editorsCount} editors)`);
    });
    
    // Sample calculation for one record
    if (chatDataRecords.length > 0) {
      const sampleRecord = chatDataRecords[0];
      console.log(`\n=== SAMPLE CALCULATION FOR ${sampleRecord.date} ===`);
      
      Object.entries(sampleRecord.copilot_ide_chat.editors).forEach(([editorName, editorData]) => {
        const totalChats = editorData.total_chats || 0;
        const totalEngagedUsers = editorData.total_engaged_users || 0;
        const averagePrompts = totalEngagedUsers > 0 ? (totalChats / totalEngagedUsers).toFixed(2) : 0;
        
        console.log(`${editorName}:`);
        console.log(`  - Total Chats: ${totalChats}`);
        console.log(`  - Total Engaged Users: ${totalEngagedUsers}`);
        console.log(`  - Average Prompts per User: ${averagePrompts}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('\nMongoDB connection closed');
  }
}

checkChatData().catch(console.error);
