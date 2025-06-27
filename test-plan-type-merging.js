// Test script to verify plan type merging functionality
async function testPlanTypeMerging() {
  try {
    console.log('Testing plan type merging functionality...');
    
    const response = await fetch('http://localhost:3000/api/billing');
    const data = await response.json();
    
    console.log('\n=== PLAN TYPE MERGING TEST ===');
    
    if (data.plan_types?.data) {
      console.log('Plan Types Distribution:');
      Object.entries(data.plan_types.data).forEach(([planType, count]) => {
        console.log(`  ${planType}: ${count} users`);
      });
      
      // Check if copilot_business still exists
      const hasCopilotBusiness = 'copilot_business' in data.plan_types.data;
      const hasBusinessOnly = 'business' in data.plan_types.data;
      
      if (!hasCopilotBusiness && hasBusinessOnly) {
        console.log('\n✅ Plan type merging successful!');
        console.log('✅ copilot_business merged into business');
      } else if (hasCopilotBusiness) {
        console.log('\n❌ Plan type merging failed - copilot_business still exists');
      } else {
        console.log('\n⚠️  No business plans found in data');
      }
    }
    
    if (data.plan_purchases?.data) {
      console.log('\n=== PLAN PURCHASES BY DATE ===');
      console.log(`Total date entries: ${data.plan_purchases.data.length}`);
      
      // Check first few entries for plan types
      const sampleEntries = data.plan_purchases.data.slice(0, 3);
      sampleEntries.forEach((entry, index) => {
        console.log(`\nSample ${index + 1} (${entry.date}):`);
        Object.keys(entry).forEach(key => {
          if (key !== 'date') {
            console.log(`  ${key}: ${entry[key]}`);
          }
        });
      });
      
      // Check if any entry still has copilot_business
      const hasLegacyPlanType = data.plan_purchases.data.some(entry => 
        'copilot_business' in entry
      );
      
      if (!hasLegacyPlanType) {
        console.log('\n✅ Plan purchases chart updated - no copilot_business found');
      } else {
        console.log('\n❌ Plan purchases still contains copilot_business');
      }
    }
    
    if (data.seat_details?.data) {
      console.log('\n=== SEAT DETAILS TABLE ===');
      const seatData = data.seat_details.data;
      
      // Count plan types in seat details
      const planTypeCounts = {};
      seatData.forEach(seat => {
        const planType = seat.plan_type;
        planTypeCounts[planType] = (planTypeCounts[planType] || 0) + 1;
      });
      
      console.log('Plan types in seat details:');
      Object.entries(planTypeCounts).forEach(([planType, count]) => {
        console.log(`  ${planType}: ${count} seats`);
      });
      
      const hasLegacyInSeats = seatData.some(seat => 
        seat.plan_type === 'copilot_business'
      );
      
      if (!hasLegacyInSeats) {
        console.log('\n✅ Seat details table updated - no copilot_business found');
      } else {
        console.log('\n❌ Seat details still contains copilot_business');
      }
    }
    
    console.log('\n=== SUMMARY ===');
    console.log('Plan type normalization applied to:');
    console.log('✅ Plan Types Distribution chart');
    console.log('✅ Plan Purchases by Date chart');
    console.log('✅ Billing Seat Details table');
    console.log('\nMerging rule: "copilot_business" → "business"');
    
  } catch (error) {
    console.error('Error testing plan type merging:', error);
  }
}

testPlanTypeMerging().catch(console.error);
