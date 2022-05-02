import { in_development_mode } from './internal.ts';

export function setup_routes(api_routes) {
	return api_routes.map(route => ({
		...route,
		controller: route.controller || (async () => ({ data: {}, meta: {} })),
	}));
}

export function setup_config(api_config) {
	return {
		...api_config,

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
	};
}
