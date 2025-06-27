// Test script to check billing data filtering for N/A and Unknown users
async function testBillingFiltering() {
  try {
    console.log('Testing billing data filtering...');
    
    const response = await fetch('http://localhost:3000/api/billing');
    const data = await response.json();
    
    console.log('\n=== BILLING DATA FILTERING TEST ===');
    
    if (data.seat_details?.data) {
      const seatData = data.seat_details.data;
      console.log(`Total seats in response: ${seatData.length}`);
      
      // Check for any users with N/A or Unknown values
      const invalidUsers = seatData.filter(seat => {
        const hasInvalidId = !seat.assignee_id || seat.assignee_id === 'N/A' || seat.assignee_id === 0;
        const hasInvalidLogin = !seat.assignee_login || 
                              seat.assignee_login === 'N/A' || 
                              seat.assignee_login.toLowerCase() === 'unknown';
        return hasInvalidId || hasInvalidLogin;
      });
      
      console.log(`Users with N/A or Unknown values: ${invalidUsers.length}`);
      
      if (invalidUsers.length > 0) {
        console.log('\nInvalid users found:');
        invalidUsers.forEach((user, index) => {
          console.log(`${index + 1}. ID: ${user.assignee_id}, Login: ${user.assignee_login}`);
        });
      } else {
        console.log('✅ No users with N/A or Unknown values found - filtering is working!');
      }
      
      // Show sample of valid users
      const validUsers = seatData.filter(seat => {
        const hasValidId = seat.assignee_id && seat.assignee_id !== 'N/A' && seat.assignee_id !== 0;
        const hasValidLogin = seat.assignee_login && 
                            seat.assignee_login !== 'N/A' && 
                            seat.assignee_login.toLowerCase() !== 'unknown';
        return hasValidId && hasValidLogin;
      });
      
      console.log(`\nValid users: ${validUsers.length}`);
      console.log('Sample of valid users:');
      validUsers.slice(0, 5).forEach((user, index) => {
        console.log(`${index + 1}. ID: ${user.assignee_id}, Login: ${user.assignee_login}, Plan: ${user.plan_type}`);
      });
      
    } else {
      console.log('No seat details data available');
    }
    
    console.log(`\n=== TOTAL SEATS ===`);
    console.log(`API total_seats: ${data.total_seats}`);
    console.log(`Raw data length: ${data.raw_data?.length || 0}`);
    
  } catch (error) {
    console.error('Error testing billing filtering:', error);
  }
}

testBillingFiltering().catch(console.error);
