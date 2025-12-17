# Elixir Discord Bot

A feature-rich Discord bot built with Discord.js v14, featuring music playback, AI integration, moderation tools, and more.

## Features

- 🎵 **Music** - Play music from YouTube, Spotify, SoundCloud with Lavalink
- 🤖 **AI Integration** - Chat with AI (GPT, Claude, Gemini) and generate images
- 🛡️ **Moderation** - Ban, kick, mute, warn, and case management
- 🔧 **Utility** - Server info, user info, avatar, stats, and more
- ⚙️ **Configurable** - Custom prefix, per-server settings
- 🎨 **Components v2** - Modern Discord UI with containers and buttons

## Commands

### Music
`play`, `stop`, `skip`, `pause`, `resume`, `queue`, `nowplaying`, `volume`, `loop`, `shuffle`, `autoplay`

### Moderation
`ban`, `kick`, `mute`, `unmute`, `warn`, `unban`, `cases`

### Utility
`ping`, `help`, `avatar`, `serverinfo`, `userinfo`, `stats`

### AI
`chat`, `image`, `clear-chat`

## Installation

1. Clone the repository
```bash
git clone https://github.com/DaisuKiee/Discord-New-Project.git
cd Discord-New-Project
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables
```bash
cp .env.example .env
# Edit .env with your tokens and settings
```

4. Set up the database
```bash
npx prisma generate
npx prisma db push
```

5. Start the bot
```bash
npm run dev    # Development with hot reload
npm start      # Production
```

## Requirements

- Node.js 18+
- MongoDB
- Lavalink server (for music)
- Discord Bot with these intents:
  - Guilds
  - Guild Members
  - Guild Messages
  - Guild Voice States
  - Message Content (for prefix commands)

## Tech Stack

- **Discord.js v14** - Discord API wrapper
- **Prisma** - Database ORM
- **Poru** - Lavalink client for music
- **MongoDB** - Database
- **EJS** - Dashboard templating

## License

MIT
