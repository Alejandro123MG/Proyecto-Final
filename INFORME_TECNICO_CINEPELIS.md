# INFORME TÉCNICO COMPLETO - CinePelis DApp

## Resumen Ejecutivo

**CinePelis** es una Aplicación Descentralizada (DApp) construida sobre la blockchain de Ethereum (testnet Sepolia) que permite comprar y coleccionar películas como NFTs. El proyecto combina:

- **Smart Contracts en Solidity** para la lógica de negocio
- **Frontend JavaScript vanilla** con diseño moderno
- **MetaMask** para autenticación y transacciones
- **IPFS/Pinata** para almacenamiento descentralizado de imágenes

---

## 1. ARQUITECTURA GENERAL

```
┌─────────────────────────────────────────────────────────────────┐
│                         USUARIO                                  │
│                      (Navegador Web)                            │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                       METAMASK                                   │
│              (Wallet / Firma de Transacciones)                  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          ▼                               ▼
┌──────────────────┐           ┌──────────────────────────────────┐
│   EXPRESS.JS     │           │      BLOCKCHAIN SEPOLIA          │
│   (Servidor)     │           │                                  │
│                  │           │  ┌────────────────────────────┐  │
│  - Archivos      │           │  │      MovieNFT.sol          │  │
│    estáticos     │           │  │      (ERC721)              │  │
│  - API Upload    │           │  │  - Minteo de NFTs          │  │
│                  │           │  │  - Metadata películas      │  │
└────────┬─────────┘           │  └────────────────────────────┘  │
         │                     │                                  │
         ▼                     │  ┌────────────────────────────┐  │
┌──────────────────┐           │  │    CinemaWallet.sol        │  │
│     PINATA       │           │  │                            │  │
│     (IPFS)       │           │  │  - Catálogo películas      │  │
│                  │           │  │  - Compras/Ventas          │  │
│  - Posters       │           │  │  - Split de pagos 70/30    │  │
│  - Metadata      │           │  │  - Carrito múltiple        │  │
└──────────────────┘           │  └────────────────────────────┘  │
                               └──────────────────────────────────┘
```

---

## 2. ESTRUCTURA DEL PROYECTO

```
Proyecto Final/
│
├── contracts/                    # Contratos Solidity
│   ├── NFT.sol                  # Contrato ERC721 para NFTs
│   └── Wallet.sol               # Contrato principal de negocio
│
├── public/                       # Frontend (archivos estáticos)
│   ├── index.html               # Página principal
│   ├── css/
│   │   ├── main.css             # Estilos globales
│   │   └── components/          # Estilos por componente
│   │       ├── navbar.css
│   │       ├── cards.css
│   │       ├── modal.css
│   │       └── cart.css
│   │
│   └── js/
│       ├── app.js               # Controlador principal
│       ├── services/
│       │   └── wallet.js        # Integración MetaMask/Contratos
│       ├── pages/
│       │   ├── catalog.js       # Página del catálogo
│       │   ├── purchases.js     # Mis películas compradas
│       │   └── admin.js         # Panel de administración
│       └── components/
│           ├── cart.js          # Carrito de compras
│           ├── navbar.js        # Barra de navegación
│           ├── movieCard.js     # Tarjeta de película
│           ├── modal.js         # Ventanas modales
│           └── toast.js         # Notificaciones
│
├── routes/
│   └── uploadRoutes.js          # API para subir imágenes
│
├── utils/
│   ├── pinataService.js         # Servicio IPFS/Pinata
│   ├── contractHelper.js        # Helpers de contratos
│   └── accountManager.js        # Gestión de cuentas
│
├── scripts/
│   └── deploy.js                # Script de deployment
│
├── index.js                     # Servidor Express
├── hardhat.config.js            # Configuración Hardhat
├── package.json                 # Dependencias
└── .env                         # Variables de entorno (secretas)
```

---

## 3. SMART CONTRACTS

### 3.1 MovieNFT.sol (Contrato de NFTs)

**Propósito:** Crear y gestionar NFTs únicos para cada película comprada.

**Estándar:** ERC721 de OpenZeppelin

**Estructura de datos:**
```solidity
struct Movie {
    string title;      // Título de la película
    string director;   // Director
    uint256 year;      // Año de lanzamiento
    string genre;      // Género
}

mapping(uint256 => Movie) public movies;  // tokenId => Movie
```

**Funciones principales:**

| Función | Acceso | Descripción |
|---------|--------|-------------|
| `mintMovie()` | Owner/Autorizado | Crea un nuevo NFT con metadata de película |
| `setAuthorizedMinter()` | Solo Owner | Autoriza a CinemaWallet para mintear |
| `getMovie()` | Público | Obtiene datos de una película por tokenId |
| `totalMovies()` | Público | Retorna cantidad total de NFTs |

**Eventos:**
- `MovieMinted(uint256 tokenId, string title, address owner)`

---

### 3.2 CinemaWallet.sol (Contrato Principal)

**Propósito:** Gestionar el catálogo de películas, procesar compras y distribuir pagos automáticamente.

**Estructura de datos:**
```solidity
struct Movie {
    uint id;              // ID único
    string title;         // Título
    string genre;         // Género
    string synopsis;      // Sinopsis
    uint price;           // Precio en Wei
    address seller;       // Vendedor (owner)
    bool active;          // Estado activo/inactivo
    uint256 releaseYear;  // Año de lanzamiento
    string posterURI;     // URI del poster en IPFS
}

mapping(uint => Movie) public movies;                        // Catálogo
mapping(address => uint[]) public purchases;                 // Compras por usuario
mapping(address => mapping(uint => bool)) public hasPurchased; // Verificación rápida
```

**Funciones principales:**

| Función | Acceso | Descripción |
|---------|--------|-------------|
| `addMovie()` | Solo Owner | Agrega película al catálogo |
| `buyMovie()` | Público | Compra una película individual |
| `buyMultipleMovies()` | Público | Compra múltiples películas (carrito) |
| `getCartTotal()` | Público | Calcula total del carrito |
| `getAllMovies()` | Público | Retorna todas las películas |
| `getActiveMovies()` | Público | Retorna solo películas activas |
| `getPurchases()` | Público | Obtiene compras de un usuario |
| `checkPurchase()` | Público | Verifica si usuario ya compró |
| `disableMovie()` | Solo Owner | Desactiva una película |
| `enableMovie()` | Solo Owner | Reactiva una película |

**Sistema de distribución de pagos:**
```
Cuando un usuario compra una película:

Pago del usuario (100%)
        │
        ├──► 70% → Owner del contrato
        │
        └──► 30% → Partner (dirección configurada)
```

**Eventos:**
- `MovieAdded(uint id, string title, string genre, uint price, address seller)`
- `MoviePurchased(uint id, address buyer, uint price, string title)`
- `PaymentDistributed(address owner, uint ownerAmount, address partner, uint partnerAmount)`

**Seguridad:**
- Modificador `nonReentrant` para prevenir ataques de reentrada
- Modificador `onlyOwner` para funciones administrativas
- Validaciones de precio y estado de películas

---

## 4. FRONTEND - COMPONENTES JAVASCRIPT

### 4.1 WalletService (wallet.js)

**Responsabilidad:** Toda la comunicación con MetaMask y los contratos.

**Configuración:**
```javascript
CONTRACT_ADDRESSES: {
    NFT: '0x23eb9bbF105Ddd890bDAF6dFC1B500f4a909e83c',
    WALLET: '0x893518855FBdfa1322f142B35138979d35C31686'
}
```

**Funciones clave:**

| Función | Retorna | Descripción |
|---------|---------|-------------|
| `connect()` | address | Conecta con MetaMask |
| `disconnect()` | void | Desconecta wallet |
| `isConnected()` | boolean | Verifica estado de conexión |
| `getEthBalance()` | string | Obtiene balance en ETH |
| `checkNetwork()` | boolean | Verifica si está en Sepolia |
| `switchToSepolia()` | boolean | Cambia a red Sepolia |
| `getAllMovies()` | Movie[] | Obtiene catálogo completo |
| `getActiveMovies()` | Movie[] | Obtiene películas disponibles |
| `buyMovie(id, price)` | receipt | Procesa compra individual |
| `buyMultipleMovies(ids, total)` | receipt | Procesa compra del carrito |
| `getPurchases()` | Purchase[] | Obtiene películas del usuario |
| `addMovie(...)` | receipt | Agrega película (admin) |
| `isOwner()` | boolean | Verifica si es administrador |

---

### 4.2 App (app.js)

**Responsabilidad:** Controlador principal que coordina toda la aplicación.

**Flujo de inicialización:**
```
1. init() → Configura componentes
2. Usuario hace clic en "Conectar"
3. connectWallet() → Llama a WalletService.connect()
4. Valida red (debe ser Sepolia)
5. onWalletConnected() → Actualiza UI
6. Carga página actual (catálogo por defecto)
```

**Eventos que maneja:**
- `walletChanged`: Cambio de cuenta en MetaMask
- `walletDisconnected`: Desconexión de wallet
- `pageChange`: Navegación entre páginas

---

### 4.3 Cart (cart.js)

**Responsabilidad:** Gestión del carrito de compras con persistencia.

**Características:**
- Almacena datos en `localStorage` (clave: `cinepelis_cart`)
- Máximo 20 películas por compra
- Calcula totales en ETH y Wei
- UI de sidebar lateral

**Estructura de datos guardados:**
```javascript
{
    id: "1",
    title: "Película",
    price: "0.01",        // En ETH
    priceWei: "10000...", // En Wei
    posterUrl: "https://gateway.pinata.cloud/ipfs/..."
}
```

**Métodos principales:**
```javascript
add(movie)      // Agrega película al carrito
remove(movieId) // Quita película
clear()         // Vacía carrito
hasItem(movieId)// Verifica si está en carrito
getTotal()      // Total en ETH
getTotalWei()   // Total en Wei (BigNumber)
checkout()      // Procesa pago
```

---

### 4.4 Páginas

**CatalogPage (catalog.js):**
- Muestra películas disponibles
- Búsqueda por título
- Filtrado por género
- Compra individual o agregar al carrito

**PurchasesPage (purchases.js):**
- Lista de películas compradas
- Muestra poster, título, precio pagado
- Badge "Comprada"

**AdminPage (admin.js):**
- Solo accesible para el owner del contrato
- Tabla de todas las películas
- Formulario para agregar películas
- Upload de poster a IPFS
- Habilitar/deshabilitar películas

---

### 4.5 Componentes UI

**MovieCard:** Tarjeta visual de película con poster, info y botones de acción

**Modal:** Ventanas modales para confirmaciones y detalles

**Toast:** Notificaciones no bloqueantes (éxito, error, info, advertencia)

**Navbar:** Barra de navegación con estado de wallet

---

## 5. BACKEND (Express.js)

### 5.1 Servidor Principal (index.js)

**Puerto:** 3000

**Rutas:**
```
GET  /              → Sirve index.html
GET  /api/info      → Información de la DApp
POST /api/upload/image    → Sube imagen a IPFS
POST /api/upload/metadata → Sube metadata a IPFS
GET  /api/upload/test     → Prueba conexión Pinata
```

---

### 5.2 Servicio Pinata (pinataService.js)

**Propósito:** Subir archivos a IPFS de forma descentralizada.

**Funciones:**
```javascript
uploadImage(buffer, fileName)  → {ipfsHash, ipfsUri, gatewayUrl}
uploadMetadata(jsonData)       → {ipfsHash, ipfsUri}
testConnection()               → {success, message}
```

**Formato de URI:**
- IPFS: `ipfs://QmXx...`
- Gateway: `https://gateway.pinata.cloud/ipfs/QmXx...`

---

## 6. FLUJOS DE USUARIO

### 6.1 Conexión de Wallet

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Usuario    │────►│   MetaMask   │────►│   Contrato   │
│ clic Conectar│     │  Autoriza    │     │  Inicializa  │
└──────────────┘     └──────────────┘     └──────────────┘
                                                  │
                                                  ▼
                                          ┌──────────────┐
                                          │  UI Actualiza│
                                          │  - Balance   │
                                          │  - Dirección │
                                          │  - Admin?    │
                                          └──────────────┘
```

### 6.2 Compra Individual

```
Usuario selecciona película
         │
         ▼
    Modal confirmación
         │
         ▼
  MetaMask firma tx
         │
         ▼
  Contrato procesa:
  ├─ Valida película activa
  ├─ Valida precio correcto
  ├─ Registra compra
  ├─ Distribuye pago (70/30)
  └─ Mintea NFT
         │
         ▼
   Toast de éxito
```

### 6.3 Compra con Carrito

```
Usuario agrega películas al carrito
         │
         ▼
   Carrito muestra total
         │
         ▼
   Usuario clic "Pagar"
         │
         ▼
  MetaMask firma tx única
         │
         ▼
  Contrato procesa todas:
  ├─ Valida cada película
  ├─ Calcula total
  ├─ Registra compras
  ├─ Un solo split de pago
  └─ Mintea NFTs
         │
         ▼
  Carrito se limpia
```

### 6.4 Agregar Película (Admin)

```
Owner accede a Admin
         │
         ▼
  Completa formulario
  + Selecciona poster
         │
         ▼
  Poster sube a Pinata/IPFS
         │
         ▼
  MetaMask firma tx
         │
         ▼
  Contrato agrega película
         │
         ▼
  Catálogo actualizado
```

---

## 7. TECNOLOGÍAS UTILIZADAS

### Blockchain
| Tecnología | Uso |
|------------|-----|
| Solidity 0.8.28 | Lenguaje de contratos |
| Hardhat | Framework de desarrollo |
| ethers.js 5.8 | Librería de interacción |
| OpenZeppelin | Contratos ERC721 seguros |
| Sepolia Testnet | Red de pruebas |

### Frontend
| Tecnología | Uso |
|------------|-----|
| HTML5 | Estructura |
| CSS3 | Estilos (tema oscuro) |
| JavaScript Vanilla | Lógica sin frameworks |
| Font Awesome | Iconografía |

### Backend
| Tecnología | Uso |
|------------|-----|
| Node.js | Runtime |
| Express 4.21 | Servidor web |
| Multer | Upload de archivos |
| Axios | Peticiones HTTP |

### Almacenamiento
| Tecnología | Uso |
|------------|-----|
| Pinata | Gateway IPFS |
| IPFS | Almacenamiento descentralizado |
| localStorage | Persistencia del carrito |

---

## 8. DIRECCIONES DE CONTRATOS DESPLEGADOS

| Contrato | Dirección (Sepolia) |
|----------|---------------------|
| MovieNFT | `0x23eb9bbF105Ddd890bDAF6dFC1B500f4a909e83c` |
| CinemaWallet | `0x893518855FBdfa1322f142B35138979d35C31686` |

**Verificar en Etherscan:**
- [MovieNFT](https://sepolia.etherscan.io/address/0x23eb9bbF105Ddd890bDAF6dFC1B500f4a909e83c)
- [CinemaWallet](https://sepolia.etherscan.io/address/0x893518855FBdfa1322f142B35138979d35C31686)

---

## 9. CONFIGURACIÓN DE DISTRIBUCIÓN DE PAGOS

```
Owner:   0xEbC61C48e516440272B076EdBd7671978F4dF210  (70%)
Partner: 0xf961361a55A87C84DeDb59BA95de5a0F7BB10582  (30%)
```

---

## 10. SEGURIDAD IMPLEMENTADA

### En Contratos:
1. **ReentrancyGuard:** Previene ataques de reentrada en funciones de pago
2. **onlyOwner:** Restringe funciones administrativas
3. **Validaciones:** Precio > 0, película activa, no duplicar compras

### En Frontend:
1. **Validación de formularios:** Antes de enviar transacciones
2. **Límites:** Máximo 20 películas por compra
3. **Tamaño de archivos:** Máximo 5MB para posters

### Datos Públicos (seguros de exponer):
- Direcciones de contratos
- ABIs
- Chain ID

### Datos Privados (NUNCA exponer en frontend):
- Private keys
- API keys de Pinata
- Claves de Alchemy/Infura

---

## 11. COMANDOS ÚTILES

```bash
# Instalar dependencias
npm install

# Compilar contratos
npx hardhat compile

# Desplegar contratos
npx hardhat run scripts/deploy.js --network sepolia

# Iniciar servidor
node index.js

# El servidor estará en http://localhost:3000
```

---

## 12. VARIABLES DE ENTORNO (.env)

```env
# RPC de Alchemy/Infura
API_URL="https://eth-sepolia.g.alchemy.com/v2/tu-api-key"

# Clave privada del deployer (NUNCA compartir)
PRIVATE_KEY="tu-private-key"

# Dirección pública del owner
PUBLIC_KEY="0x..."

# Pinata (IPFS)
PINATA_API_KEY="tu-api-key"
PINATA_SECRET_KEY="tu-secret-key"

# Direcciones de contratos desplegados
NFT_CONTRACT_ADDRESS="0x23eb9bbF105Ddd890bDAF6dFC1B500f4a909e83c"
WALLET_CONTRACT="0x893518855FBdfa1322f142B35138979d35C31686"
```

---

## 13. RESUMEN DE FUNCIONALIDADES

| Funcionalidad | Estado |
|--------------|--------|
| Conexión MetaMask | ✅ Implementado |
| Catálogo de películas | ✅ Implementado |
| Compra individual | ✅ Implementado |
| Carrito de compras | ✅ Implementado |
| Compra múltiple | ✅ Implementado |
| Minteo de NFTs | ✅ Implementado |
| Upload a IPFS | ✅ Implementado |
| Panel de administración | ✅ Implementado |
| Distribución de pagos 70/30 | ✅ Implementado |
| Mis películas compradas | ✅ Implementado |
| Búsqueda y filtros | ✅ Implementado |

---

## 14. CONCLUSIÓN

CinePelis es una DApp completa que demuestra la integración de múltiples tecnologías blockchain:

1. **Smart Contracts seguros** con estándares ERC721 y protecciones contra vulnerabilidades
2. **Frontend modular** sin dependencias de frameworks pesados
3. **Almacenamiento descentralizado** mediante IPFS/Pinata
4. **UX completa** con carrito, notificaciones y panel admin
5. **Distribución automática** de ingresos entre owner y partner

El proyecto está listo para demostración en testnet Sepolia y puede ser migrado a mainnet con cambios mínimos de configuración.
