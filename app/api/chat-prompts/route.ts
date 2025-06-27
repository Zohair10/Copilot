import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/';

interface ProcessedDataItem {
  date: string;
  editor: string;
  total_chats: number;
  total_engaged_users: number;
  average_prompts_per_user: number;
}

interface DateGroup {
  [editorName: string]: number;
}

interface DateGroups {
  [date: string]: DateGroup;
}

export async function GET() {
  try {
    const client = new MongoClient(mongoUri);
    await client.connect();
    
    const db = client.db("GitHubCopilotData");
    const collection = db.collection("GetMetricsData");
    
    // Get all records with copilot_ide_chat.editors data
    const chatRecords = await collection.find({
      "copilot_ide_chat.editors": { $exists: true, $ne: null }
    }, {
      projection: { 
        date: 1, 
        "copilot_ide_chat.editors": 1, 
        _id: 0 
      }
    }).sort({ date: 1 }).toArray();
    
    // Process the data to calculate average prompts per user for each editor on each date
    const processedData: ProcessedDataItem[] = [];
    const availableEditors = new Set<string>();
    
    chatRecords.forEach(record => {
      const date = record.date;
      const editors = record.copilot_ide_chat.editors;
      
      // Process each editor for this date
      Object.values(editors).forEach((editorData: any) => {
        const editorName = editorData.name;
        const totalChats = editorData.models?.[0]?.total_chats || 0;
        const totalEngagedUsers = editorData.total_engaged_users || 0;
        
        // Calculate average prompts per user (avoid division by zero)
        const averagePrompts = totalEngagedUsers > 0 ? totalChats / totalEngagedUsers : 0;
        
        // Normalize editor name (convert vscode to VS Code for consistency)
        const normalizedEditorName = editorName === 'vscode' ? 'VS Code' : editorName;
        
        availableEditors.add(normalizedEditorName);
        
        processedData.push({
          date,
          editor: normalizedEditorName,
          total_chats: totalChats,
          total_engaged_users: totalEngagedUsers,
          average_prompts_per_user: Math.round(averagePrompts * 100) / 100 // Round to 2 decimal places
        });
      });
    });
    
    // Group data by date for easier chart consumption
    const dateGroups: DateGroups = {};
    processedData.forEach(item => {
      if (!dateGroups[item.date]) {
        dateGroups[item.date] = {};
      }
      dateGroups[item.date][item.editor] = item.average_prompts_per_user;
    });
    
    // Convert to chart-friendly format
    const chartData = Object.entries(dateGroups).map(([date, editors]) => ({
      date,
      ...editors as DateGroup
    }));
    
    await client.close();
    
    return NextResponse.json({
      success: true,
      data: chartData,
      available_editors: Array.from(availableEditors).sort(),
      raw_data: processedData,
      total_records: chatRecords.length,
      date_range: {
        start: chatRecords[0]?.date,
        end: chatRecords[chatRecords.length - 1]?.date
      }
    });
    
  } catch (error) {
    console.error('Error fetching chat prompts data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch chat prompts data',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}
