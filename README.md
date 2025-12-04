# CinePelis DApp

DApp de cine con NFTs desplegada en Sepolia.

## Requisitos previos

- Node.js instalado
- Cuenta de Ethereum con ETH en Sepolia


## Comandos a ejecutar

### 1. Instalar dependencias

```shell
npm install
```

### 2. Configurar variables de entorno

Crear archivo `.env` en la raíz del proyecto:

```
# Configuración de Red (Sepolia)
API_URL=https://eth-sepolia.g.alchemy.com/v2/TU_API_KEY
PRIVATE_KEY=tu_clave_privada_sin_0x
PUBLIC_KEY=0xTuDireccionPublica

# Configuración de Pinata (IPFS para imágenes y metadata)
PINATA_API_KEY=tu_api_key_de_pinata
PINATA_SECRET_KEY=tu_secret_key_de_pinata

# Direcciones de contratos (se generan automáticamente en el deploy)
NFT_CONTRACT_ADDRESS=
WALLET_CONTRACT=

# Opcional: Puerto del servidor (default: 3000)
PORT=3000
```

**Donde obtener las claves:**

- **API_URL**: Crear cuenta en [Alchemy](https://www.alchemy.com/) o [Infura](https://infura.io/), crear app en Sepolia y copiar la URL
- **PRIVATE_KEY**: Exportar desde MetaMask (Configuración > Seguridad > Exportar clave privada)
- **PINATA_API_KEY / PINATA_SECRET_KEY**: Crear cuenta en [Pinata](https://www.pinata.cloud/), ir a API Keys y generar nueva key

### 3. Compilar contratos

```shell
npx hardhat compile
```

### 4. Desplegar contratos en Sepolia

```shell
npx hardhat run scripts/deploy.js --network sepolia
```

Este comando despliega los contratos MovieNFT y CinemaWallet, y guarda las direcciones en el archivo `.env`.

### 5. Iniciar el servidor

```shell
node index.js
```

El servidor estará disponible en `http://localhost:3000`

## Contratos

- **MovieNFT** (`contracts/NFT.sol`): Contrato de NFTs de películas
- **CinemaWallet** (`contracts/Wallet.sol`): Wallet para distribución de pagos

## Estructura del proyecto

```
├── contracts/          # Contratos Solidity
├── scripts/            # Scripts de despliegue
├── public/             # Frontend
├── routes/             # Rutas de la API
├── utils/              # Servicios auxiliares (pinataService.js para IPFS)
├── index.js            # Servidor Express
└── hardhat.config.js   # Configuración de Hardhat
```
