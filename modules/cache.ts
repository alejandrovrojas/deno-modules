import { ensure_dir } from '../deps.ts';
import { log } from '../util.ts';

export function Cache(setup: Record<string, any>) {
	const { fullpath } = setup.methods;

	async function return_hash(input: string) {
		const text_encoder = new TextEncoder();
		const hash_buffer = await crypto.subtle.digest('SHA-1', text_encoder.encode(input));
		const hash_array = Array.from(new Uint8Array(hash_buffer));
		const hash_hex = hash_array.map(value => value.toString(16).padStart(2, '0')).join('');

		return hash_hex;
	}

	async function store(id: string, data: any) {
		await ensure_dir(setup.config.cache.directory);

		const timestamp = Date.now() + setup.config.cache.timeout;
		const hash = await return_hash(id);
		const filename = timestamp + '-' + hash;

		if (setup.config.log.level === 'debug') {
			log(`cache: stored "${hash}"`, 'gray');
		}

		return Deno.writeTextFile(fullpath([setup.config.cache.directory, filename]), JSON.stringify(data));
	}

	async function get(id: string) {
		await ensure_dir(setup.config.cache.directory);

		const hash = await return_hash(id);

		for await (const entry of Deno.readDir(fullpath([setup.config.cache.directory]))) {
			const filename = entry.name;
			const [entry_timestamp, entry_hash] = filename.split('-');

			if (hash === entry_hash) {
				const is_stale = parseInt(entry_timestamp) < Date.now();

				if (is_stale) {
					remove(filename);
					if (setup.config.log.level === 'debug') {
						log(`cache: removed "${hash}"`, 'gray');
					}
				} else {
					if (setup.config.log.level === 'debug') {
						log(`cache: removed "${hash}"`, 'gray');
					}
					return JSON.parse(await Deno.readTextFile(fullpath([setup.config.cache.directory, entry.name])));
				}
			}
		}

		return undefined;
	}

	async function remove(filename: string) {
		return Deno.remove(fullpath([setup.config.cache.directory, filename]));
	}

	return {
		store,
		get,
		remove,
	};
}
