import express from 'express'
require('dotenv').config()
import cors from 'cors'
import initRoutes from './src/routes'
import connectDatabase from './src/config/connectDatabase'
import * as scheduleService from './src/services/schedule'

const app = express()
app.use(cors({
    origin: process.env.CLIENT_URL,
    methods: ["POST", 'GET', 'PUT', "PATCH", "DELETE"],
    allowedHeaders: ['Content-Type', 'Authorization']
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

initRoutes(app)

// Scheduled task: Tự động đánh vắng các schedule quá thời gian ca
// Chạy mỗi 15 phút
const markAbsentSchedulesTask = () => {
    scheduleService.markAbsentSchedules()
        .then(result => {
            if (result.data.updated_count > 0) {
                console.log(`[Scheduled Task] Marked ${result.data.updated_count} schedules as absent`)
            }
        })
        .catch(error => {
            console.error('[Scheduled Task] Error marking absent schedules:', error)
        })
}

// Kết nối database và khởi động scheduled task
connectDatabase().then(() => {
    // Chạy ngay sau khi database kết nối
    markAbsentSchedulesTask()
    
    // Chạy định kỳ mỗi 15 phút (900000 ms)
    setInterval(markAbsentSchedulesTask, 15 * 60 * 1000)
    console.log('[Scheduled Task] Auto-mark absent schedules task started (runs every 15 minutes)')
}).catch(error => {
    console.error('Failed to connect to database:', error)
})

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