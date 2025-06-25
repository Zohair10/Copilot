let currentButton = null;
let activeCharts = [];
let currentType = null;
let availableOptions = [];
let selectedFilters = [];

let selectedDateRange = 7; // default to last 7 days
let customStartDate = null;
let customEndDate = null;

// Enhanced vibrant color palette for better visibility
const colors = {
    primary: [
        '#FF5733', // Vibrant Red-Orange
        '#33C1FF', // Bright Blue
        '#28A745', // Vivid Green
        '#FFC300', // Bright Yellow
        '#C70039', // Strong Red
        '#8E44AD', // Vivid Purple
        '#FF33F6', // Neon Pink
        '#00FFB3', // Aqua
        '#FF8C00', // Orange
        '#1ABC9C', // Turquoise
        '#E67E22', // Carrot
        '#2ECC71', // Emerald
        '#F39C12', // Sunflower
        '#9B59B6', // Amethyst
        '#34495E'  // Wet Asphalt
    ],
    secondary: [
        'rgba(255, 87, 51, 0.2)',
        'rgba(51, 193, 255, 0.2)',
        'rgba(40, 167, 69, 0.2)',
        'rgba(255, 195, 0, 0.2)',
        'rgba(199, 0, 57, 0.2)',
        'rgba(142, 68, 173, 0.2)',
        'rgba(255, 51, 246, 0.2)',
        'rgba(0, 255, 179, 0.2)',
        'rgba(255, 140, 0, 0.2)',
        'rgba(26, 188, 156, 0.2)',
        'rgba(230, 126, 34, 0.2)',
        'rgba(46, 204, 113, 0.2)',
        'rgba(243, 156, 18, 0.2)',
        'rgba(155, 89, 182, 0.2)',
        'rgba(52, 73, 94, 0.2)'
    ]
};

function onDateRangeChange() {
    const select = document.getElementById('dateRangeSelect');
    const customStart = document.getElementById('customStartDate');
    const customEnd = document.getElementById('customEndDate');
    if (select.value === 'custom') {
        customStart.style.display = 'inline-block';
        customEnd.style.display = 'inline-block';
        selectedDateRange = 'custom';
        customStartDate = customStart.value;
        customEndDate = customEnd.value;
    } else {
        customStart.style.display = 'none';
        customEnd.style.display = 'none';
        selectedDateRange = parseInt(select.value);
        customStartDate = null;
        customEndDate = null;
    }
    if (currentType) {
        fetchData(currentType);
    }
}

function fetchData(type) {
    // Clear filters when switching to a different type
    if (currentType && currentType !== type) {
        selectedFilters = [];
    }
    
    // Update button states
    if (currentButton) {
        currentButton.classList.remove('active');
    }
    currentButton = document.getElementById('btn-' + type);
    currentButton.classList.add('active');
    currentType = type;
    
    // Show loading state
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '<div class="loading">Loading ' + type + ' data...</div>';
    
    // Clear existing charts
    activeCharts.forEach(chart => chart.destroy());
    activeCharts = [];
    
    // Hide filter container initially
    document.getElementById('filterContainer').style.display = 'none';
    
    // Fetch data from API
    let url = '/api/' + type;
    if (selectedFilters.length > 0 && (type === 'languages' || type === 'editors')) {
        const filterParam = type === 'languages' ? 'languages' : 'editors';
        url += '?' + selectedFilters.map(filter => filterParam + '=' + encodeURIComponent(filter)).join('&');
    }
    
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            displayData(type, data);
            setupFilters(type, data);
        })
        .catch(error => {
            resultDiv.innerHTML = '<div class="error">Error loading data: ' + error.message + '</div>';
        });
}

function setupFilters(type, data) {
    if (type === 'languages' && data.available_languages) {
        availableOptions = data.available_languages;
        showFilterContainer('Languages', availableOptions);
    } else if (type === 'editors' && data.available_editors) {
        availableOptions = data.available_editors;
        showFilterContainer('Editors', availableOptions);
    }
}

function showFilterContainer(filterType, options) {
    const container = document.getElementById('filterContainer');
    const title = document.getElementById('filterTitle');
    const optionsDiv = document.getElementById('filterOptions');
    
    title.textContent = `Filter ${filterType} (${options.length} available)`;
    
    let html = `
        <div style="margin-bottom: 15px;">
            <input type="text" id="filterSearch" placeholder="Search ${filterType.toLowerCase()}..." 
                   style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;"
                   onkeyup="filterSearchOptions('${filterType}')">
        </div>
        <div id="filterOptionsContainer">
    `;
    
    options.forEach(option => {
        const isChecked = selectedFilters.includes(option) ? 'checked' : '';
        html += `
            <div class="checkbox-item" data-option="${option.toLowerCase()}">
                <input type="checkbox" id="filter_${option}" value="${option}" ${isChecked}>
                <label for="filter_${option}">${option}</label>
            </div>
        `;
    });
    
    html += '</div>';
    optionsDiv.innerHTML = html;
    container.style.display = 'block';
}

function applyFilters() {
    selectedFilters = [];
    const checkboxes = document.querySelectorAll('#filterOptions input[type="checkbox"]:checked');
    checkboxes.forEach(checkbox => {
        selectedFilters.push(checkbox.value);
    });
    
    // Update filter title with count
    const title = document.getElementById('filterTitle');
    const filterType = title.textContent.includes('Languages') ? 'Languages' : 'Editors';
    const totalCount = document.querySelectorAll('#filterOptions input[type="checkbox"]').length;
    
    if (selectedFilters.length > 0) {
        title.textContent = `Filter ${filterType} (${selectedFilters.length} of ${totalCount} selected) ✓`;
        title.style.color = '#28a745';
    } else {
        title.textContent = `Filter ${filterType} (${totalCount} available)`;
        title.style.color = '#4F8BF9';
    }
    
    if (currentType) {
        fetchData(currentType);
    }
}

function clearFilters() {
    selectedFilters = [];
    const checkboxes = document.querySelectorAll('#filterOptions input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Update filter title
    const title = document.getElementById('filterTitle');
    const filterType = title.textContent.includes('Languages') ? 'Languages' : 'Editors';
    const totalCount = checkboxes.length;
    title.textContent = `Filter ${filterType} (${totalCount} available)`;
    title.style.color = '#4F8BF9';
    
    if (currentType) {
        fetchData(currentType);
    }
}

function displayData(type, data) {
    const resultDiv = document.getElementById('result');
    
    if (data.error) {
        resultDiv.innerHTML = '<div class="error">Error: ' + data.error + '</div>';
        return;
    }
    
    let html = '';
    
    // Display charts based on type
    if (type === 'organization') {
        html += '<div class="charts-container">';
        
        if (data.active_vs_engaged_daily) {
            html += createChartSection('orgDailyChart', data.active_vs_engaged_daily.title, data.active_vs_engaged_daily.data);
        }
        
        if (data.active_vs_engaged_weekly) {
            html += createChartSection('orgWeeklyChart', data.active_vs_engaged_weekly.title, data.active_vs_engaged_weekly.data, 'bar');
        }
        
        if (data.features_daily) {
            html += createChartSection('featuresDailyChart', data.features_daily.title, data.features_daily.data);
        }
        
        if (data.features_weekly) {
            html += createChartSection('featuresWeeklyChart', data.features_weekly.title, data.features_weekly.data, 'bar');
        }
        
        html += '</div>';
        
    } else if (type === 'languages') {
        html += '<div class="charts-container">';
        
        if (data.languages_daily) {
            html += createChartSection('langDailyChart', data.languages_daily.title, data.languages_daily.data);
        }
        
        if (data.languages_weekly) {
            html += createChartSection('langWeeklyChart', data.languages_weekly.title, data.languages_weekly.data, 'bar');
        }
        
        if (data.top_languages) {
            html += createChartSection('topLangChart', data.top_languages.title, data.top_languages.data, 'pie');
        }
        
        html += '</div>';
        
    } else if (type === 'editors') {
        html += '<div class="charts-container">';
        
        if (data.editors_daily) {
            html += createChartSection('editorsDailyChart', data.editors_daily.title, data.editors_daily.data);
        }
        
        if (data.editors_weekly) {
            html += createChartSection('editorsWeeklyChart', data.editors_weekly.title, data.editors_weekly.data, 'bar');
        }
        
        if (data.chats_daily) {
            html += createChartSection('chatsDailyChart', data.chats_daily.title, data.chats_daily.data);
        }
        
        if (data.chats_weekly) {
            html += createChartSection('chatsWeeklyChart', data.chats_weekly.title, data.chats_weekly.data, 'bar');
        }
        
        if (data.copy_insert_daily) {
            html += createChartSection('copyInsertDailyChart', data.copy_insert_daily.title, data.copy_insert_daily.data);
        }
        
        if (data.copy_insert_weekly) {
            html += createChartSection('copyInsertWeeklyChart', data.copy_insert_weekly.title, data.copy_insert_weekly.data, 'bar');
        }
        
        if (data.top_editors) {
            html += createChartSection('topEditorsChart', data.top_editors.title, data.top_editors.data, 'pie');
        }
        
        html += '</div>';
    } else if (type === 'billing') {
        html += '<div class="charts-container">';
        html += createChartSection('billingDailyChart', data.title, data.data, 'line');
        html += '</div>';

        // Billing Table
        if (data.seats && data.seats.length > 0) {
            html += `
            <div class="billing-table-section">
                <h3>Billing Seats Details</h3>
                <label for="billingTableLimit" style="font-weight:normal;font-size:14px;">Show&nbsp;</label>
                <select id="billingTableLimit" onchange="updateBillingTableRows()">
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="75">75</option>
                    <option value="100">100</option>
                </select>
                <span style="font-weight:normal;font-size:14px;">&nbsp;records</span>
                <table class="billing-table" id="billingSeatsTable">
                    <thead>
                        <tr>
                            <th>Username</th>
                            <th>Purchased Date</th>
                            <th>Plan Type</th>
                            <th>Last Activity At</th>
                            <th>Last Activity Editor</th>
                        </tr>
                    </thead>
                    <tbody id="billingSeatsTableBody">
                        ${data.seats.slice(0, 25).map(seat => `
                            <tr>
                                <td>${seat.assignee?.login || ''}</td>
                                <td>${formatDate(seat.created_at) || ''}</td>
                                <td>${seat.plan_type || ''}</td>
                                <td>${formatDate(seat.last_activity_at) || ''}</td>
                                <td>${seat.last_activity_editor || ''}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            `;
        } else {
            html += '<div>No billing seat details available.</div>';
        }
    }
    
    // Add raw data section (expandable)
    html += '<div class="raw-data-section">';
    html += '<button onclick="toggleRawData()" class="toggle-btn">Show Raw Data</button>';
    html += '<div id="rawData" class="raw-data" style="display: none;">';
    html += '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
    html += '</div>';
    html += '</div>';
    
    resultDiv.innerHTML = html;
    
    // Create charts after updated
    setTimeout(() => createCharts(type, data), 100);
}

function createChartSection(canvasId, title, chartData, chartType = 'line') {
    const tableId = canvasId.replace('Chart', 'Table');
    let filteredData = chartData;

    // Filter for top 5 languages in Code Acceptances & Suggestions per Language
    if (
        (canvasId === 'langDailyChart' || canvasId === 'langWeeklyChart') &&
        Array.isArray(chartData) &&
        selectedFilters.length === 0
    ) {
        const topLangs = ['java', 'javascript', 'typescript', 'json', 'dotenv'];
        filteredData = chartData.filter(item => topLangs.includes(item.language));
    }

    return `
        <div class="chart-section">
            <h3>${title}</h3>
            <div class="chart-container">
                <canvas id="${canvasId}" class="chart-canvas"></canvas>
            </div>
            <button onclick="toggleDataTable('${tableId}')" class="table-toggle">Show Data Table</button>
            <div id="${tableId}" class="data-table" style="display: none;">
                ${generateDataTable(filteredData, chartType, tableId)}
            </div>
        </div>
    `;
}

function generateDataTable(data, chartType, tableId = '') {
    if (!data || (Array.isArray(data) && data.length === 0)) {
        return '<p>No data available</p>';
    }

    let html = '<table class="sortable-table" ' + (tableId ? `id="${tableId}_table"` : '') + '>';

    if ((chartType === 'pie' || chartType === 'bar') && typeof data === 'object' && !Array.isArray(data)) {
        // Handle pie/bar chart data (object with key-value pairs)
        html += '<thead><tr>';
        html += `<th onclick="sortTable(this, 0, '${tableId}_table')">Category</th>`;
        html += `<th onclick="sortTable(this, 1, '${tableId}_table')">Value</th>`;
        html += '</tr></thead><tbody>';
        Object.entries(data).forEach(([key, value]) => {
            html += `<tr><td>${key}</td><td>${value}</td></tr>`;
        });
    } else if (Array.isArray(data) && data.length > 0) {
        // Handle array data
        const keysRaw = Object.keys(data[0]);
        // Move 'date' to the first column if present
        let keys;
        if (keysRaw.includes('date')) {
            keys = ['date', ...keysRaw.filter(k => k !== 'date')];
        } //else {
            //keys = keysRaw;
        else if (keysRaw.includes('week')) {
            keys = ['week', ...keysRaw.filter(k => k !== 'week')];
        } 
        else {
            keys = keysRaw;
        }


        html += '<thead><tr>';
        keys.forEach((key, idx) => {
            html += `<th onclick="sortTable(this, ${idx}, '${tableId}_table')">${key.replace(/_/g, ' ').toUpperCase()}</th>`;
        });
        html += '</tr></thead><tbody>';

        data.forEach(row => {
            html += '<tr>';
            keys.forEach(key => {
                html += `<td>${row[key]}</td>`;
            });
            html += '</tr>';
        });
    }

    html += '</tbody></table>';
    return html;
}

function toggleDataTable(tableId) {
    const table = document.getElementById(tableId);
    const button = table.previousElementSibling;
    
    if (table.style.display === 'none') {
        table.style.display = 'block';
        button.textContent = 'Hide Data Table';
    } else {
        table.style.display = 'none';
        button.textContent = 'Show Data Table';
    }
}

function createCharts(type, data) {
    if (type === 'organization') {
        createOrganizationCharts(data);
    } else if (type === 'languages') {
        createLanguageCharts(data);
    } else if (type === 'editors') {
        createEditorCharts(data);
    } else if (type === 'billing') {
        createBillingChart(data); // <-- Add this line
    }
}

function createOrganizationCharts(data) {
    // Daily active vs engaged users
    if (data.active_vs_engaged_daily && document.getElementById('orgDailyChart')) {
        const ctx = document.getElementById('orgDailyChart').getContext('2d');
        const chartData = data.active_vs_engaged_daily.data;
        
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.map(item => item.date),
                datasets: [
                    {
                        label: 'Active Users',
                        data: chartData.map(item => item.total_active_users),
                        borderColor: colors.primary[0],
                        backgroundColor: colors.secondary[0],
                        tension: 0.1,
                        borderWidth: 3
                    },
                    {
                        label: 'Engaged Users',
                        data: chartData.map(item => item.total_engaged_users),
                        borderColor: colors.primary[1],
                        backgroundColor: colors.secondary[1],
                        tension: 0.1,
                        borderWidth: 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'category',
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Number of Users'
                        }
                    }
                }
            }
        });
        activeCharts.push(chart);
    }
    
    // Weekly active vs engaged users
    if (data.active_vs_engaged_weekly && document.getElementById('orgWeeklyChart')) {
        const ctx = document.getElementById('orgWeeklyChart').getContext('2d');
        const chartData = data.active_vs_engaged_weekly.data;
        
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartData.map(item => item.week),
                datasets: [
                    {
                        label: 'Active Users',
                        data: chartData.map(item => item.total_active_users),
                        borderColor: colors.primary[0],
                        backgroundColor: colors.secondary[0],
                        borderWidth: 1
                    },
                    {
                        label: 'Engaged Users',
                        data: chartData.map(item => item.total_engaged_users),
                        borderColor: colors.primary[1],
                        backgroundColor: colors.secondary[1],
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Week'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Number of Users'
                        }
                    }
                }
            }
        });
        activeCharts.push(chart);
    }
    
    // Features daily chart
    if (data.features_daily && document.getElementById('featuresDailyChart')) {
        const ctx = document.getElementById('featuresDailyChart').getContext('2d');
        const chartData = data.features_daily.data;
        
        if (chartData && chartData.length > 0) {
            const features = ['IDE_Chat', 'Dotcom_Chat', 'Pull_Request', 'Code_Completion'];
            const datasets = features.map((feature, index) => ({
                label: feature.replace(/_/g, ' '),
                data: chartData.map(item => item[feature] || 0),
                borderColor: colors.primary[index],
                backgroundColor: colors.secondary[index],
                tension: 0.1,
                borderWidth: 3
            }));
            
            const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: chartData.map(item => item.date),
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Date'
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Engaged Users'
                            }
                        }
                    }
                }
            });
            activeCharts.push(chart);
        }
    }
    
    // Features weekly chart
    if (data.features_weekly && document.getElementById('featuresWeeklyChart')) {
        const ctx = document.getElementById('featuresWeeklyChart').getContext('2d');
        const chartData = data.features_weekly.data;
        
        if (chartData && chartData.length > 0) {
            const features = ['IDE_Chat', 'Dotcom_Chat', 'Pull_Request', 'Code_Completion'];
            const datasets = features.map((feature, index) => ({
                label: feature.replace(/_/g, ' '),
                data: chartData.map(item => item[feature] || 0),
                borderColor: colors.primary[index],
                backgroundColor: colors.secondary[index],
                borderWidth: 1
            }));
            
            const chart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: chartData.map(item => item.week),
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Week'
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Engaged Users'
                            }
                        }
                    }
                }
            });
            activeCharts.push(chart);
        }
    }
}

function createLanguageCharts(data) {
    // Use selected filters if present, otherwise default to top 5
    let langsToShow = selectedFilters.length > 0
        ? selectedFilters
        : ['java', 'javascript', 'typescript', 'json', 'dotenv'];

    // Languages daily chart (filtered)
    if (data.languages_daily && document.getElementById('langDailyChart')) {
        const filtered = data.languages_daily.data.filter(item => langsToShow.includes(item.language));
        createMultiSeriesLineChart('langDailyChart', filtered, 'language', 'date', ['total_code_acceptances', 'total_code_suggestions']);
    }

    // Languages weekly chart (filtered)
    if (data.languages_weekly && document.getElementById('langWeeklyChart')) {
        const filtered = data.languages_weekly.data.filter(item => langsToShow.includes(item.language));
        createMultiSeriesBarChart('langWeeklyChart', filtered, 'language', 'week', ['total_code_acceptances', 'total_code_suggestions']);
    }

    // Pie chart (unchanged)
    if (data.top_languages && document.getElementById('topLangChart')) {
        const ctx = document.getElementById('topLangChart').getContext('2d');
        const chartData = data.top_languages.data;
        
        const chart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(chartData),
                datasets: [{
                    label: 'Engaged Users',
                    data: Object.values(chartData),
                    backgroundColor: colors.primary.slice(0, Object.keys(chartData).length),
                    borderColor: '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
        activeCharts.push(chart);
    }
}

function createEditorCharts(data) {
    // Editors daily chart
    if (data.editors_daily && document.getElementById('editorsDailyChart')) {
        createMultiSeriesLineChart('editorsDailyChart', data.editors_daily.data, 'editor', 'date', ['total_engaged_users']);
    }
    
    // Editors weekly chart
    if (data.editors_weekly && document.getElementById('editorsWeeklyChart')) {
        createMultiSeriesBarChart('editorsWeeklyChart', data.editors_weekly.data, 'editor', 'week', ['total_engaged_users']);
    }
    
    // Chats daily chart
    if (data.chats_daily && document.getElementById('chatsDailyChart')) {
        createMultiSeriesLineChart('chatsDailyChart', data.chats_daily.data, 'editor', 'date', ['total_chats']);
    }
    
    // Chats weekly chart
    if (data.chats_weekly && document.getElementById('chatsWeeklyChart')) {
        createMultiSeriesBarChart('chatsWeeklyChart', data.chats_weekly.data, 'editor', 'week', ['total_chats']);
    }
    
    // Copy insert daily chart
    if (data.copy_insert_daily && document.getElementById('copyInsertDailyChart')) {
        createMultiSeriesLineChart('copyInsertDailyChart', data.copy_insert_daily.data, 'editor', 'date', ['total_chat_copy_events', 'total_chat_insertion_events']);
    }
    
    // Copy insert weekly chart
    if (data.copy_insert_weekly && document.getElementById('copyInsertWeeklyChart')) {
        createMultiSeriesLineChart('copyInsertWeeklyChart', data.copy_insert_weekly.data, 'editor', 'week', ['total_chat_copy_events', 'total_chat_insertion_events']);
    }
    
    // Top editors pie chart
    if (data.top_editors && document.getElementById('topEditorsChart')) {
        const ctx = document.getElementById('topEditorsChart').getContext('2d');
        const chartData = data.top_editors.data;
        
        const chart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(chartData),
                datasets: [{
                    label: 'Engaged Users',
                    data: Object.values(chartData),
                    backgroundColor: colors.primary.slice(0, Object.keys(chartData).length),
                    borderColor: '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
        activeCharts.push(chart);
    }
}

function createMultiSeriesLineChart(canvasId, data, groupBy, xAxis, metrics) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    if (!data || data.length === 0) return;
    
    // Group data by the groupBy field (e.g., 'language' or 'editor')
    const grouped = {};
    data.forEach(item => {
        const key = item[groupBy];
        if (!grouped[key]) {
            grouped[key] = [];
        }
        grouped[key].push(item);
    });
    
    // Get all unique x-axis values (dates/weeks)
    const allXValues = [...new Set(data.map(item => item[xAxis]))].sort();
    
    const datasets = [];
    let colorIndex = 0;
    
    // Create datasets for each group
    Object.keys(grouped).forEach(group => {
        metrics.forEach(metric => {
            const metricData = allXValues.map(xVal => {
                const found = grouped[group].find(item => item[xAxis] === xVal);
                return found ? found[metric] || 0 : 0;
            });
            
            datasets.push({
                label: `${group} - ${metric.replace(/_/g, ' ')}`,
                data: metricData,
                borderColor: colors.primary[colorIndex % colors.primary.length],
                backgroundColor: colors.secondary[colorIndex % colors.secondary.length],
                tension: 0.1,
                borderWidth: 3
            });
            colorIndex++;
        });
    });
    
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: allXValues,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: xAxis.charAt(0).toUpperCase() + xAxis.slice(1)
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Count'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        }
    });
    activeCharts.push(chart);
}

function toggleRawData() {
    const rawData = document.getElementById('rawData');
    const button = rawData.previousElementSibling;
    
    if (rawData.style.display === 'none') {
        rawData.style.display = 'block';
        button.textContent = 'Hide Raw Data';
    } else {
        rawData.style.display = 'none';
        button.textContent = 'Show Raw Data';
    }
}

function filterSearchOptions(filterType) {
    const searchInput = document.getElementById('filterSearch');
    const searchTerm = searchInput.value.toLowerCase();
    const checkboxItems = document.querySelectorAll('#filterOptionsContainer .checkbox-item');
    
    let visibleCount = 0;
    checkboxItems.forEach(item => {
        const optionText = item.getAttribute('data-option');
        if (optionText.includes(searchTerm)) {
            item.style.display = 'flex';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });
    
    // Update title with search results
    const title = document.getElementById('filterTitle');
    const selectedCount = selectedFilters.length;
    if (searchTerm) {
        title.textContent = `Filter ${filterType} (${visibleCount} of ${checkboxItems.length} visible)`;
    } else if (selectedCount > 0) {
        title.textContent = `Filter ${filterType} (${selectedCount} of ${checkboxItems.length} selected) ✓`;
        title.style.color = '#28a745';
    } else {
        title.textContent = `Filter ${filterType} (${checkboxItems.length} available)`;
        title.style.color = '#4F8BF9';
    }
}

function createMultiSeriesBarChart(canvasId, data, groupBy, xAxis, metrics) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    if (!data || data.length === 0) return;
    
    // Group data by the groupBy field (e.g., 'language' or 'editor')
    const grouped = {};
    data.forEach(item => {
        const key = item[groupBy];
        if (!grouped[key]) {
            grouped[key] = [];
        }
        grouped[key].push(item);
    });
    
    // Get all unique x-axis values (dates/weeks)
    const allXValues = [...new Set(data.map(item => item[xAxis]))].sort();
    
    const datasets = [];
    let colorIndex = 0;
    
    // Create datasets for each group
    Object.keys(grouped).forEach(group => {
        metrics.forEach(metric => {
            const metricData = allXValues.map(xVal => {
                const found = grouped[group].find(item => item[xAxis] === xVal);
                return found ? found[metric] || 0 : 0;
            });
            
            datasets.push({
                label: `${group} - ${metric.replace(/_/g, ' ')}`,
                data: metricData,
                borderColor: colors.primary[colorIndex % colors.primary.length],
                backgroundColor: colors.secondary[colorIndex % colors.secondary.length],
                borderWidth: 1
            });
            colorIndex++;
        });
    });
    
    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: allXValues,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: xAxis.charAt(0).toUpperCase() + xAxis.slice(1)
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Count'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            }
        }
    });
    activeCharts.push(chart);
}

function sortTable(header, colIndex, tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;
    const tbody = table.tBodies[0];
    const rows = Array.from(tbody.rows);
    const isAsc = header.classList.contains('asc');
    const headerText = header.textContent.trim().toLowerCase();

    rows.sort((a, b) => {
        let aText = a.cells[colIndex].textContent.trim();
        let bText = b.cells[colIndex].textContent.trim();

        // If the column is a date or week, sort as date
        if (headerText.includes('date') || headerText.includes('week')) {
            let aDate = Date.parse(aText.replace(/-/g, '/'));
            let bDate = Date.parse(bText.replace(/-/g, '/'));
            if (!isNaN(aDate) && !isNaN(bDate)) {
                return isAsc ? aDate - bDate : bDate - aDate;
            }
        }

        // Try to compare as numbers, fallback to string
        let aNum = parseFloat(aText.replace(/,/g, ''));
        let bNum = parseFloat(bText.replace(/,/g, ''));
        if (!isNaN(aNum) && !isNaN(bNum)) {
            return isAsc ? aNum - bNum : bNum - aNum;
        } else {
            return isAsc ? aText.localeCompare(bText) : bText.localeCompare(aText);
        }
    });

    // Remove existing rows and re-add sorted
    while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
    rows.forEach(row => tbody.appendChild(row));
    // Update header classes for sort direction
    Array.from(header.parentNode.children).forEach(th => th.classList.remove('asc', 'desc'));
    header.classList.add(isAsc ? 'desc' : 'asc');
}

function createBillingChart(data) {
    if (data.data && document.getElementById('billingDailyChart')) {
        const ctx = document.getElementById('billingDailyChart').getContext('2d');
        const chartData = data.data;
        const planTypes = data.plan_types;

        const labels = chartData.map(item => item.date);
        const datasets = planTypes.map((plan, idx) => ({
            label: plan,
            data: chartData.map(item => item[plan] || 0),
            backgroundColor: colors.primary[idx % colors.primary.length],
            borderColor: colors.primary[idx % colors.primary.length],
            borderWidth: 2
        }));

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' }
                },
                scales: {
                    x: { title: { display: true, text: 'Date' } },
                    y: { title: { display: true, text: 'Plans Purchased' } }
                }
            }
        });
        activeCharts.push(chart);
    }
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    // Parse and format as YYYY-MM-DD HH:mm
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function updateBillingTableRows() {
    const limit = parseInt(document.getElementById('billingTableLimit').value, 10);
    // Get the latest seats data from the raw data section
    const rawDataDiv = document.getElementById('rawData');
    if (!rawDataDiv) return;
    let data;
    try {
        data = JSON.parse(rawDataDiv.textContent || rawDataDiv.innerText);
    } catch {
        return;
    }
    const seats = data.seats || [];
    const tbody = document.getElementById('billingSeatsTableBody');
    if (!tbody) return;
    tbody.innerHTML = seats.slice(0, limit).map(seat => `
        <tr>
            <td>${seat.assignee?.login || ''}</td>
            <td>${formatDate(seat.created_at) || ''}</td>
            <td>${seat.plan_type || ''}</td>
            <td>${formatDate(seat.last_activity_at) || ''}</td>
            <td>${seat.last_activity_editor || ''}</td>
        </tr>
    `).join('');
}

function getTopLanguages(data, count = 5) {
    if (data.top_languages && data.top_languages.data) {
        return Object.keys(data.top_languages.data).slice(0, count);
    }
    return [];
}
