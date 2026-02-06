import { createPool } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = createPool({
    host: process.env.DB_HOST || '192.168.1.7',
    user: process.env.DB_USER || 'mayli_dev',
    password: process.env.DB_PASSWORD || 'coreasuno',
    database: process.env.DB_NAME || 'declaracion_renta_db',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000 
});


pool.getConnection()
    .then(connection => {
        console.log('✅ Conectado exitosamente a la base de datos MySQL');
        connection.release();
    })
    .catch(error => {
        console.error('Error fatal al conectar a la base de datos:', error.message);
    });

export default pool;