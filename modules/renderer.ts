import { ServerClientOptions, SEOClient, SEOOptions } from '../types.ts';
import * as Utilities from '../util.ts';

import { nano, join_path } from '../dependencies.ts';

export function Renderer(options: ServerClientOptions, seo_client: SEOClient) {
	const { frontend_directory, import_directory, pages_directory, main_template_filename } = options.renderer;

	const base_server_render_data = Object.assign(
		{
			$seo: seo_client.get(),
			$server: {
				page: '',
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
		const import_directory_path = join_path(Deno.cwd(), frontend_directory, import_directory);

		for await (const component_template of Deno.readDir(import_directory_path)) {
			base_server_render_data[component_template.name] = await load_import_template(component_template.name);
		}
	}

	async function cache_pages_directory() {
		const pages_directory_path = join_path(Deno.cwd(), frontend_directory, pages_directory);

		for await (const page_template of Deno.readDir(pages_directory_path)) {
			base_server_render_data[`$cache/pages/${page_template.name}`] = await load_page_template(page_template.name);
		}
	}

	async function cache_main_template() {
		base_server_render_data[`$cache/${main_template_filename}`] = await load_main_template();
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

	function return_json_response(repsonse_data: unknown): Response {
		return new Response(JSON.stringify(repsonse_data), {
			headers: new Headers({
				'content-type': 'application/json; charset=utf-8',
				'cache-control': 'no-cache',
			}),
		});
	}

	function return_html_response(response_text: string): Response {
		return new Response(response_text, {
			headers: new Headers({
				'content-type': 'text/html; charset=utf-8',
				'cache-control': 'no-cache',
			}),
		});
	}

	async function render_string(input_string: string, input_data: Record<string, unknown>): Promise<string> {
		const nano_data = Object.assign({}, base_server_render_data, input_data);
		const nano_options = {
			import_directory: join_path(Deno.cwd(), frontend_directory, import_directory),
		};

		if (Utilities.in_development_mode) {
			const object_keys = JSON.stringify(Object.keys(nano_data).sort(), null, 3);
			Utilities.log(`${object_keys.replace('[', '{').replace(']', '}')}`, 'nano');
		}

		return await nano(input_string, nano_data, nano_options);
	}

	async function render_page(
		page_template_filename: string,
		page_render_data: Record<string, unknown>,
		page_seo_options: SEOOptions
	): Promise<Response> {
		try {
			const cached_main_template_file = base_server_render_data[`$cache/${main_template_filename}`];
			const cached_page_template_file = base_server_render_data[`$cache/pages/${page_template_filename}`];

			const template_string = cached_main_template_file || (await load_main_template());

			const page_template_file_absolute_path = join_path(
				Deno.cwd(),
				frontend_directory,
				pages_directory,
				page_template_filename
			);

			const template_data = Object.assign(page_render_data || {}, {
				$seo: seo_client.update(page_seo_options || {}),
				$server: {
					page: cached_page_template_file
						? `$cache/pages/${page_template_filename}`
						: page_template_file_absolute_path,
				},
			});

			const rendered_page = await render_string(template_string, template_data);

			return return_html_response(rendered_page);
		} catch (error) {
			console.error(error);
			return new Response(error.message);
		}
	}

	async function render_component(
		component_filename: string,
		component_render_data: Record<string, unknown> = {}
	): Promise<Response> {
		try {
			const cached_component_file = base_server_render_data[component_filename];
			const component_template_string = cached_component_file || (await load_import_template(component_filename));

			const rendered_component = await render_string(component_template_string, component_render_data);

			return return_html_response(rendered_component);
		} catch (error) {
			console.error(error);
			return new Response(error.message);
		}
	}

	return {
		init,
		return_html_response,
		return_json_response,
		render_string,
		render_page,
		render_component,
	};
}
