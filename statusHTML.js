// In server.js, add this before your routes

export const statusHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Google Calendar API - System Status</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        :root {
            --primary: #4f46e5;
            --success: #22c55e;
            --warning: #eab308;
            --error: #ef4444;
            --bg-primary: #ffffff;
            --bg-secondary: #f9fafb;
            --text-primary: #111827;
            --text-secondary: #6b7280;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', sans-serif;
            background: var(--bg-secondary);
            color: var(--text-primary);
            line-height: 1.6;
        }

        .container {
            max-width: 1200px;
            margin: 2rem auto;
            padding: 0 1rem;
        }

        .header {
            background: var(--bg-primary);
            padding: 2rem;
            border-radius: 1rem;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
            margin-bottom: 2rem;
            text-align: center;
        }

        .header h1 {
            color: var(--primary);
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
        }

        .header p {
            color: var(--text-secondary);
        }

        .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }

        .status-card {
            background: var(--bg-primary);
            padding: 1.5rem;
            border-radius: 0.75rem;
            box-shadow: 0 2px 4px -1px rgb(0 0 0 / 0.1);
        }

        .status-indicator {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 1rem;
        }

        .status-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: var(--success);
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.5; }
            100% { transform: scale(1); opacity: 1; }
        }

        .endpoints-container {
            background: var(--bg-primary);
            padding: 2rem;
            border-radius: 0.75rem;
            box-shadow: 0 2px 4px -1px rgb(0 0 0 / 0.1);
        }

        .endpoint {
            padding: 1rem;
            border: 1px solid #e5e7eb;
            border-radius: 0.5rem;
            margin-bottom: 1rem;
            transition: all 0.3s ease;
        }

        .endpoint:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }

        .method {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 0.375rem;
            font-size: 0.875rem;
            font-weight: 600;
            margin-right: 0.5rem;
        }

        .method.post { background: #fef3c7; color: #92400e; }
        .method.get { background: #dbeafe; color: #1e40af; }
        .method.put { background: #f3e8ff; color: #6b21a8; }
        .method.delete { background: #fee2e2; color: #991b1b; }

        .path {
            font-family: monospace;
            font-size: 0.9rem;
            color: var(--text-primary);
        }

        .description {
            margin-top: 0.5rem;
            color: var(--text-secondary);
            font-size: 0.875rem;
        }

        .metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }

        .metric-card {
            background: var(--bg-primary);
            padding: 1.5rem;
            border-radius: 0.75rem;
            box-shadow: 0 2px 4px -1px rgb(0 0 0 / 0.1);
            text-align: center;
        }

        .metric-value {
            font-size: 2rem;
            font-weight: 700;
            color: var(--primary);
            margin: 0.5rem 0;
        }

        .chart-container {
            background: var(--bg-primary);
            padding: 1.5rem;
            border-radius: 0.75rem;
            box-shadow: 0 2px 4px -1px rgb(0 0 0 / 0.1);
            margin-bottom: 2rem;
        }

        footer {
            text-align: center;
            padding: 2rem;
            color: var(--text-secondary);
            font-size: 0.875rem;
        }

        @media (max-width: 768px) {
            .container {
                margin: 1rem auto;
            }
            .header h1 {
                font-size: 2rem;
            }
            .status-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>Google Calendar API</h1>
            <p>System Status Dashboard</p>
        </header>

        <div class="status-grid">
            <div class="status-card">
                <div class="status-indicator">
                    <span class="status-dot"></span>
                    <h2>System Status</h2>
                </div>
                <p>All systems operational</p>
            </div>
            <div class="status-card">
                <h2>Uptime</h2>
                <div class="metric-value">99.9%</div>
                <p>Last 30 days</p>
            </div>
            <div class="status-card">
                <h2>Response Time</h2>
                <div class="metric-value">145ms</div>
                <p>Average</p>
            </div>
        </div>

        <div class="chart-container">
            <h2>API Response Times</h2>
            <canvas id="responseChart"></canvas>
        </div>

        <div class="endpoints-container">
            <h2>API Endpoints</h2>
            <div class="endpoint">
                <span class="method post">POST</span>
                <span class="path">/api/auth/google</span>
                <p class="description">Authenticate users with Google OAuth2</p>
            </div>
            <div class="endpoint">
                <span class="method get">GET</span>
                <span class="path">/api/events/:userId</span>
                <p class="description">Retrieve user's calendar events</p>
            </div>
            <div class="endpoint">
                <span class="method post">POST</span>
                <span class="path">/api/events</span>
                <p class="description">Create a new calendar event</p>
            </div>
            <div class="endpoint">
                <span class="method put">PUT</span>
                <span class="path">/api/events/:eventId</span>
                <p class="description">Update an existing event</p>
            </div>
            <div class="endpoint">
                <span class="method delete">DELETE</span>
                <span class="path">/api/events/:eventId</span>
                <p class="description">Delete an existing event</p>
            </div>
        </div>

        <footer>
            <p>Last Updated: ${new Date().toLocaleString()}</p>
            <p>Server Time Zone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}</p>
        </footer>
    </div>

    <script>
        // Sample data for the response time chart
        const ctx = document.getElementById('responseChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['1h ago', '45m ago', '30m ago', '15m ago', 'Now'],
                datasets: [{
                    label: 'Response Time (ms)',
                    data: [150, 143, 155, 141, 145],
                    borderColor: '#4f46e5',
                    tension: 0.4,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Response Time (ms)'
                        }
                    }
                }
            }
        });
    </script>
</body>
</html>
`;