import os
import asyncio

from twitchio.ext import commands
from server.app import make_join_token  # import from package path


CHANNEL = os.getenv("TWITCH_CHANNEL")
OAUTH = os.getenv("TWITCH_OAUTH")
NICK = os.getenv("TWITCH_BOT_NICK", "bot")
BASE = os.getenv("BASE_URL", "http://localhost:8000")
PREFIX = os.getenv("COMMAND_PREFIX", "%")

class Bot(commands.Bot):
    def __init__(self):
        super().__init__(token=OAUTH, prefix=PREFIX, initial_channels=[CHANNEL])

        # Wire server.app.post_to_twitch to send to chat through this bot
        import server.app as webapp

        def _say(msg: str):
            asyncio.create_task(self._send(msg))

        webapp.post_to_twitch = _say

    async def _send(self, msg: str):
        chan = self.get_channel(CHANNEL)
        if chan:
            await chan.send(msg)

    @commands.command(name="play")
    async def play(self, ctx: commands.Context):
        user = ctx.author.name
        token = make_join_token(user, ttl_sec=300)
        url = f"{BASE}/play?t={token}"
        await ctx.reply(f"@{user} start your adventure here → {url} (link expires in 5 min)")

    @commands.command(name="setrarity")
    async def setrarity(self, ctx: commands.Context):
        if not ctx.author.is_mod:
            return
        parts = ctx.message.content.split()
        if len(parts) == 2:
            import server.app as webapp
            webapp.LOOT_MIN = parts[1].lower()
            await ctx.send(f"Min loot rarity set to {webapp.LOOT_MIN}.")


if __name__ == "__main__":
    Bot().run()
