const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./db');
const { useFormState } = require('react-dom');

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

const getUser = async (req, res) => {
    try {
        const user = await pool.query(
            'SELECT id, username, email, role FROM users WHERE id = $1',
            [req.user.id]
        );
        res.json(user.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo usuario', error });
    }
};

const updateUser = async (req, res) => {
    const { username, email, role } = req.body;
    try {
        const result = await pool.query(
            'UPDATE users SET username = $1, email = $2, role = $3 WHERE id = $4 RETURNING *',
            [username, email, role, req.params.id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: 'Error actualizando usuario', error });
    }
};

const deleteUser = async (req, res) => {
    try{
        await pool.query(
            'DELETE FROM usersWHERE id = $1'[req.params.id]
        )
        res.json({ message: 'Usuario eliminado correctamente.' });
    } catch (error) {
        res.status(500).json({ message: 'Error eliminando usuario', error });
    }
};



// Other CRUD operations for users, restaurants, menus, reservations, and orders can be added similarly.

module.exports = { registerUser , loginUser, getUser };