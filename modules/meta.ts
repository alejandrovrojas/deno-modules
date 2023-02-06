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
		return Object.assign(meta, get_patched_url(meta_fields.url));
	}

	function update(meta_fields = {}) {
		return Object.assign(meta, meta_fields, get_patched_url(meta_fields.url));
	}

	function get_patched_url(url: string = meta.origin) {
		const url_object = new URL(url);
		const url_object_joined = new URL(url_object.pathname, meta.origin);

		return {
			url: url_object_joined.href,
		};
	}

	return {
		get,
		update,
	};
}
