import { process, render } from './dependencies.ts';

import api_config from '../api/config.js';
import api_meta from '../api/meta.js';
import api_methods from '../api/methods.js';
import api_routes from '../api/routes.js';

export const in_development_mode = process.mode === 'development';

export const routes = api_routes.map(route => ({
	...route, controller: route.controller || (async () => ({ data: {}, meta: {} })),
}));

export const config = Object.assign(api_config, {
	port: in_development_mode ? api_config.port : 80,

	frontend: 'frontend',
	watch: 'frontend',
	template: 'frontend/app/app.html',
	pages: 'frontend/pages',
	components: 'frontend/components',

	get origin(): string {
		return in_development_mode ? `http://localhost:${this.port}` : api_meta.url;
	},

	get origins_allowed(): string[] {
		return [this.origin];
	},
});

export function app_meta(route_meta: object, route_url: URL) {
	const computed_meta = {
		url: config.origin + route_url.pathname,
	};

	return {
		...api_meta,
		...route_meta,
		...computed_meta,
	};
}

export function app_render(template: string, data: object) {
	const render_options = {
		show_comments: false,
		import_path: config.components,
	};

	return render(template, data, api_methods, render_options);
}
