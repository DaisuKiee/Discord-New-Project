export function checkAuth(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/auth/login');
}

export function checkGuildPermission(req, res, next) {
    const guildId = req.params.id;
    const userGuilds = req.user.guilds.filter(g => (g.permissions & 0x20) === 0x20);
    
    if (!userGuilds.find(g => g.id === guildId)) {
        return res.status(403).json({ error: 'No permission' });
    }
    
    next();
}
