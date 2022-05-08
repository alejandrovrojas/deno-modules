import { log, in_development } from '../util.ts';
import { Setup } from './setup.ts';
import { Cache } from './cache.ts';

export function Sanity(user_config: Record<string, any>) {
	const setup = Setup(user_config);
	const cache = Cache(setup);

	const { id, dataset, version, cdn, token } = setup.config.sanity;

	if (!id || !dataset || !version) {
		throw new Error('misconfigured sanity client. project id, dataset, and api version need to be defined');
	}

	async function client_fetch(query: string = '', params: Record<string, any> = {}): Promise<any> {
		const host = cdn === true ? 'apicdn.sanity.io' : 'api.sanity.io';

		const encoded_query = encodeURIComponent(query);
		const encoded_params = Object.keys(params).reduce((pairs, param_key) => {
			const key = encodeURIComponent(`$${param_key}`);
			const value = encodeURIComponent(JSON.stringify(params[param_key]));
			return pairs + `&${key}=${value}`;
		}, '');

		const query_string = `?query=${encoded_query}${encoded_params}`;
		const switch_method = query_string.length > 11264;

		let request_url = `https://${id}.${host}/v${version}/data/query/${dataset}`;

		const request_options: any = {
			method: 'GET',
			headers: {},
			body: null,
		};

		if (token) {
			request_options.headers['Authorization'] = `Bearer ${token}`;
		}

		if (switch_method) {
			request_options.headers['Content-Type'] = 'application/json';
			request_options.method = 'POST';
			request_options.body = JSON.stringify({ query, params });
		} else {
			request_url += query_string;
		}

		const response = await fetch(request_url, request_options);
		const response_json = await response.json();

		if (response.status < 400) {
			return response_json.result;
		} else {
			throw new Error(response_json.message);
		}
	}

	async function client_fetch_cached(query: string, params?: Record<string, any>): Promise<any> {
		try {
			if (in_development) {
				const cached_result = await cache.get(query);

				if (cached_result !== undefined) {
					return cached_result;
				}
			}

			const result = await client_fetch(query, params);

			if (in_development) {
				cache.store(query, result);
			}

			return result;
		} catch (error) {
			log('sanity error: ' + error.message, 'red');
			return null;
		}
	}

	return {
		fetch: client_fetch_cached,
	};
}
