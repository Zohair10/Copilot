async function testEditorsData() {
  try {
    console.log('Testing editors data structure...');
    
    const response = await fetch('http://localhost:3000/api/editors');
    const data = await response.json();
    
    console.log('\n=== TOP EDITORS DATA ===');
    if (data.top_editors?.data) {
      const editorsData = data.top_editors.data;
      console.log('Original editors data:', editorsData);
      
      const entries = Object.entries(editorsData);
      const total = entries.reduce((sum, [, value]) => sum + value, 0);
      
      console.log(`Total engaged users across all editors: ${total}`);
      console.log('\nEditor breakdown:');
      
      // Sort by value descending
      entries.sort(([, a], [, b]) => b - a);
      
      entries.forEach(([editor, value], index) => {
        const percentage = ((value / total) * 100).toFixed(1);
        console.log(`  ${index + 1}. ${editor}: ${value} (${percentage}%)`);
      });
      
      console.log(`\n=== ANALYSIS ===`);
      console.log(`Total editors: ${entries.length}`);
      console.log('All editors should be shown individually in pie chart');
      
    } else {
      console.log('No top editors data available');
    }
    
    console.log('\n=== AVAILABLE EDITORS ===');
    if (data.available_editors) {
      console.log('Available editors list:', data.available_editors);
      console.log(`Total available editors: ${data.available_editors.length}`);
    }
    
  } catch (error) {
    console.error('Error testing editors data:', error);
  }
}

testEditorsData();
