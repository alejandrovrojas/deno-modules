import { path_join } from '../deps.ts';
import { deep_merge, in_development } from '../util.ts';

export function Setup(user_config: Record<string, any>) {
	const default_config = {
		port: 3000,

		get origin() {
			return in_development ? `http://localhost:${this.port}` : this.meta.url;
		},

		get origins_allowed() {
			return [this.origin];
		},

		meta: {
			title: 'Default title',
			description: 'Default description',
			image: 'assets/default.png',
			url: 'https://production.url.com',
			theme: '#ffffff',
			language: 'no',
			locale: 'nb_NO',
		},

		static: [
			'/assets/(.*)',
			'/static/(.*)',
			'/script/(.*)',
			'/style/(.*)'
		],

		filters: {
			json: (value: object) => {
				return JSON.stringify(value, null, 3);
			},

			escape: (value: string) => {
				const map: Record<string, string> = {
					'&': '&amp;',
					'<': '&lt;',
					'>': '&gt;',
					'"': '&quot;',
					"'": '&#39;',
					'`': '&#x60;',
					'=': '&#x3D;',
					'/': '&#x2F;',
				};

				return value.replace(/[&<>"'`=\/]/g, (s: string) => map[s]);
			},
		},

		sanity: {
			id: '',
			dataset: '',
			version: '',
			cdn: !in_development,
			token: null,
		},

		deploy: {
			base: '',
		},

		framework: {
			template: 'frontend/app/app.html',
			source: 'frontend/',
			components: 'frontend/components/',
			pages: 'frontend/pages/',
			controllers: 'server/controllers/',
		},

		cache: {
			timeout: 1000 * 60,
			directory: '.cache'
		}
	};

	const config = deep_merge(default_config, user_config);

	function fullpath(parts: string[]) {
		const base_path = !in_development ? config.deploy.base : '';
		return path_join(Deno.cwd(), base_path, ...parts);
	}

	return {
		config,
		methods: {
			fullpath,
		},
	};
}
