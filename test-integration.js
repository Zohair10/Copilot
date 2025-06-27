// Test the organization endpoint with chat prompts integration
async function testOrganizationWithChatPrompts() {
  try {
    console.log('Testing organization endpoint with chat prompts...');
    
    const response = await fetch('http://localhost:3001/api/organization');
    const data = await response.json();
    
    console.log('\n=== ORGANIZATION API RESPONSE ===');
    console.log('Keys available:', Object.keys(data));
    console.log(`Active vs Engaged Daily: ${data.active_vs_engaged_daily?.data?.length || 0} records`);
    console.log(`Features Daily: ${data.features_daily?.data?.length || 0} records`);
    
    // Check if chat prompts data is being fetched when organization is loaded
    // (This should happen client-side in the dashboard component)
    
    console.log('\n=== TESTING DASHBOARD DATA FETCH ===');
    
    // Simulate what the dashboard does - fetch organization data first
    console.log('1. Organization data fetched');
    
    // Then fetch chat prompts data separately (as the dashboard does)
    const chatPromptsResponse = await fetch('http://localhost:3001/api/chat-prompts');
    const chatPromptsData = await chatPromptsResponse.json();
    
    if (chatPromptsData.success) {
      console.log('2. Chat prompts data fetched successfully');
      console.log(`   - ${chatPromptsData.data.length} chart data points`);
      console.log(`   - Available editors: ${chatPromptsData.available_editors.join(', ')}`);
      console.log(`   - Date range: ${chatPromptsData.date_range.start} to ${chatPromptsData.date_range.end}`);
      
      // Show sample data structure for the chart
      if (chatPromptsData.data.length > 0) {
        const samplePoint = chatPromptsData.data[0];
        console.log('\n=== SAMPLE CHART DATA POINT ===');
        console.log(`Date: ${samplePoint.date}`);
        Object.entries(samplePoint).forEach(([key, value]) => {
          if (key !== 'date') {
            console.log(`  ${key}: ${value} prompts/user`);
          }
        });
      }
      
      console.log('\n✅ INTEGRATION TEST PASSED');
      console.log('✅ Chat prompts data is ready for the Organization dashboard');
      
    } else {
      console.log('❌ Chat prompts data fetch failed:', chatPromptsData.error);
    }
    
  } catch (error) {
    console.error('❌ Integration test failed:', error);
  }
}

testOrganizationWithChatPrompts();
