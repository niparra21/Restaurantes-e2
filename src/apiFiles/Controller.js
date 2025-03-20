const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./db');

// User Registration
const registerUser  = async (req, res) => {
    const { username, password, email, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query('INSERT INTO users (username, password, email, role) VALUES ($1, $2, $3, $4) RETURNING *', [username, hashedPassword, email, role]);
    res.status(201).json(result.rows[0]);
};

// User Login
const loginUser  = async (req, res) => {
    const { username, password } = req.body;
    const user = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (user.rows.length > 0 && await bcrypt.compare(password, user.rows[0].password)) {
        const token = jwt.sign({ id: user.rows[0].id, role: user.rows[0].role }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
    } else {
        res.status(401).json({ message: 'Invalid credentials' });
    }
};

// Other CRUD operations for users, restaurants, menus, reservations, and orders can be added similarly.

module.exports = { registerUser , loginUser  };