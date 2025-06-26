'use client';

import { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Line, Pie } from 'react-chartjs-2';
import Link from 'next/link';
import styles from '../components/Dashboard.module.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

export default function LanguagesPage() {
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [availableOptions, setAvailableOptions] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = '/api/languages';
      if (selectedFilters.length > 0) {
        const params = new URLSearchParams();
        selectedFilters.forEach(filter => params.append('languages', filter));
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url);
      const result = await response.json();
      setData(result);
      
      if (result.available_languages) {
        setAvailableOptions(result.available_languages);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setData({ error: 'Failed to fetch data' });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    fetchData();
  };

  const clearFilters = () => {
    setSelectedFilters([]);
    fetchData();
  };

  const handleFilterChange = (option: string, checked: boolean) => {
    if (checked) {
      setSelectedFilters([...selectedFilters, option]);
    } else {
      setSelectedFilters(selectedFilters.filter(f => f !== option));
    }
  };

  const colors = {
    primary: [
      '#FF5733', '#33C1FF', '#28A745', '#FFC300', '#C70039',
      '#8E44AD', '#FF33F6', '#00FFB3', '#FF8C00', '#1ABC9C',
      '#E67E22', '#2ECC71', '#F39C12', '#9B59B6', '#34495E'
    ],
    secondary: [
      'rgba(255, 87, 51, 0.2)', 'rgba(51, 193, 255, 0.2)', 'rgba(40, 167, 69, 0.2)',
      'rgba(255, 195, 0, 0.2)', 'rgba(199, 0, 57, 0.2)', 'rgba(142, 68, 173, 0.2)',
      'rgba(255, 51, 246, 0.2)', 'rgba(0, 255, 179, 0.2)', 'rgba(255, 140, 0, 0.2)',
      'rgba(26, 188, 156, 0.2)', 'rgba(230, 126, 34, 0.2)', 'rgba(46, 204, 113, 0.2)',
      'rgba(243, 156, 18, 0.2)', 'rgba(155, 89, 182, 0.2)', 'rgba(52, 73, 94, 0.2)'
    ]
  };

  const createLineChart = (chartData: any[], xKey: string, yKeys: string[]) => {
    if (!chartData || chartData.length === 0) return null;

    const datasets = yKeys.map((key, index) => ({
      label: key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
      data: chartData.map(item => item[key] || 0),
      borderColor: colors.primary[index % colors.primary.length],
      backgroundColor: colors.secondary[index % colors.secondary.length],
      tension: 0.1,
    }));

    return {
      labels: chartData.map(item => item[xKey]),
      datasets,
    };
  };

  const createPieChart = (pieData: any) => {
    if (!pieData || typeof pieData !== 'object') return null;

    const labels = Object.keys(pieData);
    const values = Object.values(pieData) as number[];

    return {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors.primary.slice(0, labels.length),
        borderColor: colors.primary.slice(0, labels.length),
        borderWidth: 2,
      }],
    };
  };

  return (
    <div className={styles.container}>
      <h1>Programming Languages Analytics</h1>
      
      <div className={styles.buttonContainer}>
        <Link href="/" className={styles.button}>Dashboard</Link>
        <Link href="/organization" className={styles.button}>Organization</Link>
        <Link href="/editors" className={styles.button}>Editors</Link>
        <Link href="/billing" className={styles.button}>Billing</Link>
        <Link href="/tables" className={styles.button}>Tables</Link>
      </div>

      <div className={styles.filterContainer}>
        <div className={styles.filterTitle}>
          Filter Languages ({availableOptions.length} available)
        </div>
        <div className={styles.multiSelect}>
          {availableOptions.map(option => (
            <div key={option} className={styles.checkboxItem}>
              <input
                type="checkbox"
                id={option}
                checked={selectedFilters.includes(option)}
                onChange={(e) => handleFilterChange(option, e.target.checked)}
              />
              <label htmlFor={option}>{option}</label>
            </div>
          ))}
        </div>
        <div className={styles.filterButtons}>
          <button onClick={applyFilters} className={styles.filterBtn}>
            Apply Filters
          </button>
          <button onClick={clearFilters} className={styles.clearBtn}>
            Clear All
          </button>
        </div>
      </div>

      <div className={styles.dataContainer}>
        {loading && <div className={styles.loading}>Loading languages data...</div>}
        
        {data.error && <div className={styles.error}>Error: {data.error}</div>}

        {data.languages_daily && (
          <div className={styles.chartSection}>
            <h3>Languages Usage (Daily)</h3>
            <div className={styles.chartContainer}>
              {(() => {
                const chartData = createLineChart(
                  data.languages_daily.data,
                  'date',
                  ['total_engaged_users', 'total_code_acceptances', 'total_code_suggestions']
                );
                return chartData ? <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false }} /> : null;
              })()}
            </div>
          </div>
        )}

        {data.top_languages && (
          <div className={styles.chartSection}>
            <h3>Top Programming Languages</h3>
            <div className={styles.chartContainer}>
              {(() => {
                const chartData = createPieChart(data.top_languages.data);
                return chartData ? <Pie data={chartData} options={{ responsive: true, maintainAspectRatio: false }} /> : null;
              })()}
            </div>
          </div>
        )}

        {data.languages_weekly && (
          <div className={styles.chartSection}>
            <h3>Languages Usage (Last 7 Days)</h3>
            <div className={styles.chartContainer}>
              {(() => {
                const chartData = createLineChart(
                  data.languages_weekly.data,
                  'week',
                  ['total_engaged_users', 'total_code_acceptances', 'total_code_suggestions']
                );
                return chartData ? <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false }} /> : null;
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
