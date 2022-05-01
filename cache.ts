import { log } from './util.ts';
import { ensure_dir } from './dependencies.ts';

const cache_time = 1000 * 60;
const cache_directory = '.cache';

async function return_hash(input: string) {
	const text_encoder = new TextEncoder();
	const hash_buffer = await crypto.subtle.digest('SHA-1', text_encoder.encode(input));
	const hash_array = Array.from(new Uint8Array(hash_buffer));
	const hash_hex = hash_array.map(value => value.toString(16).padStart(2, '0')).join('');

	return hash_hex;
}

export async function remove_from_cache(filename: string) {
	return Deno.remove(`${cache_directory}/${filename}`);
}

export async function store_in_cache(id: string, data: any) {
	await ensure_dir(cache_directory);

	const timestamp = Date.now() + cache_time;
	const hash = await return_hash(id);
	const filename = timestamp + '-' + hash;

	log(filename + ' stored in cache', 'gray');

	return Deno.writeTextFile(`${cache_directory}/${filename}`, JSON.stringify(data));
}

export async function get_from_cache(id: string) {
	await ensure_dir(cache_directory);

	const hash = await return_hash(id);

	for await (const entry of Deno.readDir('.cache')) {
		const filename = entry.name;
		const [entry_timestamp, entry_hash] = filename.split('-');

		if (hash === entry_hash) {
			const is_stale = parseInt(entry_timestamp) < Date.now();

			if (is_stale) {
				// log(filename + ' is stale', 'gray');
				remove_from_cache(filename);
			} else {
				log(filename + ' returned from cache', 'gray');
				return JSON.parse(await Deno.readTextFile(`${cache_directory}/${entry.name}`));
			}
		}
	}

	return null;
}
