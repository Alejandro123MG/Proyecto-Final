const WalletService = {
    provider: null,
    signer: null,
    currentAccount: null,
    contracts: {
        nft: null,
        wallet: null
    },

    // Direcciones de contratos (desplegados en Sepolia)
    CONTRACT_ADDRESSES: {
        NFT: '0x6e9BF00EA36A6596d6D0E146fB4C15117B6EB225',
        WALLET: '0x597e1d1602Dae6EFBEDec09eB67DC08b1071A765'
    },

    // ABIs simplificados de los contratos
    ABIS: {
        NFT: [
            "function mintMovie(address recipient, string tokenURI, string title, string director, uint256 year, string genre) public returns(uint256)",
            "function minNFT(address recipient, string tokenURI) public returns(uint256)",
            "function tokenURI(uint256 tokenId) public view returns(string)",
            "function ownerOf(uint256 tokenId) public view returns(address)",
            "function balanceOf(address owner) public view returns(uint256)",
            "function getMovie(uint256 tokenId) public view returns(tuple(string title, string director, uint256 year, string genre))",
            "function totalMovies() public view returns(uint256)",
            "event MovieMinted(uint256 indexed tokenId, string title, address owner)"
        ],
        WALLET: [
            "function addMovie(string _title, string _genre, string _synopsis, uint _price, uint256 _releaseYear, string _posterURI, string _director) external",
            "function buyMovie(uint _movieId) external payable",
            "function buyMultipleMovies(uint[] _movieIds) external payable",
            "function getCartTotal(uint[] _movieIds) external view returns(uint256)",
            "function disableMovie(uint _movieId) external",
            "function enableMovie(uint _movieId) external",
            "function getAllMovies() external view returns(tuple(uint id, string title, string genre, string synopsis, uint price, address seller, bool active, uint256 releaseYear, string posterURI, string director)[])",
            "function getActiveMovies() external view returns(tuple(uint id, string title, string genre, string synopsis, uint price, address seller, bool active, uint256 releaseYear, string posterURI, string director)[])",
            "function getPurchases(address _buyer) external view returns(uint[])",
            "function checkPurchase(address _buyer, uint _movieId) external view returns(bool)",
            "function movies(uint) external view returns(uint id, string title, string genre, string synopsis, uint price, address seller, bool active, uint256 releaseYear, string posterURI, string director)",
            "function isOwner(address) external view returns(bool)",
            "function getSalesCount(uint _movieId) external view returns(uint)",
            "function getMovieBuyers(uint _movieId) external view returns(address[])",
            "event MovieAdded(uint id, string title, string genre, uint price, address seller)",
            "event MoviePurchased(uint id, address buyer, uint price, string title)",
            "event PaymentDistributed(address owner, uint ownerAmount, address partner, uint partnerAmount)"
        ]
    },

    // Verificar si MetaMask esta instalado
    isMetaMaskInstalled() {
        return typeof window.ethereum !== 'undefined';
    },

    // Conectar wallet
    async connect() {
        if (!this.isMetaMaskInstalled()) {
            throw new Error('MetaMask no esta instalado. Por favor instalalo desde metamask.io');
        }

        try {
            // Solicitar conexion
            this.provider = new ethers.providers.Web3Provider(window.ethereum);
            await this.provider.send('eth_requestAccounts', []);

            this.signer = this.provider.getSigner();
            this.currentAccount = await this.signer.getAddress();

            // Inicializar contratos
            this.contracts.nft = new ethers.Contract(
                this.CONTRACT_ADDRESSES.NFT,
                this.ABIS.NFT,
                this.signer
            );

            this.contracts.wallet = new ethers.Contract(
                this.CONTRACT_ADDRESSES.WALLET,
                this.ABIS.WALLET,
                this.signer
            );

            // Escuchar cambios de cuenta
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    this.disconnect();
                } else {
                    this.currentAccount = accounts[0];
                    window.dispatchEvent(new CustomEvent('walletChanged', {
                        detail: { account: this.currentAccount }
                    }));
                }
            });

            // Escuchar cambios de red
            window.ethereum.on('chainChanged', () => {
                window.location.reload();
            });

            return this.currentAccount;
        } catch (error) {
            console.error('Error conectando wallet:', error);
            throw error;
        }
    },

    // Desconectar
    disconnect() {
        this.provider = null;
        this.signer = null;
        this.currentAccount = null;
        this.contracts.nft = null;
        this.contracts.wallet = null;
        window.dispatchEvent(new CustomEvent('walletDisconnected'));
    },

    // Verificar si esta conectado
    isConnected() {
        return this.currentAccount !== null;
    },

    // Obtener cuenta actual
    getAccount() {
        return this.currentAccount;
    },

    // Obtener balance de ETH
    async getEthBalance() {
        if (!this.provider || !this.currentAccount) return '0';
        const balance = await this.provider.getBalance(this.currentAccount);
        return ethers.utils.formatEther(balance);
    },

    // Verificar si es owner del contrato wallet
    async isOwner() {
        if (!this.contracts.wallet || !this.currentAccount) return false;
        try {
            return await this.contracts.wallet.isOwner(this.currentAccount);
        } catch {
            return false;
        }
    },

    // Verificar red (Sepolia = 11155111)
    async checkNetwork() {
        if (!this.provider) return false;
        const network = await this.provider.getNetwork();
        return network.chainId === 11155111;
    },

    // Cambiar a Sepolia
    async switchToSepolia() {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0xaa36a7' }] // 11155111 en hex
            });
            return true;
        } catch (error) {
            // Si Sepolia no esta agregada, agregarla
            if (error.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                        chainId: '0xaa36a7',
                        chainName: 'Sepolia Testnet',
                        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                        rpcUrls: ['https://sepolia.infura.io/v3/'],
                        blockExplorerUrls: ['https://sepolia.etherscan.io']
                    }]
                });
                return true;
            }
            throw error;
        }
    },

    // FUNCIONES DEL CONTRATO WALLET

    // Obtener todas las peliculas
    async getAllMovies() {
        if (!this.contracts.wallet) throw new Error('Wallet no conectada');
        const movies = await this.contracts.wallet.getAllMovies();

        // Resolver las imágenes de los metadatos en paralelo
        const moviesWithImages = await Promise.all(movies.map(async (m) => {
            const posterUrl = await this.getImageFromMetadata(m.posterURI);
            return {
                id: m.id.toString(),
                title: m.title,
                genre: m.genre,
                synopsis: m.synopsis,
                price: ethers.utils.formatEther(m.price),
                priceWei: m.price,
                seller: m.seller,
                active: m.active,
                releaseYear: m.releaseYear.toString(),
                posterURI: m.posterURI,
                posterUrl: posterUrl,
                director: m.director
            };
        }));

        return moviesWithImages;
    },

    // Obtener peliculas activas
    async getActiveMovies() {
        if (!this.contracts.wallet) throw new Error('Wallet no conectada');
        const movies = await this.contracts.wallet.getActiveMovies();

        // Resolver las imágenes de los metadatos en paralelo
        const moviesWithImages = await Promise.all(movies.map(async (m) => {
            const posterUrl = await this.getImageFromMetadata(m.posterURI);
            return {
                id: m.id.toString(),
                title: m.title,
                genre: m.genre,
                synopsis: m.synopsis,
                price: ethers.utils.formatEther(m.price),
                priceWei: m.price,
                seller: m.seller,
                active: m.active,
                releaseYear: m.releaseYear.toString(),
                posterURI: m.posterURI,
                posterUrl: posterUrl,
                director: m.director
            };
        }));

        return moviesWithImages;
    },

    // Convertir URI IPFS a URL HTTP
    ipfsToHttp(ipfsUri) {
        if (!ipfsUri) return '';
        if (ipfsUri.startsWith('ipfs://')) {
            return ipfsUri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
        }
        return ipfsUri;
    },

    // Obtener imagen desde metadatos NFT (si el URI es un JSON)
    async getImageFromMetadata(metadataUri) {
        try {
            const url = this.ipfsToHttp(metadataUri);
            const response = await fetch(url);
            const metadata = await response.json();
            if (metadata.image) {
                return this.ipfsToHttp(metadata.image);
            }
        } catch (e) {
            console.log('URI es imagen directa, no metadatos');
        }
        return this.ipfsToHttp(metadataUri);
    },

    // Comprar pelicula
    async buyMovie(movieId, priceWei) {
        if (!this.contracts.wallet) throw new Error('Wallet no conectada');
        const tx = await this.contracts.wallet.buyMovie(movieId, { value: priceWei });
        const receipt = await tx.wait();
        return receipt;
    },

    // Obtener compras del usuario
    async getPurchases() {
        if (!this.contracts.wallet || !this.currentAccount) return [];
        const purchaseIds = await this.contracts.wallet.getPurchases(this.currentAccount);

        const purchases = await Promise.all(purchaseIds.map(async (id) => {
            const movie = await this.contracts.wallet.movies(id);
            const posterUrl = await this.getImageFromMetadata(movie.posterURI);
            return {
                movieId: id.toString(),
                id: id.toString(),
                title: movie.title,
                genre: movie.genre,
                synopsis: movie.synopsis,
                price: ethers.utils.formatEther(movie.price),
                releaseYear: movie.releaseYear.toString(),
                posterURI: movie.posterURI,
                posterUrl: posterUrl,
                director: movie.director
            };
        }));

        return purchases;
    },

    // Verificar si ya compro una pelicula
    async checkPurchase(movieId) {
        if (!this.contracts.wallet || !this.currentAccount) return false;
        return await this.contracts.wallet.checkPurchase(this.currentAccount, movieId);
    },

    // Agregar pelicula (solo owner)
    async addMovie(title, genre, synopsis, priceEth, releaseYear, posterURI, director) {
        if (!this.contracts.wallet) throw new Error('Wallet no conectada');
        const priceWei = ethers.utils.parseEther(priceEth.toString());
        const tx = await this.contracts.wallet.addMovie(title, genre, synopsis, priceWei, releaseYear || 0, posterURI || '', director || '');
        const receipt = await tx.wait();
        return receipt;
    },

    // Deshabilitar pelicula (solo owner)
    async disableMovie(movieId) {
        if (!this.contracts.wallet) throw new Error('Wallet no conectada');
        const tx = await this.contracts.wallet.disableMovie(movieId);
        return await tx.wait();
    },

    // Habilitar pelicula (solo owner)
    async enableMovie(movieId) {
        if (!this.contracts.wallet) throw new Error('Wallet no conectada');
        const tx = await this.contracts.wallet.enableMovie(movieId);
        return await tx.wait();
    },

    //FUNCIONES DE CARRITO

    // Comprar multiples peliculas
    async buyMultipleMovies(movieIds, totalWei) {
        if (!this.contracts.wallet) throw new Error('Wallet no conectada');
        const tx = await this.contracts.wallet.buyMultipleMovies(movieIds, { value: totalWei });
        return await tx.wait();
    },

    // Obtener total del carrito desde el contrato
    async getCartTotal(movieIds) {
        if (!this.contracts.wallet) throw new Error('Wallet no conectada');
        const total = await this.contracts.wallet.getCartTotal(movieIds);
        return total;
    },

    //FUNCIONES DE ESTADÍSTICAS

    // Obtener cantidad de ventas de una película
    async getSalesCount(movieId) {
        if (!this.contracts.wallet) throw new Error('Wallet no conectada');
        const count = await this.contracts.wallet.getSalesCount(movieId);
        return count.toNumber();
    },

    // Obtener lista de compradores de una película
    async getMovieBuyers(movieId) {
        if (!this.contracts.wallet) throw new Error('Wallet no conectada');
        return await this.contracts.wallet.getMovieBuyers(movieId);
    }
};

window.WalletService = WalletService;
