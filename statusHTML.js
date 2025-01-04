const generateStatusHTML = (metrics) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Google Calendar API - System Status</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
    /* Keep only essential styles */
    :root {
      --primary: #4f46e5;
      --success: #22c55e;
      --bg-primary: #ffff;
      --bg-secondary: #f9fafb;
      --text-primary: #111827;
      --text-secondary: #6b7280;
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

    /* Keep only essential component styles */
    </style>
</head>
<body>
    <div class="container">
      <!-- Simplified structure -->
    </div>
    <script>
    // Move chart initialization to separate function
    function initializeChart(data) {
      const ctx = document.getElementById('responseChart').getContext('2d');
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: data.labels,
          datasets: [{
            label: 'Response Time (ms)',
            data: data.values,
            borderColor: '#4f46e5',
            tension: 0.4,
            fill: false
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { display: false } },
          scales: {
            y: {
              beginAtZero: true,
              title: { display: true, text: 'Response Time (ms)' }
            }
          }
        }
      });
    }
    </script>
</body>
</html>
`;