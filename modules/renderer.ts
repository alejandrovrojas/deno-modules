import { ServerClientOptions, SEOClient } from '../types.ts';
import * as Utilities from '../util.ts';

import { nano, join_path } from '../dependencies.ts';

export function Renderer(options: ServerClientOptions, seo_client: SEOClient) {
	const { frontend_directory, import_directory, pages_directory, main_template_filename } = options.renderer;
	const base_server_render_data = Object.assign(
		{
			$seo: seo_client.get(),
			$renderer: {
				pages: {},
				main: '',
			},
		},
		options.data,
		options.functions
	);

	function init() {
		if (Utilities.in_development_mode) {
			// Utilities.log(`frontend directory: ./${frontend_directory}`, 'renderer');
			// Utilities.log(`pages directory: ./${pages_directory}`, 'renderer');
			// Utilities.log(`import directory: ./${import_directory}`, 'renderer');
		} else {
			cache_main_template();
			cache_pages_directory();
			cache_import_directory();
		}
	}

	async function cache_import_directory() {
		for await (const template of Deno.readDir(join_path(Deno.cwd(), frontend_directory, import_directory))) {
			base_server_render_data[template.name] = await load_import_template(template.name);
			// Utilities.log(`${import_directory}/${template.name}`, 'cache');
		}
	}

	async function cache_pages_directory() {
		for await (const template of Deno.readDir(join_path(Deno.cwd(), frontend_directory, pages_directory))) {
			base_server_render_data.$renderer.pages[template.name] = await load_page_template(template.name);
			// Utilities.log(`${pages_directory}/${template.name}`, 'cache');
		}
	}

	async function cache_main_template() {
		base_server_render_data.$renderer.main = await load_main_template();
		// Utilities.log(`${main_template_filename}`, 'cache');
	}

	async function load_main_template(): Promise<string> {
		Utilities.log(`read file ./${frontend_directory}/${main_template_filename}`, 'renderer');
		return Deno.readTextFile(join_path(Deno.cwd(), frontend_directory, main_template_filename));
	}

	async function load_page_template(page_template_filename: string): Promise<string> {
		Utilities.log(`read file ./${frontend_directory}/${pages_directory}/${page_template_filename}`, 'renderer');
		return Deno.readTextFile(join_path(Deno.cwd(), frontend_directory, pages_directory, page_template_filename));
	}

	async function load_import_template(import_template_filename: string): Promise<string> {
		Utilities.log(`read file ./${frontend_directory}/${import_directory}/${import_template_filename}`, 'renderer');
		return Deno.readTextFile(join_path(Deno.cwd(), frontend_directory, import_directory, import_template_filename));
	}

	async function render_string(input_string: string, input_data: Record<string, unknown>): Promise<string> {
		const nano_data = Object.assign({}, base_server_render_data, input_data);
		const nano_options = {
			import_directory: join_path(Deno.cwd(), frontend_directory, import_directory),
		};

		if (Utilities.in_development_mode) {
			const object_keys = JSON.stringify(Object.keys(nano_data), null, 3);
			Utilities.log(`${object_keys.replace('[', '{').replace(']', '}')}`, 'nano');
		}

		return await nano(input_string, nano_data, nano_options);
	}

	async function render_page(
		page_template_filename: string,
		page_render_data: Record<string, unknown>,
		page_seo_fields: Record<string, string> = {}
	): Promise<Response> {
		try {
			const cached_main_file = base_server_render_data.$renderer.main;
			const cached_page_file = base_server_render_data.$renderer.pages[page_template_filename];

			const main_template_file = cached_main_file || (await load_main_template());
			const page_template_file = cached_page_file || (await load_page_template(page_template_filename));

			const template_string = main_template_file.replace('<template name="page"></template>', page_template_file);
			const template_data = Object.assign(page_render_data || {}, {
				$seo: seo_client.update(page_seo_fields),
			});

			const rendered_page = await render_string(template_string, template_data);

			return new Response(rendered_page, {
				headers: new Headers({
					'content-type': 'text/html',
					'cache-control': 'no-cache',
				}),
			});
		} catch (error) {
			console.error(error);

			return new Response(error.message);
		}
	}

	async function render_component(
		component_filename: string,
		component_render_data: Record<string, unknown> = {}
	): Promise<string> {
		try {
			const cached_component_file = base_server_render_data[component_filename];
			const component_template_file = cached_component_file || (await load_import_template(component_filename));

			return await render_string(component_template_file, component_render_data);
		} catch (error) {
			console.error(error);
			return error.message;
		}
	}

	return {
		init,
		render_string,
		render_page,
		render_component,
	};
}
