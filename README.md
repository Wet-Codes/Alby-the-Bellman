
Setup:

1. Install dependencies:
   npm install
   

2. .env
   DIS=dude
   CLIENT_ID=wtf
   GUILD_ID=paste dc server ID
   ```

3. Start the bot:
   npm run dev
  

Run `/party tracking`, `/party dungeon`, or `/party pvp` in server.

The bot creates a thread, posts the party embed, and lets members join roles from the dropdown. If a role is full, users are queued automatically. Leaving a party promotes the next queued user.

## Notes

- Single Discord server only.
- One active party at a time.
- State is stored in memory and resets when the bot restarts.
- No Albion API, economy, stats, website, database, or voice channel features.
