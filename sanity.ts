import { config, in_development_mode } from './internal.ts';
import { log } from './util.ts';
import { get_from_cache, store_in_cache } from './cache.ts';

export async function sanity_query(query: string, params: Record<string, any>): Promise<any> {
	const { id, version, dataset, cdn } = config.sanity || {};

	const host = cdn === true ? 'apicdn.sanity.io' : 'api.sanity.io';
	const encoded_query = encodeURIComponent(query);
	const encoded_params = Object.keys(params).reduce((sequence, key) => {
		return sequence + `&${encodeURIComponent(`$${key}`)}=${encodeURIComponent(JSON.stringify(params[key]))}`;
	}, '');

	const request_url = `https://${id}.${host}/v${version}/data/query/${dataset}?query=${encoded_query}${encoded_params}`;
	const response = await fetch(request_url);
	const response_json = await response.json();

	if (response.status < 400) {
		return response_json.result;
	} else {
		throw new Error(response_json.message);
	}
}

export async function sanity_fetch(query: string, params: Record<string, any>): Promise<any> {
	if (in_development_mode) {
		const cached_result = await get_from_cache(query);

		if (cached_result) {
			return cached_result;
		}
	}

	try {
		const result = await sanity_query(query, params);

		if (in_development_mode) {
			store_in_cache(query, result);
		}

		return result;
	} catch (error) {
		log('sanity error: ' + error.message, 'red');
		return null;
	}
}
