const jwt = require('jsonwebtoken');
const pool = require('./db');

const authenticateJWT = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (token) {
        jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
            if (err) {
                return res.sendStatus(403);
            }
            req.user = user;
            next();
        });
    } else {
        res.sendStatus(401);
    }
};

const isAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador.' });
    }
    next();
};

const canEdit = (req, res, next) => {
    const userIdFromToken = req.user.id;         
    const userRole = req.user.role;              
    const userIdToEdit = parseInt(req.params.id); 
    if (userIdFromToken === userIdToEdit || userRole === 'admin') {
        return next(); // ✅ 
    }
    return res.status(403).json({ message: 'No tienes permiso para editar este usuario.' });
};

const canSeeOrder = async (req, res, next) => {
    const userIdFromToken = req.user.id;
    const userRole = req.user.role;
    const orderId = req.params.id;
    const result = await pool.query(
        'SELECT user_id FROM orders WHERE id = $1',
        [orderId]
    );
    const order = result.rows[0];
    if (userIdFromToken === order.user_id || userRole === 'admin') {
        return next();
    }

    return res.status(403).json({ message: 'No tienes permiso para acceder a esta orden.' });
};




module.exports = { authenticateJWT, isAdmin, canEdit, canSeeOrder };