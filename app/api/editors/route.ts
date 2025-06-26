import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db("GitHubCopilotData");
    const collection = db.collection("GetMetricsData");

    // Get query parameters for editor filtering
    const { searchParams } = new URL(request.url);
    const selectedEditors = searchParams.getAll('editors');

    const data = await collection.find({}, { projection: { _id: 0 } }).sort({ date: 1 }).toArray();

    if (data.length === 0) {
      return NextResponse.json({ error: 'No data found' });
    }

    // Process editor data
    const editorsData: any[] = [];
    const allEditors = new Set<string>();

    data.forEach(item => {
      const date = new Date(item.date).toISOString().split('T')[0];
      
      // Extract editors from copilot_ide_code_completions
      if (item.copilot_ide_code_completions?.editors) {
        item.copilot_ide_code_completions.editors.forEach((editorItem: any) => {
          if (editorItem.name) {
            allEditors.add(editorItem.name);
            
            // Filter by selected editors if specified
            if (selectedEditors.length === 0 || selectedEditors.includes(editorItem.name)) {
              // Calculate total suggestions and acceptances for this editor
              let totalSuggestions = 0;
              let totalAcceptances = 0;
              
              if (editorItem.models) {
                editorItem.models.forEach((model: any) => {
                  if (model.languages) {
                    model.languages.forEach((lang: any) => {
                      totalSuggestions += lang.total_code_suggestions || 0;
                      totalAcceptances += lang.total_code_acceptances || 0;
                    });
                  }
                });
              }

              editorsData.push({
                date,
                editor: editorItem.name,
                total_engaged_users: editorItem.total_engaged_users || 0,
                total_code_acceptances: totalAcceptances,
                total_code_suggestions: totalSuggestions,
                total_chat_acceptances: 0, // Not available in current data structure
                total_chat_turns: 0 // Not available in current data structure
              });
            }
          }
        });
      }
    });

    // Create weekly aggregation
    const weeklyEditors: { [key: string]: any } = {};
    editorsData.forEach(item => {
      const date = new Date(item.date);
      const year = date.getFullYear();
      const weekNumber = getWeekNumber(date);
      const weekKey = `${year}-W${weekNumber.toString().padStart(2, '0')}-${item.editor}`;
      
      if (!weeklyEditors[weekKey]) {
        weeklyEditors[weekKey] = {
          week: getStartOfWeek(date).toISOString().split('T')[0],
          editor: item.editor,
          total_engaged_users: 0,
          total_code_acceptances: 0,
          total_code_suggestions: 0,
          total_chat_acceptances: 0,
          total_chat_turns: 0
        };
      }
      
      weeklyEditors[weekKey].total_engaged_users += item.total_engaged_users;
      weeklyEditors[weekKey].total_code_acceptances += item.total_code_acceptances;
      weeklyEditors[weekKey].total_code_suggestions += item.total_code_suggestions;
      weeklyEditors[weekKey].total_chat_acceptances += item.total_chat_acceptances;
      weeklyEditors[weekKey].total_chat_turns += item.total_chat_turns;
    });

    // Get top editors
    const editorTotals: { [key: string]: number } = {};
    editorsData.forEach(item => {
      if (!editorTotals[item.editor]) {
        editorTotals[item.editor] = 0;
      }
      editorTotals[item.editor] += item.total_engaged_users;
    });

    const sortedEditors = Object.entries(editorTotals)
      .sort(([,a], [,b]) => b - a);
    
    const topEditorsData: { [key: string]: number } = {};
    sortedEditors.forEach(([editor, count]) => {
      topEditorsData[editor] = count;
    });

    const charts = {
      "editors_daily": {
        "data": editorsData,
        "title": "Editor Usage (Daily)"
      },
      "editors_weekly": {
        "data": Object.values(weeklyEditors),
        "title": "Editor Usage (Last 7 Days)"
      },
      "top_editors": {
        "data": topEditorsData,
        "title": "Top Editors by Engaged Users"
      },
      "available_editors": Array.from(allEditors).sort()
    };

    return NextResponse.json(charts);
  } catch (error) {
    console.error('Error fetching editors data:', error);
    return NextResponse.json({ error: 'Failed to fetch editors data' }, { status: 500 });
  }
}

function getWeekNumber(date: Date): number {
  const startDate = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
  return Math.ceil(days / 7);
}

function getStartOfWeek(date: Date): Date {
  const day = date.getDay();
  const diff = date.getDate() - day;
  return new Date(date.setDate(diff));
}
