import { ServerClientOptions, UserServerClientOptions } from '../types.ts';
import { Autoreload } from './autoreload.ts';
import { Router } from './router.ts';
import { SEO } from './seo.ts';
import { Renderer } from './renderer.ts';

import * as Utilities from '../util.ts';

export const default_server_options: ServerClientOptions = {
	port: 3000,

	seo: {
		title: 'Default title',
		description: 'Default description',
		origin: 'https://default.url',
		url: '',
		image: '',
		language: 'no',
		locale: 'nb_NO',
	},

	data: {
		$in_development_mode: Utilities.in_development_mode,
	},

	functions: {
		$print: Utilities.stringify_value,
		$format_sanity_asset: Utilities.format_sanity_image_asset,
		$format_sanity_portable_text: Utilities.format_sanity_portable_text,
	},

	autoreload: {
		watch_directory: 'frontend',
	},

	renderer: {
		frontend_directory: 'frontend',
		import_directory: 'components',
		pages_directory: 'pages',
		templates_directory: 'templates',
		main_template_filename: 'index.html',
	},
};

export function Server(server_options: Partial<UserServerClientOptions>) {
	const options = Utilities.setup_options(server_options, default_server_options);
	const autoreload = Autoreload(options);
	const router = Router(options, autoreload);
	const seo = SEO(options);
	const renderer = Renderer(options, seo);

	Utilities.log(`${options.seo.origin}`, 'server', 'blue');

	autoreload.init();
	router.init();
	seo.init();
	renderer.init();

	return {
		options: options,
		get: router.get,
		post: router.post,
		directory: router.directory,
		serve: router.serve,
		string: renderer.render_string,
		page: renderer.render_page,
		component: renderer.render_component,
		template: renderer.render_template,
		html: renderer.return_html_response,
		json: renderer.return_json_response,
		log: Utilities.log,
	};
}
