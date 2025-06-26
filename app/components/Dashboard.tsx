'use client';

import { useState, useEffect } from 'react';
import styles from './Dashboard.module.css';

interface OrganizationData {
  active_vs_engaged_daily: {
    data: Array<{
      date: string;
      total_active_users: number;
      total_engaged_users: number;
    }>;
    title: string;
  };
  features_daily: {
    data: Array<{
      date: string;
      IDE_Chat: number;
      Dotcom_Chat: number;
      Pull_Request: number;
      Code_Completion: number;
    }>;
    title: string;
  };
}

interface LanguagesData {
  languages_daily: {
    data: Array<{
      date: string;
      language: string;
      total_engaged_users: number;
      total_code_acceptances: number;
      total_code_suggestions: number;
    }>;
    title: string;
  };
  top_languages: {
    data: Record<string, number>;
    title: string;
  };
  available_languages: string[];
}

interface EditorsData {
  editors_daily: {
    data: Array<{
      date: string;
      editor: string;
      total_engaged_users: number;
      total_code_acceptances: number;
      total_code_suggestions: number;
    }>;
    title: string;
  };
  top_editors: {
    data: Record<string, number>;
    title: string;
  };
  available_editors: string[];
}

export default function Dashboard() {
  const [organizationData, setOrganizationData] = useState<OrganizationData | null>(null);
  const [languagesData, setLanguagesData] = useState<LanguagesData | null>(null);
  const [editorsData, setEditorsData] = useState<EditorsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTables, setShowTables] = useState(false);
  const [showRawData, setShowRawData] = useState(false);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        
        const [orgRes, langRes, editRes] = await Promise.all([
          fetch('/api/organization'),
          fetch('/api/languages'),
          fetch('/api/editors')
        ]);

        if (!orgRes.ok || !langRes.ok || !editRes.ok) {
          throw new Error('Failed to fetch data from APIs');
        }

        const orgData = await orgRes.json();
        const langData = await langRes.json();
        const editData = await editRes.json();

        setOrganizationData(orgData);
        setLanguagesData(langData);
        setEditorsData(editData);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  const renderTable = (data: any[], title: string, maxRows = 10) => {
    if (!data || data.length === 0) return null;
    
    const headers = Object.keys(data[0]);
    
    return (
      <div className={styles.tableContainer}>
        <h4>{title}</h4>
        <table className={styles.table}>
          <thead>
            <tr>
              {headers.map(header => (
                <th key={header}>{header.replace(/_/g, ' ').toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.slice(0, maxRows).map((row, index) => (
              <tr key={index}>
                {headers.map(header => (
                  <td key={header}>{row[header]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length > maxRows && (
          <p className={styles.tableNote}>Showing first {maxRows} of {data.length} records</p>
        )}
      </div>
    );
  };

  const renderBarChart = (data: Record<string, number>, title: string) => {
    const entries = Object.entries(data);
    if (entries.length === 0) return null;

    const maxValue = Math.max(...entries.map(([, value]) => value));

    return (
      <div className={styles.chartContainer}>
        <h4>{title}</h4>
        <div className={styles.barChart}>
          {entries.map(([key, value]) => (
            <div key={key} className={styles.barItem}>
              <div className={styles.barLabel}>{key}</div>
              <div className={styles.barWrapper}>
                <div 
                  className={styles.bar}
                  style={{ width: `${(value / maxValue) * 100}%` }}
                />
                <span className={styles.barValue}>{value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading GitHub Copilot analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Error: {error}</div>
        <button onClick={() => window.location.reload()} className={styles.button}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>GitHub Copilot Analytics Dashboard</h1>
        <div className={styles.controls}>
          <button 
            onClick={() => setShowTables(!showTables)}
            className={`${styles.button} ${showTables ? styles.active : ''}`}
          >
            {showTables ? 'Hide Tables' : 'Show Tables'}
          </button>
          <button 
            onClick={() => setShowRawData(!showRawData)}
            className={`${styles.button} ${showRawData ? styles.active : ''}`}
          >
            {showRawData ? 'Hide Raw Data' : 'Show Raw Data'}
          </button>
        </div>
      </div>

      {/* Organization Metrics */}
      <div className={styles.section}>
        <h2>📊 Organization Metrics</h2>
        
        {organizationData?.active_vs_engaged_daily && (
          <div className={styles.metrics}>
            <h3>{organizationData.active_vs_engaged_daily.title}</h3>
            <div className={styles.summary}>
              <div className={styles.stat}>
                <span className={styles.label}>Total Days:</span>
                <span className={styles.value}>{organizationData.active_vs_engaged_daily.data.length}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.label}>Latest Active Users:</span>
                <span className={styles.value}>
                  {organizationData.active_vs_engaged_daily.data[organizationData.active_vs_engaged_daily.data.length - 1]?.total_active_users || 0}
                </span>
              </div>
              <div className={styles.stat}>
                <span className={styles.label}>Latest Engaged Users:</span>
                <span className={styles.value}>
                  {organizationData.active_vs_engaged_daily.data[organizationData.active_vs_engaged_daily.data.length - 1]?.total_engaged_users || 0}
                </span>
              </div>
            </div>
            {showTables && renderTable(organizationData.active_vs_engaged_daily.data, "Daily Active vs Engaged Users")}
          </div>
        )}

        {organizationData?.features_daily && (
          <div className={styles.metrics}>
            <h3>{organizationData.features_daily.title}</h3>
            <div className={styles.summary}>
              <div className={styles.stat}>
                <span className={styles.label}>Code Completion Users (Latest):</span>
                <span className={styles.value}>
                  {organizationData.features_daily.data[organizationData.features_daily.data.length - 1]?.Code_Completion || 0}
                </span>
              </div>
            </div>
            {showTables && renderTable(organizationData.features_daily.data, "Daily Features Usage")}
          </div>
        )}
      </div>

      {/* Languages */}
      <div className={styles.section}>
        <h2>💻 Programming Languages</h2>
        
        {languagesData?.available_languages && languagesData.available_languages.length > 0 && (
          <div className={styles.summary}>
            <div className={styles.stat}>
              <span className={styles.label}>Languages Tracked:</span>
              <span className={styles.value}>{languagesData.available_languages.length}</span>
            </div>
            <div className={styles.languageList}>
              {languagesData.available_languages.join(', ')}
            </div>
          </div>
        )}

        {languagesData?.top_languages && Object.keys(languagesData.top_languages.data).length > 0 && 
          renderBarChart(languagesData.top_languages.data, languagesData.top_languages.title)
        }

        {languagesData?.languages_daily && showTables && 
          renderTable(languagesData.languages_daily.data, "Daily Language Usage", 20)
        }
      </div>

      {/* Editors */}
      <div className={styles.section}>
        <h2>🛠️ Code Editors</h2>
        
        {editorsData?.available_editors && editorsData.available_editors.length > 0 && (
          <div className={styles.summary}>
            <div className={styles.stat}>
              <span className={styles.label}>Editors Tracked:</span>
              <span className={styles.value}>{editorsData.available_editors.length}</span>
            </div>
            <div className={styles.editorList}>
              {editorsData.available_editors.join(', ')}
            </div>
          </div>
        )}

        {editorsData?.top_editors && Object.keys(editorsData.top_editors.data).length > 0 && 
          renderBarChart(editorsData.top_editors.data, editorsData.top_editors.title)
        }

        {editorsData?.editors_daily && showTables && 
          renderTable(editorsData.editors_daily.data, "Daily Editor Usage", 20)
        }
      </div>

      {/* Raw Data */}
      {showRawData && (
        <div className={styles.section}>
          <h2>🔍 Raw JSON Data</h2>
          <div className={styles.rawData}>
            <details>
              <summary>Organization Data</summary>
              <pre>{JSON.stringify(organizationData, null, 2)}</pre>
            </details>
            
            <details>
              <summary>Languages Data</summary>
              <pre>{JSON.stringify(languagesData, null, 2)}</pre>
            </details>
            
            <details>
              <summary>Editors Data</summary>
              <pre>{JSON.stringify(editorsData, null, 2)}</pre>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}
