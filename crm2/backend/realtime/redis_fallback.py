import time
import fnmatch
from django_redis import get_redis_connection

class DummyRedis:
    def __init__(self):
        self._data = {}
        self._expires = {}

    def _to_str(self, val):
        if isinstance(val, bytes):
            return val.decode('utf-8', errors='ignore')
        return str(val)

    def _is_expired(self, key_str):
        if key_str in self._expires:
            if time.time() > self._expires[key_str]:
                try:
                    del self._data[key_str]
                except KeyError:
                    pass
                try:
                    del self._expires[key_str]
                except KeyError:
                    pass
                return True
        return False

    def incr(self, key, amount=1):
        key_str = self._to_str(key)
        self._is_expired(key_str)
        val = self._data.get(key_str, 0)
        try:
            val = int(val)
        except (ValueError, TypeError):
            val = 0
        new_val = val + amount
        self._data[key_str] = new_val
        return new_val

    def decr(self, key, amount=1):
        return self.incr(key, -amount)

    def hincrby(self, name, key, amount=1):
        name_str = self._to_str(name)
        key_str = self._to_str(key)
        self._is_expired(name_str)
        if name_str not in self._data or not isinstance(self._data[name_str], dict):
            self._data[name_str] = {}
        h = self._data[name_str]
        val = h.get(key_str, 0)
        try:
            val = int(val)
        except (ValueError, TypeError):
            val = 0
        new_val = val + amount
        h[key_str] = new_val
        return new_val

    def expire(self, key, time_in_sec):
        key_str = self._to_str(key)
        self._expires[key_str] = time.time() + time_in_sec
        return True

    def get(self, key):
        key_str = self._to_str(key)
        if self._is_expired(key_str):
            return None
        val = self._data.get(key_str)
        if val is None:
            return None
        if isinstance(val, (int, float, str)):
            return str(val).encode('utf-8')
        return val

    def set(self, key, value):
        key_str = self._to_str(key)
        self._data[key_str] = value
        if key_str in self._expires:
            try:
                del self._expires[key_str]
            except KeyError:
                pass
        return True

    def setex(self, key, time_in_sec, value):
        key_str = self._to_str(key)
        self._data[key_str] = value
        self._expires[key_str] = time.time() + time_in_sec
        return True

    def hset(self, name, key, value=None, mapping=None):
        name_str = self._to_str(name)
        self._is_expired(name_str)
        if name_str not in self._data or not isinstance(self._data[name_str], dict):
            self._data[name_str] = {}
        
        h = self._data[name_str]
        if mapping:
            for k, v in mapping.items():
                h[self._to_str(k)] = v
            return len(mapping)
        else:
            h[self._to_str(key)] = value
            return 1

    def hdel(self, name, *keys):
        name_str = self._to_str(name)
        self._is_expired(name_str)
        if name_str not in self._data or not isinstance(self._data[name_str], dict):
            return 0
        h = self._data[name_str]
        deleted = 0
        for k in keys:
            k_str = self._to_str(k)
            if k_str in h:
                del h[k_str]
                deleted += 1
        return deleted

    def hgetall(self, name):
        name_str = self._to_str(name)
        self._is_expired(name_str)
        h = self._data.get(name_str, {})
        if not isinstance(h, dict):
            return {}
        res = {}
        for k, v in h.items():
            k_bytes = self._to_str(k).encode('utf-8')
            if isinstance(v, bytes):
                v_bytes = v
            elif isinstance(v, (int, float, str)):
                v_bytes = str(v).encode('utf-8')
            else:
                v_bytes = str(v).encode('utf-8')
            res[k_bytes] = v_bytes
        return res

    def scan(self, cursor=0, match=None, count=10):
        all_keys = list(self._data.keys())
        matched_keys = []
        for key_str in all_keys:
            if self._is_expired(key_str):
                continue
            if match:
                match_str = self._to_str(match)
                if fnmatch.fnmatch(key_str, match_str):
                    matched_keys.append(key_str)
            else:
                matched_keys.append(key_str)
        return 0, [k.encode('utf-8') for k in matched_keys]

def get_safe_redis_connection(alias="default"):
    try:
        return get_redis_connection(alias)
    except Exception:
        return get_fallback_redis_instance()

_fallback_redis_instance = None

def get_fallback_redis_instance():
    global _fallback_redis_instance
    if _fallback_redis_instance is None:
        _fallback_redis_instance = DummyRedis()
    return _fallback_redis_instance
