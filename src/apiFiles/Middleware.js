const jwt = require('jsonwebtoken');

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


module.exports = { authenticateJWT, isAdmin, canEdit };