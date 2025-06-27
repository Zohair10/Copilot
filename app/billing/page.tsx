'use client';

import { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import Link from 'next/link';
import styles from '../styles/professional.module.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement);

export default function BillingPage() {
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/billing');
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

  const createLineChart = (chartData: any[], xKey: string, yKey: string) => {
    if (!chartData || chartData.length === 0) return null;

    return {
      labels: chartData.map(item => item[xKey]),
      datasets: [{
        label: 'Seats Created',
        data: chartData.map(item => item[yKey] || 0),
        borderColor: colors.primary[0],
        backgroundColor: colors.secondary[0],
        tension: 0.1,
      }],
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
      <h1>Billing & Seat Management</h1>
      
      <div className={styles.buttonContainer}>
        <Link href="/" className={styles.button}>Dashboard</Link>
        <Link href="/organization" className={styles.button}>Organization</Link>
        <Link href="/languages" className={styles.button}>Languages</Link>
        <Link href="/editors" className={styles.button}>Editors</Link>
        <Link href="/tables" className={styles.button}>Tables</Link>
      </div>

      <div className={styles.dataContainer}>
        {loading && <div className={styles.loading}>Loading billing data...</div>}
        
        {data.error && <div className={styles.error}>Error: {data.error}</div>}

        {data.total_seats && (
          <div className={styles.chartSection}>
            <h3>Total Seats: {data.total_seats}</h3>
          </div>
        )}

        {data.billing_timeline && (
          <div className={styles.chartSection}>
            <h3>Seat Creation Timeline</h3>
            <div className={styles.chartContainer}>
              {(() => {
                const chartData = createLineChart(
                  data.billing_timeline.data,
                  'date',
                  'count'
                );
                return chartData ? <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false }} /> : null;
              })()}
            </div>
          </div>
        )}

        {data.plan_types && (
          <div className={styles.chartSection}>
            <h3>Distribution by Plan Type</h3>
            <div className={styles.chartContainer}>
              {(() => {
                const chartData = createPieChart(data.plan_types.data);
                return chartData ? <Pie data={chartData} options={{ responsive: true, maintainAspectRatio: false }} /> : null;
              })()}
            </div>
          </div>
        )}

        {data.activity_editors && (
          <div className={styles.chartSection}>
            <h3>Last Activity by Editor</h3>
            <div className={styles.chartContainer}>
              {(() => {
                const chartData = createPieChart(data.activity_editors.data);
                return chartData ? <Pie data={chartData} options={{ responsive: true, maintainAspectRatio: false }} /> : null;
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
