const express = require('express');
const router = express.Router();
const multer = require('multer');
const pinataService = require('../utils/pinataService');

// Configurar multer para manejar archivos en memoria
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten imagenes'), false);
        }
    }
});

// Subir imagen a Pinata/IPFS
router.post('/image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se envio ninguna imagen' });
        }

        const result = await pinataService.uploadImage(
            req.file.buffer,
            req.file.originalname
        );

        res.json({
            success: true,
            ipfsHash: result.ipfsHash,
            ipfsUri: result.ipfsUri,
            gatewayUrl: result.pinataUrl
        });
    } catch (error) {
        console.error('Error subiendo imagen:', error);
        res.status(500).json({ error: error.message });
    }
});

// Subir metadata JSON a Pinata/IPFS
router.post('/metadata', async (req, res) => {
    try {
        const metadata = req.body;

        if (!metadata || Object.keys(metadata).length === 0) {
            return res.status(400).json({ error: 'Metadata vacia' });
        }

        const result = await pinataService.uploadMetadata(metadata);

        res.json({
            success: true,
            ipfsHash: result.ipfsHash,
            ipfsUri: result.ipfsUri,
            gatewayUrl: result.pinataUrl
        });
    } catch (error) {
        console.error('Error subiendo metadata:', error);
        res.status(500).json({ error: error.message });
    }
});

// Subir imagen + crear metadatos NFT completos 
router.post('/nft-metadata', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se envio ninguna imagen' });
        }

        // 1. Subir imagen a IPFS
        const imageResult = await pinataService.uploadImage(
            req.file.buffer,
            req.file.originalname
        );

        // 2. Crear y subir metadatos JSON con la imagen
        const movieData = {
            title: req.body.title || 'Sin titulo',
            synopsis: req.body.synopsis || '',
            director: req.body.director || '',
            genre: req.body.genre || '',
            releaseYear: req.body.releaseYear || ''
        };

        const metadataResult = await pinataService.createMovieNFTMetadata(
            movieData,
            imageResult.ipfsHash
        );

        res.json({
            success: true,
            // URI de la imagen (para mostrar en la web)
            imageUri: imageResult.ipfsUri,
            imageUrl: imageResult.pinataUrl,
            // URI de los metadatos (para el NFT - tokenURI)
            metadataUri: metadataResult.ipfsUri,
            metadataUrl: metadataResult.pinataUrl
        });
    } catch (error) {
        console.error('Error creando NFT metadata:', error);
        res.status(500).json({ error: error.message });
    }
});

// Test de conexion con Pinata
router.get('/test', async (req, res) => {
    try {
        const result = await pinataService.testConnection();
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
