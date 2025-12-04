const Cart = {
    items: [],
    isOpen: false,

    init() {
        this.loadFromStorage();
        this.render();
        this.setupEvents();
    },

    setupEvents() {
        // Cerrar carrito al hacer clic fuera
        document.addEventListener('click', (e) => {
            const cart = document.getElementById('cart-sidebar');
            const cartBtn = document.getElementById('btn-cart');
            if (cart && this.isOpen && !cart.contains(e.target) && !cartBtn.contains(e.target)) {
                this.close();
            }
        });
    },

    // Agregar pelicula al carrito
    add(movie) {
        if (this.items.find(item => item.id === movie.id)) {
            Toast.warning('Ya agregado', 'Esta pelicula ya esta en el carrito');
            return;
        }

        this.items.push({
            id: movie.id,
            title: movie.title,
            price: movie.price,
            priceWei: movie.priceWei,
            posterUrl: movie.posterUrl
        });

        this.saveToStorage();
        this.render();
        Toast.success('Agregado', `"${movie.title}" agregado al carrito`);
    },

    // Quitar pelicula del carrito
    remove(movieId) {
        const index = this.items.findIndex(item => item.id === movieId);
        if (index > -1) {
            const removed = this.items.splice(index, 1)[0];
            this.saveToStorage();
            this.render();
            Toast.info('Eliminado', `"${removed.title}" eliminado del carrito`);
        }
    },

    // Limpiar carrito
    clear() {
        this.items = [];
        this.saveToStorage();
        this.render();
    },

    // Verificar si una pelicula esta en el carrito
    hasItem(movieId) {
        return this.items.some(item => item.id === movieId);
    },

    // Obtener total en ETH
    getTotal() {
        return this.items.reduce((sum, item) => sum + parseFloat(item.price), 0);
    },

    // Obtener total en Wei
    getTotalWei() {
        return this.items.reduce((sum, item) => sum.add(item.priceWei), ethers.BigNumber.from(0));
    },

    // Obtener IDs de peliculas
    getMovieIds() {
        return this.items.map(item => item.id);
    },

    // Guardar en localStorage
    saveToStorage() {
        const data = this.items.map(item => ({
            id: item.id,
            title: item.title,
            price: item.price,
            priceWei: item.priceWei.toString(),
            posterUrl: item.posterUrl
        }));
        localStorage.setItem('cinepelis_cart', JSON.stringify(data));
    },

    // Cargar desde localStorage
    loadFromStorage() {
        try {
            const data = localStorage.getItem('cinepelis_cart');
            if (data) {
                const parsed = JSON.parse(data);
                this.items = parsed.map(item => ({
                    ...item,
                    priceWei: ethers.BigNumber.from(item.priceWei)
                }));
            }
        } catch {
            this.items = [];
        }
    },

    // Abrir carrito
    open() {
        const sidebar = document.getElementById('cart-sidebar');
        if (sidebar) {
            sidebar.classList.add('open');
            this.isOpen = true;
        }
    },

    // Cerrar carrito
    close() {
        const sidebar = document.getElementById('cart-sidebar');
        if (sidebar) {
            sidebar.classList.remove('open');
            this.isOpen = false;
        }
    },

    // Toggle carrito
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    },

    // Procesar compra
    async checkout() {
        if (this.items.length === 0) {
            Toast.warning('Carrito vacio', 'Agrega peliculas al carrito');
            return;
        }

        if (!WalletService.isConnected()) {
            Toast.error('Error', 'Conecta tu wallet primero');
            return;
        }

        const checkoutBtn = document.getElementById('btn-checkout');

        try {
            checkoutBtn.disabled = true;
            checkoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';

            Toast.warning('Procesando', 'Confirma la transaccion en MetaMask...');

            const movieIds = this.getMovieIds();
            const totalWei = this.getTotalWei();

            await WalletService.buyMultipleMovies(movieIds, totalWei);

            Toast.success('Compra exitosa', `Compraste ${this.items.length} peliculas`);

            this.clear();
            this.close();

            // Recargar catalogo
            if (typeof CatalogPage !== 'undefined') {
                await CatalogPage.loadMovies();
            }

        } catch (error) {
            if (error.code === 4001) {
                Toast.error('Cancelado', 'Transaccion rechazada');
            } else if (error.message.includes('Ya compraste')) {
                Toast.error('Error', 'Ya tienes una pelicula del carrito');
            } else {
                Toast.error('Error', error.reason || error.message || 'Error al procesar compra');
            }
        } finally {
            checkoutBtn.disabled = false;
            checkoutBtn.innerHTML = '<i class="fas fa-credit-card"></i> Pagar';
        }
    },

    // Renderizar
    render() {
        this.renderButton();
        this.renderSidebar();
    },

    // Renderizar boton del carrito
    renderButton() {
        const btn = document.getElementById('btn-cart');
        if (!btn) return;

        const count = this.items.length;
        const badge = btn.querySelector('.cart-badge');

        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
    },

    // Renderizar sidebar del carrito
    renderSidebar() {
        const container = document.getElementById('cart-items');
        const totalEl = document.getElementById('cart-total');
        const checkoutBtn = document.getElementById('btn-checkout');

        if (!container) return;

        if (this.items.length === 0) {
            container.innerHTML = `
                <div class="cart-empty">
                    <i class="fas fa-shopping-cart"></i>
                    <p>Tu carrito esta vacio</p>
                </div>
            `;
            if (checkoutBtn) checkoutBtn.disabled = true;
        } else {
            container.innerHTML = this.items.map(item => `
                <div class="cart-item">
                    <img src="${item.posterUrl || 'https://via.placeholder.com/60x90?text=?'}" alt="${item.title}" class="cart-item-img">
                    <div class="cart-item-info">
                        <div class="cart-item-title">${item.title}</div>
                        <div class="cart-item-price">${item.price} ETH</div>
                    </div>
                    <button class="cart-item-remove" onclick="Cart.remove('${item.id}')" title="Eliminar">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `).join('');
            if (checkoutBtn) checkoutBtn.disabled = false;
        }

        if (totalEl) {
            totalEl.textContent = `${this.getTotal().toFixed(4)} ETH`;
        }
    }
};

window.Cart = Cart;
