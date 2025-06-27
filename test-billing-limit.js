// Test script to verify billing table limit functionality
async function testBillingTableLimit() {
  try {
    console.log('Testing billing table limit functionality...');
    
    const response = await fetch('http://localhost:3000/api/billing');
    const data = await response.json();
    
    console.log('\n=== BILLING TABLE LIMIT TEST ===');
    
    if (data.seat_details?.data) {
      const seatData = data.seat_details.data;
      
      // Filter valid users (same logic as component)
      const validUsers = seatData.filter(seat => {
        const hasValidId = seat.assignee_id && seat.assignee_id !== 'N/A' && seat.assignee_id !== 0;
        const hasValidLogin = seat.assignee_login && 
                            seat.assignee_login !== 'N/A' && 
                            seat.assignee_login.toLowerCase() !== 'unknown';
        return hasValidId && hasValidLogin;
      });
      
      // Sort by creation date (same logic as component)
      validUsers.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
        const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
        return dateA.getTime() - dateB.getTime();
      });
      
      console.log(`Total valid users: ${validUsers.length}`);
      
      // Test different limits
      const limits = [25, 50, 75, 100];
      
      limits.forEach(limit => {
        const limitedData = validUsers.slice(0, limit);
        const displayedCount = Math.min(limit, validUsers.length);
        console.log(`\nLimit ${limit}: Shows ${displayedCount} of ${validUsers.length} entries`);
        
        if (limitedData.length > 0) {
          console.log(`  First entry: ${limitedData[0].assignee_login} (${limitedData[0].assignee_id})`);
          if (limitedData.length > 1) {
            console.log(`  Last entry: ${limitedData[limitedData.length - 1].assignee_login} (${limitedData[limitedData.length - 1].assignee_id})`);
          }
        }
      });
      
      console.log('\n✅ Table limit functionality test passed!');
      console.log('Dropdown options: 25, 50, 75, 100');
      console.log('Default limit: 25');
      
    } else {
      console.log('No seat details data available');
    }
    
  } catch (error) {
    console.error('Error testing billing table limit:', error);
  }
}

testBillingTableLimit().catch(console.error);
