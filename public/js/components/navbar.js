const Navbar = {
    element: null,
    currentPage: 'catalog',

    init() {
        this.element = document.getElementById('navbar');
        if (!this.element) return;

        this.setupScrollEffect();
        this.setupMobileMenu();
        this.setupNavigation();
        this.setupAccountDropdown();
    },

    setupScrollEffect() {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                this.element.classList.add('scrolled');
            } else {
                this.element.classList.remove('scrolled');
            }
        });
    },

    setupMobileMenu() {
        const toggle = this.element.querySelector('.navbar-toggle');
        const menu = this.element.querySelector('.navbar-menu');

        if (toggle && menu) {
            toggle.addEventListener('click', () => {
                menu.classList.toggle('open');
            });

            // Cerrar menu al hacer click en un link
            menu.querySelectorAll('.navbar-link').forEach(link => {
                link.addEventListener('click', () => {
                    menu.classList.remove('open');
                });
            });
        }
    },

    setupNavigation() {
        const links = this.element.querySelectorAll('.navbar-link');

        links.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                if (page) {
                    this.navigateTo(page);
                }
            });
        });
    },

    navigateTo(page) {
        // Actualizar link activo
        this.element.querySelectorAll('.navbar-link').forEach(link => {
            link.classList.toggle('active', link.dataset.page === page);
        });

        // Mostrar seccion correspondiente
        document.querySelectorAll('.page-section').forEach(section => {
            section.classList.toggle('active', section.id === `page-${page}`);
        });

        this.currentPage = page;

        // Disparar evento de cambio de pagina
        window.dispatchEvent(new CustomEvent('pageChange', { detail: { page } }));

        // Scroll al inicio
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    setupAccountDropdown() {
        const dropdown = this.element.querySelector('.account-dropdown');
        const btn = this.element.querySelector('.account-btn');
        const disconnectBtn = document.getElementById('btn-disconnect');

        if (btn && dropdown) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('open');
            });

            // Cerrar al hacer click fuera
            document.addEventListener('click', (e) => {
                if (!dropdown.contains(e.target)) {
                    dropdown.classList.remove('open');
                }
            });
        }

        if (disconnectBtn) {
            disconnectBtn.addEventListener('click', () => {
                this.disconnect();
            });
        }
    },

    disconnect() {
        WalletService.disconnect();

        // Mostrar boton conectar, ocultar info cuenta
        const connectBtn = document.getElementById('btn-connect-wallet');
        const accountInfo = document.getElementById('account-info');
        const dropdown = this.element.querySelector('.account-dropdown');

        if (connectBtn) connectBtn.classList.remove('hidden');
        if (accountInfo) accountInfo.classList.add('hidden');
        if (dropdown) dropdown.classList.remove('open');

        // Limpiar carrito
        if (window.Cart) Cart.clear();

        // Navegar al catalogo
        this.navigateTo('catalog');

        Toast.success('Desconectado', 'Wallet desconectada correctamente');
    },

    setAccount(address) {
        const accountEl = this.element.querySelector('.account-address');
        if (accountEl && address) {
            // Mostrar direccion truncada
            const truncated = `${address.slice(0, 6)}...${address.slice(-4)}`;
            accountEl.textContent = truncated;
            accountEl.title = address;
        }
    },

    getCurrentPage() {
        return this.currentPage;
    }
};

window.Navbar = Navbar;
