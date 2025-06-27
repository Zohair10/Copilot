'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from '../styles/professional.module.css';

export default function TablesPage() {
  const [activeTable, setActiveTable] = useState<string>('organization');
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData(activeTable);
  }, [activeTable]);

  const fetchData = async (type: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/${type}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching data:', error);
      setData({ error: 'Failed to fetch data' });
    } finally {
      setLoading(false);
    }
  };

  const renderTable = (tableData: any[], title: string, keys: string[]) => {
    if (!tableData || tableData.length === 0) return null;

    return (
      <div className={styles.chartSection}>
        <h3>{title}</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa' }}>
                {keys.map(key => (
                  <th key={key} style={{ 
                    padding: '12px 8px', 
                    border: '1px solid #ddd', 
                    textAlign: 'left',
                    fontWeight: 'bold',
                    backgroundColor: '#4F8BF9',
                    color: 'white'
                  }}>
                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.slice(0, 100).map((row, index) => (
                <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white' }}>
                  {keys.map(key => (
                    <td key={key} style={{ 
                      padding: '8px', 
                      border: '1px solid #ddd',
                      fontSize: '14px'
                    }}>
                      {typeof row[key] === 'object' ? JSON.stringify(row[key]) : String(row[key] || '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {tableData.length > 100 && (
            <p style={{ marginTop: '10px', fontStyle: 'italic', color: '#666' }}>
              Showing first 100 rows of {tableData.length} total rows
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderOrganizationTables = () => {
    const tables = [];

    if (data.active_vs_engaged_daily?.data) {
      tables.push(renderTable(
        data.active_vs_engaged_daily.data,
        'Active vs Engaged Users (Daily)',
        ['date', 'total_active_users', 'total_engaged_users']
      ));
    }

    if (data.active_vs_engaged_weekly?.data) {
      tables.push(renderTable(
        data.active_vs_engaged_weekly.data,
        'Active vs Engaged Users (Last 7 Days)',
        ['week', 'total_active_users', 'total_engaged_users']
      ));
    }

    if (data.features_daily?.data) {
      tables.push(renderTable(
        data.features_daily.data,
        'Features Usage (Daily)',
        ['date', 'IDE_Chat', 'Dotcom_Chat', 'Pull_Request', 'Code_Completion']
      ));
    }

    if (data.features_weekly?.data) {
      tables.push(renderTable(
        data.features_weekly.data,
        'Features Usage (Last 7 Days)',
        ['week', 'IDE_Chat', 'Dotcom_Chat', 'Pull_Request', 'Code_Completion']
      ));
    }

    return tables;
  };

  const renderLanguagesTables = () => {
    const tables = [];

    if (data.languages_daily?.data) {
      tables.push(renderTable(
        data.languages_daily.data,
        'Languages Usage (Daily)',
        ['date', 'language', 'total_engaged_users', 'total_code_acceptances', 'total_code_suggestions']
      ));
    }

    if (data.languages_weekly?.data) {
      tables.push(renderTable(
        data.languages_weekly.data,
        'Languages Usage (Last 7 Days)',
        ['week', 'language', 'total_engaged_users', 'total_code_acceptances', 'total_code_suggestions']
      ));
    }

    return tables;
  };

  const renderEditorsTables = () => {
    const tables = [];

    if (data.editors_daily?.data) {
      tables.push(renderTable(
        data.editors_daily.data,
        'Editors Usage (Daily)',
        ['date', 'editor', 'total_engaged_users', 'total_code_acceptances', 'total_code_suggestions', 'total_chat_acceptances', 'total_chat_turns']
      ));
    }

    if (data.editors_weekly?.data) {
      tables.push(renderTable(
        data.editors_weekly.data,
        'Editors Usage (Last 7 Days)',
        ['week', 'editor', 'total_engaged_users', 'total_code_acceptances', 'total_code_suggestions', 'total_chat_acceptances', 'total_chat_turns']
      ));
    }

    return tables;
  };

  const renderBillingTables = () => {
    const tables = [];

    if (data.raw_data) {
      tables.push(renderTable(
        data.raw_data,
        'Billing Seats Data',
        ['created_at', 'updated_at', 'assignee_login', 'assignee_id', 'plan_type', 'last_activity_at', 'last_activity_editor']
      ));
    }

    if (data.billing_timeline?.data) {
      tables.push(renderTable(
        data.billing_timeline.data,
        'Seat Creation Timeline',
        ['date', 'count']
      ));
    }

    return tables;
  };

  const renderTables = () => {
    if (loading) return <div className={styles.loading}>Loading {activeTable} data...</div>;
    if (data.error) return <div className={styles.error}>Error: {data.error}</div>;

    switch (activeTable) {
      case 'organization':
        return renderOrganizationTables();
      case 'languages':
        return renderLanguagesTables();
      case 'editors':
        return renderEditorsTables();
      case 'billing':
        return renderBillingTables();
      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
      <h1>Data Tables</h1>
      
      <div className={styles.buttonContainer}>
        <Link href="/" className={styles.button}>Dashboard</Link>
        <Link href="/organization" className={styles.button}>Organization</Link>
        <Link href="/languages" className={styles.button}>Languages</Link>
        <Link href="/editors" className={styles.button}>Editors</Link>
        <Link href="/billing" className={styles.button}>Billing</Link>
      </div>

      <div className={styles.buttonContainer}>
        <button
          onClick={() => setActiveTable('organization')}
          className={`${styles.button} ${activeTable === 'organization' ? styles.active : ''}`}
        >
          Organization Tables
        </button>
        <button
          onClick={() => setActiveTable('languages')}
          className={`${styles.button} ${activeTable === 'languages' ? styles.active : ''}`}
        >
          Languages Tables
        </button>
        <button
          onClick={() => setActiveTable('editors')}
          className={`${styles.button} ${activeTable === 'editors' ? styles.active : ''}`}
        >
          Editors Tables
        </button>
        <button
          onClick={() => setActiveTable('billing')}
          className={`${styles.button} ${activeTable === 'billing' ? styles.active : ''}`}
        >
          Billing Tables
        </button>
      </div>

      <div className={styles.dataContainer}>
        {renderTables()}
      </div>
    </div>
  );
}
