// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IMovieNFT {
    function mintMovie(
        address recipient,
        string memory _tokenURI,
        string memory title,
        string memory director,
        uint256 year,
        string memory genre
    ) external returns(uint256);
}

contract CinemaWallet {
    address public owner;
    address public partner;
    uint256 public ownerShare;
    uint256 public partnerShare;

    uint256 private _status;

    modifier nonReentrant() {
        require(_status != 2, "Reentrancy Guard");
        _status = 2;
        _;
        _status = 1;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "No autorizado");
        _;
    }

    event MovieAdded(uint id, string title, string genre, uint price, address seller);
    event MoviePurchased(uint id, address buyer, uint price, string title);
    event PaymentDistributed(address owner, uint ownerAmount, address partner, uint partnerAmount);

    constructor(address _partner, uint256 _ownerShare, uint256 _partnerShare) {
        require(_partner != address(0), "Partner invalido");
        require(_ownerShare + _partnerShare == 100, "Shares deben sumar 100");

        _status = 1;
        owner = msg.sender;
        partner = _partner;
        ownerShare = _ownerShare;
        partnerShare = _partnerShare;
    }

    struct Movie {
        uint id;
        string title;
        string genre;
        string synopsis;
        uint price;
        address seller;
        bool active;
        uint256 releaseYear;
        string posterURI;
        string director;
    }

    address public nftContract;
    uint public nextMovieId;
    mapping(uint => Movie) public movies;
    mapping(address => uint[]) public purchases;
    mapping(address => mapping(uint => bool)) public hasPurchased;
    mapping(uint => uint) public salesCount; // Contador de ventas por película
    mapping(uint => address[]) public movieBuyers; // Lista de compradores por película

    function setNFTContract(address _nftContract) external onlyOwner {
        require(nftContract == address(0), "Ya configurado");
        nftContract = _nftContract;
    }

    function isOwner(address _addr) external view returns (bool) {
        return _addr == owner;
    }

    function addMovie(
        string memory _title,
        string memory _genre,
        string memory _synopsis,
        uint _price,
        uint256 _releaseYear,
        string memory _posterURI,
        string memory _director
    ) external onlyOwner {
        require(_price > 0, "Precio debe ser mayor a 0");
        require(bytes(_title).length > 0, "Titulo requerido");

        uint movieId = nextMovieId++;
        movies[movieId] = Movie({
            id: movieId,
            title: _title,
            genre: _genre,
            synopsis: _synopsis,
            price: _price,
            seller: msg.sender,
            active: true,
            releaseYear: _releaseYear,
            posterURI: _posterURI,
            director: _director
        });
        emit MovieAdded(movieId, _title, _genre, _price, msg.sender);
    }

    function buyMovie(uint _movieId) external payable nonReentrant {
        Movie storage movie = movies[_movieId];
        require(movie.active, "Pelicula no disponible");
        require(msg.value == movie.price, "Monto incorrecto");
        require(!hasPurchased[msg.sender][_movieId], "Ya compraste esta pelicula");

        purchases[msg.sender].push(_movieId);
        hasPurchased[msg.sender][_movieId] = true;
        salesCount[_movieId]++;
        movieBuyers[_movieId].push(msg.sender);

        // Distribuir pago automaticamente
        uint256 ownerAmount = (msg.value * ownerShare) / 100;
        uint256 partnerAmount = msg.value - ownerAmount;

        (bool s1, ) = payable(owner).call{value: ownerAmount}("");
        (bool s2, ) = payable(partner).call{value: partnerAmount}("");
        require(s1 && s2, "Pago fallido");

        emit PaymentDistributed(owner, ownerAmount, partner, partnerAmount);

        // Mintear NFT
        if (nftContract != address(0) && bytes(movie.posterURI).length > 0) {
            IMovieNFT(nftContract).mintMovie(
                msg.sender,
                movie.posterURI,
                movie.title,
                movie.director,
                movie.releaseYear,
                movie.genre
            );
        }

        emit MoviePurchased(_movieId, msg.sender, movie.price, movie.title);
    }

    // Comprar multiples peliculas (carrito)
    function buyMultipleMovies(uint[] calldata _movieIds) external payable nonReentrant {
        require(_movieIds.length > 0, "Carrito vacio");
        require(_movieIds.length <= 20, "Maximo 20 peliculas por compra");

        // Calcular total y validar
        uint256 totalPrice = 0;
        for (uint i = 0; i < _movieIds.length; i++) {
            Movie storage movie = movies[_movieIds[i]];
            require(movie.active, "Pelicula no disponible");
            require(!hasPurchased[msg.sender][_movieIds[i]], "Ya compraste una pelicula del carrito");
            totalPrice += movie.price;
        }

        require(msg.value == totalPrice, "Monto incorrecto");

        // Procesar cada compra
        for (uint i = 0; i < _movieIds.length; i++) {
            uint movieId = _movieIds[i];
            Movie storage movie = movies[movieId];

            purchases[msg.sender].push(movieId);
            hasPurchased[msg.sender][movieId] = true;
            salesCount[movieId]++;
            movieBuyers[movieId].push(msg.sender);

            // Mintear NFT
            if (nftContract != address(0) && bytes(movie.posterURI).length > 0) {
                IMovieNFT(nftContract).mintMovie(
                    msg.sender,
                    movie.posterURI,
                    movie.title,
                    movie.director,
                    movie.releaseYear,
                    movie.genre
                );
            }

            emit MoviePurchased(movieId, msg.sender, movie.price, movie.title);
        }

        // Distribuir pago total
        uint256 ownerAmount = (msg.value * ownerShare) / 100;
        uint256 partnerAmount = msg.value - ownerAmount;

        (bool s1, ) = payable(owner).call{value: ownerAmount}("");
        (bool s2, ) = payable(partner).call{value: partnerAmount}("");
        require(s1 && s2, "Pago fallido");

        emit PaymentDistributed(owner, ownerAmount, partner, partnerAmount);
    }

    // Calcular total de un carrito
    function getCartTotal(uint[] calldata _movieIds) external view returns (uint256) {
        uint256 total = 0;
        for (uint i = 0; i < _movieIds.length; i++) {
            if (movies[_movieIds[i]].active && !hasPurchased[msg.sender][_movieIds[i]]) {
                total += movies[_movieIds[i]].price;
            }
        }
        return total;
    }

    function disableMovie(uint _movieId) external onlyOwner {
        movies[_movieId].active = false;
    }

    function enableMovie(uint _movieId) external onlyOwner {
        movies[_movieId].active = true;
    }

    function getAllMovies() external view returns (Movie[] memory) {
        Movie[] memory all = new Movie[](nextMovieId);
        for (uint i = 0; i < nextMovieId; i++) {
            all[i] = movies[i];
        }
        return all;
    }

    function getActiveMovies() external view returns (Movie[] memory) {
        uint activeCount = 0;
        for (uint i = 0; i < nextMovieId; i++) {
            if (movies[i].active) activeCount++;
        }

        Movie[] memory activeMovies = new Movie[](activeCount);
        uint index = 0;
        for (uint i = 0; i < nextMovieId; i++) {
            if (movies[i].active) {
                activeMovies[index] = movies[i];
                index++;
            }
        }
        return activeMovies;
    }

    function getPurchases(address _buyer) external view returns (uint[] memory) {
        return purchases[_buyer];
    }

    function checkPurchase(address _buyer, uint _movieId) external view returns (bool) {
        return hasPurchased[_buyer][_movieId];
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // Obtener cantidad de ventas de una película
    function getSalesCount(uint _movieId) external view returns (uint) {
        return salesCount[_movieId];
    }

    // Obtener lista de compradores de una película
    function getMovieBuyers(uint _movieId) external view returns (address[] memory) {
        return movieBuyers[_movieId];
    }
}
