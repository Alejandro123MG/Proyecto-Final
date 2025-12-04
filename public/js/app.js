const App = {
    isConnected: false,
    isOwner: false,

    async init() {
        try {
            Navbar.init();
            Cart.init();
            this.setupConnectButton();
            this.setupWalletEvents();

            window.addEventListener('pageChange', (e) => {
                this.onPageChange(e.detail.page);
            });

            this.showConnectPrompt();
        } catch (error) {
            Toast.error('Error', 'Error al iniciar la aplicacion');
        }
    },

    setupConnectButton() {
        const connectBtn = document.getElementById('btn-connect-wallet');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => this.connectWallet());
        }
    },

    setupWalletEvents() {
        // Cuando cambia la cuenta
        window.addEventListener('walletChanged', async (e) => {
            Toast.warning('Cuenta cambiada', 'Recargando datos...');
            await this.onWalletConnected(e.detail.account);
        });

        // Cuando se desconecta
        window.addEventListener('walletDisconnected', () => {
            this.isConnected = false;
            this.isOwner = false;
            this.updateUI();
            this.showConnectPrompt();
            Toast.warning('Desconectado', 'Wallet desconectada');
        });
    },

    async connectWallet() {
        try {
            // Verificar MetaMask
            if (!WalletService.isMetaMaskInstalled()) {
                Toast.error('MetaMask requerido', 'Por favor instala MetaMask para continuar');
                window.open('https://metamask.io/download/', '_blank');
                return;
            }

            Toast.warning('Conectando', 'Abriendo MetaMask...');

            // Conectar
            const account = await WalletService.connect();

            // Verificar red
            const isCorrectNetwork = await WalletService.checkNetwork();
            if (!isCorrectNetwork) {
                Toast.warning('Red incorrecta', 'Cambiando a Sepolia...');
                await WalletService.switchToSepolia();
            }

            await this.onWalletConnected(account);

        } catch (error) {
            if (error.code === 4001) {
                Toast.error('Cancelado', 'Conexion rechazada por el usuario');
            } else {
                Toast.error('Error', error.message || 'No se pudo conectar la wallet');
            }
        }
    },

    async onWalletConnected(account) {
        this.isConnected = true;

        // Verificar si es owner
        this.isOwner = await WalletService.isOwner();

        // Actualizar UI
        this.updateUI();
        Navbar.setAccount(account);

        // Obtener balance
        const balance = await WalletService.getEthBalance();

        Toast.success('Conectado', `Wallet conectada - ${parseFloat(balance).toFixed(4)} ETH`);

        // Cargar pagina actual
        await this.loadPage(Navbar.getCurrentPage());
    },

    updateUI() {
        const connectBtn = document.getElementById('btn-connect-wallet');
        const accountInfo = document.getElementById('account-info');
        const adminLink = document.querySelector('[data-page="admin"]');

        if (connectBtn && accountInfo) {
            if (this.isConnected) {
                connectBtn.classList.add('hidden');
                accountInfo.classList.remove('hidden');
            } else {
                connectBtn.classList.remove('hidden');
                accountInfo.classList.add('hidden');
            }
        }

        // Mostrar/ocultar admin segun si es owner
        if (adminLink) {
            adminLink.style.display = this.isOwner ? '' : 'none';
        }
    },

    showConnectPrompt() {
        const containers = ['catalog-movies', 'purchases-movies'];
        containers.forEach(id => {
            const container = document.getElementById(id);
            if (container) {
                container.innerHTML = `
                    <div class="empty-state" style="grid-column: 1/-1;">
                        <div class="empty-state-icon"><i class="fas fa-link"></i></div>
                        <h3 class="empty-state-title">Conecta tu Wallet</h3>
                        <p class="empty-state-text">Conecta tu wallet de MetaMask para ver el catalogo de peliculas</p>
                        <button class="btn btn-primary mt-2" onclick="App.connectWallet()">
                            <i class="fab fa-ethereum"></i> Conectar MetaMask
                        </button>
                    </div>
                `;
            }
        });
    },

    async loadPage(page) {
        if (!this.isConnected && page !== 'catalog') {
            this.showConnectPrompt();
            return;
        }

        switch (page) {
            case 'catalog':
                if (this.isConnected) {
                    await CatalogPage.init();
                }
                break;
            case 'purchases':
                if (this.isConnected) {
                    await PurchasesPage.init();
                }
                break;
            case 'admin':
                if (this.isConnected && this.isOwner) {
                    await AdminPage.init();
                } else if (!this.isOwner) {
                    Toast.error('Acceso denegado', 'Solo los owners pueden acceder al panel de admin');
                    Navbar.navigateTo('catalog');
                }
                break;
        }
    },

    onPageChange(page) {
        this.loadPage(page);
    },

    // Utilidades
    formatAddress(address) {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
};

// Iniciar cuando el DOM este listo
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

window.App = App;
