const path = require('path');
const dotenv = require('dotenv');
const environment = (process.env.NODE_ENV || 'development').trim();

dotenv.config({
  path: path.join(__dirname, '..', '..', `.env.${environment}`),
});

// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formato "Bearer TOKEN"

    if (!token) return res.status(403).send({ message: "Token requerido" });
    jwt.verify(token, process.env.JWT_PASSWORD_SECRET, (err, decoded) => {
        if (err) return res.status(401).send({ message: "Token inválido o expirado" });
        
        req.user = decoded; // Guardamos los datos del usuario en el request
        next();
    });
};