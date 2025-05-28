import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class DevToolsServer {
  private app: express.Express;
  private server: http.Server;
  private io: Server;
  private port: number = 3333;
  private maxPortAttempts: number = 10;

  constructor() {
    this.app = express();
    
    // Serve static files from the 'public' directory
    const publicPath = path.join(__dirname, 'public');
    this.app.use(express.static(publicPath));
    
    // For any other request, serve the index.html (for React router)
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(publicPath, 'index.html'));
    });
    
    this.server = http.createServer(this.app);
    
    // Initialize Socket.IO
    this.io = new Server(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    
    this.io.on('connection', (socket) => {
      console.log('Client connected');
      
      socket.on('disconnect', () => {
        console.log('Client disconnected');
      });
    });
  }

  public start(): Promise<number> {
    return new Promise((resolve) => {
      const tryListen = (attempt = 0) => {
        const currentPort = this.port + attempt;
        
        // Create server error handler
        const errorHandler = (err: Error) => {
          if (err.message.includes('EADDRINUSE') && attempt < this.maxPortAttempts) {
            console.log(`Port ${currentPort} is in use, trying ${this.port + attempt + 1}...`);
            this.server.removeListener('error', errorHandler);
            tryListen(attempt + 1);
          } else {
            console.error(`Failed to start server: ${err.message}`);
          }
        };
        
        // Add error handler
        this.server.once('error', errorHandler);
        
        // Try to listen on the port
        this.server.listen(currentPort, () => {
          // Update the port to the one that worked
          this.port = currentPort;
          console.log(`DevTools server running at http://localhost:${this.port}`);
          resolve(this.port);
        });
      };
      
      tryListen();
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      this.io.close(() => {
        this.server.close(() => {
          resolve();
        });
      });
    });
  }

  public sendLog(level: string, message: string): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message
    };

    this.io.emit('log', logEntry);
  }
}
