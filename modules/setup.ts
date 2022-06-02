import { Config, DefaultConfig } from '../types.ts';
import { path_join } from '../deps.ts';
import { deep_merge, in_development, nested_portable_text } from '../util.ts';

export function Setup(user_config: Record<string, any>) {
	const default_config: DefaultConfig = {
		port: 3000,

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
			'/style/(.*)',
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

			portable_text: (value: array) => nested_portable_text(value)
		},

		sanity: {
			cdn: !in_development,
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
			directory: '.cache',
		},

		log: {
			level: 'info'
		},
	};

	const config = {
		...deep_merge(default_config, user_config),

		get server_port(): string {
			return in_development ? this.port : 80;
		},

		get origin(): string {
			return in_development ? `http://localhost:${this.server_port}` : this.meta.url;
		},

		get origins_allowed(): string[] {
			return [this.origin];
		}
	} as Config;

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
