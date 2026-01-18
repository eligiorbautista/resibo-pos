import express from 'express';
import * as printerController from '../controllers/printer.controller';

const router = express.Router();

/**
 * @route   POST /api/printer/print
 * @desc    Print a receipt
 * @access  Public
 */
router.post('/print', printerController.printReceipt);

/**
 * @route   GET /api/printer/status
 * @desc    Get printer status
 * @access  Public
 */
router.get('/status', printerController.getPrinterStatus);

/**
 * @route   POST /api/printer/reconnect
 * @desc    Reconnect to printer
 * @access  Public
 */
router.post('/reconnect', printerController.reconnectPrinter);

/**
 * @route   GET /api/printer/ports
 * @desc    List available serial ports
 * @access  Public
 */
router.get('/ports', printerController.listPorts);

export default router;
