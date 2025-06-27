'use client';

import { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, TimeScale } from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import styles from '../styles/professional.module.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, TimeScale);

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

export default function ProfessionalDashboard() {
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

  const [pendingFilters, setPendingFilters] = useState<{ [key: string]: string[] }>({
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
  const [excludeWeekends, setExcludeWeekends] = useState(false);
  const [billingTableLimit, setBillingTableLimit] = useState(25);
  const [billingSortConfig, setBillingSortConfig] = useState<{ key: string; direction: 'ascending' | 'descending' | null }>({
    key: '',
    direction: null
  });

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

  // Add useEffect to re-fetch data when exclude weekends changes
  useEffect(() => {
    if (activeTab) {
      fetchData(activeTab);
    }
  }, [excludeWeekends]);

  // Add useEffect to re-fetch data when custom dates change
  useEffect(() => {
    if (activeTab && timePeriodFilter === 'custom' && customStartDate && customEndDate) {
      fetchData(activeTab);
    }
  }, [customStartDate, customEndDate]);

  // Remove automatic filter refresh - only refresh when Apply is clicked

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
    return fetchDataWithFilters(tab, filters[tab] || []);
  };

  const fetchDataWithFilters = async (tab: string, tabFilters: string[]) => {
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
      if (tabFilters && Array.isArray(tabFilters) && tabFilters.length > 0) {
        // Filter the data based on selected filters
        if (tab === 'languages' && result.languages_daily?.data) {
          filteredResult.languages_daily.data = result.languages_daily.data.filter((item: any) => 
            tabFilters.includes(item.language)
          );
        }
        if (tab === 'editors' && result.editors_daily?.data) {
          filteredResult.editors_daily.data = result.editors_daily.data.filter((item: any) => 
            tabFilters.includes(item.editor)
          );
        }
      }
      
      // For organization tab, also fetch chat prompts data
      if (tab === 'organization') {
        try {
          const chatPromptsResponse = await fetch('/api/chat-prompts');
          if (chatPromptsResponse.ok) {
            const chatPromptsData = await chatPromptsResponse.json();
            filteredResult.chat_prompts = chatPromptsData;
          }
        } catch (chatError) {
          console.warn('Failed to fetch chat prompts data:', chatError);
          // Don't fail the whole request if chat prompts fail
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
      // Apply pending filters to active filters
      setFilters(prev => ({ ...prev, [activeTab]: pendingFilters[activeTab] || [] }));
      
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
      // Clear both pending and active filters
      setPendingFilters(prev => ({ ...prev, [activeTab]: [] }));
      setFilters(prev => ({ ...prev, [activeTab]: [] }));
      
      // Immediately fetch fresh data after clearing filters
      if (activeTab) {
        await fetchDataWithFilters(activeTab, []);
      }
    } catch (err) {
      console.error('Error clearing filters:', err);
    }
  };

  const filterDataByTimePeriod = (data: any[], timePeriod: string): any[] => {
    if (!data || data.length === 0) return data;
    
    let filteredData = data;
    
    // First apply time period filter
    if (timePeriod !== 'all-time') {
      // Handle custom date range
      if (timePeriod === 'custom') {
        if (!customStartDate || !customEndDate) return data;
        
        filteredData = data.filter(item => {
          const itemDate = new Date(item.date);
          // Create end date with time set to end of day to include the full end date
          const endDateInclusive = new Date(customEndDate);
          endDateInclusive.setHours(23, 59, 59, 999);
          
          return itemDate >= customStartDate && itemDate <= endDateInclusive;
        });
      } else {
        // Use the current date (today) as the reference point for filtering
        // This ensures that "last week" means the past 7 days from today, 
        // and "last month" means the past 30 days from today
        const today = new Date();
        today.setHours(23, 59, 59, 999); // Set to end of today to include today's data
        
        let cutoffDate: Date;
        
        if (timePeriod === 'last-month') {
          cutoffDate = new Date(today);
          cutoffDate.setDate(cutoffDate.getDate() - 30); // 30 days ago from today
          cutoffDate.setHours(0, 0, 0, 0); // Set to start of that day
        } else if (timePeriod === 'last-week') {
          cutoffDate = new Date(today);
          cutoffDate.setDate(cutoffDate.getDate() - 7); // 7 days ago from today
          cutoffDate.setHours(0, 0, 0, 0); // Set to start of that day
        } else {
          return data; // fallback to all data
        }
        
        filteredData = data.filter(item => {
          const itemDate = new Date(item.date);
          return itemDate >= cutoffDate && itemDate <= today;
        });
      }
    }
    
    // Then apply weekend exclusion filter if enabled
    if (excludeWeekends) {
      filteredData = filteredData.filter(item => {
        const itemDate = new Date(item.date);
        const dayOfWeek = itemDate.getDay(); // 0 = Sunday, 6 = Saturday
        return dayOfWeek !== 0 && dayOfWeek !== 6; // Exclude Saturday (6) and Sunday (0)
      });
    }
    
    return filteredData;
  };

  const createChartData = (chartData: any[], xKey: string, yKeys: string[], type: 'line' | 'bar' = 'line') => {
    if (!chartData || chartData.length === 0) return null;

    // Apply time period filter
    const filteredData = filterDataByTimePeriod(chartData, timePeriodFilter);
    if (filteredData.length === 0) return null;

    // Professional color palette with high contrast and accessibility
    const colors = [
      '#3b82f6', // Blue
      '#10b981', // Green
      '#f59e0b', // Amber
      '#ef4444', // Red
      '#8b5cf6', // Violet
      '#06b6d4', // Cyan
      '#f97316', // Orange
      '#84cc16', // Lime
      '#ec4899', // Pink
      '#6366f1', // Indigo
    ];

    const datasets = yKeys.map((key, index) => ({
      label: key.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
      data: filteredData.map(item => item[key] || 0),
      borderColor: colors[index % colors.length],
      backgroundColor: `${colors[index % colors.length]}1A`, // 10% opacity
      tension: 0.1,
      borderWidth: 3,
      pointBackgroundColor: colors[index % colors.length],
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
    }));

    return {
      labels: filteredData.map(item => {
        const dateValue = item[xKey];
        if (excludeWeekends) {
          // For weekends excluded, use formatted date strings to avoid gaps
          if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}/)) {
            const date = new Date(dateValue);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          }
          return dateValue;
        } else {
          // For all days, use Date objects for time scale
          if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}/)) {
            return new Date(dateValue);
          }
          return dateValue;
        }
      }),
      datasets,
    };
  };

  const createPieData = (pieData: any) => {
    if (!pieData || typeof pieData !== 'object') return null;

    // First, normalize language names and merge duplicates (case-insensitive)
    const normalizedData: { [key: string]: number } = {};
    
    Object.entries(pieData).forEach(([language, value]) => {
      const normalizedName = language.toLowerCase();
      
      // Normalize some common language names
      let finalName = language;
      if (normalizedName === 'javascript') finalName = 'JavaScript';
      else if (normalizedName === 'typescript') finalName = 'TypeScript';
      else if (normalizedName === 'python') finalName = 'Python';
      else if (normalizedName === 'java') finalName = 'Java';
      else if (normalizedName === 'others') finalName = 'Others'; // Keep existing Others
      else if (normalizedName === 'csharp' || normalizedName === 'c#') finalName = 'C#';
      else if (normalizedName === 'html') finalName = 'HTML';
      else if (normalizedName === 'css') finalName = 'CSS';
      else if (normalizedName === 'json') finalName = 'JSON';
      else if (normalizedName === 'sql') finalName = 'SQL';
      else if (normalizedName === 'go') finalName = 'Go';
      else if (normalizedName === 'rust') finalName = 'Rust';
      else if (normalizedName === 'php') finalName = 'PHP';
      else if (normalizedName === 'ruby') finalName = 'Ruby';
      else if (normalizedName === 'dart') finalName = 'Dart';
      else if (normalizedName === 'kotlin') finalName = 'Kotlin';
      else if (normalizedName === 'swift') finalName = 'Swift';
      else if (normalizedName === 'yaml' || normalizedName === 'yml') finalName = 'YAML';
      else if (normalizedName === 'xml') finalName = 'XML';
      else if (normalizedName === 'markdown' || normalizedName === 'md') finalName = 'Markdown';
      
      if (!normalizedData[finalName]) {
        normalizedData[finalName] = 0;
      }
      normalizedData[finalName] += (value as number);
    });

    const entries = Object.entries(normalizedData) as [string, number][];
    const total = entries.reduce((sum, [, value]) => sum + value, 0);
    
    // Define the top 4 languages that should be shown individually
    const topLanguagesToShow = ['Java', 'JavaScript', 'TypeScript', 'Python'];
    
    const mainLanguages: [string, number][] = [];
    const languagesToGroup: [string, number][] = [];
    
    entries.forEach(([language, value]) => {
      if (topLanguagesToShow.includes(language)) {
        mainLanguages.push([language, value]);
      } else {
        // Everything else goes to "Others" - including existing "Others" and all small languages
        languagesToGroup.push([language, value]);
      }
    });
    
    // Sort main languages by value (descending)
    mainLanguages.sort(([, a], [, b]) => b - a);
    
    // Create final arrays for chart
    const labels: string[] = [];
    const values: number[] = [];
    
    // Add main languages (top 4)
    mainLanguages.forEach(([language, value]) => {
      labels.push(language);
      values.push(value);
    });
    
    // Add "Others" category combining all non-top-4 languages
    if (languagesToGroup.length > 0) {
      const othersTotal = languagesToGroup.reduce((sum, [, value]) => sum + value, 0);
      
      labels.push('Others');
      values.push(othersTotal);
    }

    // Professional color palette with high contrast
    const colors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
      '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6366f1',
      '#1e40af', '#059669', '#d97706', '#dc2626', '#7c3aed',
      '#64748b' // Slate gray color for "Others"
    ];

    // Use slate gray color for "Others" if it exists
    const backgroundColors = labels.map((label, index) => {
      if (label.startsWith('Others')) {
        return '#64748b'; // Slate gray for Others
      }
      return colors[index % (colors.length - 1)]; // Exclude the gray color for main languages
    });

    return {
      labels,
      datasets: [{
        data: values,
        backgroundColor: backgroundColors,
        borderColor: '#ffffff',
        borderWidth: 2,
        hoverBorderWidth: 4,
        hoverOffset: 8,
        hoverBackgroundColor: backgroundColors.map(color => color + 'dd'),
        hoverBorderColor: '#ffffff',
      }],
    };
  };

  const createEditorsPieData = (pieData: any) => {
    if (!pieData || typeof pieData !== 'object') return null;

    const entries = Object.entries(pieData) as [string, number][];
    // Sort editors by value (descending)
    entries.sort(([, a], [, b]) => b - a);
    
    const labels = entries.map(([editor]) => editor);
    const values = entries.map(([, value]) => value);

    // Professional color palette with high contrast - specific colors for editors
    const editorColors = [
      '#3b82f6', // Blue for VS Code
      '#10b981', // Green for JetBrains  
      '#f59e0b', // Amber for Eclipse
      '#ef4444', // Red for VisualStudio
      '#8b5cf6', // Violet for additional editors
      '#06b6d4', // Cyan
      '#f97316', // Orange
      '#84cc16', // Lime
    ];

    return {
      labels,
      datasets: [{
        data: values,
        backgroundColor: editorColors.slice(0, labels.length),
        borderColor: '#ffffff',
        borderWidth: 2,
        hoverBorderWidth: 4,
        hoverOffset: 8,
        hoverBackgroundColor: editorColors.slice(0, labels.length).map(color => color + 'dd'),
        hoverBorderColor: '#ffffff',
      }],
    };
  };

  // Pie chart specific options with smooth hover
  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1000,
      easing: 'easeOutQuart' as const
    },
    interaction: {
      mode: 'nearest' as const,
      intersect: true,
    },
    plugins: {
      legend: {
        labels: {
          color: '#1e293b',
          font: {
            family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            size: 14,
            weight: 'normal' as const
          },
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
          generateLabels: (chart: any) => {
            const datasets = chart.data.datasets;
            if (datasets.length && datasets[0].data.length) {
              return chart.data.labels.map((label: string, i: number) => {
                const dataset = datasets[0];
                const total = dataset.data.reduce((sum: number, val: number) => sum + val, 0);
                const value = dataset.data[i];
                const percentage = ((value / total) * 100).toFixed(1);
                
                return {
                  text: `${label} (${percentage}%)`,
                  fillStyle: dataset.backgroundColor[i],
                  strokeStyle: dataset.borderColor,
                  lineWidth: dataset.borderWidth,
                  pointStyle: 'circle',
                  hidden: false,
                  index: i
                };
              });
            }
            return [];
          }
        },
        position: 'right' as const,
        align: 'center' as const
      },
      tooltip: {
        enabled: true,
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        titleColor: '#1e293b',
        bodyColor: '#475569',
        borderColor: '#e2e8f0',
        borderWidth: 2,
        padding: 16,
        cornerRadius: 12,
        titleFont: {
          family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          size: 16,
          weight: 'bold' as const
        },
        bodyFont: {
          family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          size: 14,
          weight: 'normal' as const
        },
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.formattedValue;
            const dataset = context.dataset;
            const total = dataset.data.reduce((sum: number, val: number) => sum + val, 0);
            const percentage = ((context.parsed / total) * 100).toFixed(1);
            
            if (label === 'Others') {
              return `Others: ${value} (${percentage}%)`;
            }
            return `${label}: ${value} (${percentage}%)`;
          },
          afterLabel: function(context: any) {
            const label = context.label || '';
            if (label === 'Others') {
              return 'All other programming languages';
            }
            return '';
          }
        }
      }
    },
    elements: {
      arc: {
        borderWidth: 2,
        hoverBorderWidth: 4,
      }
    }
  };

  // Dynamic chart options that change based on weekend exclusion
  const getChartOptions = () => {
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#1e293b',
            font: {
              family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              size: 14,
              weight: 'normal' as const
            },
            padding: 20,
            usePointStyle: true,
            pointStyle: 'circle',
          },
          position: 'top' as const,
          align: 'center' as const
        },
        tooltip: {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          titleColor: '#1e293b',
          bodyColor: '#475569',
          borderColor: '#e2e8f0',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          titleFont: {
            family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            size: 14,
            weight: 'bold' as const
          },
          bodyFont: {
            family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            size: 13,
            weight: 'normal' as const
          },
          boxPadding: 4,
        }
      },
      scales: {
        x: excludeWeekends ? {
          // Use category scale for weekends excluded to avoid gaps
          type: 'category' as const,
          grid: { 
            color: '#f1f5f9',
            borderColor: '#e2e8f0',
          },
          ticks: { 
            color: '#64748b',
            font: { 
              family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              size: 11,
              weight: 'normal' as const
            },
            maxRotation: 45,
            minRotation: 0,
            padding: 8,
            autoSkip: true,
            maxTicksLimit: 15,
          },
          border: {
            color: '#e2e8f0',
          }
        } : {
          // Use time scale for all days to show proper date progression
          type: 'time' as const,
          time: {
            unit: 'day' as const,
            displayFormats: {
              day: 'MMM dd'
            },
            tooltipFormat: 'MMM dd, yyyy'
          },
          grid: { 
            color: '#f1f5f9',
            borderColor: '#e2e8f0',
          },
          ticks: { 
            color: '#64748b',
            font: { 
              family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              size: 11,
              weight: 'normal' as const
            },
            maxRotation: 45,
            minRotation: 0,
            padding: 8,
            autoSkip: true,
            maxTicksLimit: 15,
          },
          border: {
            color: '#e2e8f0',
          }
        },
        y: {
          grid: { 
            color: '#f1f5f9',
            borderColor: '#e2e8f0',
          },
          ticks: { 
            color: '#64748b',
            font: { 
              family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              size: 12,
              weight: 'normal' as const
            },
            padding: 8,
          },
          border: {
            color: '#e2e8f0',
          },
          beginAtZero: true
        }
      },
      interaction: {
        intersect: false,
        mode: 'index' as const,
      },
      elements: {
        line: {
          tension: 0.2,
        },
        point: {
          hoverRadius: 8,
        }
      }
    };

    return baseOptions;
  };

  const chartOptions = getChartOptions();

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
              background: 'var(--primary-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              minWidth: '220px',
              maxWidth: '300px',
              minHeight: '145px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-md)'
            }}>
              <div style={{ 
                fontSize: '34px', 
                fontWeight: 'bold',
                //color: 'var(--primary-color)',
                color: '#5faafb',
                marginBottom: '8px'
              }}>
                {metric.value}
              </div>
              <div style={{ 
                fontSize: '16px',
                lineHeight: '1.3',
                padding: '0 5px',
                color: 'var(--secondary-color)',
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
                  color: 'var(--secondary-color)',
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
      <div className={styles.professionalMetrics}>
        {metrics.map((metric, index) => (
          <div key={index} className={styles.professionalMetric}>
            <span className={styles.professionalMetricValue}>{metric.value}</span>
            <span className={styles.professionalMetricLabel}>{metric.label}</span>
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
        <h4 style={{ color: 'var(--primary-color)', marginBottom: '10px' }}>{title}</h4>
        <div style={{ 
          overflowX: 'auto', 
          maxHeight: '400px', 
          overflowY: 'auto', 
          border: '1px solid var(--border-color)', 
          borderRadius: '8px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <table className={styles.professionalTable} style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--tertiary-bg)', zIndex: 1 }}>
              <tr>
                {headers.map(header => (
                  <th 
                    key={header} 
                    onClick={() => requestSort(header)}
                    style={{ 
                      cursor: 'pointer',
                      padding: '12px 15px',
                      textAlign: 'left',
                      backgroundColor: 'var(--tertiary-bg)',
                      borderBottom: '2px solid var(--border-color)',
                      color: 'var(--primary-color)'
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
                <tr key={index} style={{ backgroundColor: index % 2 === 0 ? 'var(--primary-bg)' : 'var(--tertiary-bg)' }}>
                  {headers.map(header => (
                    <td key={header} style={{ 
                      padding: '10px 15px', 
                      borderBottom: '1px solid var(--border-color)',
                      color: 'var(--primary-color)'
                    }}>{row[header]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ color: 'var(--secondary-color)', fontSize: '12px', marginTop: '10px', textAlign: 'right' }}>
          Showing all {tableData.length} records
        </p>
      </div>
    );
  };

  // Billing table sorting functions
  const handleBillingSort = (key: string) => {
    let direction: 'ascending' | 'descending' | null = 'ascending';
    
    if (billingSortConfig.key === key) {
      if (billingSortConfig.direction === 'ascending') {
        direction = 'descending';
      } else if (billingSortConfig.direction === 'descending') {
        direction = null;
      }
    }
    
    setBillingSortConfig({ key, direction });
  };

  const getBillingSortIndicator = (key: string) => {
    if (billingSortConfig.key !== key) return '';
    if (billingSortConfig.direction === 'ascending') return ' ▲';
    if (billingSortConfig.direction === 'descending') return ' ▼';
    return '';
  };

  const renderTabContent = (tab: string) => {
    const tabData = data[tab];
    const isLoading = loading[tab];
    const hasError = error[tab];

    if (isLoading) {
      return (
        <div className={styles.professionalLoading}>
          <div className={styles.professionalSpinner}></div>
          Loading {tab} data...
        </div>
      );
    }

    if (hasError) {
      return (
        <div className={styles.professionalError}>
          Error: {hasError}
          <br />
          <button onClick={() => fetchData(tab)} className={styles.professionalBtn} style={{ marginTop: '10px' }}>
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
            gap: (activeTab === 'editors' || activeTab === 'languages') ? '40px' : '20px',
            maxWidth: '1200px',
            margin: '0 auto 20px',
            width: '95%'
          }}>
            {/* Left Side: Filters */}
            <div style={{ flex: (activeTab === 'editors' || activeTab === 'languages') ? '0 0 50%' : '0 0 25%' }}>
              {availableFilters[activeTab] && availableFilters[activeTab].length > 0 && (
                <div className={styles.professionalFilters}>
                  <div className={styles.professionalFilterTitle}>
                    {activeTab === 'languages' 
                      ? (filters[activeTab]?.length > 0 
                          ? `Filter languages (${filters[activeTab].length} selected)`
                          : `Filter languages (showing top 3 by default)`)
                      : activeTab === 'editors'
                      ? (filters[activeTab]?.length > 0 
                          ? `Filter editors (${filters[activeTab].length} selected)`
                          : `Filter editors (showing all by default)`)
                      : `Filter ${activeTab}`
                    }
                  </div>
                  <div className={styles.professionalCheckboxesScrollable}>
                    {(availableFilters[activeTab] || []).map(option => (
                      <label key={option} className={styles.professionalCheckbox}>
                        <input
                          type="checkbox"
                          checked={(pendingFilters[activeTab] || []).includes(option)}
                          onChange={(e) => {
                            try {
                              const isChecked = e.target.checked;
                              setPendingFilters(prev => {
                                const current = prev[activeTab] || [];
                                if (isChecked) {
                                  return { ...prev, [activeTab]: [...current, option] };
                                } else {
                                  return { ...prev, [activeTab]: current.filter((item: string) => item !== option) };
                                }
                              });
                            } catch (err) {
                              console.error('Error in checkbox onChange:', err);
                            }
                          }}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                  <div className={styles.professionalControls}>
                    <button onClick={applyFilters} className={styles.professionalBtn}>Apply Filters</button>
                    <button onClick={clearFilters} className={styles.professionalBtn}>Clear All</button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Right Side: Metrics */}
            <div style={{ 
              flex: (activeTab === 'editors' || activeTab === 'languages') ? '0 0 calc(50% - 40px)' : '1',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start'
            }}>
              {activeTab !== 'billing' && (
                <div className={styles.professionalMetrics}>
                  <div className={styles.professionalMetric} style={(activeTab === 'editors' || activeTab === 'languages') ? {
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
                    <span className={styles.professionalMetricValue}>
                      {activeTab === 'editors' 
                        ? (data[activeTab]?.available_editors?.length || 0)
                        : activeTab === 'languages'
                        ? (data[activeTab]?.available_languages?.length || 0)
                        : 0
                      }
                    </span>
                    <span className={styles.professionalMetricLabel}>
                      {activeTab === 'editors' ? 'Editors Tracked' : activeTab === 'languages' ? 'Languages Tracked' : 'Items Tracked'}
                    </span>
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
              <div className={styles.professionalFilters} style={{ maxWidth: '1200px', margin: '0 auto', width: '95%' }}>
                <div className={styles.professionalFilterTitle}>
                  Filter {activeTab}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <select 
                    className={styles.professionalSelect} 
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
                  <div className={styles.professionalControls} style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={applyFilters} className={styles.professionalBtn}>Apply Filters</button>
                    <button onClick={clearFilters} className={styles.professionalBtn}>Clear All</button>
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
              <div className={styles.professionalSection} style={{ maxWidth: '1200px', marginTop: '10px', marginLeft: 'auto', marginRight: 'auto', width: '95%' }}>
                <div 
                  className={styles.professionalSectionHeader}
                  onClick={() => toggleSection('org-active-engaged')}
                >
                  <h3 className={styles.professionalSectionTitle}>Active vs Engaged Users</h3>
                  <button className={styles.professionalToggleBtn}>
                    {collapsedSections['org-active-engaged'] ? '▼ Expand' : '▲ Collapse'}
                  </button>
                </div>
                <div className={`${styles.professionalSectionContent} ${collapsedSections['org-active-engaged'] ? styles.collapsed : ''}`}>
                  <div className={styles.professionalChart} style={{ margin: '0 auto', height: '500px', maxWidth: '1200px', width: '95%' }}>
                    {(() => {
                      const chartData = createChartData(
                        tabData.active_vs_engaged_daily.data,
                        'date',
                        ['total_active_users', 'total_engaged_users']
                      );
                      return chartData ? <Line key={getChartKey()} data={chartData} options={chartOptions} /> : null;
                    })()}
                  </div>
                  <div className={styles.professionalControlsSection}>
                    <button 
                      onClick={() => toggleTables(activeTab + '-active-engaged')} 
                      className={`${styles.professionalBtn} ${showTables[activeTab + '-active-engaged'] ? styles.active : ''}`}
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
              <div className={styles.professionalSection} style={{ maxWidth: '1200px', margin: '20px auto', width: '95%' }}>
                <div 
                  className={styles.professionalSectionHeader}
                  onClick={() => toggleSection('org-features')}
                >
                  <h3 className={styles.professionalSectionTitle}>Features Usage</h3>
                  <button className={styles.professionalToggleBtn}>
                    {collapsedSections['org-features'] ? '▼ Expand' : '▲ Collapse'}
                  </button>
                </div>
                <div className={`${styles.professionalSectionContent} ${collapsedSections['org-features'] ? styles.collapsed : ''}`}>
                  <div className={styles.professionalChart} style={{ margin: '0 auto', height: '500px' }}>
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
                  <div className={styles.professionalControlsSection}>
                    <button 
                      onClick={() => toggleTables(activeTab + '-features')} 
                      className={`${styles.professionalBtn} ${showTables[activeTab + '-features'] ? styles.active : ''}`}
                    >
                      {showTables[activeTab + '-features'] ? 'Hide Table' : 'Show Table'}
                    </button>
                  </div>
                  {showTables[activeTab + '-features'] && renderTable(tabData.features_daily.data, 'Daily Features Usage')}
                </div>
              </div>
            )}

            {/* Average Chat Prompts per User by Editor */}
            {tabData.chat_prompts?.success && tabData.chat_prompts.data && (
              <div className={styles.professionalSection} style={{ maxWidth: '1200px', margin: '20px auto', width: '95%' }}>
                <div 
                  className={styles.professionalSectionHeader}
                  onClick={() => toggleSection('org-chat-prompts')}
                >
                  <h3 className={styles.professionalSectionTitle}>Average Chat Prompts per User by Editor</h3>
                  <button className={styles.professionalToggleBtn}>
                    {collapsedSections['org-chat-prompts'] ? '▼ Expand' : '▲ Collapse'}
                  </button>
                </div>
                <div className={`${styles.professionalSectionContent} ${collapsedSections['org-chat-prompts'] ? styles.collapsed : ''}`}>
                  <div className={styles.professionalChart} style={{ margin: '0 auto', height: '500px' }}>
                    {(() => {
                      const chatData = tabData.chat_prompts.data;
                      const availableEditors = tabData.chat_prompts.available_editors || [];
                      
                      const chartData = createChartData(
                        chatData,
                        'date',
                        availableEditors,
                        'bar'
                      );
                      return chartData ? (
                        <Bar 
                          key={getChartKey()} 
                          data={chartData} 
                          options={{
                            ...getChartOptions(),
                            plugins: {
                              ...getChartOptions().plugins,
                              title: {
                                display: true,
                                text: 'Average Chat Prompts per User by Editor Over Time',
                                font: { size: 16, weight: 'bold' }
                              },
                              tooltip: {
                                callbacks: {
                                  label: function(context: any) {
                                    return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} prompts/user`;
                                  }
                                }
                              }
                            },
                            scales: {
                              ...getChartOptions().scales,
                              y: {
                                ...getChartOptions().scales?.y,
                                title: {
                                  display: true,
                                  text: 'Average Prompts per User'
                                }
                              },
                              x: {
                                ...getChartOptions().scales?.x,
                                title: {
                                  display: true,
                                  text: 'Date'
                                }
                              }
                            }
                          }} 
                        />
                      ) : null;
                    })()}
                  </div>
                  <div className={styles.professionalControlsSection}>
                    <button 
                      onClick={() => toggleTables(activeTab + '-chat-prompts')} 
                      className={`${styles.professionalBtn} ${showTables[activeTab + '-chat-prompts'] ? styles.active : ''}`}
                    >
                      {showTables[activeTab + '-chat-prompts'] ? 'Hide Table' : 'Show Table'}
                    </button>
                  </div>
                  {showTables[activeTab + '-chat-prompts'] && renderTable(tabData.chat_prompts.raw_data, 'Daily Average Chat Prompts per User by Editor')}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'languages' && (
          <>
            {/* Top Languages */}
            {originalData[activeTab]?.top_languages && Object.keys(originalData[activeTab].top_languages.data).length > 0 && (
              <div className={styles.professionalSection} style={{ maxWidth: '1200px', margin: '20px auto', width: '95%' }}>
                <div 
                  className={styles.professionalSectionHeader}
                  onClick={() => toggleSection('lang-top')}
                >
                  <h3 className={styles.professionalSectionTitle}>Top Languages</h3>
                  <button className={styles.professionalToggleBtn}>
                    {collapsedSections['lang-top'] ? '▼ Expand' : '▲ Collapse'}
                  </button>
                </div>
                <div className={`${styles.professionalSectionContent} ${collapsedSections['lang-top'] ? styles.collapsed : ''}`}>
                  <div className={styles.professionalChart} style={{ margin: '0 auto', height: '500px' }}>
                    {(() => {
                      const chartData = createPieData(originalData[activeTab]?.top_languages?.data);
                      return chartData ? <Pie key={getPieChartKey()} data={chartData} options={pieChartOptions} /> : null;
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Code Acceptance and Suggestions Per Language */}
            {data[activeTab]?.languages_daily && (
              <div className={styles.professionalSection} style={{ maxWidth: '1200px', margin: '20px auto', width: '95%' }}>
                <div 
                  className={styles.professionalSectionHeader}
                  onClick={() => toggleSection('lang-code-stats')}
                >
                  <h3 className={styles.professionalSectionTitle}>Code Acceptance and Suggestions Per Language</h3>
                  <button className={styles.professionalToggleBtn}>
                    {collapsedSections['lang-code-stats'] ? '▼ Expand' : '▲ Collapse'}
                  </button>
                </div>
                <div className={`${styles.professionalSectionContent} ${collapsedSections['lang-code-stats'] ? styles.collapsed : ''}`}>
                  <div className={styles.professionalChart} style={{ margin: '0 auto', height: '500px' }}>
                    {(() => {
                      // Use original data when no filters, filtered data when filters are applied
                      const languagesData = filters[activeTab]?.length > 0 
                        ? data[activeTab].languages_daily.data 
                        : originalData[activeTab]?.languages_daily?.data || data[activeTab].languages_daily.data;
                      
                      const selectedLangs = filters[activeTab]?.length > 0 
                        ? filters[activeTab] 
                        : getTopLanguages(originalData[activeTab]?.languages_daily?.data || data[activeTab].languages_daily.data, 3);
                      
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
                      // Enhanced professional color palette with high contrast and better distinguishability
                      const acceptanceColors = [
                        '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', 
                        '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
                        '#aec7e8', '#ffbb78', '#98df8a', '#ff9896', '#c5b0d5'
                      ];
                      const suggestionColors = [
                        '#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f',
                        '#edc949', '#af7aa1', '#ff9d9a', '#9c755f', '#bab0ab',
                        '#1f83b4', '#ff8c0e', '#3ca13c', '#e62738', '#a467cd'
                      ];
                      
                      selectedLangs.forEach((lang: string, langIndex: number) => {
                        // Acceptance dataset for this language
                        allDatasets.push({
                          type: 'bar',
                          label: `${lang} Acceptances`,
                          data: chartData.map((item: any) => item[`${lang}_acceptances`] || 0),
                          backgroundColor: acceptanceColors[langIndex % acceptanceColors.length],
                          borderColor: acceptanceColors[langIndex % acceptanceColors.length],
                          borderWidth: 1,
                          borderRadius: 4,
                          borderSkipped: false,
                        });
                        
                        // Suggestions dataset for this language
                        allDatasets.push({
                          type: 'bar',
                          label: `${lang} Suggestions`,
                          data: chartData.map((item: any) => item[`${lang}_suggestions`] || 0),
                          backgroundColor: suggestionColors[langIndex % suggestionColors.length],
                          borderColor: suggestionColors[langIndex % suggestionColors.length],
                          borderWidth: 1,
                          borderRadius: 4,
                          borderSkipped: false,
                        });
                      });
                      
                      // Create final chart data
                      const finalChartData = {
                        labels: chartData.map((item: any) => {
                          if (excludeWeekends) {
                            // For weekends excluded, use formatted date strings to avoid gaps
                            const date = new Date(item.date);
                            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          } else {
                            // For all days, use original date for time scale
                            return item.date;
                          }
                        }),
                        datasets: allDatasets,
                      };
                      
                      return finalChartData ? 
                        <Bar 
                          key={getChartKey()} 
                          data={finalChartData} 
                          options={{
                            ...getChartOptions(),
                            scales: {
                              x: excludeWeekends ? {
                                type: 'category',
                                title: {
                                  display: true,
                                  text: 'Date',
                                  color: 'var(--primary-color)'
                                },
                                grid: {
                                  display: true,
                                  color: 'rgba(0, 0, 0, 0.1)'
                                },
                                ticks: {
                                  autoSkip: false,
                                  maxTicksLimit: 15,
                                  color: 'var(--primary-color)',
                                  maxRotation: 45
                                }
                              } : {
                                type: 'time',
                                time: {
                                  unit: 'day',
                                  displayFormats: {
                                    day: 'MMM dd',
                                    week: 'MMM dd',
                                    month: 'MMM yyyy'
                                  },
                                  tooltipFormat: 'PPP'
                                },
                                title: {
                                  display: true,
                                  text: 'Date',
                                  color: 'var(--primary-color)'
                                },
                                grid: {
                                  display: true,
                                  color: 'rgba(0, 0, 0, 0.1)'
                                },
                                ticks: {
                                  autoSkip: false,
                                  maxTicksLimit: 15,
                                  color: 'var(--primary-color)',
                                  maxRotation: 45
                                }
                              },
                              y: {
                                beginAtZero: true,
                                title: {
                                  display: true,
                                  text: 'Count',
                                  color: 'var(--primary-color)'
                                },
                                grid: {
                                  display: true,
                                  color: 'rgba(0, 0, 0, 0.1)'
                                },
                                ticks: {
                                  color: 'var(--primary-color)'
                                }
                              }
                            },
                            plugins: {
                              ...getChartOptions().plugins,
                              legend: {
                                display: true,
                                position: 'top',
                                labels: {
                                  usePointStyle: true,
                                  pointStyle: 'rect',
                                  color: 'var(--primary-color)',
                                  font: {
                                    size: 12
                                  }
                                }
                              },
                              title: {
                                display: true,
                                text: selectedLangs.length === 0 ? 
                                  'No languages selected' : 
                                  `Code Acceptance & Suggestions: ${selectedLangs.join(', ')}`,
                                color: 'var(--primary-color)',
                                font: {
                                  size: 16,
                                  weight: 'bold'
                                }
                              }
                            },
                            responsive: true,
                            maintainAspectRatio: false,
                            interaction: {
                              mode: 'index',
                              intersect: false,
                            },
                            elements: {
                              bar: {
                                borderWidth: 1,
                                borderRadius: 4
                              }
                            }
                          }} 
                        /> : null;
                    })()}
                  </div>
                  <div className={styles.professionalControlsSection}>
                    <button 
                      onClick={() => toggleTables(activeTab)} 
                      className={`${styles.professionalBtn} ${showTables[activeTab] ? styles.active : ''}`}
                    >
                      {showTables[activeTab] ? 'Hide Table' : 'Show Table'}
                    </button>
                  </div>
                  {showTables[activeTab] && (() => {
                    const selectedLangs = filters[activeTab]?.length > 0 
                      ? filters[activeTab] 
                      : getTopLanguages(originalData[activeTab]?.languages_daily?.data || data[activeTab].languages_daily.data, 3);
                    
                    const dataToUse = filters[activeTab]?.length > 0 
                      ? data[activeTab].languages_daily.data 
                      : originalData[activeTab]?.languages_daily?.data || data[activeTab].languages_daily.data;
                    
                    return renderTable(
                      dataToUse.filter((item: any) => 
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
              <div className={styles.professionalSection} style={{ maxWidth: '1200px', margin: '20px auto', width: '95%' }}>
                <div 
                  className={styles.professionalSectionHeader}
                  onClick={() => toggleSection('edit-top')}
                >
                  <h3 className={styles.professionalSectionTitle}>Top Editors</h3>
                  <button className={styles.professionalToggleBtn}>
                    {collapsedSections['edit-top'] ? '▼ Expand' : '▲ Collapse'}
                  </button>
                </div>
                <div className={`${styles.professionalSectionContent} ${collapsedSections['edit-top'] ? styles.collapsed : ''}`}>
                  <div className={styles.professionalChart} style={{ margin: '0 auto', height: '500px' }}>
                    {(() => {
                      const chartData = createEditorsPieData(originalData[activeTab]?.top_editors?.data);
                      return chartData ? <Pie key={getPieChartKey()} data={chartData} options={pieChartOptions} /> : null;
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Total Code Acceptance and Suggestions per Editor */}
            {data[activeTab]?.editors_daily && (
              <div className={styles.professionalSection} style={{ maxWidth: '1200px', margin: '20px auto', width: '95%' }}>
                <div 
                  className={styles.professionalSectionHeader}
                  onClick={() => toggleSection('edit-code-stats')}
                >
                  <h3 className={styles.professionalSectionTitle}>Total Code Acceptance and Suggestions per Editor</h3>
                  <button className={styles.professionalToggleBtn}>
                    {collapsedSections['edit-code-stats'] ? '▼ Expand' : '▲ Collapse'}
                  </button>
                </div>
                <div className={`${styles.professionalSectionContent} ${collapsedSections['edit-code-stats'] ? styles.collapsed : ''}`}>
                  <div className={styles.professionalChart} style={{ margin: '0 auto', height: '500px' }}>
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
                      // Professional color palette with high contrast and accessibility
                      const colors = [
                        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
                        '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6366f1'
                      ];
                      
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
                        labels: chartData.map((item: any) => {
                          if (excludeWeekends) {
                            // For weekends excluded, use formatted date strings to avoid gaps
                            const date = new Date(item.date);
                            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          } else {
                            // For all days, use original date for time scale
                            return item.date;
                          }
                        }),
                        datasets: allDatasets,
                      };
                      
                      return finalChartData && finalChartData.datasets.length > 0 ? 
                        <Line 
                          key={getChartKey()} 
                          data={finalChartData} 
                          options={{
                            ...getChartOptions(),
                            plugins: {
                              ...getChartOptions().plugins,
                              title: {
                                display: true,
                                text: selectedEditors.length === 0 ? 
                                  'No editors selected' : 
                                  `Showing data for: ${selectedEditors.join(', ')}`,
                                color: 'var(--primary-color)'
                              }
                            }
                          }} 
                        /> : <div style={{ color: 'var(--secondary-color)', padding: '20px', textAlign: 'center' }}>No data available for selected editors</div>;
                    })()}
                  </div>
                  <div className={styles.professionalControlsSection}>
                    <button 
                      onClick={() => toggleTables(activeTab + '-code')} 
                      className={`${styles.professionalBtn} ${showTables[activeTab + '-code'] ? styles.active : ''}`}
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
              <div className={styles.professionalSection} style={{ maxWidth: '1200px', margin: '20px auto', width: '95%' }}>
                <div 
                  className={styles.professionalSectionHeader}
                  onClick={() => toggleSection('edit-engaged-users')}
                >
                  <h3 className={styles.professionalSectionTitle}>Engaged Users per Editor</h3>
                  <button className={styles.professionalToggleBtn}>
                    {collapsedSections['edit-engaged-users'] ? '▼ Expand' : '▲ Collapse'}
                  </button>
                </div>
                <div className={`${styles.professionalSectionContent} ${collapsedSections['edit-engaged-users'] ? styles.collapsed : ''}`}>
                  <div className={styles.professionalChart} style={{ margin: '0 auto', height: '500px' }}>
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
                      
                      // Professional color palette for editors
                      const colors = [
                        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
                        '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#6366f1'
                      ];
                      
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
                        labels: chartData.map((item: any) => {
                          if (excludeWeekends) {
                            // For weekends excluded, use formatted date strings to avoid gaps
                            const date = new Date(item.date);
                            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          } else {
                            // For all days, use original date for time scale
                            return item.date;
                          }
                        }),
                        datasets
                      };
                      
                      return finalChartData && finalChartData.datasets.length > 0 ? 
                        <Line 
                          key={getChartKey()} 
                          data={finalChartData}
                          options={{
                            ...getChartOptions(),
                            plugins: {
                              ...getChartOptions().plugins,
                              title: {
                                display: true,
                                text: selectedEditors.length === 0 ? 
                                  'No editors selected' : 
                                  `Showing data for: ${selectedEditors.join(', ')}`,
                                color: 'var(--primary-color)'
                              }
                            }
                          }}
                        /> : <div style={{ color: 'var(--secondary-color)', padding: '20px', textAlign: 'center' }}>No data available for selected editors</div>;
                    })()}
                  </div>
                  <div className={styles.professionalControlsSection}>
                    <button 
                      onClick={() => toggleTables(activeTab + '-engaged')} 
                      className={`${styles.professionalBtn} ${showTables[activeTab + '-engaged'] ? styles.active : ''}`}
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
            <div className={styles.professionalSection} style={{ maxWidth: '1200px', margin: '20px auto', width: '95%' }}>
              <div className={styles.professionalSectionHeader}>
                <h3 className={styles.professionalSectionTitle}>Billing Information</h3>
              </div>
              <div className={styles.professionalSectionContent}>
                {data[activeTab]?.error ? (
                  <p style={{ color: 'var(--warning-color)' }}>No billing data available in the current database</p>
                ) : (
                  <div className={styles.professionalMetrics}>
                    {(() => {
                      // Filter out users with N/A or Unknown values
                      const validUsers = data[activeTab]?.seat_details?.data?.filter((user: any) => {
                        const hasValidId = user.assignee_id && user.assignee_id !== 'N/A' && user.assignee_id !== 0;
                        const hasValidLogin = user.assignee_login && 
                                            user.assignee_login !== 'N/A' && 
                                            user.assignee_login.toLowerCase() !== 'unknown';
                        return hasValidId && hasValidLogin;
                      }) || [];
                      
                      // Calculate total premium users (filtered)
                      const totalPremiumUsers = validUsers.length;
                      
                      // Calculate users who purchased in the last week (filtered)
                      const lastWeekUsers = validUsers.filter((user: any) => {
                        if (!user.created_at) return false;
                        const purchaseDate = new Date(user.created_at);
                        const oneWeekAgo = new Date();
                        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                        return purchaseDate >= oneWeekAgo;
                      }).length || 0;
                      
                      return (
                        <>
                          <div className={styles.professionalMetric}>
                            <span className={styles.professionalMetricValue}>{totalPremiumUsers}</span>
                            <span className={styles.professionalMetricLabel}>Total Premium Users</span>
                          </div>
                          <div className={styles.professionalMetric}>
                            <span className={styles.professionalMetricValue}>{lastWeekUsers}</span>
                            <span className={styles.professionalMetricLabel}>New Users (Last 7 Days)</span>
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
              <div className={styles.professionalSection} style={{ maxWidth: '1200px', margin: '20px auto', width: '95%' }}>
                <div 
                  className={styles.professionalSectionHeader}
                  onClick={() => toggleSection('billing-plan-purchases')}
                >
                  <h3 className={styles.professionalSectionTitle}>Plan Purchases by Date</h3>
                  <button className={styles.professionalToggleBtn}>
                    {collapsedSections['billing-plan-purchases'] ? '▼ Expand' : '▲ Collapse'}
                  </button>
                </div>
                <div className={`${styles.professionalSectionContent} ${collapsedSections['billing-plan-purchases'] ? styles.collapsed : ''}`}>
                  <div className={styles.professionalChart} style={{ margin: '0 auto', height: '500px' }}>
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
              <div className={styles.professionalSection} style={{ maxWidth: '1200px', margin: '20px auto', width: '95%' }}>
                <div 
                  className={styles.professionalSectionHeader}
                  onClick={() => toggleSection('billing-seat-details')}
                >
                  <h3 className={styles.professionalSectionTitle}>Billing Seat Details</h3>
                  <button className={styles.professionalToggleBtn}>
                    {collapsedSections['billing-seat-details'] ? '▼ Expand' : '▲ Collapse'}
                  </button>
                </div>
                <div className={`${styles.professionalSectionContent} ${collapsedSections['billing-seat-details'] ? styles.collapsed : ''}`}>
                  {/* Display Control */}
                  <div style={{ 
                    marginBottom: '15px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px',
                    fontSize: '14px'
                  }}>
                    <label htmlFor="billing-limit">Show entries:</label>
                    <select
                      id="billing-limit"
                      value={billingTableLimit}
                      onChange={(e) => setBillingTableLimit(Number(e.target.value))}
                      style={{
                        padding: '5px 10px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px',
                        backgroundColor: 'var(--bg-color)',
                        color: 'var(--text-color)'
                      }}
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={75}>75</option>
                      <option value={100}>100</option>
                    </select>
                    <span style={{ color: 'var(--secondary-text-color)' }}>
                      {(() => {
                        const filteredData = data[activeTab].seat_details.data.filter((seat: any) => {
                          const hasValidId = seat.assignee_id && seat.assignee_id !== 'N/A' && seat.assignee_id !== 0;
                          const hasValidLogin = seat.assignee_login && 
                                              seat.assignee_login !== 'N/A' && 
                                              seat.assignee_login.toLowerCase() !== 'unknown';
                          return hasValidId && hasValidLogin;
                        });
                        const totalCount = filteredData.length;
                        const displayedCount = Math.min(billingTableLimit, totalCount);
                        return `Showing ${displayedCount} of ${totalCount} entries`;
                      })()}
                    </span>
                  </div>
                  <div className={styles.professionalTableContainer}>
                    <table className={styles.professionalTable}>
                                           <thead>
                        <tr>
                          <th>#</th>
                          <th 
                            onClick={() => handleBillingSort('assignee_login')}
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                          >
                            Username{getBillingSortIndicator('assignee_login')}
                          </th>
                          <th 
                            onClick={() => handleBillingSort('created_at')}
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                          >
                            Purchased Date{getBillingSortIndicator('created_at')}
                          </th>
                          <th 
                            onClick={() => handleBillingSort('last_activity_at')}
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                          >
                            Last Activity Date{getBillingSortIndicator('last_activity_at')}
                          </th>
                          <th 
                            onClick={() => handleBillingSort('last_activity_editor')}
                            style={{ cursor: 'pointer', userSelect: 'none' }}
                          >
                            Last Activity Editor{getBillingSortIndicator('last_activity_editor')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          // Filter out users with N/A or Unknown values
                          let filteredData = data[activeTab].seat_details.data.filter((seat: any) => {
                            const hasValidId = seat.assignee_id && seat.assignee_id !== 'N/A' && seat.assignee_id !== 0;
                            const hasValidLogin = seat.assignee_login && 
                                                seat.assignee_login !== 'N/A' && 
                                                seat.assignee_login.toLowerCase() !== 'unknown';
                            return hasValidId && hasValidLogin;
                          });

                          // Apply sorting if active
                          if (billingSortConfig.key && billingSortConfig.direction) {
                            filteredData.sort((a: any, b: any) => {
                              const aValue = a[billingSortConfig.key];
                              const bValue = b[billingSortConfig.key];

                              // Handle date sorting
                              if (billingSortConfig.key === 'created_at' || billingSortConfig.key === 'last_activity_at') {
                                const aDate = aValue ? new Date(aValue) : new Date(0);
                                const bDate = bValue ? new Date(bValue) : new Date(0);
                                return billingSortConfig.direction === 'ascending' 
                                  ? aDate.getTime() - bDate.getTime() 
                                  : bDate.getTime() - aDate.getTime();
                              }

                              // Handle string sorting
                              const aString = String(aValue || '').toLowerCase();
                              const bString = String(bValue || '').toLowerCase();
                              
                              if (aString < bString) {
                                return billingSortConfig.direction === 'ascending' ? -1 : 1;
                              }
                              if (aString > bString) {
                                return billingSortConfig.direction === 'ascending' ? 1 : -1;
                              }
                              return 0;
                            });
                          } else {
                            // Default sort by purchase date (created_at) ascending if no custom sort
                            filteredData.sort((a: any, b: any) => {
                              const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
                              const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
                              return dateA.getTime() - dateB.getTime();
                            });
                          }

                          // Limit the number of displayed records
                          return filteredData.slice(0, billingTableLimit).map((seat: any, index: number) => (
                            <tr key={seat.assignee_id || index}>
                              <td>{index + 1}</td>
                              <td>{seat.assignee_login}</td>
                              <td>{seat.created_at || 'N/A'}</td>
                              <td>{seat.last_activity_at || 'N/A'}</td>
                              <td>{seat.last_activity_editor || 'N/A'}</td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Raw Data Control */}
        <div className={styles.professionalSection} style={{ 
          maxWidth: '1200px', 
          margin: '30px auto',
          width: '95%'
        }}>
          <div className={styles.professionalSectionHeader}>
            <h3 className={styles.professionalSectionTitle}>Raw Data</h3>
            <button 
              onClick={() => toggleRawData(activeTab)} 
              className={`${styles.professionalBtn} ${showRawData[activeTab] ? styles.active : ''}`}
            >
              {showRawData[activeTab] ? 'Hide Raw Data' : 'Show Raw Data'}
            </button>
          </div>
          {showRawData[activeTab] && (
            <div className={styles.professionalSectionContent}>
              <div className={styles.professionalRawData}>
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
    const baseKey = `chart-${activeTab}-${filters[activeTab]?.join('-')}-${timePeriodFilter}-${excludeWeekends ? 'no-weekends' : 'all-days'}`;
    if (timePeriodFilter === 'custom' && customStartDate && customEndDate) {
      return `${baseKey}-${customStartDate.toDateString()}-${customEndDate.toDateString()}`;
    }
    return baseKey;
  };

  // Helper function to generate chart key for pie charts (excludes filters)
  const getPieChartKey = () => {
    const baseKey = `pie-chart-${activeTab}-${timePeriodFilter}-${excludeWeekends ? 'no-weekends' : 'all-days'}`;
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
          className={styles.timePeriodSelect}
          value={timePeriodFilter}
          onChange={(e) => setTimePeriodFilter(e.target.value)}
          style={{ 
            minWidth: '160px',
            height: '36px',
            fontSize: '14px',
            width: 'auto',
            marginBottom: '0'
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
            <div style={{ width: '150px' }}>
              <DatePicker
                selected={customStartDate}
                onChange={(date) => setCustomStartDate(date)}
                placeholderText="Start Date"
                dateFormat="yyyy-MM-dd"
                className={styles.dateInput}
              />
            </div>
            <div style={{ width: '150px' }}>
              <DatePicker
                selected={customEndDate}
                onChange={(date) => setCustomEndDate(date)}
                placeholderText="End Date"
                dateFormat="yyyy-MM-dd"
                className={styles.dateInput}
              />
            </div>
          </>
        )}

        <button
          className={styles.weekendToggleButton}
          onClick={() => setExcludeWeekends(!excludeWeekends)}
          style={{
            height: '36px',
            padding: '0 12px',
            fontSize: '14px',
            backgroundColor: excludeWeekends ? '#3b82f6' : '#f1f5f9',
            color: excludeWeekends ? 'white' : '#475569',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: '500',
            whiteSpace: 'nowrap'
          }}
          title={excludeWeekends ? 'Include weekends in chart data' : 'Exclude weekends from chart data'}
        >
          <span style={{ fontSize: '12px' }}>
            {excludeWeekends ? '📊' : '📅'}
          </span>
          {excludeWeekends ? 'Weekdays Only' : 'All Days'}
        </button>
      </div>
    );
  };

  return (
    <div className={styles.professionalContainer}>
      <div className={styles.professionalHeader}>
        <h1 className={styles.professionalTitle}>GitHub Copilot Analytics</h1>
        <p className={styles.professionalSubtitle}>
          Comprehensive insights into usage, engagement, and feature adoption
        </p>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', width: '95%' }}>
        <div className={styles.professionalTabs}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`${styles.professionalTab} ${activeTab === tab.id ? styles.active : ''}`}
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
