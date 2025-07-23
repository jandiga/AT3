import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
    return new Promise((resolve) => {
        try {
            const options = {
                serverSelectionTimeoutMS: 5000, // Shorter timeout
                socketTimeoutMS: 10000, // Shorter timeout
                family: 4, // Use IPv4, skip trying IPv6
                retryWrites: true,
                w: 'majority',
                ssl: true,
                tlsAllowInvalidCertificates: true,
                tlsAllowInvalidHostnames: true,
                // Connection pooling for better performance
                maxPoolSize: 10, // Maintain up to 10 socket connections
                minPoolSize: 2,  // Maintain a minimum of 2 socket connections
                maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
                bufferCommands: false, // Disable mongoose buffering
            };

            mongoose.connect(process.env.MONGODB_URI, options)
                .then(() => {
                    console.log('✅ MongoDB Connected Successfully');
                    global.dbConnected = true;

                    // Handle connection events
                    mongoose.connection.on('error', (err) => {
                        console.error('MongoDB connection error:', err.message);
                        global.dbConnected = false;
                    });

                    mongoose.connection.on('disconnected', () => {
                        console.log('MongoDB disconnected');
                        global.dbConnected = false;
                    });

                    mongoose.connection.on('reconnected', () => {
                        console.log('MongoDB reconnected');
                        global.dbConnected = true;
                    });

                    resolve();
                })
                .catch((error) => {
                    console.error('MongoDB Connection Error:', error.message);
                    console.log('⚠️  Continuing in development mode without database...');
                    console.log('⚠️  Some features may not work properly.');
                    global.dbConnected = false;
                    resolve(); // Don't reject, just resolve without connection
                });
        } catch (error) {
            console.error('MongoDB Connection Error:', error.message);
            console.log('⚠️  Continuing in development mode without database...');
            global.dbConnected = false;
            resolve(); // Don't reject, just resolve without connection
        }
    });
};

export default connectDB;