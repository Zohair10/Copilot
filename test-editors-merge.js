async function testEditorsMerge() {
  try {
    console.log('Testing VS Code editor merge...');
    
    const response = await fetch('http://localhost:3000/api/editors');
    const data = await response.json();
    
    console.log('\n=== EDITORS SUMMARY ===');
    console.log(`Total editors: ${data.available_editors?.length || 0}`);
    console.log('Available editors:', data.available_editors?.join(', ') || 'None');
    
    // Check VS Code data specifically
    const vsCodeData = data.editors_daily?.data?.filter(item => item.editor === 'VS Code') || [];
    console.log(`\nVS Code daily entries: ${vsCodeData.length}`);
    
    if (vsCodeData.length > 0) {
      const totalEngagedUsers = vsCodeData.reduce((sum, item) => sum + item.total_engaged_users, 0);
      console.log(`VS Code total engaged users across all dates: ${totalEngagedUsers}`);
      
      // Show first few entries
      console.log('\nFirst 5 VS Code entries:');
      vsCodeData.slice(0, 5).forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.date} - Engaged Users: ${item.total_engaged_users}, Acceptances: ${item.total_code_acceptances}`);
      });
    }
    
    // Check if there are any remaining vscode entries (there shouldn't be)
    const vscodeData = data.editors_daily?.data?.filter(item => item.editor === 'vscode') || [];
    console.log(`\nRemaining 'vscode' entries (should be 0): ${vscodeData.length}`);
    
  } catch (error) {
    console.error('Error testing editors merge:', error);
  }
}

testEditorsMerge();
