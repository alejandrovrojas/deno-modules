type LRUCacheItem = {
	timestamp: number;
	value: unknown;
};

type LRUCacheOptions = {
	max_items: number;
	max_age: number;
};

const default_lru_cache_options: LRUCacheOptions = {
	max_items: 20,
	max_age: 5000,
};

export function LRUCache(lru_cache_options: Partial<LRUCacheOptions>) {
	const { max_items, max_age } = Object.assign(default_lru_cache_options, lru_cache_options);

	const cache = new Map();

	function get(key: string) {
		if (!cache.has(key)) {
			return null;
		}

		const cached_item = cache.get(key);

		if (cached_item.timestamp > Date.now()) {
			cache.delete(key);
			cache.set(key, cached_item);

			return cached_item.value;
		}

		return null;
	}

	function set(key: string, value: unknown) {
		if (cache.has(key)) {
			cache.delete(key);
		}

		const new_item: LRUCacheItem = {
			timestamp: Date.now() + max_age,
			value: value,
		};

		cache.set(key, new_item);

		if (cache.size > max_items) {
			for (const cached_item_key of cache.keys()) {
				cache.delete(cached_item_key);
				break;
			}
		}
	}

	return {
		get,
		set,
	};
}
