const express = require('express');
const cors = require('cors');
const routes = require('./Routes');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', routes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});