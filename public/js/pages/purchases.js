const PurchasesPage = {
    purchases: [],

    async init() {
        if (!WalletService.isConnected()) {
            App.showConnectPrompt();
            return;
        }
        await this.loadPurchases();
    },

    async loadPurchases() {
        try {
            this.showLoading();

            // Usar WalletService para obtener compras
            this.purchases = await WalletService.getPurchases();

            this.render();
        } catch (error) {
            console.error('Error cargando compras:', error);
            Toast.error('Error', 'No se pudieron cargar tus peliculas');
        }
    },

    showLoading() {
        const container = document.getElementById('purchases-movies');
        if (container) {
            container.innerHTML = `
                <div class="loading" style="grid-column: 1/-1;">
                    <div class="spinner"></div>
                    <p class="mt-2">Cargando tus peliculas...</p>
                </div>
            `;
        }
    },

    showEmpty(message) {
        const container = document.getElementById('purchases-movies');
        if (container) {
            container.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <div class="empty-state-icon"><i class="fas fa-film"></i></div>
                    <h3 class="empty-state-title">Sin peliculas</h3>
                    <p class="empty-state-text">${message}</p>
                    <button class="btn btn-primary mt-2" onclick="Navbar.navigateTo('catalog')">
                        Explorar catalogo
                    </button>
                </div>
            `;
        }
    },

    render() {
        const container = document.getElementById('purchases-movies');
        if (!container) return;

        container.innerHTML = '';

        // Actualizar contador
        const countEl = document.getElementById('purchases-count');
        if (countEl) {
            countEl.textContent = this.purchases.length;
        }

        if (this.purchases.length === 0) {
            this.showEmpty('Aun no has comprado ninguna pelicula');
            return;
        }

        this.purchases.forEach(purchase => {
            const card = this.createPurchaseCard(purchase);
            container.appendChild(card);
        });
    },

    createPurchaseCard(purchase) {
        const card = document.createElement('div');
        card.className = 'movie-card';

        // Verificar si hay poster
        const hasPoster = purchase.posterUrl && purchase.posterUrl.length > 0;

        card.innerHTML = `
            <span class="movie-card-badge badge-purchased">Comprada</span>
            ${hasPoster
                ? `<div class="movie-card-poster"><img src="${purchase.posterUrl}" alt="${purchase.title}" onerror="this.parentElement.innerHTML='<div class=\\'movie-card-placeholder\\'><i class=\\'fas fa-film\\'></i></div>'"></div>`
                : `<div class="movie-card-placeholder"><i class="fas fa-film"></i></div>`
            }
            <div class="movie-card-content">
                <h3 class="movie-card-title">${purchase.title}</h3>
                ${purchase.director ? `<div class="movie-card-director"><i class="fas fa-user"></i> ${purchase.director}</div>` : ''}
                <div class="movie-card-meta">
                    ${purchase.genre ? `<span class="movie-card-genre">${purchase.genre}</span>` : ''}
                    ${purchase.releaseYear && purchase.releaseYear !== '0' ? `<span>${purchase.releaseYear}</span>` : ''}
                </div>
                <div class="movie-card-price">
                    <div>
                        <div class="price-label">Pagado</div>
                        <div class="price-value">${purchase.price} ETH</div>
                    </div>
                </div>
            </div>
        `;

        return card;
    }
};

window.PurchasesPage = PurchasesPage;
