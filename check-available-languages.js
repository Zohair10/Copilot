async function checkAvailableLanguages() {
  try {
    const response = await fetch('http://localhost:3001/api/languages');
    const data = await response.json();
    
    console.log('=== RAW AVAILABLE LANGUAGES ===');
    data.available_languages.forEach((lang, i) => {
      console.log(`${i+1}. "${lang}"`);
    });
    
    console.log('\n=== DUPLICATES CHECK ===');
    const counts = {};
    data.available_languages.forEach(lang => {
      const lower = lang.toLowerCase();
      counts[lower] = (counts[lower] || 0) + 1;
    });
    
    const duplicates = Object.entries(counts).filter(([, count]) => count > 1);
    
    if (duplicates.length > 0) {
      console.log('Found duplicates:');
      duplicates.forEach(([lower, count]) => {
        console.log(`  ${lower}: appears ${count} times`);
        // Show actual variants
        const variants = data.available_languages.filter(lang => lang.toLowerCase() === lower);
        console.log(`    Variants: ${variants.join(', ')}`);
      });
    } else {
      console.log('No duplicates found!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAvailableLanguages();
