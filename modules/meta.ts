const default_meta_fields = {
	title: 'Default title',
	description: 'Default description',
	origin: 'https://default.url',
	url: '',
	image: '',
	language: 'no',
	locale: 'nb_NO',
};

export function Meta(meta_fields) {
	const meta = Object.assign(default_meta_fields, meta_fields);

	function get() {
		return meta;
	}

	function update(meta_fields = {}) {
		return Object.assign(meta, meta_fields, get_url_object(meta_fields.url));
	}

	function get_url_object(url: string | undefined) {
		return {
			url: url ? get_joined_url(url) : meta.origin,
		};
	}

	function get_joined_url(new_url: string) {
		const origin = meta.origin;
		const url_object = new URL(new_url);
		const url_object_joined = new URL(url_object.pathname, origin);

		return url_object_joined.href;
	}

	return {
		get,
		update,
	};
}
