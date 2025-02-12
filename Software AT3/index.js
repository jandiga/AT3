import path from 'path';
import express from 'express';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname)));
// app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true })); 
app.use(express.urlencoded({ extended: true }));


// Routes
app.get('/', (req, res) => { 
    res.render('index.ejs');
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/leagues', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'leagues.html'));
});

app.get('/leaderboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'leaderboard.html'));
});

app.get('/faq', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'FAQ.html'));
});

app.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'about.html'));
});

app.get('/login', (req, res) => {
    res.render('login.ejs');
});

app.post('/login', (req, res) => {
    // Handle login logic here
    console.log(req.body['email']);
    console.log(req.body['password']);
    console.log(req.body['remember']);

    res.redirect('/dashboard');
});

app.get('/sign-up', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sign-up.html'));
});

app.get('/team-management', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'team-management.html'));
});

app.get('/settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'settings.html'));
});

app.get('/player-details', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'player-details.html'));
});

app.get('/rewards', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'rewards.html'));
});

app.get('/scoring-and-progress', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'scoring-and-progress.html'));
});

app.get('/drafting', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'drafting.html'));
});

app.listen(port, () => { 
    console.log(`Server is running on port ${port}`); 
}); 
