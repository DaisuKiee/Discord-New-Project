import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import { createServer } from 'http';
import { Server } from 'socket.io';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from '../src/config.js';
import { connectDatabase, prisma } from '../src/utils/database.js';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import apiRoutes from './routes/api.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

// Middleware
app.use(helmet({
    contentSecurityPolicy: false
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('dashboard/public'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use('/api/', limiter);

// Session
app.use(session({
    secret: config.dashboard.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    }
}));

// Passport
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

passport.use(new DiscordStrategy({
    clientID: config.clientId,
    clientSecret: config.clientSecret,
    callbackURL: config.dashboard.callbackUrl,
    scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    process.nextTick(() => done(null, profile));
}));

app.use(passport.initialize());
app.use(passport.session());

// View engine
app.set('view engine', 'ejs');
app.set('views', './dashboard/views');

// Routes
app.use('/auth', authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
    res.render('index', {
        user: req.user,
        config
    });
});

app.get('/status', (req, res) => {
    res.render('status', {
        user: req.user
    });
});

app.get('/commands', (req, res) => {
    res.render('commands', {
        user: req.user
    });
});

app.get('/docs', (req, res) => {
    res.render('docs', {
        user: req.user
    });
});

// 404 handler
app.use((req, res, next) => {
    if (!res.headersSent) {
        res.status(404).render('error', {
            message: 'Page not found'
        });
    }
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Dashboard error:', err);
    res.status(500).render('error', {
        message: 'Internal server error'
    });
});

// Socket.io for real-time updates
io.on('connection', (socket) => {
    console.log('Client connected to dashboard');
    
    socket.on('disconnect', () => {
        console.log('Client disconnected from dashboard');
    });
});

// Start server function
async function startDashboard(manager = null) {
    try {
        await connectDatabase();
        
        // Store shard manager globally for API access
        if (manager) {
            global.shardManager = manager;
        }
        
        httpServer.listen(config.dashboard.port, () => {
            console.log(`✅ Dashboard running on ${config.dashboard.url}`);
        });
        
        return { app, httpServer, io };
    } catch (error) {
        console.error('❌ Failed to start dashboard:', error);
        throw error;
    }
}

// Auto-start if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    startDashboard();
}

export default startDashboard;
export { io, app, httpServer };
