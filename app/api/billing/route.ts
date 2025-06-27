import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const client = await clientPromise;
    const db = client.db("GitHubCopilotData");
    
    // Check if billing collection exists
    const collections = await db.listCollections().toArray();
    const billingCollection = collections.find(c => c.name === "BillingSeats");
    
    if (!billingCollection) {
      return NextResponse.json({
        message: 'No billing data available - BillingSeats collection not found',
        total_cost: 0,
        breakdown: [],
        cost_per_user: 0,
        users_count: 0,
        period: {
          start: null,
          end: null
        }
      });
    }

    const collection = db.collection("BillingSeats");
    const data = await collection.find({}, { projection: { _id: 0 } }).sort({ created_at: -1 }).toArray();

    if (data.length === 0) {
      return NextResponse.json({ 
        message: 'BillingSeats collection exists but contains no data',
        total_cost: 0,
        breakdown: [],
        cost_per_user: 0,
        users_count: 0,
        period: {
          start: null,
          end: null
        }
      });
    }

    // Filter out users with invalid/missing data and process billing data for charts
    const filteredData = data.filter(seat => {
      // Exclude users with missing assignee data
      const hasValidAssignee = seat.assignee && seat.assignee.login && seat.assignee.id;
      // Exclude users with 'N/A' or 'Unknown' values
      const hasValidLogin = seat.assignee?.login && 
                           seat.assignee.login.toLowerCase() !== 'unknown' && 
                           seat.assignee.login.toLowerCase() !== 'n/a';
      
      return hasValidAssignee && hasValidLogin;
    });
    
    // Function to normalize plan types
    const normalizePlanType = (planType: string): string => {
      if (!planType) return 'unknown';
      const lowerPlanType = planType.toLowerCase();
      // Merge 'business' and 'copilot_business' into 'business'
      if (lowerPlanType === 'copilot_business' || lowerPlanType === 'copilot business') {
        return 'business';
      }
      return planType;
    };
    
    const processedData = filteredData.map(seat => ({
      created_at: new Date(seat.created_at).toISOString().split('T')[0],
      updated_at: seat.updated_at ? new Date(seat.updated_at).toISOString().split('T')[0] : null,
      assignee_login: seat.assignee?.login || 'Unknown',
      assignee_id: seat.assignee?.id || 0,
      plan_type: normalizePlanType(seat.plan_type || 'unknown'),
      last_activity_at: seat.last_activity_at ? new Date(seat.last_activity_at).toISOString().split('T')[0] : null,
      last_activity_editor: seat.last_activity_editor || 'unknown'
    }));

    // Group by creation date
    const creationDateCounts: { [key: string]: number } = {};
    const planTypeCounts: { [key: string]: number } = {};
    const editorCounts: { [key: string]: number } = {};
    // Track plan purchases by date and plan type
    const planPurchasesByDate: { [key: string]: { [planType: string]: number } } = {};

    processedData.forEach(seat => {
      // Count by creation date
      if (!creationDateCounts[seat.created_at]) {
        creationDateCounts[seat.created_at] = 0;
      }
      creationDateCounts[seat.created_at]++;

      // Count by plan type (using normalized plan type)
      const normalizedPlanType = seat.plan_type; // Already normalized in processedData
      if (!planTypeCounts[normalizedPlanType]) {
        planTypeCounts[normalizedPlanType] = 0;
      }
      planTypeCounts[normalizedPlanType]++;

      // Count by last activity editor
      if (seat.last_activity_editor && seat.last_activity_editor !== 'unknown') {
        if (!editorCounts[seat.last_activity_editor]) {
          editorCounts[seat.last_activity_editor] = 0;
        }
        editorCounts[seat.last_activity_editor]++;
      }
      
      // Track plan purchases by date and plan type (using normalized plan type)
      if (!planPurchasesByDate[seat.created_at]) {
        planPurchasesByDate[seat.created_at] = {};
      }
      if (!planPurchasesByDate[seat.created_at][normalizedPlanType]) {
        planPurchasesByDate[seat.created_at][normalizedPlanType] = 0;
      }
      planPurchasesByDate[seat.created_at][normalizedPlanType]++;
    });

    // Convert to chart format
    const creationTimelineData = Object.entries(creationDateCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // Process plan purchases by date
    const planPurchaseData = Object.entries(planPurchasesByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, planCounts]) => ({
        date,
        ...planCounts
      }));

    const charts = {
      "billing_timeline": {
        "data": creationTimelineData,
        "title": "Seat Creation Timeline"
      },
      "plan_types": {
        "data": planTypeCounts,
        "title": "Distribution by Plan Type"
      },
      "activity_editors": {
        "data": editorCounts,
        "title": "Last Activity by Editor"
      },
      "plan_purchases": {
        "data": planPurchaseData,
        "title": "Plan Purchases by Date"
      },
      "seat_details": {
        "data": processedData,
        "title": "Billing Seat Details"
      },
      "raw_data": processedData,
      "total_seats": filteredData.length,
      "plan_purchases_timeline": {
        "data": Object.entries(planPurchasesByDate).map(([date, planTypes]) => ({
          date,
          ...planTypes
        })),
        "title": "Plan Purchases by Date"
      }
    };

    return NextResponse.json(charts);
  } catch (error) {
    console.error('Error fetching billing data:', error);
    return NextResponse.json({ error: 'Failed to fetch billing data' }, { status: 500 });
  }
}
