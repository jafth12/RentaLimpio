import { createHmac } from 'crypto';

// Rutas que no requieren autenticación
const RUTAS_PUBLICAS = ['/api/login'];

// Genera un token de sesión: base64(usuario:rol:timestamp):firma
export const generarToken = (usuario, rol) => {
    const secret = process.env.SESSION_SECRET || 'renta_sv_secret_2025';
    const timestamp = Date.now();
    const payload = Buffer.from(`${usuario}:${rol}:${timestamp}`).toString('base64');
    const firma = createHmac('sha256', secret).update(payload).digest('hex');
    return `${payload}.${firma}`;
};

// Verifica y decodifica un token de sesión
export const verificarToken = (token) => {
    if (!token) return null;
    try {
        const secret = process.env.SESSION_SECRET || 'renta_sv_secret_2025';
        const [payload, firma] = token.split('.');
        if (!payload || !firma) return null;

        // Verificar firma
        const firmaEsperada = createHmac('sha256', secret).update(payload).digest('hex');
        if (firma !== firmaEsperada) return null;

        // Decodificar payload
        const [usuario, rol, timestamp] = Buffer.from(payload, 'base64').toString().split(':');

        // Expiración: 8 horas
        const OCHO_HORAS = 8 * 60 * 60 * 1000;
        if (Date.now() - parseInt(timestamp) > OCHO_HORAS) return null;

        return { usuario, rol, timestamp: parseInt(timestamp) };
    } catch {
        return null;
    }
};

// Middleware global — se aplica a todas las rutas excepto las públicas
export const requireSession = (req, res, next) => {
    // Permitir rutas públicas
    if (RUTAS_PUBLICAS.some(ruta => req.path === ruta || req.path.startsWith(ruta))) {
        return next();
    }

    const token = req.headers['x-session-token'];
    const sesion = verificarToken(token);

    if (!sesion) {
        return res.status(401).json({
            message: 'Sesión no válida o expirada. Por favor, inicie sesión nuevamente.'
        });
    }

    // Adjuntar datos del usuario al request para que los controllers los usen
    req.usuario = sesion.usuario;
    req.rolUsuario = sesion.rol;

    next();
};
