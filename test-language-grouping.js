async function testLanguageData() {
  try {
    console.log('Testing updated language data grouping...');
    
    const response = await fetch('http://localhost:3000/api/languages');
    const data = await response.json();
    
    console.log('\n=== ORIGINAL TOP LANGUAGES DATA ===');
    if (data.top_languages?.data) {
      const originalData = data.top_languages.data;
      console.log('Original data:', originalData);
      
      // Simulate the updated createPieData function logic
      const normalizedData = {};
      
      Object.entries(originalData).forEach(([language, value]) => {
        const normalizedName = language.toLowerCase();
        
        // Normalize language names (now including Others)
        let finalName = language;
        if (normalizedName === 'javascript') finalName = 'JavaScript';
        else if (normalizedName === 'typescript') finalName = 'TypeScript';
        else if (normalizedName === 'python') finalName = 'Python';
        else if (normalizedName === 'java') finalName = 'Java';
        else if (normalizedName === 'others') finalName = 'Others'; // Keep existing Others
        else if (normalizedName === 'json') finalName = 'JSON';
        
        if (!normalizedData[finalName]) {
          normalizedData[finalName] = 0;
        }
        normalizedData[finalName] += value;
      });
      
      const entries = Object.entries(normalizedData);
      const total = entries.reduce((sum, [, value]) => sum + value, 0);
      
      console.log(`\n=== NORMALIZED DATA ===`);
      console.log(`Total after normalization: ${total}`);
      
      // Define the top 4 languages that should be shown individually
      const topLanguagesToShow = ['Java', 'JavaScript', 'TypeScript', 'Python'];
      
      const mainLanguages = [];
      const languagesToGroup = [];
      
      entries.forEach(([language, value]) => {
        const percentage = ((value / total) * 100).toFixed(1);
        console.log(`  ${language}: ${value} (${percentage}%)`);
        
        if (topLanguagesToShow.includes(language)) {
          mainLanguages.push([language, value]);
        } else {
          languagesToGroup.push([language, value]);
        }
      });
      
      // Sort main languages
      mainLanguages.sort(([, a], [, b]) => b - a);
      
      console.log(`\n=== FINAL PIE CHART DATA ===`);
      console.log(`Top 4 languages shown individually:`);
      mainLanguages.forEach(([lang, val]) => {
        const pct = ((val / total) * 100).toFixed(1);
        console.log(`  - ${lang}: ${val} (${pct}%)`);
      });
      
      if (languagesToGroup.length > 0) {
        const othersTotal = languagesToGroup.reduce((sum, [, val]) => sum + val, 0);
        const othersPct = ((othersTotal / total) * 100).toFixed(1);
        const uniqueLanguagesCount = languagesToGroup.filter(([lang]) => lang !== 'Others').length;
        const hasExistingOthers = languagesToGroup.some(([lang]) => lang === 'Others');
        
        console.log(`\nCombined Others section: ${othersTotal} (${othersPct}%)`);
        console.log('Languages included in Others:');
        languagesToGroup.forEach(([lang, val]) => {
          const pct = ((val / total) * 100).toFixed(1);
          console.log(`  - ${lang}: ${val} (${pct}%)`);
        });
        
        if (hasExistingOthers) {
          console.log(`\n✅ Includes existing "Others" category from API!`);
        }
        console.log(`Total unique languages in Others: ${uniqueLanguagesCount}${hasExistingOthers ? ' + existing Others group' : ''}`);
      } else {
        console.log('\nNo "Others" group needed - only top 4 languages');
      }
      
    } else {
      console.log('No top languages data available');
    }
    
  } catch (error) {
    console.error('Error testing language data:', error);
  }
}

testLanguageData();
