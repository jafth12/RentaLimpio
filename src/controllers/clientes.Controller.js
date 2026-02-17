import pool from '../config/db.js';

// 1. OBTENER TODOS LOS CLIENTES
export const getClientes = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM clientes');
        res.json(rows);
    } catch (error) {
        console.error('❌ Error al obtener clientes:', error);
        res.status(500).json({ message: 'Error interno', error: error.message });
    }
};

// 2. CREAR UN CLIENTE
export const createCliente = async (req, res) => {
    let { nit, nombre, direccion, departamento, giro, registro, tel1, tel2, correo, observacion } = req.body;

    // 1. Estandarización de Auditoría: Limpiamos el NIT de guiones/espacios
    const nitLimpio = nit ? nit.replace(/-/g, '').trim() : null;

    if (!nitLimpio || !nombre) {
        return res.status(400).json({ message: 'Error de Auditoría: NIT y Nombre son obligatorios.' });
    }

    try {
        // Verificar duplicidad con el NIT estandarizado
        const [existente] = await pool.query('SELECT ClienNIT FROM clientes WHERE ClienNIT = ?', [nitLimpio]);
        if (existente.length > 0) {
            return res.status(400).json({ message: 'Este NIT ya consta en nuestros registros contables.' });
        }

        await pool.query(
            `INSERT INTO clientes 
            (ClienNIT, ClienNom, ClienDirec, ClienDepto, ClienGiro, ClienNumReg, ClienTel1, ClienTel2, ClienCorreo, ClienObserv) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [nitLimpio, nombre.toUpperCase(), direccion || '', departamento || '', giro || '', registro || '', tel1 || '', tel2 || '', correo || '', observacion || '']
        );

        // Informamos si el registro es apto para operaciones de Crédito Fiscal
        const esAptoCCF = (registro && giro) ? true : false;

        res.json({ 
            message: 'Cliente registrado exitosamente', 
            nit: nitLimpio,
            aptoParaCCF: esAptoCCF 
        });
    } catch (error) {
        res.status(500).json({ message: 'Falla de integridad en el servidor', error: error.message });
    }
};

// 3. ACTUALIZAR UN CLIENTE
export const updateCliente = async (req, res) => {
    const { id } = req.params; // NIT original para el WHERE
    const { 
        nit, 
        nombre, 
        direccion, 
        departamento, 
        giro, 
        registro, 
        tel1, 
        tel2, 
        correo, 
        observacion 
    } = req.body;

    if (!nit || !nombre) {
        return res.status(400).json({ message: 'El NIT y el Nombre son obligatorios.' });
    }

    try {
        const [result] = await pool.query(
            `UPDATE clientes SET 
            ClienNIT = ?, 
            ClienNom = ?, 
            ClienDirec = ?, 
            ClienDepto = ?, 
            ClienGiro = ?, 
            ClienNumReg = ?, 
            ClienTel1 = ?, 
            ClienTel2 = ?, 
            ClienCorreo = ?, 
            ClienObserv = ?
            WHERE ClienNIT = ?`,
            [
                nit, 
                nombre, 
                direccion || '', 
                departamento || '', 
                giro || '', 
                registro || '', 
                tel1 || '', 
                tel2 || '', 
                correo || '', 
                observacion || '', 
                id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }

        res.json({ message: 'Cliente actualizado correctamente' });
    } catch (error) {
        console.error('❌ Error al actualizar cliente:', error);
        res.status(500).json({ message: 'Error al actualizar', error: error.message });
    }
};

// 4. ELIMINAR UN CLIENTE
export const deleteCliente = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM clientes WHERE ClienNIT = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
        }
        res.json({ message: 'Cliente eliminado correctamente' });
    } catch (error) {
        console.error('❌ Error al eliminar cliente:', error);
        res.status(500).json({ message: 'Error al eliminar', error: error.message });
    }
};