// Test script to verify chart data format
console.log('Testing date conversion...');

const testData = [
  { date: '2025-05-15', value: 10 },
  { date: '2025-05-16', value: 15 },
  { date: '2025-05-17', value: 20 }
];

console.log('Original data:', testData);

const labels = testData.map(item => {
  const dateValue = item.date;
  if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}/)) {
    return new Date(dateValue);
  }
  return dateValue;
});

console.log('Converted labels:', labels);
console.log('Labels as strings:', labels.map(l => l.toString()));
