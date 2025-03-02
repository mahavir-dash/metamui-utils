const express = require('express');
const { exec } = require('child_process');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname)));

app.get('/run', (req, res) => {
    const script = req.query.script;

    if (!script || !['client_login_requests.js', 'authorisation_request.js'].includes(script)) {
        return res.status(400).send("Invalid script request");
    }

    exec(`node ${script}`, (error, stdout, stderr) => {
        if (error) return res.status(500).send(stderr);
        res.send(stdout || "Script executed successfully!");
    });
});

// Serve index.html at root "/"
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
