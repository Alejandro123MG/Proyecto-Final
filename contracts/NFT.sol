// SPDX-License-Identifier: MIT
pragma solidity >= 0.8.0 < 0.9.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Contrato de NFTs para peliculas - CinePelis
contract MovieNFT is ERC721, Ownable{

    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    using Strings for uint256;
    mapping (uint256 => string) private _tokenURIs;

    // Estructura para almacenar metadata de pelicula
    struct Movie {
        string title;
        string director;
        uint256 year;
        string genre;
    }

    // Mapping de tokenId a datos de pelicula
    mapping(uint256 => Movie) public movies;

    // Direccion del contrato CinemaWallet autorizado para mintear
    address public authorizedMinter;

    // Evento cuando se mintea una pelicula
    event MovieMinted(uint256 indexed tokenId, string title, address owner);

    constructor() ERC721("CinePelis", "CINE") {}

    // Configurar el contrato autorizado para mintear (CinemaWallet)
    function setAuthorizedMinter(address _minter) external onlyOwner {
        authorizedMinter = _minter;
    }

    // Modifier para permitir minteo por owner o contrato autorizado
    modifier canMint() {
        require(
            msg.sender == owner() || msg.sender == authorizedMinter,
            "No autorizado para mintear"
        );
        _;
    }
    string private _baseURIextended;

    function setbaseUri(string memory baseUri) external onlyOwner(){
        _baseURIextended=baseUri;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseURIextended;
    }

    function _setTokenUri(uint256 tokenId, string memory _tokenURI)internal virtual{
        require(_exists(tokenId),"ERC721META:URI set of nonexisten token");
        _tokenURIs[tokenId]=_tokenURI;
    }

    function tokenURI(uint256 tokenId) public view virtual override returns(string memory){
        require(_exists(tokenId),"ERC721META:URI set of nonexisten token");
        string memory _tokenURI=_tokenURIs[tokenId];
        string memory base = _baseURI();
        if(bytes(base).length==0){
            return _tokenURI;
        }
        if(bytes(_tokenURI).length>0){
            return string(abi.encodePacked(base,_tokenURI));
        }
        return string(abi.encodePacked(base,tokenId.toString()));
    }

    // Mintear NFT de pelicula con metadata
    function mintMovie(
        address recipient,
        string memory _tokenURI,
        string memory title,
        string memory director,
        uint256 year,
        string memory genre
    ) public canMint returns(uint256){
        _tokenIds.increment();
        uint256 newItemId = _tokenIds.current();
        _mint(recipient, newItemId);
        _setTokenUri(newItemId, _tokenURI);

        // Guardar metadata de la pelicula
        movies[newItemId] = Movie({
            title: title,
            director: director,
            year: year,
            genre: genre
        });

        emit MovieMinted(newItemId, title, recipient);
        return newItemId;
    }

    // Funcion original para compatibilidad
    function minNFT(address recipent,string memory _tokenURI) public onlyOwner returns(uint256){
        _tokenIds.increment();
        uint256 newItemId= _tokenIds.current();
        _mint(recipent,newItemId);
        _setTokenUri(newItemId,_tokenURI);
        return newItemId;
    }

    // Obtener datos de una pelicula
    function getMovie(uint256 tokenId) public view returns (Movie memory) {
        require(_exists(tokenId), "Pelicula no existe");
        return movies[tokenId];
    }

    // Obtener total de peliculas minteadas
    function totalMovies() public view returns (uint256) {
        return _tokenIds.current();
    }
}