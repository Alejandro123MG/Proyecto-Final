const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;

const pinataService = {
    // Subir imagen a Pinata
    async uploadImage(fileBuffer, fileName) {
        const url = 'https://api.pinata.cloud/pinning/pinFileToIPFS';

        const formData = new FormData();
        formData.append('file', fileBuffer, {
            filename: fileName,
            contentType: 'image/jpeg'
        });

        const metadata = JSON.stringify({
            name: fileName
        });
        formData.append('pinataMetadata', metadata);

        try {
            const response = await axios.post(url, formData, {
                maxBodyLength: 'Infinity',
                headers: {
                    'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
                    'pinata_api_key': PINATA_API_KEY,
                    'pinata_secret_api_key': PINATA_SECRET_KEY
                }
            });

            return {
                success: true,
                ipfsHash: response.data.IpfsHash,
                pinataUrl: `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`,
                ipfsUri: `ipfs://${response.data.IpfsHash}`
            };
        } catch (error) {
            console.error('Error subiendo a Pinata:', error.response?.data || error.message);
            throw new Error('Error al subir imagen a IPFS');
        }
    },

    // Subir metadata JSON a Pinata 
    async uploadMetadata(metadata) {
        const url = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';

        try {
            const response = await axios.post(url, metadata, {
                headers: {
                    'Content-Type': 'application/json',
                    'pinata_api_key': PINATA_API_KEY,
                    'pinata_secret_api_key': PINATA_SECRET_KEY
                }
            });

            return {
                success: true,
                ipfsHash: response.data.IpfsHash,
                pinataUrl: `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`,
                ipfsUri: `ipfs://${response.data.IpfsHash}`
            };
        } catch (error) {
            console.error('Error subiendo metadata a Pinata:', error.response?.data || error.message);
            throw new Error('Error al subir metadata a IPFS');
        }
    },

    // Crear metadata completa de película para NFT 
    async createMovieNFTMetadata(movieData, imageIpfsHash) {
        const metadata = {
            name: movieData.title,
            description: movieData.synopsis || `Película: ${movieData.title}`,
            image: `ipfs://${imageIpfsHash}`,
            external_url: "https://cinepelis.app",
            attributes: [
                {
                    trait_type: "Director",
                    value: movieData.director || "Desconocido"
                },
                {
                    trait_type: "Genero",
                    value: movieData.genre || "Sin genero"
                },
                {
                    trait_type: "Año",
                    value: movieData.releaseYear ? movieData.releaseYear.toString() : "Desconocido"
                },
                {
                    trait_type: "Tipo",
                    value: "Pelicula"
                }
            ]
        };

        return await this.uploadMetadata(metadata);
    },

    // Verificar conexión con Pinata
    async testConnection() {
        try {
            const response = await axios.get('https://api.pinata.cloud/data/testAuthentication', {
                headers: {
                    'pinata_api_key': PINATA_API_KEY,
                    'pinata_secret_api_key': PINATA_SECRET_KEY
                }
            });
            return { success: true, message: response.data.message };
        } catch (error) {
            return { success: false, message: error.response?.data || error.message };
        }
    }
};

module.exports = pinataService;
