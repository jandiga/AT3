import path from 'path';
import express from 'express';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Serve static files from the Pages directory
app.use(express.static(path.join(__dirname)));

// Routes
app.get('/', (req, res) => { 
    res.sendFile(path.join(__dirname, 'Pages', 'homepage.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'Pages', 'dashboard.html'));
});

app.get('/leagues', (req, res) => {
    res.sendFile(path.join(__dirname, 'Pages', 'leagues.html'));
});

app.get('/leaderboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'Pages', 'leaderboard.html'));
});

app.get('/faq', (req, res) => {
    res.sendFile(path.join(__dirname, 'Pages', 'FAQ.html'));
});

app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'Pages', 'about.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'Pages', 'login.html'));
});

app.get('/sign-up', (req, res) => {
    res.sendFile(path.join(__dirname, 'Pages', 'sign-up.html'));
});

app.get('/team-management', (req, res) => {
    res.sendFile(path.join(__dirname, 'Pages', 'team-management.html'));
});

app.get('/settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'Pages', 'settings.html'));
});

app.get('/player-details', (req, res) => {
    res.sendFile(path.join(__dirname, 'Pages', 'player-details.html'));
});

app.get('/rewards', (req, res) => {
    res.sendFile(path.join(__dirname, 'Pages', 'rewards.html'));
});

app.get('/scoring-and-progress', (req, res) => {
    res.sendFile(path.join(__dirname, 'Pages', 'scoring-and-progress.html'));
});

app.get('/drafting', (req, res) => {
    res.sendFile(path.join(__dirname, 'Pages', 'drafting.html'));
});

app.listen(port, () => { 
    console.log(`Server is running on port ${port}`); 
}); 
