const Modal = {
    backdrop: null,
    currentModal: null,

    init() {
        // Crear backdrop si no existe
        if (!this.backdrop) {
            this.backdrop = document.createElement('div');
            this.backdrop.className = 'modal-backdrop';
            this.backdrop.addEventListener('click', (e) => {
                if (e.target === this.backdrop) {
                    this.close();
                }
            });
            document.body.appendChild(this.backdrop);

            // Cerrar con ESC
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.backdrop.classList.contains('open')) {
                    this.close();
                }
            });
        }
    },

    open(options) {
        this.init();

        const { title, content, footer, size = 'default' } = options;

        const sizeClass = size === 'large' ? 'modal-lg' : size === 'small' ? 'modal-sm' : '';

        this.backdrop.innerHTML = `
            <div class="modal ${sizeClass}">
                <div class="modal-header">
                    <h3 class="modal-title">${title}</h3>
                    <button class="modal-close">×</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
            </div>
        `;

        // Evento cerrar
        this.backdrop.querySelector('.modal-close').addEventListener('click', () => {
            this.close();
        });

        // Mostrar
        requestAnimationFrame(() => {
            this.backdrop.classList.add('open');
        });

        this.currentModal = this.backdrop.querySelector('.modal');
        return this.currentModal;
    },

    close() {
        if (this.backdrop) {
            this.backdrop.classList.remove('open');
        }
    },

    // Modal de confirmacion
    confirm(options) {
        const { title, message, icon = 'warning', confirmText = 'Confirmar', cancelText = 'Cancelar', onConfirm, onCancel } = options;

        const iconHtml = icon === 'warning'
            ? '<i class="fas fa-exclamation-triangle"></i>'
            : icon === 'danger'
                ? '<i class="fas fa-times-circle"></i>'
                : '<i class="fas fa-check-circle"></i>';

        const content = `
            <div class="confirm-content">
                <div class="confirm-icon ${icon}">${iconHtml}</div>
                <h4 class="confirm-title">${title}</h4>
                <p class="confirm-message">${message}</p>
            </div>
        `;

        const footer = `
            <button class="btn btn-secondary" id="modal-cancel">${cancelText}</button>
            <button class="btn btn-primary" id="modal-confirm">${confirmText}</button>
        `;

        this.open({ title: '', content, footer });

        // Ocultar header en confirm
        this.backdrop.querySelector('.modal-header').style.display = 'none';

        // Eventos
        this.backdrop.querySelector('#modal-cancel').addEventListener('click', () => {
            this.close();
            if (onCancel) onCancel();
        });

        this.backdrop.querySelector('#modal-confirm').addEventListener('click', () => {
            this.close();
            if (onConfirm) onConfirm();
        });
    },

    // Modal de detalle de pelicula
    movieDetail(movie, onBuy, isPurchased = false) {
        const posterHtml = movie.posterUrl
            ? `<div class="movie-detail-poster"><img src="${movie.posterUrl}" alt="${movie.title}"></div>`
            : `<div class="movie-detail-poster"><i class="fas fa-film"></i></div>`;

        const content = `
            <div class="movie-detail">
                ${posterHtml}
                <div class="movie-detail-info">
                    <h2>${movie.title}</h2>
                    <div class="movie-detail-meta">
                        ${movie.genre ? `<span><i class="fas fa-theater-masks"></i> ${movie.genre}</span>` : ''}
                        ${movie.releaseYear && movie.releaseYear !== '0' ? `<span><i class="fas fa-calendar-alt"></i> ${movie.releaseYear}</span>` : ''}
                        <span>ID: #${movie.id}</span>
                    </div>
                    ${movie.synopsis ? `<p class="movie-detail-synopsis">${movie.synopsis}</p>` : ''}
                    <div class="movie-detail-price">
                        <div>
                            <div class="price-label">Precio</div>
                            <div class="price-value">${movie.price} ETH</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        let footer = '';
        if (isPurchased) {
            footer = `<span class="text-muted">Ya tienes esta pelicula</span>`;
        } else if (movie.active) {
            footer = `
                <button class="btn btn-secondary" id="modal-cancel">Cancelar</button>
                <button class="btn btn-primary" id="modal-buy">Comprar por ${movie.price} ETH</button>
            `;
        } else {
            footer = `<span class="text-muted">Pelicula no disponible</span>`;
        }

        this.open({ title: movie.title, content, footer, size: 'large' });

        // Eventos
        const cancelBtn = this.backdrop.querySelector('#modal-cancel');
        const buyBtn = this.backdrop.querySelector('#modal-buy');

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.close());
        }

        if (buyBtn) {
            buyBtn.addEventListener('click', () => {
                if (onBuy) onBuy(movie);
            });
        }
    }
};

window.Modal = Modal;
