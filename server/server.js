import express from 'express'
require('dotenv').config()
import cors from 'cors'
import initRoutes from './src/routes'
import connectDatabase from './src/config/connectDatabase'

const app = express()
app.use(cors({
    origin: process.env.CLIENT_URL,
    methods: ["POST", 'GET', 'PUT', "PATCH", "DELETE"],
    allowedHeaders: ['Content-Type', 'Authorization']
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

initRoutes(app)
connectDatabase()

const port = process.env.PORT || 5000

// Function to start server
const startServer = () => {
    const server = app.listen(port, () => {
        console.log(`Server is running on the port ${server.address().port}`)
    })

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`Port ${port} is already in use. Please stop the other process or use a different port.`)
            console.error(`You can kill the process using: netstat -ano | findstr :${port} then taskkill /F /PID <PID>`)
            process.exit(1)
        } else {
            throw err
        }
    })
}

startServer()

