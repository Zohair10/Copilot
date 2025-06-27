// Test the new chat prompts API
async function testChatPromptsAPI() {
  try {
    console.log('Testing chat prompts API...');
    
    const response = await fetch('http://localhost:3001/api/chat-prompts');
    const data = await response.json();
    
    if (data.success) {
      console.log('\n=== API RESPONSE SUCCESS ===');
      console.log(`Total records processed: ${data.total_records}`);
      console.log(`Available editors: ${data.available_editors.join(', ')}`);
      console.log(`Date range: ${data.date_range.start} to ${data.date_range.end}`);
      console.log(`Chart data points: ${data.data.length}`);
      
      console.log('\n=== FIRST 5 CHART DATA POINTS ===');
      data.data.slice(0, 5).forEach((item, index) => {
        console.log(`${index + 1}. ${item.date}:`);
        Object.entries(item).forEach(([key, value]) => {
          if (key !== 'date') {
            console.log(`   ${key}: ${value} prompts/user`);
          }
        });
      });
      
      console.log('\n=== SAMPLE RAW DATA (First 10) ===');
      data.raw_data.slice(0, 10).forEach((item, index) => {
        console.log(`${index + 1}. ${item.date} - ${item.editor}: ${item.total_chats} chats / ${item.total_engaged_users} users = ${item.average_prompts_per_user} prompts/user`);
      });
      
    } else {
      console.log('API Error:', data.error);
      if (data.details) {
        console.log('Details:', data.details);
      }
    }
    
  } catch (error) {
    console.error('Error testing chat prompts API:', error);
  }
}

testChatPromptsAPI();
