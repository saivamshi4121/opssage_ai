class CacheService:
    async def get(self, key: str):
        return None

    async def set(self, key: str, value, ttl: int = 300):
        pass

    async def delete(self, key: str):
        pass
