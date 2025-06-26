'use client';

import { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import styles from '../styles/retro.module.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement);

interface TabData {
  [key: string]: any;
}

interface MetricItem {
  label: string;
  sublabel?: string;
  value: string | number;
}

interface SectionState {
  [key: string]: boolean;
}

interface TimePeriod {
  label: string;
  value: string;
  getDates: (data: any[]) => any[];
}

export default function RetroDashboard() {
  const [activeTab, setActiveTab] = useState('organization');
  const [data, setData] = useState<TabData>({});
  const [originalData, setOriginalData] = useState<TabData>({}); // Store unfiltered data for pie charts
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [error, setError] = useState<{ [key: string]: string }>({});
  const [collapsedSections, setCollapsedSections] = useState<SectionState>({});
  const [showTables, setShowTables] = useState<{ [key: string]: boolean }>({});
  const [showRawData, setShowRawData] = useState<{ [key: string]: boolean }>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' | null }>({
    key: '',
    direction: null
  });
  const [filters, setFilters] = useState<{ [key: string]: string[] }>({
    organization: [],
    languages: [],
    editors: [],
    billing: []
  });

  const [availableFilters, setAvailableFilters] = useState<{ [key: string]: string[] }>({
    organization: [],
    languages: [],
    editors: [],
    billing: []
  });

  const [timePeriodFilter, setTimePeriodFilter] = useState('all-time');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);

  const tabs = [
    { id: 'organization', label: 'Organization', icon: '' },
    { id: 'languages', label: 'Languages', icon: '' },
    { id: 'editors', label: 'Editors', icon: '' },
    { id: 'billing', label: 'Billing', icon: '' }
  ];

  useEffect(() => {
    fetchData(activeTab);
  }, [activeTab]);

  // Add useEffect to re-fetch data when time period filter changes
  useEffect(() => {
    if (activeTab) {
      fetchData(activeTab);
    }
  }, [timePeriodFilter]);

  // Add useEffect to re-fetch data when custom dates change
  useEffect(() => {
    if (activeTab && timePeriodFilter === 'custom' && customStartDate && customEndDate) {
      fetchData(activeTab);
    }
  }, [customStartDate, customEndDate]);

  // Add useEffect to re-fetch data when filters change
  useEffect(() => {
    if (activeTab) {
      fetchData(activeTab);
    }
  }, [filters]);

  // Add useEffect with cleanup to destroy chart instances on tab change/unmount
  useEffect(() => {
    return () => {
      // This will ensure all chart instances are properly cleaned up
      const chartInstances = ChartJS.instances;
      Object.keys(chartInstances).forEach(key => {
        chartInstances[key].destroy();
      });
    };
  }, [activeTab]); // Run cleanup when tab changes

  const fetchData = async (tab: string) => {
    if (!tab) {
      console.error('Tab is undefined in fetchData');
      return;
    }
    
    setLoading(prev => ({ ...prev, [tab]: true }));
    setError(prev => ({ ...prev, [tab]: '' }));

    try {
      // Always fetch unfiltered data from API
      let url = `/api/${tab}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch ${tab} data`);
      
      const result = await response.json();
      
      // Store original unfiltered data for pie charts
      setOriginalData(prev => ({ ...prev, [tab]: result }));
      
      // Apply filters client-side for line charts
      let filteredResult = { ...result };
      if (filters[tab] && Array.isArray(filters[tab]) && filters[tab].length > 0) {
        // Filter the data based on selected filters
        if (tab === 'languages' && result.languages_daily?.data) {
          filteredResult.languages_daily.data = result.languages_daily.data.filter((item: any) => 
            filters[tab].includes(item.language)
          );
        }
        if (tab === 'editors' && result.editors_daily?.data) {
          filteredResult.editors_daily.data = result.editors_daily.data.filter((item: any) => 
            filters[tab].includes(item.editor)
          );
        }
      }
      
      setData(prev => ({ ...prev, [tab]: filteredResult }));

      // Set available filters from original unfiltered data
      if (result.available_languages) {
        setAvailableFilters(prev => ({ ...prev, [tab]: result.available_languages }));
      } else if (result.available_editors) {
        setAvailableFilters(prev => ({ ...prev, [tab]: result.available_editors }));
      }

    } catch (err) {
      setError(prev => ({ 
        ...prev, 
        [tab]: err instanceof Error ? err.message : `Failed to fetch ${tab} data` 
      }));
    } finally {
      setLoading(prev => ({ ...prev, [tab]: false }));
    }
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const toggleTables = (tab: string) => {
    setShowTables(prev => ({ ...prev, [tab]: !prev[tab] }));
  };

  const toggleRawData = (tab: string) => {
    setShowRawData(prev => ({ ...prev, [tab]: !prev[tab] }));
  };

  const handleFilterChange = (tab: string, filter: string, checked: boolean) => {
    setFilters(prev => {
      const current = prev[tab] || [];
      if (checked) {
        return { ...prev, [tab]: [...current, filter] };
      } else {
        return { ...prev, [tab]: current.filter(f => f !== filter) };
      }
    });
  };

  const applyFilters = async () => {
    try {
      // Ensure we have a proper activeTab before fetching
      if (activeTab) {
        await fetchData(activeTab);
      }
    } catch (err) {
      console.error('Error applying filters:', err);
    }
  };

  const clearFilters = async () => {
    try {
      // Update filters state safely
      setFilters(prev => ({ ...prev, [activeTab]: [] }));
      
      // Immediately fetch fresh data after clearing filters
      if (activeTab) {
        await fetchData(activeTab);
      }
    } catch (err) {
      console.error('Error clearing filters:', err);
    }
  };

  const filterDataByTimePeriod = (data: any[], timePeriod: string): any[] => {
    if (!data || data.length === 0 || timePeriod === 'all-time') return data;
    
    // Handle custom date range
    if (timePeriod === 'custom') {
      if (!customStartDate || !customEndDate) return data;
      
      return data.filter(item => {
        const itemDate = new Date(item.date);
        // Create end date with time set to end of day to include the full end date
        const endDateInclusive = new Date(customEndDate);
        endDateInclusive.setHours(23, 59, 59, 999);
        
        return itemDate >= customStartDate && itemDate <= endDateInclusive;
      });
    }
    
    // Sort data by date to get the latest date
    const sortedData = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (sortedData.length === 0) return data;
    
    const latestDate = new Date(sortedData[0].date);
    let cutoffDate: Date;
    
    if (timePeriod === 'last-month') {
      cutoffDate = new Date(latestDate);
      cutoffDate.setMonth(cutoffDate.getMonth() - 1);
    } else if (timePeriod === 'last-week') {
      cutoffDate = new Date(latestDate);
      cutoffDate.setDate(cutoffDate.getDate() - 7);
    } else {
      return data; // fallback to all data
    }
    
    return data.filter(item => new Date(item.date) >= cutoffDate);
  };

  const createChartData = (chartData: any[], xKey: string, yKeys: string[], type: 'line' | 'bar' = 'line') => {
    if (!chartData || chartData.length === 0) return null;

    // Apply time period filter
    const filteredData = filterDataByTimePeriod(chartData, timePeriodFilter);
    if (filteredData.length === 0) return null;

    const colors = [
      '#00ff00', '#ffff00', '#ff00ff', '#00ffff', '#ff8000',
      '#ff0080', '#80ff00', '#8000ff', '#0080ff', '#ff8080'
    ];

    const datasets = yKeys.map((key, index) => ({
      label: key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
      data: filteredData.map(item => item[key] || 0),
      borderColor: colors[index % colors.length],
      backgroundColor: `${colors[index % colors.length]}20`,
      tension: 0.1,
      borderWidth: 2,
    }));

    return {
      labels: filteredData.map(item => item[xKey]),
      datasets,
    };
  };

  const createPieData = (pieData: any) => {
    if (!pieData || typeof pieData !== 'object') return null;

    const labels = Object.keys(pieData);
    const values = Object.values(pieData) as number[];
    const colors = ['#00ff00', '#ffff00', '#ff00ff', '#00ffff', '#ff8000', '#ff0080', '#80ff00', '#8000ff'];

    return {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: colors.slice(0, labels.length),
        borderWidth: 2,
      }],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#00ff00',
          font: {
            family: 'Courier New',
            size: 14
          },
          padding: 20
        },
        position: 'top' as const,
        align: 'center' as const
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#00ff00',
        bodyColor: '#ffffff',
        borderColor: '#333333',
        borderWidth: 1,
        padding: 10,
        titleFont: {
          family: 'Courier New',
          size: 14
        },
        bodyFont: {
          family: 'Courier New',
          size: 12
        }
      }
    },
    scales: {
      x: {
        grid: { color: '#333333' },
        ticks: { 
          color: '#ffffff',
          font: { family: 'Courier New', size: 12 },
          maxRotation: 45,
          minRotation: 45,
          autoSkip: false // Ensures all labels are shown
        }
      },
      y: {
        grid: { color: '#333333' },
        ticks: { 
          color: '#ffffff',
          font: { family: 'Courier New', size: 12 },
          padding: 10
        },
        beginAtZero: true
      }
    }
  };

  const renderMetrics = (tabData: any, tab: string) => {
    if (!tabData) return null;

    let metrics: MetricItem[] = [];

    switch (tab) {
      case 'organization':
        if (tabData.active_vs_engaged_daily?.data) {
          // Get the last 7 days of data
          const lastWeekData = tabData.active_vs_engaged_daily.data.slice(-7);
          
          // Calculate active and engaged users for last 7 days
          const lastWeekActiveUsers = lastWeekData.reduce((sum: number, day: any) => sum + (day.total_active_users || 0), 0);
          const lastWeekEngagedUsers = lastWeekData.reduce((sum: number, day: any) => sum + (day.total_engaged_users || 0), 0);
          
          // Get latest code completion data for last 7 days
          const lastWeekFeaturesData = tabData.features_daily?.data.slice(-7) || [];
          const lastWeekCodeCompletion = lastWeekFeaturesData.reduce((sum: number, day: any) => sum + (day.Code_Completion || 0), 0);
          
          // Calculate percentage increase in active users compared to previous week
          const previousWeekData = tabData.active_vs_engaged_daily.data.slice(-14, -7) || [];
          const previousWeekActiveUsers = previousWeekData.reduce((sum: number, day: any) => sum + (day.total_active_users || 0), 0);
          const percentageIncrease = previousWeekActiveUsers > 0 
            ? ((lastWeekActiveUsers - previousWeekActiveUsers) / previousWeekActiveUsers * 100).toFixed(1)
            : 'N/A';
          
          metrics = [
            { label: 'Total Active Users', sublabel: '(Last 7 Days)', value: lastWeekActiveUsers },
            { label: 'Total Engaged Users', sublabel: '(Last 7 Days)', value: lastWeekEngagedUsers },
            { label: 'Total Code Completion', sublabel: '(Last 7 Days)', value: lastWeekCodeCompletion },
            { label: 'Active Users Increase', sublabel: '(Last 7 Days)', value: previousWeekActiveUsers > 0 ? `${percentageIncrease}%` : percentageIncrease }
          ];
        }
        break;
      case 'languages':
        metrics = [
          { label: 'Languages Tracked', value: tabData.available_languages?.length || 0 },
          { label: 'Daily Records', value: tabData.languages_daily?.data?.length || 0 },
          { label: 'Last 7 Days Records', value: tabData.languages_weekly?.data?.length || 0 }
        ];
        break;
      case 'editors':
        metrics = [
          { label: 'Editors Tracked', value: tabData.available_editors?.length || 0 },
          { label: 'Daily Records', value: tabData.editors_daily?.data?.length || 0 },
          { label: 'Last 7 Days Records', value: tabData.editors_weekly?.data?.length || 0 }
        ];
        break;
    }

    // Special styling for organization tab to make metrics evenly spaced in a single line
    if (tab === 'organization') {
      return (
        <div style={{ 
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between', 
          width: '95%',
          maxWidth: '1200px',
          margin: '0 auto 20px',
          flexWrap: 'nowrap',
          gap: '10px'
        }}>
          {metrics.map((metric, index) => (
            <div key={index} style={{ 
              flex: '1', 
              textAlign: 'center',
              padding: '15px 10px',
              margin: '0',
              background: 'rgba(0, 255, 0, 0.05)',
              border: '1px solid var(--retro-border)',
              borderRadius: '4px',
              minWidth: '220px',
              maxWidth: '300px',
              minHeight: '145px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              boxShadow: '0 0 10px rgba(0, 255, 0, 0.15)'
            }}>
              <div style={{ 
                fontSize: '34px', 
                fontWeight: 'bold',
                color: 'var(--retro-primary)',
                marginBottom: '8px',
                textShadow: '0 0 5px rgba(0, 255, 0, 0.5)'
              }}>
                {metric.value}
              </div>
              <div style={{ 
                fontSize: '16px',
                lineHeight: '1.3',
                padding: '0 5px',
                color: 'var(--retro-secondary)',
                fontWeight: 'bold',
                marginBottom: '4px'
              }}>
                {metric.label}
              </div>
              {metric.sublabel && (
                <div style={{ 
                  fontSize: '14px',
                  lineHeight: '1.2',
                  padding: '0 5px',
                  color: 'var(--retro-secondary)',
                  opacity: 0.8
                }}>
                  {metric.sublabel}
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }
    
    // Default metrics display for other tabs
    return (
      <div className={styles.retroMetrics}>
        {metrics.map((metric, index) => (
          <div key={index} className={styles.retroMetric}>
            <span className={styles.retroMetricValue}>{metric.value}</span>
            <span className={styles.retroMetricLabel}>{metric.label}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderTable = (tableData: any[], title: string) => {
    if (!tableData || tableData.length === 0) return null;

    const headers = Object.keys(tableData[0]);

    // Sorting logic
    const requestSort = (key: string) => {
      let direction: 'ascending' | 'descending' | null = 'ascending';
      
      if (sortConfig.key === key) {
        if (sortConfig.direction === 'ascending') {
          direction = 'descending';
        } else if (sortConfig.direction === 'descending') {
          direction = null;
        }
      }
      
      setSortConfig({ key, direction });
    };

    // Apply sorting if active
    const sortedData = [...tableData];
    if (sortConfig.key && sortConfig.direction) {
      sortedData.sort((a, b) => {
        // Handle numeric and string sorting
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
        }

        // Convert to strings for comparison if not numbers
        const aString = String(aValue).toLowerCase();
        const bString = String(bValue).toLowerCase();
        
        if (aString < bString) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aString > bString) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    // Get sort direction indicator
    const getSortDirectionIndicator = (key: string) => {
      if (sortConfig.key !== key) return '';
      if (sortConfig.direction === 'ascending') return ' ▲';
      if (sortConfig.direction === 'descending') return ' ▼';
      return '';
    };

    return (
      <div style={{ marginTop: '20px' }}>
        <h4 style={{ color: '#ffff00', marginBottom: '10px' }}>{title}</h4>
        <div style={{ 
          overflowX: 'auto', 
          maxHeight: '400px', 
          overflowY: 'auto', 
          border: '1px solid #555', 
          borderRadius: '8px',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)'
        }}>
          <table className={styles.retroTable} style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#222', zIndex: 1 }}>
              <tr>
                {headers.map(header => (
                  <th 
                    key={header} 
                    onClick={() => requestSort(header)}
                    style={{ 
                      cursor: 'pointer',
                      padding: '12px 15px',
                      textAlign: 'left',
                      backgroundColor: '#333',
                      borderBottom: '2px solid #444',
                      color: '#ffff00'
                    }}
                    title="Click to sort"
                  >
                    {header.replace(/_/g, ' ')}
                    {getSortDirectionIndicator(header)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedData.map((row, index) => (
                <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#222' : '#272727' }}>
                  {headers.map(header => (
                    <td key={header} style={{ padding: '10px 15px', borderBottom: '1px solid #444' }}>{row[header]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ color: '#ffffff', fontSize: '12px', marginTop: '10px', textAlign: 'right' }}>
          Showing all {tableData.length} records
        </p>
      </div>
    );
  };

  const renderTabContent = (tab: string) => {
    const tabData = data[tab];
    const isLoading = loading[tab];
    const hasError = error[tab];

    if (isLoading) {
      return (
        <div className={styles.retroLoading}>
          <div className={styles.retroSpinner}></div>
          Loading {tab} data...
        </div>
      );
    }

    if (hasError) {
      return (
        <div className={styles.retroError}>
          Error: {hasError}
          <br />
          <button onClick={() => fetchData(tab)} className={styles.retroBtn} style={{ marginTop: '10px' }}>
            Retry
          </button>
        </div>
      );
    }

    if (!tabData) return null;

    return (
      <div>
        {/* Two-column layout for non-organization tabs */}
        {activeTab !== 'organization' ? (
          <div style={{ 
            display: 'flex', 
            gap: activeTab === 'editors' ? '40px' : '20px',
            maxWidth: '1200px',
            margin: '0 auto 20px',
            width: '95%'
          }}>
            {/* Left Side: Filters */}
            <div style={{ flex: activeTab === 'editors' ? '0 0 50%' : '0 0 25%' }}>
              {availableFilters[activeTab] && availableFilters[activeTab].length > 0 && (
                <div className={styles.retroFilters}>
                  <div className={styles.retroFilterTitle}>
                    Filter {activeTab} ({availableFilters[activeTab].length} available)
                  </div>
                  <div>
                    <select 
                      className={styles.retroSelect} 
                      multiple 
                      size={Math.min(10, (availableFilters[activeTab] || []).length)}
                      value={filters[activeTab] || []}
                      onChange={(e) => {
                        try {
                          const selected = Array.from(e.target.selectedOptions || [], option => option.value);
                          setFilters(prev => ({ ...prev, [activeTab]: selected }));
                        } catch (err) {
                          console.error('Error in select onChange:', err);
                        }
                      }}
                    >
                      {(availableFilters[activeTab] || []).map(option => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.retroControls}>
                    <button onClick={applyFilters} className={styles.retroBtn}>Apply Filters</button>
                    <button onClick={clearFilters} className={styles.retroBtn}>Clear All</button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Right Side: Metrics */}
            <div style={{ 
              flex: activeTab === 'editors' ? '0 0 calc(50% - 40px)' : '1',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start'
            }}>
              {activeTab !== 'billing' && (
                <div className={styles.retroMetrics}>
                  <div className={styles.retroMetric} style={activeTab === 'editors' ? {
                    width: '200px',
                    height: '200px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    aspectRatio: '1/1',
                    padding: '20px',
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #e0e0e0'
                  } : {}}>
                    <span className={styles.retroMetricValue}>
                      {data[activeTab]?.available_editors?.length || 0}
                    </span>
                    <span className={styles.retroMetricLabel}>Editors Tracked</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Organization tab - centered layout with metrics */
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {renderMetrics(data[activeTab], activeTab)}
            
            {/* Filters below metrics if needed */}
            {availableFilters[activeTab] && availableFilters[activeTab].length > 0 && (
              <div className={styles.retroFilters} style={{ maxWidth: '1200px', margin: '0 auto', width: '95%' }}>
                <div className={styles.retroFilterTitle}>
                  Filter {activeTab} ({availableFilters[activeTab].length} available)
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <select 
                    className={styles.retroSelect} 
                    multiple 
                    size={Math.min(5, (availableFilters[activeTab] || []).length)}
                    value={filters[activeTab] || []}
                    onChange={(e) => {
                      try {
                        const selected = Array.from(e.target.selectedOptions || [], option => option.value);
                        setFilters(prev => ({ ...prev, [activeTab]: selected }));
                      } catch (err) {
                        console.error('Error in select onChange:', err);
                      }
                    }}
                  >
                    {(availableFilters[activeTab] || []).map(option => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <div className={styles.retroControls} style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={applyFilters} className={styles.retroBtn}>Apply Filters</button>
                    <button onClick={clearFilters} className={styles.retroBtn}>Clear All</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Charts and Tables */}
        {activeTab === 'organization' && (
          <>
            {/* Active vs Engaged Users */}
            {data[activeTab]?.active_vs_engaged_daily && (
              <div className={styles.retroSection} style={{ maxWidth: '1200px', marginTop: '10px', marginLeft: 'auto', marginRight: 'auto', width: '95%' }}>
                <div 
                  className={styles.retroSectionHeader}
                  onClick={() => toggleSection('org-active-engaged')}
                >
                  <h3 className={styles.retroSectionTitle}>Active vs Engaged Users</h3>
                  <button className={styles.retroToggleBtn}>
                    {collapsedSections['org-active-engaged'] ? '▼ Expand' : '▲ Collapse'}
                  </button>
                </div>
                <div className={`${styles.retroSectionContent} ${collapsedSections['org-active-engaged'] ? styles.collapsed : ''}`}>
                  <div className={styles.retroChart} style={{ margin: '0 auto', height: '500px', maxWidth: '1200px', width: '95%' }}>
                    {(() => {
                      const chartData = createChartData(
                        tabData.active_vs_engaged_daily.data,
                        'date',
                        ['total_active_users', 'total_engaged_users']
                      );
                      return chartData ? <Line key={getChartKey()} data={chartData} options={chartOptions} /> : null;
                    })()}
                  </div>
                  <div className={styles.retroControlsSection}>
                    <button 
                      onClick={() => toggleTables(activeTab + '-active-engaged')} 
                      className={`${styles.retroBtn} ${showTables[activeTab + '-active-engaged'] ? styles.active : ''}`}
                    >
                      {showTables[activeTab + '-active-engaged'] ? 'Hide Table' : 'Show Table'}
                    </button>
                  </div>
                  {showTables[activeTab + '-active-engaged'] && renderTable(tabData.active_vs_engaged_daily.data, 'Daily Active vs Engaged Users')}
                </div>
              </div>
            )}

            {/* Features Usage */}
            {tabData.features_daily && (
              <div className={styles.retroSection} style={{ maxWidth: '1200px', margin: '20px auto', width: '95%' }}>
                <div 
                  className={styles.retroSectionHeader}
                  onClick={() => toggleSection('org-features')}
                >
                  <h3 className={styles.retroSectionTitle}>Features Usage</h3>
                  <button className={styles.retroToggleBtn}>
                    {collapsedSections['org-features'] ? '▼ Expand' : '▲ Collapse'}
                  </button>
                </div>
                <div className={`${styles.retroSectionContent} ${collapsedSections['org-features'] ? styles.collapsed : ''}`}>
                  <div className={styles.retroChart} style={{ margin: '0 auto', height: '500px' }}>
                    {(() => {
                      const chartData = createChartData(
                        tabData.features_daily.data,
                        'date',
                        ['IDE_Chat', 'Dotcom_Chat', 'Pull_Request', 'Code_Completion'],
                        'line'
                      );
                      return chartData ? <Line key={getChartKey()} data={chartData} options={chartOptions} /> : null;
                    })()}
                  </div>
                  <div className={styles.retroControlsSection}>
                    <button 
                      onClick={() => toggleTables(activeTab + '-features')} 
                      className={`${styles.retroBtn} ${showTables[activeTab + '-features'] ? styles.active : ''}`}
                    >
                      {showTables[activeTab + '-features'] ? 'Hide Table' : 'Show Table'}
                    </button>
                  </div>
                  {showTables[activeTab + '-features'] && renderTable(tabData.features_daily.data, 'Daily Features Usage')}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'languages' && (
          <>
            {/* Top Languages */}
            {originalData[activeTab]?.top_languages && Object.keys(originalData[activeTab].top_languages.data).length > 0 && (
              <div className={styles.retroSection} style={{ maxWidth: '1200px', margin: '20px auto', width: '95%' }}>
                <div 
                  className={styles.retroSectionHeader}
                  onClick={() => toggleSection('lang-top')}
                >
                  <h3 className={styles.retroSectionTitle}>Top Languages</h3>
                  <button className={styles.retroToggleBtn}>
                    {collapsedSections['lang-top'] ? '▼ Expand' : '▲ Collapse'}
                  </button>
                </div>
                <div className={`${styles.retroSectionContent} ${collapsedSections['lang-top'] ? styles.collapsed : ''}`}>
                  <div className={styles.retroChart} style={{ margin: '0 auto', height: '500px' }}>
                    {(() => {
                      const chartData = createPieData(originalData[activeTab]?.top_languages?.data);
                      return chartData ? <Pie key={getPieChartKey()} data={chartData} options={chartOptions} /> : null;
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Code Acceptance and Suggestions Per Language */}
            {data[activeTab]?.languages_daily && (
              <div className={styles.retroSection} style={{ maxWidth: '1200px', margin: '20px auto', width: '95%' }}>
                <div 
                  className={styles.retroSectionHeader}
                  onClick={() => toggleSection('lang-code-stats')}
                >
                  <h3 className={styles.retroSectionTitle}>Code Acceptance and Suggestions Per Language</h3>
                  <button className={styles.retroToggleBtn}>
                    {collapsedSections['lang-code-stats'] ? '▼ Expand' : '▲ Collapse'}
                  </button>
                </div>
                <div className={`${styles.retroSectionContent} ${collapsedSections['lang-code-stats'] ? styles.collapsed : ''}`}>
                  <div className={styles.retroChart} style={{ margin: '0 auto', height: '500px' }}>
                    {(() => {
                      // Filter data for selected languages or get top 3 if none selected
                      const languagesData = data[activeTab].languages_daily.data;
                      const selectedLangs = filters[activeTab]?.length > 0 
                        ? filters[activeTab] 
                        : getTopLanguages(languagesData, 3);
                      
                      // Apply time period filtering first
                      const filteredData = filterDataByTimePeriod(languagesData, timePeriodFilter);
                      
                      // Group by date and language
                      const languagesByDate = new Map();
                      
                      // Get all unique dates from the filtered data
                      const allDatesSet = new Set<string>();
                      filteredData.forEach((item: any) => {
                        allDatesSet.add(item.date);
                      });
                      
                      // Create a sorted array of all dates
                      const allDates = Array.from(allDatesSet).sort();
                      
                      // Initialize data structure with all dates for each selected language
                      allDates.forEach(date => {
                        languagesByDate.set(date, {
                          date: date,
                          // Initialize with zero values for all selected languages
                          ...Object.fromEntries(
                            selectedLangs.flatMap(lang => [
                              [`${lang}_acceptances`, 0],
                              [`${lang}_suggestions`, 0]
                            ])
                          )
                        });
                      });
                      
                      // Filter by selected languages and organize by date
                      filteredData
                        .filter((item: any) => selectedLangs.includes(item.language))
                        .forEach((item: any) => {
                          // Add language-specific metrics
                          const dateEntry = languagesByDate.get(item.date);
                          dateEntry[`${item.language}_acceptances`] = item.total_code_acceptances;
                          dateEntry[`${item.language}_suggestions`] = item.total_code_suggestions;
                        });
                      
                      // Convert to array and sort by date
                      const chartData = Array.from(languagesByDate.values())
                        .sort((a: any, b: any) => a.date.localeCompare(b.date));
                      
                      // Create datasets for each language (both acceptances and suggestions)
                      const allDatasets: any[] = [];
                      const colors = ['#00ff00', '#ffff00', '#ff00ff', '#00ffff', '#ff8000', '#80ff00'];
                      
                      selectedLangs.forEach((lang: string, langIndex: number) => {
                        // Acceptance dataset for this language
                        allDatasets.push({
                          type: 'line',
                          label: `${lang} Acceptances`,
                          data: chartData.map((item: any) => item[`${lang}_acceptances`] || 0),
                          borderColor: colors[langIndex % colors.length],
                          backgroundColor: `${colors[langIndex % colors.length]}20`,
                          pointBackgroundColor: colors[langIndex % colors.length],
                          borderWidth: 2,
                          pointRadius: 4,
                          tension: 0.1,
                        });
                        
                        // Suggestions dataset for this language
                        allDatasets.push({
                          type: 'line',
                          label: `${lang} Suggestions`,
                          data: chartData.map((item: any) => item[`${lang}_suggestions`] || 0),
                          borderColor: colors[langIndex % colors.length],
                          backgroundColor: `${colors[langIndex % colors.length]}20`,
                          borderDash: [5, 5],
                          pointBackgroundColor: colors[langIndex % colors.length],
                          borderWidth: 2,
                          pointRadius: 3,
                          tension: 0.1,
                        });
                      });
                      
                      // Create final chart data
                      const finalChartData = {
                        labels: chartData.map((item: any) => item.date),
                        datasets: allDatasets,
                      };
                      
                      return finalChartData ? 
                        <Line 
                          key={getChartKey()} 
                          data={finalChartData} 
                          options={{
                            ...chartOptions,
                            plugins: {
                              ...chartOptions.plugins,
                              title: {
                                display: true,
                                text: selectedLangs.length === 0 ? 
                                  'No languages selected' : 
                                  `Showing data for: ${selectedLangs.join(', ')}`,
                                color: '#ffffff'
                              }
                            }
                          }} 
                        /> : null;
                    })()}
                  </div>
                  <div className={styles.retroControlsSection}>
                    <button 
                      onClick={() => toggleTables(activeTab)} 
                      className={`${styles.retroBtn} ${showTables[activeTab] ? styles.active : ''}`}
                    >
                      {showTables[activeTab] ? 'Hide Table' : 'Show Table'}
                    </button>
                  </div>
                  {showTables[activeTab] && (() => {
                    const selectedLangs = filters[activeTab]?.length > 0 
                      ? filters[activeTab] 
                      : getTopLanguages(data[activeTab].languages_daily.data, 3);
                    
                    return renderTable(
                      data[activeTab].languages_daily.data.filter((item: any) => 
                        selectedLangs.includes(item.language)
                      ), 
                      'Code Acceptance and Suggestions Per Language'
                    );
                  })()}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'editors' && (
          <>
            {/* Top Editors */}
            {originalData[activeTab]?.top_editors && Object.keys(originalData[activeTab].top_editors.data).length > 0 && (
              <div className={styles.retroSection} style={{ maxWidth: '1200px', margin: '20px auto', width: '95%' }}>
                <div 
                  className={styles.retroSectionHeader}
                  onClick={() => toggleSection('edit-top')}
                >
                  <h3 className={styles.retroSectionTitle}>Top Editors</h3>
                  <button className={styles.retroToggleBtn}>
                    {collapsedSections['edit-top'] ? '▼ Expand' : '▲ Collapse'}
                  </button>
                </div>
                <div className={`${styles.retroSectionContent} ${collapsedSections['edit-top'] ? styles.collapsed : ''}`}>
                  <div className={styles.retroChart} style={{ margin: '0 auto', height: '500px' }}>
                    {(() => {
                      const chartData = createPieData(originalData[activeTab]?.top_editors?.data);
                      return chartData ? <Pie key={getPieChartKey()} data={chartData} options={chartOptions} /> : null;
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Total Code Acceptance and Suggestions per Editor */}
            {data[activeTab]?.editors_daily && (
              <div className={styles.retroSection} style={{ maxWidth: '1200px', margin: '20px auto', width: '95%' }}>
                <div 
                  className={styles.retroSectionHeader}
                  onClick={() => toggleSection('edit-code-stats')}
                >
                  <h3 className={styles.retroSectionTitle}>Total Code Acceptance and Suggestions per Editor</h3>
                  <button className={styles.retroToggleBtn}>
                    {collapsedSections['edit-code-stats'] ? '▼ Expand' : '▲ Collapse'}
                  </button>
                </div>
                <div className={`${styles.retroSectionContent} ${collapsedSections['edit-code-stats'] ? styles.collapsed : ''}`}>
                  <div className={styles.retroChart} style={{ margin: '0 auto', height: '500px' }}>
                    {(() => {
                      // Filter data for selected editors or get all if none selected
                      const editorsData = data[activeTab].editors_daily.data;
                      const selectedEditors = filters[activeTab]?.length > 0 
                        ? filters[activeTab] 
                        : data[activeTab].available_editors || [];
                      
                      // Apply time period filtering first
                      const filteredData = filterDataByTimePeriod(editorsData, timePeriodFilter);
                      
                      // Group by date and editor
                      const editorsByDate = new Map();
                      
                      // Filter by selected editors and organize by date
                      filteredData
                        .filter((item: any) => selectedEditors.includes(item.editor))
                        .forEach((item: any) => {
                          if (!editorsByDate.has(item.date)) {
                            editorsByDate.set(item.date, {
                              date: item.date,
                            });
                          }
                          
                          // Add editor-specific metrics
                          const dateEntry = editorsByDate.get(item.date);
                          dateEntry[`${item.editor}_acceptances`] = item.total_code_acceptances || 0;
                          dateEntry[`${item.editor}_suggestions`] = item.total_code_suggestions || 0;
                        });
                      
                      // Convert to array and sort by date
                      const chartData = Array.from(editorsByDate.values())
                        .sort((a: any, b: any) => a.date.localeCompare(b.date));
                      
                      // Create datasets for each editor (both acceptances and suggestions)
                      const allDatasets: any[] = [];
                      const colors = ['#00ff00', '#ffff00', '#ff00ff', '#00ffff', '#ff8000', '#80ff00'];
                      
                      selectedEditors.forEach((editor: string, editorIndex: number) => {
                        // Acceptances dataset for this editor
                        allDatasets.push({
                          type: 'line',
                          label: `${editor} Acceptances`,
                          data: chartData.map((item: any) => item[`${editor}_acceptances`] || 0),
                          borderColor: colors[editorIndex % colors.length],
                          backgroundColor: `${colors[editorIndex % colors.length]}20`,
                          pointBackgroundColor: colors[editorIndex % colors.length],
                          borderWidth: 2,
                          pointRadius: 4,
                          tension: 0.1,
                        });
                        
                        // Suggestions dataset for this editor
                        allDatasets.push({
                          type: 'line',
                          label: `${editor} Suggestions`,
                          data: chartData.map((item: any) => item[`${editor}_suggestions`] || 0),
                          borderColor: colors[editorIndex % colors.length],
                          backgroundColor: `${colors[editorIndex % colors.length]}20`,
                          borderDash: [5, 5],
                          pointBackgroundColor: colors[editorIndex % colors.length],
                          borderWidth: 2,
                          pointRadius: 3,
                          tension: 0.1,
                        });
                      });
                      
                      const finalChartData = {
                        labels: chartData.map((item: any) => item.date),
                        datasets: allDatasets,
                      };
                      
                      return finalChartData && finalChartData.datasets.length > 0 ? 
                        <Line 
                          key={getChartKey()} 
                          data={finalChartData} 
                          options={{
                            ...chartOptions,
                            plugins: {
                              ...chartOptions.plugins,
                              title: {
                                display: true,
                                text: selectedEditors.length === 0 ? 
                                  'No editors selected' : 
                                  `Showing data for: ${selectedEditors.join(', ')}`,
                                color: '#ffffff'
                              }
                            }
                          }} 
                        /> : <div style={{ color: '#ffff00', padding: '20px', textAlign: 'center' }}>No data available for selected editors</div>;
                    })()}
                  </div>
                  <div className={styles.retroControlsSection}>
                    <button 
                      onClick={() => toggleTables(activeTab + '-code')} 
                      className={`${styles.retroBtn} ${showTables[activeTab + '-code'] ? styles.active : ''}`}
                    >
                      {showTables[activeTab + '-code'] ? 'Hide Table' : 'Show Table'}
                    </button>
                  </div>
                  {showTables[activeTab + '-code'] && renderTable(
                    data[activeTab].editors_daily.data.filter((item: any) => {
                      const selectedEditors = filters[activeTab]?.length > 0 
                        ? filters[activeTab] 
                        : data[activeTab].available_editors || [];
                      return selectedEditors.includes(item.editor);
                    }).map((item: any) => ({
                      date: item.date,
                      editor: item.editor,
                      code_acceptances: item.total_code_acceptances || 0,
                      code_suggestions: item.total_code_suggestions || 0,
                      acceptance_rate: item.total_code_suggestions > 0 ? 
                        ((item.total_code_acceptances / item.total_code_suggestions) * 100).toFixed(2) + '%' : 
                        'N/A'
                    })), 
                    'Code Acceptance and Suggestions per Editor'
                  )}
                </div>
              </div>
            )}

            {/* Engaged Users per Editor */}
            {data[activeTab]?.editors_daily && (
              <div className={styles.retroSection} style={{ maxWidth: '1200px', margin: '20px auto', width: '95%' }}>
                <div 
                  className={styles.retroSectionHeader}
                  onClick={() => toggleSection('edit-engaged-users')}
                >
                  <h3 className={styles.retroSectionTitle}>Engaged Users per Editor</h3>
                  <button className={styles.retroToggleBtn}>
                    {collapsedSections['edit-engaged-users'] ? '▼ Expand' : '▲ Collapse'}
                  </button>
                </div>
                <div className={`${styles.retroSectionContent} ${collapsedSections['edit-engaged-users'] ? styles.collapsed : ''}`}>
                  <div className={styles.retroChart} style={{ margin: '0 auto', height: '500px' }}>
                    {(() => {
                      // Filter data for selected editors or get all if none selected
                      const editorsData = data[activeTab].editors_daily.data;
                      const selectedEditors = filters[activeTab]?.length > 0 
                        ? filters[activeTab] 
                        : data[activeTab].available_editors || [];
                      
                      // Apply time period filtering first
                      const filteredData = filterDataByTimePeriod(editorsData, timePeriodFilter);
                      
                      // Get all unique dates from the filtered data
                      const allDatesSet = new Set<string>();
                      filteredData.forEach((item: any) => {
                        allDatesSet.add(item.date);
                      });
                      
                      // Create a sorted array of all dates
                      const allDates = Array.from(allDatesSet).sort();
                      
                      // Group by date with all editors initialized to zero
                      const dateGroups = new Map();
                      
                      // Initialize all dates with zero values for all editors
                      allDates.forEach(date => {
                        const entry: { [key: string]: string | number } = { date };
                        selectedEditors.forEach((editor: string) => {
                          entry[editor] = 0;
                        });
                        dateGroups.set(date, entry);
                      });
                      
                      // Filter by selected editors and organize by date
                      filteredData
                        .filter((item: any) => selectedEditors.includes(item.editor))
                        .forEach((item: any) => {
                          const dateEntry = dateGroups.get(item.date);
                          dateEntry[item.editor] = item.total_engaged_users || 0;
                        });
                      
                      // Convert to array and sort by date
                      const chartData = Array.from(dateGroups.values())
                        .sort((a: any, b: any) => a.date.localeCompare(b.date));
                      
                      // Define colors for each editor
                      const colors = ['#00ff00', '#ffff00', '#ff00ff', '#00ffff', '#ff8000', '#80ff00'];
                      
                      // Create datasets for each editor
                      const datasets = selectedEditors.map((editor: string, index: number) => ({
                        label: editor,
                        data: chartData.map((item: any) => item[editor] || 0),
                        borderColor: colors[index % colors.length],
                        backgroundColor: `${colors[index % colors.length]}20`,
                        pointBackgroundColor: colors[index % colors.length],
                        borderWidth: 2,
                        pointRadius: 4,
                        tension: 0.1
                      }));
                      
                      const finalChartData = {
                        labels: chartData.map((item: any) => item.date),
                        datasets
                      };
                      
                      return finalChartData && finalChartData.datasets.length > 0 ? 
                        <Line 
                          key={getChartKey()} 
                          data={finalChartData}
                          options={{
                            ...chartOptions,
                            plugins: {
                              ...chartOptions.plugins,
                              title: {
                                display: true,
                                text: selectedEditors.length === 0 ? 
                                  'No editors selected' : 
                                  `Showing data for: ${selectedEditors.join(', ')}`,
                                color: '#ffffff'
                              }
                            }
                          }}
                        /> : <div style={{ color: '#ffff00', padding: '20px', textAlign: 'center' }}>No data available for selected editors</div>;
                    })()}
                  </div>
                  <div className={styles.retroControlsSection}>
                    <button 
                      onClick={() => toggleTables(activeTab + '-engaged')} 
                      className={`${styles.retroBtn} ${showTables[activeTab + '-engaged'] ? styles.active : ''}`}
                    >
                      {showTables[activeTab + '-engaged'] ? 'Hide Table' : 'Show Table'}
                    </button>
                  </div>
                  {showTables[activeTab + '-engaged'] && (() => {
                    const selectedEditors = filters[activeTab]?.length > 0 
                      ? filters[activeTab] 
                      : data[activeTab].available_editors || [];
                    
                    return renderTable(
                      data[activeTab].editors_daily.data.filter((item: any) => 
                        selectedEditors.includes(item.editor)
                      ).map((item: any) => ({
                        date: item.date,
                        editor: item.editor,
                        engaged_users: item.total_engaged_users || 0
                      })), 
                      'Engaged Users per Editor'
                    );
                  })()}
                </div>
              </div>
            )}


          </>
        )}

        {activeTab === 'billing' && (
          <>
            {/* Billing Information */}
            <div className={styles.retroSection} style={{ maxWidth: '1200px', margin: '20px auto', width: '95%' }}>
              <div className={styles.retroSectionHeader}>
                <h3 className={styles.retroSectionTitle}>Billing Information</h3>
              </div>
              <div className={styles.retroSectionContent}>
                {data[activeTab]?.error ? (
                  <p style={{ color: '#ffff00' }}>No billing data available in the current database</p>
                ) : (
                  <div className={styles.retroMetrics}>
                    {(() => {
                      // Calculate total premium users
                      const totalPremiumUsers = data[activeTab]?.seat_details?.data?.length || 0;
                      
                      // Calculate users who purchased in the last week
                      const lastWeekUsers = data[activeTab]?.seat_details?.data?.filter((user: any) => {
                        if (!user.created_at) return false;
                        const purchaseDate = new Date(user.created_at);
                        const oneWeekAgo = new Date();
                        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                        return purchaseDate >= oneWeekAgo;
                      }).length || 0;
                      
                      return (
                        <>
                          <div className={styles.retroMetric}>
                            <span className={styles.retroMetricValue}>{totalPremiumUsers}</span>
                            <span className={styles.retroMetricLabel}>Total Premium Users</span>
                          </div>
                          <div className={styles.retroMetric}>
                            <span className={styles.retroMetricValue}>{lastWeekUsers}</span>
                            <span className={styles.retroMetricLabel}>New Users (Last 7 Days)</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Plan Purchases by Date */}
            {data[activeTab]?.plan_purchases && data[activeTab].plan_purchases.data.length > 0 && (
              <div className={styles.retroSection} style={{ maxWidth: '1200px', margin: '20px auto', width: '95%' }}>
                <div 
                  className={styles.retroSectionHeader}
                  onClick={() => toggleSection('billing-plan-purchases')}
                >
                  <h3 className={styles.retroSectionTitle}>Plan Purchases by Date</h3>
                  <button className={styles.retroToggleBtn}>
                    {collapsedSections['billing-plan-purchases'] ? '▼ Expand' : '▲ Collapse'}
                  </button>
                </div>
                <div className={`${styles.retroSectionContent} ${collapsedSections['billing-plan-purchases'] ? styles.collapsed : ''}`}>
                  <div className={styles.retroChart} style={{ margin: '0 auto', height: '500px' }}>
                    {(() => {
                      if (!data[activeTab].plan_purchases.data || data[activeTab].plan_purchases.data.length === 0) return null;
                      
                      // Apply time period filtering first
                      const filteredPurchaseData = filterDataByTimePeriod(data[activeTab].plan_purchases.data, timePeriodFilter);
                      
                      // Extract all unique plan types
                      const uniquePlanTypes = new Set<string>();
                      
                      filteredPurchaseData.forEach((item: any) => {
                        Object.keys(item).forEach(key => {
                          if (key !== 'date') uniquePlanTypes.add(key);
                        });
                      });
                      
                      const planTypes = Array.from(uniquePlanTypes);
                      
                      const chartData = {
                        labels: filteredPurchaseData.map((item: any) => item.date),
                        datasets: planTypes.map((planType: string, index: number) => ({
                          label: planType,
                          data: filteredPurchaseData.map((item: any) => item[planType] as number || 0),
                          backgroundColor: `rgba(0, ${255 - index * 30}, ${index * 30}, 0.7)`,
                          borderColor: `rgba(0, ${255 - index * 30}, ${index * 30}, 1)`,
                          borderWidth: 1,
                        }))
                      };
                      
                      return <Bar 
                        data={chartData} 
                        options={{ 
                          responsive: true, 
                          maintainAspectRatio: false,
                          scales: {
                            x: { stacked: true },
                            y: { stacked: true }
                          }
                        }} 
                      />;
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Billing Seat Details */}
            {data[activeTab]?.seat_details && data[activeTab].seat_details.data.length > 0 && (
              <div className={styles.retroSection} style={{ maxWidth: '1200px', margin: '20px auto', width: '95%' }}>
                <div 
                  className={styles.retroSectionHeader}
                  onClick={() => toggleSection('billing-seat-details')}
                >
                  <h3 className={styles.retroSectionTitle}>Billing Seat Details</h3>
                  <button className={styles.retroToggleBtn}>
                    {collapsedSections['billing-seat-details'] ? '▼ Expand' : '▲ Collapse'}
                  </button>
                </div>
                <div className={`${styles.retroSectionContent} ${collapsedSections['billing-seat-details'] ? styles.collapsed : ''}`}>
                  <div className={styles.retroTableContainer}>
                    <table className={styles.retroTable}>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>ID</th>
                          <th>Username</th>
                          <th>Plan Type</th>
                          <th>Purchased Date</th>
                          <th>Last Activity Date</th>
                          <th>Last Activity Editor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data[activeTab].seat_details.data
                          // Sort by purchase date (created_at)
                          .sort((a: any, b: any) => {
                            const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
                            const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
                            return dateA.getTime() - dateB.getTime();
                          })
                          .map((seat: any, index: number) => (
                          <tr key={seat.assignee_id || index}>
                            <td>{index + 1}</td>
                            <td>{seat.assignee_id || 'N/A'}</td>
                            <td>{seat.assignee_login || 'N/A'}</td>
                            <td>{seat.plan_type || 'N/A'}</td>
                            <td>{seat.created_at || 'N/A'}</td>
                            <td>{seat.last_activity_at || 'N/A'}</td>
                            <td>{seat.last_activity_editor || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Raw Data Control */}
        <div className={styles.retroSection} style={{ 
          maxWidth: '1200px', 
          margin: '30px auto',
          width: '95%'
        }}>
          <div className={styles.retroSectionHeader}>
            <h3 className={styles.retroSectionTitle}>Raw Data</h3>
            <button 
              onClick={() => toggleRawData(activeTab)} 
              className={`${styles.retroBtn} ${showRawData[activeTab] ? styles.active : ''}`}
            >
              {showRawData[activeTab] ? 'Hide Raw Data' : 'Show Raw Data'}
            </button>
          </div>
          {showRawData[activeTab] && (
            <div className={styles.retroSectionContent}>
              <div className={styles.retroRawData}>
                <pre>{JSON.stringify(data[activeTab], null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Helper function to generate chart key for proper re-rendering
  const getChartKey = () => {
    const baseKey = `chart-${activeTab}-${filters[activeTab]?.join('-')}-${timePeriodFilter}`;
    if (timePeriodFilter === 'custom' && customStartDate && customEndDate) {
      return `${baseKey}-${customStartDate.toDateString()}-${customEndDate.toDateString()}`;
    }
    return baseKey;
  };

  // Helper function to generate chart key for pie charts (excludes filters)
  const getPieChartKey = () => {
    const baseKey = `pie-chart-${activeTab}-${timePeriodFilter}`;
    if (timePeriodFilter === 'custom' && customStartDate && customEndDate) {
      return `${baseKey}-${customStartDate.toDateString()}-${customEndDate.toDateString()}`;
    }
    return baseKey;
  };

  // Helper function to get top languages based on usage
  const getTopLanguages = (languageData: any[], limit = 3) => {
    if (!languageData || !Array.isArray(languageData)) return [];
    
    // Calculate totals for each language
    const languageTotals: Record<string, number> = languageData.reduce((acc: Record<string, number>, item: any) => {
      const language = item.language || 'Unknown';
      if (!acc[language]) acc[language] = 0;
      acc[language] += (item.total_code_acceptances || 0) + (item.total_code_suggestions || 0);
      return acc;
    }, {});
    
    // Sort languages by total usage and return top ones
    return Object.entries(languageTotals)
      .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
      .slice(0, limit)
      .map(([language]) => language);
  };

  // Helper function to render time period filter dropdown
  const renderTimePeriodFilter = () => {
    const timePeriodOptions = [
      { value: 'all-time', label: 'All Time' },
      { value: 'last-month', label: 'Last Month' },
      { value: 'last-week', label: 'Last Week' },
      { value: 'custom', label: 'Custom Date Range' }
    ];

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <select 
          className={styles.retroSelect}
          value={timePeriodFilter}
          onChange={(e) => setTimePeriodFilter(e.target.value)}
          style={{ 
            minWidth: '160px',
            height: '32px',
            fontSize: '12px'
          }}
        >
          {timePeriodOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        
        {timePeriodFilter === 'custom' && (
          <>
            <DatePicker
              selected={customStartDate}
              onChange={(date) => setCustomStartDate(date)}
              placeholderText="Start Date"
              dateFormat="yyyy-MM-dd"
              className={styles.retroSelect}
            />
            <DatePicker
              selected={customEndDate}
              onChange={(date) => setCustomEndDate(date)}
              placeholderText="End Date"
              dateFormat="yyyy-MM-dd"
              className={styles.retroSelect}
            />
          </>
        )}
      </div>
    );
  };

  return (
    <div className={styles.retroContainer}>
      <div className={styles.retroHeader}>
        <h1 className={styles.retroTitle}>GITHUB COPILOT ANALYTICS</h1>
        <p className={styles.retroSubtitle}>
          [ VISUALIZE USAGE • ENGAGEMENT • FEATURE ADOPTION ]
        </p>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', width: '95%' }}>
        <div className={styles.retroTabs}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`${styles.retroTab} ${activeTab === tab.id ? styles.active : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
            {renderTimePeriodFilter()}
          </div>
        </div>
      </div>

      <div>
        {renderTabContent(activeTab)}
      </div>
    </div>
  );
}
