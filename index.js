require('dotenv').config({ path: require('find-config')('.env') });
const express = require("express");
const path = require("path");

const uploadRoutes = require("./routes/uploadRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Rutas API
app.use("/api/upload", uploadRoutes);

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/api/info", (req, res) => {
    res.json({
        name: "CinePelis DApp",
        version: "1.0.0",
        contracts: {
            movieNFT: process.env.NFT_CONTRACT_ADDRESS,
            cinemaWallet: process.env.WALLET_CONTRACT
        }
    });
});

app.use((err, req, res, next) => {
    res.status(500).json({ error: "Error interno del servidor" });
});

app.listen(PORT, () => {
    console.log(`\nCinePelis DApp - http://localhost:${PORT}`);
    console.log(`Contratos: NFT=${process.env.NFT_CONTRACT_ADDRESS} | Wallet=${process.env.WALLET_CONTRACT}\n`);
});
