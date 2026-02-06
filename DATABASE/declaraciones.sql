-- MySQL dump 10.13  Distrib 8.0.34, for Win64 (x86_64)
--
-- Host: 192.168.1.5    Database: declaraciones
-- ------------------------------------------------------
-- Server version	8.4.8

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `compras`
--

DROP TABLE IF EXISTS `compras`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `compras` (
  `idcompras` int NOT NULL,
  `ComFecha` date DEFAULT NULL,
  `ComClase` varchar(45) DEFAULT NULL,
  `ComTipo` varchar(45) DEFAULT NULL,
  `ComNumero` varchar(45) DEFAULT NULL,
  `proveedor_ProvNIT` varchar(14) NOT NULL,
  `ComNomProve` varchar(50) DEFAULT NULL,
  `ComIntExe` decimal(10,2) NOT NULL DEFAULT '0.00',
  `ComInternacioExe` decimal(10,2) DEFAULT '0.00',
  `ComImpExeNoSujetas` decimal(10,2) DEFAULT '0.00',
  `ComIntGrav` decimal(10,2) NOT NULL,
  `ComInternacGravBienes` decimal(10,2) DEFAULT '0.00',
  `ComImportGravBienes` decimal(10,2) DEFAULT '0.00',
  `ComImportGravServicios` decimal(10,2) DEFAULT '0.00',
  `ComCredFiscal` decimal(10,2) DEFAULT NULL,
  `ComTotal` decimal(10,2) DEFAULT NULL,
  `ComDuiProve` varchar(10) DEFAULT NULL,
  `ComTipoOpeRenta` varchar(45) DEFAULT NULL,
  `ComClasiRenta` varchar(45) DEFAULT NULL COMMENT 'Clasificacion',
  `ComSecNum` varchar(45) DEFAULT NULL COMMENT 'Sector',
  `ComTipoCostoGasto` varchar(45) DEFAULT NULL COMMENT 'Tipo de costo / Gasto',
  `ComAnexo` varchar(1) DEFAULT '3' COMMENT 'Anexo',
  `ComMesDeclarado` varchar(20) NOT NULL COMMENT 'Mes declarado',
  PRIMARY KEY (`idcompras`,`proveedor_ProvNIT`),
  KEY `fk_compras_proveedor1_idx` (`proveedor_ProvNIT`),
  CONSTRAINT `fk_compras_proveedor1` FOREIGN KEY (`proveedor_ProvNIT`) REFERENCES `proveedor` (`ProvNIT`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `compras`
--

LOCK TABLES `compras` WRITE;
/*!40000 ALTER TABLE `compras` DISABLE KEYS */;
/*!40000 ALTER TABLE `compras` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `empleados`
--

DROP TABLE IF EXISTS `empleados`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `empleados` (
  `idempleado` int NOT NULL AUTO_INCREMENT,
  `EmpleNombre` varchar(50) NOT NULL,
  `EmpleDirec` varchar(60) DEFAULT NULL,
  `EmpleaDepto` varchar(15) DEFAULT NULL,
  `EmpleDUI` varchar(410) NOT NULL,
  `EmpleaTel` varchar(8) DEFAULT NULL,
  `EmpleCorreo` varchar(45) DEFAULT NULL,
  `empledoscol` varchar(70) DEFAULT NULL,
  PRIMARY KEY (`idempleado`),
  UNIQUE KEY `EmpleDUI_UNIQUE` (`EmpleDUI`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `empleados`
--

LOCK TABLES `empleados` WRITE;
/*!40000 ALTER TABLE `empleados` DISABLE KEYS */;
INSERT INTO `empleados` VALUES (1,'Admin','Prueba_direccion','San Miguel','123456789','12345678','Admin@gmail.com',NULL);
/*!40000 ALTER TABLE `empleados` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `proveedor`
--

DROP TABLE IF EXISTS `proveedor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `proveedor` (
  `ProvNIT` varchar(14) NOT NULL,
  `ProvNombre` varchar(50) DEFAULT NULL,
  `ProvDirec` varchar(60) DEFAULT NULL,
  `ProvDepto` varchar(15) DEFAULT NULL,
  PRIMARY KEY (`ProvNIT`),
  UNIQUE KEY `ProvNIT_UNIQUE` (`ProvNIT`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `proveedor`
--

LOCK TABLES `proveedor` WRITE;
/*!40000 ALTER TABLE `proveedor` DISABLE KEYS */;
/*!40000 ALTER TABLE `proveedor` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `idUsuario` int NOT NULL AUTO_INCREMENT,
  `UsuaNombre` varchar(45) NOT NULL,
  `UsuarioPassword` varchar(45) NOT NULL,
  `id_empleado` varchar(45) DEFAULT NULL,
  `empleados_idempleado` int NOT NULL,
  PRIMARY KEY (`idUsuario`,`empleados_idempleado`),
  KEY `fk_usuarios_empleados_idx` (`empleados_idempleado`),
  CONSTRAINT `fk_usuarios_empleados` FOREIGN KEY (`empleados_idempleado`) REFERENCES `empleados` (`idempleado`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (1,'Admin','1234',NULL,1);
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-23 11:42:23
