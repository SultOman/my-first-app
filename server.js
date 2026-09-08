const express = require('express');
const cors = require('cors');
const path = require('path');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const app = express();
const PORT = 4000;

const HR_USERNAME = 'hr.manager';
const HR_PASSWORD = 'opaz2026';

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'x-hr-token']
}));
app.use(express.json());
app.use(express.static('public'));

const adapter = new FileSync('employees.json');
const db = low(adapter);
db.defaults({ employees: [], nextId: 1 }).write();

console.log('Database ready! Data saved to employees.json');

let hrToken = null;

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/hr-login', (req, res) => {
    const { username, password } = req.body;
    if (username === HR_USERNAME && password === HR_PASSWORD) {
        hrToken = 'hr-token-' + Date.now();
        console.log('HR Manager logged in!');
        res.json({ success: true, message: 'Welcome HR Manager!', token: hrToken });
    } else {
        res.json({ success: false, message: 'Wrong username or password!' });
    }
});

app.post('/hr-logout', (req, res) => {
    hrToken = null;
    res.json({ success: true, message: 'Logged out!' });
});

app.get('/hr-check', (req, res) => {
    const token = req.headers['x-hr-token'];
    res.json({ loggedIn: token && token === hrToken });
});

app.post('/submit-employee', (req, res) => {
    const data = req.body;
    const id = db.get('nextId').value();
    const newEmployee = {
        id: id,
        name: data.name,
        department: data.department,
        position: data.position,
        email: data.email,
        phone: data.phone,
        status: 'pending',
        hrComment: null,
        submittedAt: new Date().toLocaleString(),
        reviewedAt: null
    };
    db.get('employees').push(newEmployee).write();
    db.update('nextId', n => n + 1).write();
    console.log('New employee saved:', data.name);
    res.json({
        success: true,
        message: 'Form submitted! HR will review it soon.',
        id: id
    });
});

app.get('/employees', (req, res) => {
    const token = req.headers['x-hr-token'];
    if (!token || token !== hrToken) {
        return res.status(401).json({ success: false, message: 'Please login first!' });
    }
    const employees = db.get('employees').value().reverse();
    res.json(employees);
});

app.post('/review/:id', (req, res) => {
    const token = req.headers['x-hr-token'];
    if (!token || token !== hrToken) {
        return res.status(401).json({ success: false, message: 'Please login first!' });
    }
    const employeeId = parseInt(req.params.id);
    const decision = req.body.decision;
    const comment = req.body.comment;
    db.get('employees')
        .find({ id: employeeId })
        .assign({
            status: decision,
            hrComment: comment,
            reviewedAt: new Date().toLocaleString()
        })
        .write();
    console.log('HR decision:', decision, 'for employee ID:', employeeId);
    res.json({ success: true, message: 'Employee ' + decision + ' successfully!' });
});

app.listen(PORT, () => {
    console.log('Server is running at http://localhost:' + PORT);
    console.log('HR Login: username = hr.manager | password = opaz2026');
    console.log('Open your app at: http://localhost:' + PORT);
});