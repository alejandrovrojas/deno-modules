const default_meta_fields = {
	title: 'Default title',
	description: 'Default description',
	url: 'http://prod.url',
	image: '/assets/preview.png',
	language: 'no',
	locale: 'nb_NO',
};

export default function seo(meta_fields) {
	const meta = Object.assign(default_meta_fields, meta_fields);

	function get() {
		return meta;
	}

	function update(new_fields) {
		return Object.assign(meta, new_fields);
	}

	return {
		get,
		update,
	};
}
