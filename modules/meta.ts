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

	function get(new_meta_fields = {}) {
		let new_meta = Object.assign(meta, new_meta_fields);

		if (new_meta_fields.url) {
			const url = new URL(new_meta_fields.url);
			new_meta.url = new URL(url.pathname, meta.origin);
		}

		return new_meta;
	}

	return {
		get,
	};
}
