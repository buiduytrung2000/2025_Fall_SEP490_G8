const { Sequelize } = require('sequelize');

// Read DB config from environment variables with sensible defaults
const dbName = process.env.MYSQL_DB || 'CCMS_DB';
const dbUser = process.env.MYSQL_USER || 'root';
const dbPass = process.env.MYSQL_PASSWORD || '123456';
const dbHost = process.env.MYSQL_HOST || 'localhost';
const dbPort = process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306;

const sequelize = new Sequelize(dbName, dbUser, dbPass, {
    host: dbHost,
    port: dbPort,
    dialect: 'mysql',
    logging: false
});

const connectDatabase = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}

export default connectDatabase