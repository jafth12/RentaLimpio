export const requireAdmin = (req, res, next) => {
    // Los headers en Express se convierten automáticamente a minúsculas
    const userRole = req.headers['x-user-role'];

    console.log(`Verificando seguridad. Usuario: ${req.headers['x-usuario']} | Rol recibido: ${userRole || 'Ninguno'}`);
    
    if (userRole === 'admin') {
        next();
    } else {
        return res.status(403).json({ 
            message: 'ACCESO DENEGADO: Solo los Administradores pueden eliminar registros o gestionar el sistema.' 
        });
    }
};