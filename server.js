const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: '*',
    credentials: true
}));

app.use(express.static('public'));

app.use(express.json());

app.post('/api/sheets', async (req, res) => {
    try {
        const { accessToken, spreadsheetId, range } = req.body;

        const response = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error proxying sheets request:', error);
        res.status(500).json({ error: 'Failed to fetch spreadsheet data' });
    }
});

app.get('/api/config', (req, res) => {
    res.json({
        clientId: process.env.GOOGLE_CLIENT_ID,
        spreadsheetId: process.env.SPREADSHEET_ID,
        scopes: 'https://www.googleapis.com/auth/spreadsheets.readonly'
    });
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

app.listen(PORT, () => {
    console.log(`  API Server running on http://localhost:${PORT}`);
    console.log(`  API endpoints available at:`);
    console.log(`   - GET  http://localhost:${PORT}/api/config`);
    console.log(`   - POST http://localhost:${PORT}/api/sheets`);
    console.log(`   - GET  http://localhost:${PORT}/api/health`);
});