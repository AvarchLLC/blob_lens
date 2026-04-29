const API_BASE = '/api';
let charts = {};

// Color scheme
const colors = {
    cyan: '#00d9ff',
    green: '#00ff88',
    purple: '#7c3aed',
    blue: '#3b82f6',
    red: '#ff6b6b',
    orange: '#ffa500',
    pink: '#ff1493',
};

// Update stats cards
async function updateStats() {
    try {
        const response = await fetch(`${API_BASE}/stats`);
        const data = await response.json();
        
        document.getElementById('total-blobs').textContent = data.total_blobs.toLocaleString();
        document.getElementById('total-txs').textContent = data.total_transactions.toLocaleString();
        document.getElementById('avg-fee').textContent = (data.avg_fee_per_blob_gas / 1e9).toFixed(2);
        document.getElementById('network').textContent = 'Mainnet';
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

// Update rollup chart
async function updateRollupChart() {
    try {
        const response = await fetch(`${API_BASE}/blobs/by-rollup`);
        const data = await response.json();
        
        const ctx = document.getElementById('rollupChart').getContext('2d');
        
        if (charts.rollup) charts.rollup.destroy();
        
        charts.rollup = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.map(r => r.rollup),
                datasets: [{
                    data: data.map(r => r.count),
                    backgroundColor: [
                        colors.cyan,
                        colors.green,
                        colors.purple,
                        colors.blue,
                        colors.pink,
                        colors.orange,
                        colors.red,
                    ],
                    borderColor: '#1a1a2e',
                    borderWidth: 2,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#e0e0e0',
                            padding: 15,
                            font: { size: 12 }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error updating rollup chart:', error);
    }
}

// Update activity chart
async function updateActivityChart() {
    try {
        const response = await fetch(`${API_BASE}/activity/hourly`);
        const data = await response.json();
        
        // Limit to last 24 hours
        const chartData = data.slice(-24);
        
        const ctx = document.getElementById('activityChart').getContext('2d');
        
        if (charts.activity) charts.activity.destroy();
        
        charts.activity = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: chartData.map(d => new Date(d.hour).getHours() + ':00'),
                datasets: [{
                    label: 'Transactions',
                    data: chartData.map(d => d.count),
                    backgroundColor: colors.green,
                    borderColor: colors.green,
                    borderRadius: 4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        labels: { color: '#e0e0e0' }
                    }
                },
                scales: {
                    y: {
                        ticks: { color: '#b0b0b0' },
                        grid: { color: '#333' }
                    },
                    x: {
                        ticks: { color: '#b0b0b0' },
                        grid: { color: '#333' }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error updating activity chart:', error);
    }
}

// Update fee trend chart
async function updateFeeChart() {
    try {
        const response = await fetch(`${API_BASE}/fees/trend`);
        const data = await response.json();
        
        const ctx = document.getElementById('feeChart').getContext('2d');
        
        if (charts.fee) charts.fee.destroy();
        
        charts.fee = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => new Date(d.timestamp).toLocaleDateString()),
                datasets: [
                    {
                        label: 'Max Fee',
                        data: data.map(d => d.max_fee / 1e9),
                        borderColor: colors.red,
                        backgroundColor: 'rgba(255, 107, 107, 0.1)',
                        fill: false,
                        tension: 0.4,
                        borderWidth: 2,
                    },
                    {
                        label: 'Avg Fee',
                        data: data.map(d => d.avg_fee / 1e9),
                        borderColor: colors.cyan,
                        backgroundColor: 'rgba(0, 217, 255, 0.1)',
                        fill: false,
                        tension: 0.4,
                        borderWidth: 2,
                    },
                    {
                        label: 'Min Fee',
                        data: data.map(d => d.min_fee / 1e9),
                        borderColor: colors.green,
                        backgroundColor: 'rgba(0, 255, 136, 0.1)',
                        fill: false,
                        tension: 0.4,
                        borderWidth: 2,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        labels: { color: '#e0e0e0' }
                    }
                },
                scales: {
                    y: {
                        ticks: { color: '#b0b0b0' },
                        grid: { color: '#333' },
                        title: { display: true, text: 'Fee (gwei)', color: '#e0e0e0' }
                    },
                    x: {
                        ticks: { color: '#b0b0b0' },
                        grid: { color: '#333' }
                    }
                }
            }
        });
        
        // Adjust height for fee chart
        document.getElementById('feeChart').style.height = '400px';
    } catch (error) {
        console.error('Error updating fee chart:', error);
    }
}

// Update recent transactions table
async function updateRecentTransactions() {
    try {
        const response = await fetch(`${API_BASE}/blobs/recent`);
        const data = await response.json();
        
        const tbody = document.getElementById('transactions-tbody');
        tbody.innerHTML = data.slice(0, 20).map(tx => {
            const time = new Date(tx.created_at).toLocaleTimeString();
            const fee = (tx.max_fee_per_blob_gas / 1e9).toFixed(2);
            const rollupBadge = `<span class="rollup-badge">${tx.rollup}</span>`;
            
            return `
                <tr>
                    <td>#${tx.block_number}</td>
                    <td>${tx.num_blobs}</td>
                    <td>${rollupBadge}</td>
                    <td>${fee}</td>
                    <td>${time}</td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error updating transactions:', error);
    }
}

// Update last updated time
function updateLastUpdate() {
    document.getElementById('last-update').textContent = new Date().toLocaleTimeString();
}

// Main update function
async function updateDashboard() {
    updateStats();
    updateRollupChart();
    updateActivityChart();
    updateFeeChart();
    updateRecentTransactions();
    updateLastUpdate();
}

// Initialize dashboard
async function initDashboard() {
    console.log('Initializing BlobLens Dashboard...');
    
    // Initial load
    await updateDashboard();
    
    // Update every 30 seconds
    setInterval(updateDashboard, 30000);
    
    console.log('Dashboard initialized. Updates every 30 seconds.');
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', initDashboard);
