const MovieCard = {
    // Crear card de pelicula
    create(movie, options = {}) {
        const { showActions = false, isPurchased = false, isAdmin = false, onClick } = options;

        const card = document.createElement('div');
        card.className = 'movie-card';
        card.dataset.movieId = movie.id;

        let badge = '';
        if (isPurchased) {
            badge = '<span class="movie-card-badge badge-purchased">Comprada</span>';
        } else if (!movie.active) {
            badge = '<span class="movie-card-badge badge-inactive">Inactiva</span>';
        }

        let actions = '';
        if (showActions && isAdmin) {
            actions = `
                <div class="movie-card-actions">
                    ${movie.active
                        ? `<button class="btn btn-warning btn-sm" data-action="disable">Deshabilitar</button>`
                        : `<button class="btn btn-success btn-sm" data-action="enable">Habilitar</button>`
                    }
                </div>
            `;
        } else if (showActions && !isPurchased && movie.active) {
            const inCart = typeof Cart !== 'undefined' && Cart.hasItem(movie.id);
            actions = `
                <div class="movie-card-actions">
                    <button class="btn btn-secondary btn-sm ${inCart ? 'in-cart' : ''}" data-action="cart" ${inCart ? 'disabled' : ''}>
                        <i class="fas fa-${inCart ? 'check' : 'cart-plus'}"></i> ${inCart ? 'En carrito' : 'Agregar'}
                    </button>
                    <button class="btn btn-primary btn-sm" data-action="buy">Comprar</button>
                </div>
            `;
        }

        // Determinar si hay poster
        const hasPoster = movie.posterUrl && movie.posterUrl.length > 0;

        card.innerHTML = `
            ${badge}
            ${hasPoster
                ? `<div class="movie-card-poster"><img src="${movie.posterUrl}" alt="${movie.title}" onerror="this.parentElement.innerHTML='<div class=\\'movie-card-placeholder\\'><i class=\\'fas fa-film\\'></i></div>'"></div>`
                : `<div class="movie-card-placeholder"><i class="fas fa-film"></i></div>`
            }
            <div class="movie-card-content">
                <h3 class="movie-card-title">${movie.title}</h3>
                ${movie.director ? `<div class="movie-card-director"><i class="fas fa-user"></i> ${movie.director}</div>` : ''}
                <div class="movie-card-meta">
                    ${movie.genre ? `<span class="movie-card-genre">${movie.genre}</span>` : ''}
                    ${movie.releaseYear && movie.releaseYear !== '0' ? `<span>${movie.releaseYear}</span>` : ''}
                </div>
                <div class="movie-card-price">
                    <div>
                        <div class="price-label">Precio</div>
                        <div class="price-value">${movie.price} ETH</div>
                    </div>
                </div>
                ${actions}
            </div>
        `;

        // Click en la card
        if (onClick) {
            card.addEventListener('click', (e) => {
                // No disparar si se hizo click en un boton
                if (!e.target.closest('button')) {
                    onClick(movie);
                }
            });
        }

        return card;
    },

    // Crear grid de peliculas
    createGrid(movies, options = {}) {
        const { containerId, emptyMessage = 'No hay peliculas disponibles' } = options;

        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';

        if (movies.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon"><i class="fas fa-film"></i></div>
                    <h3 class="empty-state-title">Sin peliculas</h3>
                    <p class="empty-state-text">${emptyMessage}</p>
                </div>
            `;
            return;
        }

        movies.forEach(movie => {
            const card = this.create(movie, options);
            container.appendChild(card);
        });
    }
};

window.MovieCard = MovieCard;
