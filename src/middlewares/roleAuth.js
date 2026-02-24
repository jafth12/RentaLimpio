export const requireAdmin = (req, res, next) => {
    // 🛡️ CORREGIDO: Leer el header exacto en minúsculas
    const userRole = req.headers['x-user-role'];

    console.log(`Verificando seguridad. Rol recibido: ${userRole || 'Ninguno'}`);
    
    if (userRole === 'admin') {
        next();
    } else {
        return res.status(403).json({ 
            message: 'ACCESO DENEGADO: Se requieren permisos de Administrador.' 
        });
    }
};