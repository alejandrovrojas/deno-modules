import { config } from './internal.ts';

async function read_templates() {
	const template_main: string = await Deno.readTextFile(config.template);
	const template_pages: Record<string, string> = {};

	for await (const page of Deno.readDir(config.pages)) {
		template_pages[page.name] = await Deno.readTextFile(`${config.pages}/${page.name}`);
	}

	return { template_main, template_pages };
}

export { read_templates };
