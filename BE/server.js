const express = require('express');
const app = express();
const connectDB = require('./config/db');
const dotenv = require('dotenv');

dotenv.config();

const showtimeRoutes = require('./routes/showtimeRoutes');
const ticketRoutes = require('./routes/ticketRoutes');
const theaterRoutes = require('./routes/theaterRoutes');

app.use('/api/showtimes', showtimeRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/theaters', theaterRoutes);

app.use(express.json());
app.get('/', async(req, res)=>{
    try {
        res.send({message: 'Welcome to Practical Exam!'});
    } catch (error) {
        res.send({error: error.message});
    }
});
connectDB();

const PORT = process.env.PORT || 9999;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));