import { SanityClientConfig } from '../types.ts';

export function Sanity(config: SanityClientConfig) {
	const { id, dataset, version, cdn, token } = config;

	if (!id || !dataset || !version) {
		throw new Error('Sanity: project id, dataset, and API version must be defined');
	}

	async function upload(asset_type: 'file' | 'image', file_blob: Blob | File) {
		const request_url = `https://${id}.api.sanity.io/v${version}/assets/${asset_type}s/${dataset}`;
		const response = await fetch(request_url, {
			method: 'POST',
			body: file_blob,
			headers: new Headers({
				'Authorization': `Bearer ${token}`,
				'Content-Type': file_blob.type,
			}),
		});

		const response_body = await response.json();

		if (response.ok) {
			return response_body.document;
		} else {
			throw new Error(`Sanity upload: ${response_body.message || response_body.error.description}`);
		}
	}

	async function mutate(mutations: unknown[] = [], params = {}) {
		if (!token) {
			throw new Error('Sanity: all mutation requests have to be authenticated');
		}

		const request_params = Object.keys(params)
			.map(key => `${key}=${params[key]}`)
			.join('&');

		const request_url = `https://${id}.api.sanity.io/v${version}/data/mutate/${dataset}?${request_params}`;

		const request_options = {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ mutations }),
		};

		const response = await fetch(request_url, request_options);
		const response_body = await response.json();

		if (response.ok) {
			return response_body;
		} else {
			let error_message = response_body.message || response_body.error.description;

			if (response_body.error.items) {
				error_message = response_body.error.items.map(item => item.error.description).join(', ');
			}

			throw new Error(`Sanity mutate: ${error_message}`);
		}
	}

	async function query(query = '', params = {}, perspective = 'published') {
		const host = cdn === true ? 'apicdn.sanity.io' : 'api.sanity.io';

		const request_query = encodeURIComponent(query);
		const request_params = Object.keys(params).reduce((pairs, param_key) => {
			const key = encodeURIComponent(`$${param_key}`);
			const value = encodeURIComponent(JSON.stringify(params[param_key]));
			return pairs + `&${key}=${value}`;
		}, '');

		let request_url = `https://${id}.${host}/v${version}/data/query/${dataset}?query=${request_query}&perspective=${perspective}`;

		const request_options: RequestInit = {
			method: 'GET',
			body: null,
			headers: {},
		};

		if (token) {
			request_options.headers!['Authorization'] = `Bearer ${token}`;
		}

		if (request_url.length + request_params.length > 11264) {
			request_options.headers!['Content-Type'] = 'application/json';
			request_options.method = 'POST';
			request_options.body = JSON.stringify({ query, params });
		} else {
			request_url += request_params;
		}

		const response = await fetch(request_url, request_options);
		const response_body = await response.json();

		if (response.ok) {
			return response_body.result;
		} else {
			throw new Error(`Sanity query: ${response_body.message || response_body.error.description}`);
		}
	}

	return {
		query,
		mutate,
		upload,
		config
	};
}
