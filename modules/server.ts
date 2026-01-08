import { ServerClientConfig, UserServerClientConfig } from '../types.ts';
import { Autoreload } from './autoreload.ts';
import { Router } from './router.ts';
import { SEO } from './seo.ts';
import { Renderer } from './renderer.ts';

import * as Utilities from '../util.ts';
import * as Env from '../env.ts';

export const default_server_config: ServerClientConfig = {
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
		$in_development_mode: Env.development_mode,
	},

	functions: {
		$print: Utilities.stringify_value,
		$format_sanity_asset: Utilities.format_sanity_image_asset,
		$format_sanity_portable_text: Utilities.format_sanity_portable_text,
	},

	autoreload: {
		enabled: true,
		watch_directory: 'frontend',
	},

	renderer: {
		frontend_directory: 'frontend',
		components_directory: 'components',
		pages_directory: 'pages',
		templates_directory: 'templates',
		main_template_filename: 'index.html',
	},
};

export function Server(server_config: Partial<UserServerClientConfig>) {
	const config = Utilities.setup_server_config(server_config, default_server_config);
	const autoreload = Autoreload(config);
	const router = Router(config, autoreload);
	const seo = SEO(config);
	const renderer = Renderer(config, seo);
	const origin = seo.get().origin;

	Utilities.log(origin, 'server', 'blue');

	autoreload.init();
	router.init();
	seo.init();
	renderer.init();

	return {
		config: config,
		origin: origin,
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
		error: renderer.return_error_response,
	};
}
