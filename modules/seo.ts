import { ServerClientConfig } from '../types.ts';
import * as Utilities from '../util.ts';
import * as Env from '../env.ts';

export function SEO(config: ServerClientConfig) {
	if (Env.development_mode) {
		config.seo.origin = `http://localhost:${config.port}`;
	}

	const seo_fields = Object.assign({}, config.seo);

	function init() {
		if (Env.development_mode) {
			Utilities.log(get(), 'SEO', 'yellow');
		}
	}

	function get() {
		return Object.assign({}, seo_fields, get_patched_url(seo_fields.url || seo_fields.origin));
	}

	function update(new_seo_fields: Partial<ServerClientConfig['seo']> = {}) {
		return Object.assign({}, seo_fields, new_seo_fields, get_patched_url(new_seo_fields.url || seo_fields.origin));
	}

	function get_patched_url(url: string) {
		const url_object = new URL(url);
		const url_object_joined = new URL(url_object.pathname, seo_fields.origin);

		return {
			url: url_object_joined.href,
		};
	}

	return {
		init,
		get,
		update,
	};
}
