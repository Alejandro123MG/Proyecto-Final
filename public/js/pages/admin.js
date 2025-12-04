const AdminPage = {
    movies: [],
    currentTab: 'movies',
    isProcessing: false,

    async init() {
        if (!WalletService.isConnected()) {
            App.showConnectPrompt();
            return;
        }

        const isOwner = await WalletService.isOwner();
        if (!isOwner) {
            Toast.error('Acceso denegado', 'Solo el owner puede acceder');
            Navbar.navigateTo('catalog');
            return;
        }

        this.setupTabs();
        this.setupForms();
        await this.loadData();
    },

    setupTabs() {
        const tabs = document.querySelectorAll('.admin-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                this.switchTab(tabName);
            });
        });
    },

    switchTab(tabName) {
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        document.querySelectorAll('.admin-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === `panel-${tabName}`);
        });

        this.currentTab = tabName;
    },

    setupForms() {
        const addMovieForm = document.getElementById('form-add-movie');
        if (addMovieForm) {
            addMovieForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addMovie();
            });
        }

        this.setupFileUpload();
    },

    setupFileUpload() {
        const input = document.getElementById('poster-input');
        const wrapper = document.getElementById('poster-upload-label');
        const removeBtn = document.getElementById('poster-remove');

        if (!input || !wrapper) return;

        input.addEventListener('change', (e) => this.handlePosterSelect(e));

        wrapper.addEventListener('dragover', (e) => {
            e.preventDefault();
            wrapper.classList.add('dragover');
        });

        wrapper.addEventListener('dragleave', () => {
            wrapper.classList.remove('dragover');
        });

        wrapper.addEventListener('drop', (e) => {
            e.preventDefault();
            wrapper.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                input.files = files;
                this.handlePosterSelect({ target: input });
            }
        });

        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.removePoster();
            });
        }
    },

    handlePosterSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            Toast.error('Error', 'La imagen no puede superar 5MB');
            event.target.value = '';
            return;
        }

        if (!file.type.startsWith('image/')) {
            Toast.error('Error', 'Solo se permiten imagenes');
            event.target.value = '';
            return;
        }

        const wrapper = document.getElementById('poster-upload-label');
        const previewImg = document.getElementById('poster-preview-img');
        const fileName = document.getElementById('poster-file-name');
        const fileSize = document.getElementById('poster-file-size');

        const reader = new FileReader();
        reader.onload = (e) => {
            if (previewImg) previewImg.src = e.target.result;
            if (wrapper) wrapper.classList.add('has-file');
            if (fileName) fileName.textContent = file.name;
            if (fileSize) fileSize.textContent = this.formatFileSize(file.size);
        };
        reader.readAsDataURL(file);
    },

    removePoster() {
        const input = document.getElementById('poster-input');
        const wrapper = document.getElementById('poster-upload-label');

        if (input) input.value = '';
        if (wrapper) wrapper.classList.remove('has-file');
    },

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    // Subir solo imagen (para mostrar en la web)
    async uploadPoster(file) {
        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('/api/upload/image', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Error subiendo imagen a IPFS');
        }

        return await response.json();
    },

    // Subir imagen + crear metadatos NFT (para OpenSea/MetaMask)
    async uploadNFTMetadata(file, movieData) {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('title', movieData.title);
        formData.append('synopsis', movieData.synopsis || '');
        formData.append('director', movieData.director || '');
        formData.append('genre', movieData.genre || '');
        formData.append('releaseYear', movieData.releaseYear || '');

        const response = await fetch('/api/upload/nft-metadata', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Error creando metadatos NFT');
        }

        return await response.json();
    },

    async loadData() {
        try {
            const movies = await WalletService.getAllMovies();

            // Cargar ventas para cada película
            this.movies = await Promise.all(movies.map(async (movie) => {
                try {
                    const salesCount = await WalletService.getSalesCount(movie.id);
                    return { ...movie, salesCount };
                } catch {
                    return { ...movie, salesCount: 0 };
                }
            }));

            this.render();
        } catch (error) {
            Toast.error('Error', 'No se pudieron cargar los datos');
        }
    },

    render() {
        this.renderStats();
        this.renderMoviesTable();
    },

    renderStats() {
        const totalMoviesEl = document.getElementById('admin-total-movies');
        if (totalMoviesEl) {
            totalMoviesEl.textContent = this.movies.length;
        }

        const activeMoviesEl = document.getElementById('admin-active-movies');
        if (activeMoviesEl) {
            activeMoviesEl.textContent = this.movies.filter(m => m.active).length;
        }
    },

    renderMoviesTable() {
        const tbody = document.getElementById('movies-table-body');
        if (!tbody) return;

        if (this.movies.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted" style="padding: 40px;">
                        No hay peliculas registradas
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.movies.map(movie => `
            <tr>
                <td>#${movie.id}</td>
                <td>${movie.title}</td>
                <td>${movie.genre || '-'}</td>
                <td>${movie.price} ETH</td>
                <td>
                    <span class="sales-count ${movie.salesCount > 0 ? 'has-sales' : ''}">
                        <i class="fas fa-shopping-cart"></i> ${movie.salesCount || 0}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${movie.active ? 'status-active' : 'status-inactive'}">
                        ${movie.active ? 'Activa' : 'Inactiva'}
                    </span>
                </td>
                <td class="actions">
                    <button class="btn btn-info btn-icon" onclick="AdminPage.showBuyers(${movie.id})" title="Ver compradores"><i class="fas fa-users"></i></button>
                    ${movie.active
                        ? `<button class="btn btn-warning btn-icon" onclick="AdminPage.toggleMovie(${movie.id}, false)" title="Deshabilitar"><i class="fas fa-pause"></i></button>`
                        : `<button class="btn btn-success btn-icon" onclick="AdminPage.toggleMovie(${movie.id}, true)" title="Habilitar"><i class="fas fa-play"></i></button>`
                    }
                </td>
            </tr>
        `).join('');
    },

    async showBuyers(movieId) {
        try {
            const movie = this.movies.find(m => m.id === movieId.toString());
            const buyers = await WalletService.getMovieBuyers(movieId);

            if (buyers.length === 0) {
                Toast.warning('Sin ventas', 'Esta película aún no tiene compradores');
                return;
            }

            const buyersList = buyers.map((addr, i) =>
                `${i + 1}. ${addr.slice(0, 6)}...${addr.slice(-4)}`
            ).join('\n');

            alert(`Compradores de "${movie?.title || 'Película #' + movieId}":\n\n${buyersList}`);
        } catch (error) {
            Toast.error('Error', 'No se pudieron cargar los compradores');
        }
    },

    async addMovie() {
        // Prevenir doble clic
        if (this.isProcessing) {
            return;
        }

        const form = document.getElementById('form-add-movie');
        const formData = new FormData(form);
        const btn = document.getElementById('btn-add-movie');

        const title = formData.get('title');
        const genre = formData.get('genre') || '';
        const synopsis = formData.get('synopsis') || '';
        const price = formData.get('price');
        const releaseYear = formData.get('releaseYear') || 0;
        const director = formData.get('director') || '';
        const posterFile = document.getElementById('poster-input').files[0];

        if (!title || !price) {
            Toast.error('Error', 'Titulo y precio son requeridos');
            return;
        }

        try {
            this.isProcessing = true;
            btn.disabled = true;
            btn.textContent = 'Procesando...';

            let posterURI = '';

            if (posterFile) {
                Toast.warning('Subiendo', 'Creando metadatos NFT en IPFS...');

                // Crear metadatos NFT completos (imagen + JSON)
                const uploadResult = await this.uploadNFTMetadata(posterFile, {
                    title,
                    synopsis,
                    director,
                    genre,
                    releaseYear
                });

                // Usar el URI de los metadatos JSON (no la imagen directa)
                // Esto permite que OpenSea/MetaMask muestren la imagen correctamente
                posterURI = uploadResult.metadataUri;

                console.log('NFT Metadata:', {
                    imageUri: uploadResult.imageUri,
                    metadataUri: uploadResult.metadataUri
                });
            }

            Toast.warning('Procesando', 'Confirma la transaccion en MetaMask...');

            await WalletService.addMovie(title, genre, synopsis, price, releaseYear, posterURI, director);

            Toast.success('Exito', 'Pelicula agregada al catalogo');

            form.reset();
            this.removePoster();
            await this.loadData();

        } catch (error) {
            if (error.code === 4001) {
                Toast.error('Cancelado', 'Transaccion rechazada');
            } else {
                Toast.error('Error', error.reason || error.message || 'No se pudo agregar la pelicula');
            }
        } finally {
            this.isProcessing = false;
            btn.disabled = false;
            btn.textContent = 'Agregar Pelicula';
        }
    },

    async toggleMovie(movieId, enable) {
        try {
            Toast.warning('Procesando', 'Confirma en MetaMask...');

            if (enable) {
                await WalletService.enableMovie(movieId);
                Toast.success('Exito', 'Pelicula habilitada');
            } else {
                await WalletService.disableMovie(movieId);
                Toast.success('Exito', 'Pelicula deshabilitada');
            }

            await this.loadData();

        } catch (error) {
            if (error.code === 4001) {
                Toast.error('Cancelado', 'Transaccion rechazada');
            } else {
                Toast.error('Error', error.reason || error.message);
            }
        }
    }
};

window.AdminPage = AdminPage;
