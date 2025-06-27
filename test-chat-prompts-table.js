// Test script to verify chat prompts table shows all editors
async function testChatPromptsTable() {
  try {
    console.log('Testing chat prompts table data...');
    
    const response = await fetch('http://localhost:3000/api/chat-prompts');
    const data = await response.json();
    
    console.log('\n=== CHAT PROMPTS TABLE TEST ===');
    
    if (data.success) {
      console.log(`✅ API call successful`);
      
      // Check chart data format
      if (data.data) {
        console.log(`\n📊 CHART DATA (data):`);
        console.log(`- Records: ${data.data.length}`);
        if (data.data.length > 0) {
          const sampleChart = data.data[0];
          console.log('- Sample chart record structure:');
          Object.keys(sampleChart).forEach(key => {
            console.log(`  ${key}: ${sampleChart[key]}`);
          });
        }
      }
      
      // Check raw data format (what table should use)
      if (data.raw_data) {
        console.log(`\n📋 TABLE DATA (raw_data):`);
        console.log(`- Records: ${data.raw_data.length}`);
        
        // Count records per editor
        const editorCounts = {};
        data.raw_data.forEach(record => {
          editorCounts[record.editor] = (editorCounts[record.editor] || 0) + 1;
        });
        
        console.log('- Records per editor:');
        Object.entries(editorCounts).forEach(([editor, count]) => {
          console.log(`  ${editor}: ${count} records`);
        });
        
        // Show sample records
        console.log('\n- Sample table records:');
        data.raw_data.slice(0, 5).forEach((record, index) => {
          console.log(`  ${index + 1}. ${record.date} | ${record.editor} | ${record.average_prompts_per_user} prompts/user`);
        });
      }
      
      // Check available editors
      if (data.available_editors) {
        console.log(`\n🎯 AVAILABLE EDITORS:`);
        console.log(`- Total: ${data.available_editors.length}`);
        console.log(`- List: ${data.available_editors.join(', ')}`);
      }
      
      // Verification
      const hasMultipleEditors = data.available_editors && data.available_editors.length > 1;
      const rawDataHasAllEditors = data.raw_data && 
        data.available_editors.every(editor => 
          data.raw_data.some(record => record.editor === editor)
        );
      
      console.log('\n=== VERIFICATION ===');
      if (hasMultipleEditors) {
        console.log('✅ Multiple editors available in API');
      } else {
        console.log('❌ Only one or no editors found');
      }
      
      if (rawDataHasAllEditors) {
        console.log('✅ Raw data contains all available editors');
        console.log('✅ Table will now show data for all editors');
      } else {
        console.log('❌ Raw data missing some editors');
      }
      
      console.log('\n📝 CHANGE MADE:');
      console.log('- Table now uses: tabData.chat_prompts.raw_data');
      console.log('- Instead of: tabData.chat_prompts.data');
      console.log('- This ensures all editor data is visible in the table');
      
    } else {
      console.log('❌ API call failed:', data.error);
    }
    
  } catch (error) {
    console.error('Error testing chat prompts table:', error);
  }
}

testChatPromptsTable().catch(console.error);
