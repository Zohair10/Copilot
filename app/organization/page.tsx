'use client';

import { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import Link from 'next/link';
import styles from '../components/Dashboard.module.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function OrganizationPage() {
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/organization');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching data:', error);
      setData({ error: 'Failed to fetch data' });
    } finally {
      setLoading(false);
    }
  };

  const colors = {
    primary: ['#FF5733', '#33C1FF', '#28A745', '#FFC300'],
    secondary: ['rgba(255, 87, 51, 0.2)', 'rgba(51, 193, 255, 0.2)', 'rgba(40, 167, 69, 0.2)', 'rgba(255, 195, 0, 0.2)']
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

  return (
    <div className={styles.container}>
      <h1>Organization Analytics</h1>
      
      <div className={styles.buttonContainer}>
        <Link href="/" className={styles.button}>Dashboard</Link>
        <Link href="/languages" className={styles.button}>Languages</Link>
        <Link href="/editors" className={styles.button}>Editors</Link>
        <Link href="/billing" className={styles.button}>Billing</Link>
        <Link href="/tables" className={styles.button}>Tables</Link>
      </div>

      <div className={styles.dataContainer}>
        {loading && <div className={styles.loading}>Loading organization data...</div>}
        
        {data.error && <div className={styles.error}>Error: {data.error}</div>}

        {data.active_vs_engaged_daily && (
          <div className={styles.chartSection}>
            <h3>Active vs Engaged Users (Daily)</h3>
            <div className={styles.chartContainer}>
              {(() => {
                const chartData = createLineChart(
                  data.active_vs_engaged_daily.data,
                  'date',
                  ['total_active_users', 'total_engaged_users']
                );
                return chartData ? <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false }} /> : null;
              })()}
            </div>
          </div>
        )}

        {data.active_vs_engaged_weekly && (
          <div className={styles.chartSection}>
            <h3>Active vs Engaged Users (Last 7 Days)</h3>
            <div className={styles.chartContainer}>
              {(() => {
                const chartData = createLineChart(
                  data.active_vs_engaged_weekly.data,
                  'week',
                  ['total_active_users', 'total_engaged_users']
                );
                return chartData ? <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false }} /> : null;
              })()}
            </div>
          </div>
        )}

        {data.features_daily && (
          <div className={styles.chartSection}>
            <h3>Features Usage (Daily)</h3>
            <div className={styles.chartContainer}>
              {(() => {
                const chartData = createLineChart(
                  data.features_daily.data,
                  'date',
                  ['IDE_Chat', 'Dotcom_Chat', 'Pull_Request', 'Code_Completion']
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
