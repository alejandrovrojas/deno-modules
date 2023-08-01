import { ServerClientOptions } from '../types.ts';
import * as Utilities from '../util.ts';

export function SEO(options: ServerClientOptions) {
	const seo_fields = Object.assign({}, options.seo);

	function init() {
		if (Utilities.in_development_mode) {
			Utilities.log(`${JSON.stringify(get(), null, 3)}`, 'SEO', 'yellow');
		}
	}

	function get() {
		return Object.assign({}, seo_fields, get_patched_url(seo_fields.url || seo_fields.origin));
	}

	function update(new_seo_fields: Partial<ServerClientOptions['seo']> = {}) {
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
