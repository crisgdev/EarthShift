import time
from threading import Lock

from backend.app.config import CACHE_TTL_SECONDS


class TTLCache:
    def __init__(self, ttl_seconds: int):
        self.ttl_seconds = ttl_seconds
        self._data = {}
        self._lock = Lock()

    def get(self, key):
        now = time.time()

        with self._lock:
            item = self._data.get(key)

            if item is None:
                return None

            expires_at, value = item

            if now >= expires_at:
                del self._data[key]
                return None

            return value

    def set(self, key, value):
        expires_at = (
            time.time()
            + self.ttl_seconds
        )

        with self._lock:
            self._data[key] = (
                expires_at,
                value,
            )

    def clear(self):
        with self._lock:
            self._data.clear()

    def delete(self, key):
        with self._lock:
            self._data.pop(
                key,
                None,
            )


engine_cache = TTLCache(
    ttl_seconds=CACHE_TTL_SECONDS
)