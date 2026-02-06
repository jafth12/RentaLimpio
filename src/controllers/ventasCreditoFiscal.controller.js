import pool from '../config/db.js'

export const getVentasCCF = async (req, res) => {
    try {
        res.json([
            { id: 1, cliente: 'Cliente Prueba', fecha: '2026-02-03', total: 113.00}
        ]);
    } catch (error) {
        res.status(500).json({ message: 'Error interno', error: error.message});
    }
};

 export const createVentasCCF = async (req, res) => {
    console.log("Datos recibidos para CCF:", req.body);

    res.json({ message: 'Venta de Credito Fiscal guardad (Simulacion)'});
};

//export const getVentasCCF = async (req, res) => {
  //  try {

    //} catch (error) {

    //}
//};

//export const getVentasCCF = async (req, res) => {
    //try {

    //} catch (error) {

    //}
//};