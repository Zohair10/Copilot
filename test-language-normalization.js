async function testLanguageNormalization() {
  console.log('🧪 Testing Language Normalization at API Level...\n');
  
  try {
    const response = await fetch('http://localhost:3001/api/languages');
    const data = await response.json();
    
    console.log('=== AVAILABLE LANGUAGES (After Normalization) ===');
    if (data.available_languages) {
      console.log(`Total languages: ${data.available_languages.length}`);
      console.log('Languages list:');
      data.available_languages.forEach((lang, index) => {
        console.log(`  ${index + 1}. ${lang}`);
      });
      
      // Check for case duplicates
      const lowerCaseCheck = new Set();
      const duplicates = [];
      
      data.available_languages.forEach(lang => {
        const lower = lang.toLowerCase();
        if (lowerCaseCheck.has(lower)) {
          duplicates.push(lang);
        } else {
          lowerCaseCheck.add(lower);
        }
      });
      
      if (duplicates.length === 0) {
        console.log('\n✅ No case-sensitive duplicates found!');
      } else {
        console.log('\n❌ Found case-sensitive duplicates:', duplicates);
      }
    }
    
    console.log('\n=== TOP LANGUAGES (After Normalization) ===');
    if (data.top_languages?.data) {
      const originalData = data.top_languages.data;
      console.log('Top languages data:', originalData);
      
      const totalEntries = Object.keys(originalData).length;
      console.log(`\nTotal language entries in top languages: ${totalEntries}`);
      
      // Check for common duplicates
      const hasJS = 'javascript' in originalData || 'JavaScript' in originalData;
      const hasTS = 'typescript' in originalData || 'TypeScript' in originalData;
      const hasPython = 'python' in originalData || 'Python' in originalData;
      
      console.log(`JavaScript variants: ${hasJS ? 'Found' : 'Not found'}`);
      console.log(`TypeScript variants: ${hasTS ? 'Found' : 'Not found'}`);
      console.log(`Python variants: ${hasPython ? 'Found' : 'Not found'}`);
    }
    
    console.log('\n=== DAILY LANGUAGES SAMPLE ===');
    if (data.languages_daily?.data) {
      const dailyData = data.languages_daily.data;
      console.log(`Total daily records: ${dailyData.length}`);
      
      // Get unique languages from daily data
      const uniqueLanguagesInDaily = new Set(dailyData.map(item => item.language));
      console.log(`Unique languages in daily data: ${uniqueLanguagesInDaily.size}`);
      
      // Show first few records
      console.log('\nFirst 10 daily records:');
      dailyData.slice(0, 10).forEach((record, index) => {
        console.log(`  ${index + 1}. ${record.date} - ${record.language} (${record.total_engaged_users} users)`);
      });
    }
    
    console.log('\n🎉 Language normalization test completed!');
    
  } catch (error) {
    console.error('❌ Error testing language normalization:', error);
  }
}

testLanguageNormalization();
