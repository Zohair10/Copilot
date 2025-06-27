import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db("GitHubCopilotData");
    const collection = db.collection("GetMetricsData");

    // Get query parameters for date filtering
    const { searchParams } = new URL(request.url);
    const days = searchParams.get('days');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let dateFilter: any = {};
    if (days) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(days));
      dateFilter = { date: { $gte: daysAgo } };
    } else if (startDate && endDate) {
      dateFilter = {
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    const data = await collection.find(dateFilter, { projection: { _id: 0 } }).sort({ date: 1 }).toArray();

    if (data.length === 0) {
      return NextResponse.json({ error: 'No data found for the specified date range' });
    }

    // Process daily data and fill gaps
    const rawDailyData = data.map(item => ({
      date: new Date(item.date).toISOString().split('T')[0],
      total_active_users: item.total_active_users || 0,
      total_engaged_users: item.total_engaged_users || 0
    }));

    // Fill missing dates with zero values
    const dailyData = fillMissingDates(rawDailyData);

    // Process weekly data
    const weeklyData: { [key: string]: any } = {};
    data.forEach(item => {
      const date = new Date(item.date);
      const year = date.getFullYear();
      const weekNumber = getWeekNumber(date);
      const weekKey = `${year}-W${weekNumber.toString().padStart(2, '0')}`;
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          week: getStartOfWeek(date).toISOString().split('T')[0],
          total_active_users: 0,
          total_engaged_users: 0
        };
      }
      
      weeklyData[weekKey].total_active_users += item.total_active_users || 0;
      weeklyData[weekKey].total_engaged_users += item.total_engaged_users || 0;
    });

    // Process features data
    const rawFeaturesData = data.map(item => {
      // Sum up engaged users from all editors for code completions
      const codeCompletionUsers = item.copilot_ide_code_completions?.editors?.reduce((sum: number, editor: any) => {
        return sum + (editor.total_engaged_users || 0);
      }, 0) || 0;

      return {
        date: new Date(item.date).toISOString().split('T')[0],
        IDE_Chat: item.copilot_ide_chat?.total_engaged_users || 0,
        Dotcom_Chat: item.copilot_dotcom_chat?.total_engaged_users || 0,
        Pull_Request: item.copilot_dotcom_pull_requests?.total_engaged_users || 0,
        Code_Completion: codeCompletionUsers
      };
    });

    // Fill missing dates for features data
    const featuresData = fillMissingFeaturesData(rawFeaturesData);

    // Process weekly features data
    const weeklyFeaturesData: { [key: string]: any } = {};
    featuresData.forEach(item => {
      const date = new Date(item.date);
      const year = date.getFullYear();
      const weekNumber = getWeekNumber(date);
      const weekKey = `${year}-W${weekNumber.toString().padStart(2, '0')}`;
      
      if (!weeklyFeaturesData[weekKey]) {
        weeklyFeaturesData[weekKey] = {
          week: getStartOfWeek(date).toISOString().split('T')[0],
          IDE_Chat: 0,
          Dotcom_Chat: 0,
          Pull_Request: 0,
          Code_Completion: 0
        };
      }
      
      weeklyFeaturesData[weekKey].IDE_Chat += item.IDE_Chat;
      weeklyFeaturesData[weekKey].Dotcom_Chat += item.Dotcom_Chat;
      weeklyFeaturesData[weekKey].Pull_Request += item.Pull_Request;
      weeklyFeaturesData[weekKey].Code_Completion += item.Code_Completion;
    });

    const charts = {
      "active_vs_engaged_daily": {
        "data": dailyData,
        "title": "Active vs Engaged Users (Daily)"
      },
      "active_vs_engaged_weekly": {
        "data": Object.values(weeklyData),
        "title": "Active vs Engaged Users (Last 7 Days)"
      },
      "features_daily": {
        "data": featuresData,
        "title": "Engaged Users per Feature (Daily)"
      },
      "features_weekly": {
        "data": Object.values(weeklyFeaturesData),
        "title": "Engaged Users per Feature (Last 7 Days)"
      }
    };

    return NextResponse.json(charts);
  } catch (error) {
    console.error('Error fetching organization data:', error);
    return NextResponse.json({ error: 'Failed to fetch organization data' }, { status: 500 });
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

function fillMissingDates(data: any[]): any[] {
  if (data.length === 0) return data;
  
  const result = [];
  const sortedData = data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  let currentDate = new Date(sortedData[0].date);
  const endDate = new Date(sortedData[sortedData.length - 1].date);
  
  let dataIndex = 0;
  
  while (currentDate <= endDate) {
    const currentDateStr = currentDate.toISOString().split('T')[0];
    
    // Check if we have data for this date
    if (dataIndex < sortedData.length && sortedData[dataIndex].date === currentDateStr) {
      result.push(sortedData[dataIndex]);
      dataIndex++;
    } else {
      // Fill missing date with zero values
      result.push({
        date: currentDateStr,
        total_active_users: 0,
        total_engaged_users: 0
      });
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return result;
}

function fillMissingFeaturesData(data: any[]): any[] {
  if (data.length === 0) return data;
  
  const result = [];
  const sortedData = data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  let currentDate = new Date(sortedData[0].date);
  const endDate = new Date(sortedData[sortedData.length - 1].date);
  
  let dataIndex = 0;
  
  while (currentDate <= endDate) {
    const currentDateStr = currentDate.toISOString().split('T')[0];
    
    // Check if we have data for this date
    if (dataIndex < sortedData.length && sortedData[dataIndex].date === currentDateStr) {
      result.push(sortedData[dataIndex]);
      dataIndex++;
    } else {
      // Fill missing date with zero values
      result.push({
        date: currentDateStr,
        IDE_Chat: 0,
        Dotcom_Chat: 0,
        Pull_Request: 0,
        Code_Completion: 0
      });
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return result;
}
