const dotenv = require('dotenv');
var environment = process.env.NODE_ENV || 'development'; // Obtiene la variable de entorno NODE_ENV, si no existe, usa 'development' por defecto
if (environment == "test ") {
  environment = "test"
}

const result = dotenv.config({
  path: `.env.${environment}` // Carga el archivo .env.[entorno] (ej: .env.development o .env.test)
});

// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formato "Bearer TOKEN"

    if (!token) return res.status(403).send({ message: "Token requerido" });
console.log(process.env.JWT_PASSWORD_SECRET, token)
    jwt.verify(token, process.env.JWT_PASSWORD_SECRET, (err, decoded) => {
        if (err) return res.status(401).send({ message: "Token inválido o expirado" });
        
        req.user = decoded; // Guardamos los datos del usuario en el request
        next();
    });
};