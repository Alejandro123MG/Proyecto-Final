const CatalogPage = {
    movies: [],
    purchasedIds: [],

    async init() {
        if (!WalletService.isConnected()) {
            App.showConnectPrompt();
            return;
        }
        await this.loadMovies();
        this.setupFilters();
        this.setupSearch();
    },

    async loadMovies() {
        try {
            this.showLoading();

            // Cargar peliculas activas y compras del usuario usando WalletService
            const [movies, purchases] = await Promise.all([
                WalletService.getActiveMovies(),
                WalletService.getPurchases()
            ]);

            this.movies = movies;
            this.purchasedIds = purchases.map(p => p.movieId);

            this.render();
        } catch (error) {
            console.error('Error cargando peliculas:', error);
            Toast.error('Error', 'No se pudieron cargar las peliculas');
        }
    },

    showLoading() {
        const container = document.getElementById('catalog-movies');
        if (container) {
            container.innerHTML = `
                <div class="loading" style="grid-column: 1/-1;">
                    <div class="spinner"></div>
                    <p class="mt-2">Cargando peliculas...</p>
                </div>
            `;
        }
    },

    render() {
        const container = document.getElementById('catalog-movies');
        if (!container) return;

        container.innerHTML = '';

        if (this.movies.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <div class="empty-state-icon"><i class="fas fa-film"></i></div>
                    <h3 class="empty-state-title">No hay peliculas</h3>
                    <p class="empty-state-text">Aun no se han agregado peliculas al catalogo</p>
                </div>
            `;
            return;
        }

        this.movies.forEach(movie => {
            const isPurchased = this.purchasedIds.includes(movie.id);
            const card = MovieCard.create(movie, {
                showActions: true,
                isPurchased,
                onClick: (m) => this.showMovieDetail(m, isPurchased)
            });

            // Evento agregar al carrito
            const cartBtn = card.querySelector('[data-action="cart"]');
            if (cartBtn) {
                cartBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    Cart.add(movie);
                    this.render(); // Re-render para actualizar boton
                });
            }

            // Evento de compra directa
            const buyBtn = card.querySelector('[data-action="buy"]');
            if (buyBtn) {
                buyBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.buyMovie(movie);
                });
            }

            container.appendChild(card);
        });
    },

    showMovieDetail(movie, isPurchased) {
        Modal.movieDetail(movie, (m) => this.buyMovie(m), isPurchased);
    },

    async buyMovie(movie) {
        Modal.confirm({
            title: 'Confirmar compra',
            message: `¿Deseas comprar "${movie.title}" por ${movie.price} ETH?`,
            icon: 'warning',
            confirmText: 'Comprar',
            onConfirm: async () => {
                try {
                    Modal.close();
                    Toast.warning('Procesando', 'Confirma la transaccion en MetaMask...');

                    // Usar WalletService para comprar directamente con MetaMask
                    await WalletService.buyMovie(movie.id, movie.priceWei);

                    Toast.success('Compra exitosa', `Has comprado "${movie.title}"`);

                    // Actualizar lista
                    this.purchasedIds.push(movie.id);
                    this.render();

                } catch (error) {
                    console.error('Error comprando:', error);
                    if (error.code === 4001) {
                        Toast.error('Cancelado', 'Transaccion rechazada');
                    } else if (error.message.includes('Ya compraste')) {
                        Toast.error('Error', 'Ya tienes esta pelicula');
                    } else {
                        Toast.error('Error', error.reason || error.message || 'No se pudo completar la compra');
                    }
                }
            }
        });
    },

    setupFilters() {
        const genreFilter = document.getElementById('filter-genre');
        if (genreFilter) {
            genreFilter.addEventListener('change', () => this.applyFilters());
        }
    },

    setupSearch() {
        const searchInput = document.getElementById('search-movies');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.applyFilters());
        }
    },

    applyFilters() {
        const searchTerm = (document.getElementById('search-movies')?.value || '').toLowerCase();
        const genre = document.getElementById('filter-genre')?.value || '';

        const container = document.getElementById('catalog-movies');
        const cards = container.querySelectorAll('.movie-card');

        cards.forEach(card => {
            const movieId = card.dataset.movieId;
            const movie = this.movies.find(m => m.id === movieId);

            if (!movie) return;

            const matchesSearch = movie.title.toLowerCase().includes(searchTerm);
            const matchesGenre = !genre || movie.genre.toLowerCase() === genre.toLowerCase();

            card.style.display = matchesSearch && matchesGenre ? '' : 'none';
        });
    }
};

window.CatalogPage = CatalogPage;
