import { in_development } from '../global/util.ts';
export const default_setup = {
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

	framework: {
		template: 'frontend/app/app.html',
		source: 'frontend/',
		components: 'frontend/components/',
		pages: 'frontend/pages/',
		controllers: 'server/controllers/',
	},
};
