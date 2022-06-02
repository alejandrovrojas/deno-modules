import { flags_parse } from './deps.ts';

export const in_development = flags_parse(Deno.args).mode === 'development';

export function log(message: string, color: string = ''): void {
	console.log('%c' + `[${new Date().toISOString().replace('T', ' ').slice(0, 19)}] → ${message}`, `color:${color}`);
}

export function type_of(value: any): string {
	return Object.prototype.toString.call(value).slice(8, -1).toLowerCase();
}

export function deep_merge(a: Record<string, any>, b: Record<string, any>) {
	const c: Record<string, any> = { ...a };

	for (const key in b) {
		const value_a = a[key];
		const value_b = b[key];
		const type_a = type_of(a[key]);
		const type_b = type_of(b[key]);

		if (type_a === 'array' && type_b === 'array') {
			c[key] = [...value_a, ...value_b];
		} else if (type_a === 'object' && type_b === 'object') {
			c[key] = deep_merge(value_a, value_b);
		} else {
			c[key] = value_b;
		}
	}

	return c;
}

export function nested_portable_text(blocks) {
	function join_adjacent_items(input_array, match_method = (a, b) => a === b) {
		const results = [];

		for (let i = 0; i < input_array.length; i += 1) {
			const joined_matches = find_adjacent_match(input_array, i, input_array[i]);

			if (joined_matches.length > 0) {
				results.push(joined_matches);
				i += joined_matches.length - 1;
			} else {
				results.push(input_array[i]);
			}
		}

		return results;

		function find_adjacent_match(array, index, value) {
			const current = array[index];

			if (current && match_method(current, value)) {
				return [current].concat(find_adjacent_match(array, index + 1, array[index]));
			} else {
				return [];
			}
		}
	}

	function exclude_studio_keys(object) {
		for (const key in object) {
			if (key.startsWith('_')) {
				delete object[key];
			}
		}

		return object;
	}

	function nest_children_by_mark(blocks, mark_defs = []) {
		const mark_match = (a, b) => a.marks[0] === b.marks[0];

		return join_adjacent_items(blocks, mark_match).map(group => {
			const [span] = group;
			const [mark] = span.marks;

			const mark_name = mark || 'text';
			const mark_def = mark_defs.find(def => def._key === mark_name);

			for (const span of group) {
				span.marks.shift();
			}

			const result = {
				type: mark_def ? mark_def._type : mark_name,
				content: mark_name === 'text' ? span.text : nest_children_by_mark(group, mark_defs),
			};

			if (mark_def) {
				result.properties = exclude_studio_keys(mark_def);
			}

			return result;
		});
	}

	function nest_list_items_by_level(list_group) {
		const level_match = (a, b) => a.level > 1 && a.level === b.level;

		return join_adjacent_items(list_group, level_match).map(list_item_group => {
			if (Array.isArray(list_item_group)) {
				const [block] = list_item_group;
				const { level, listItem } = block;

				for (const item_block of list_item_group) {
					item_block.level -= 1;
				}

				if (level > 1) {
					return {
						type: 'list_item',
						content: [
							{
								type: listItem + '_list',
								content: nest_list_items_by_level(list_item_group),
							},
						],
					};
				}

				return list_item_group.map(item => {
					return {
						type: 'list_item',
						content: nest_children_by_mark(item.children, item.markDefs),
					};
				});
			} else {
				return {
					type: 'list_item',
					content: nest_children_by_mark(list_item_group.children, nest_children_by_mark.markDefs),
				};
			}
		});
	}

	function group_list_blocks(blocks) {
		const list_match = (a, b) => {
			const is_block = a._type === 'block' && b._type === 'block';
			const is_list = a.listItem && b.listItem && a.listItem === b.listItem;
			return is_block && is_list;
		};

		return join_adjacent_items(blocks, list_match);
	}

	function map_all_block_types(blocks) {
		return group_list_blocks(blocks).map(block_group => {
			if (Array.isArray(block_group)) {
				const [first] = block_group;
				const { listItem } = first;

				return {
					type: listItem + '_list',
					content: nest_list_items_by_level(block_group),
				};
			}

			if (block_group._type === 'block') {
				return {
					type: 'paragraph',
					content: nest_children_by_mark(block_group.children, block_group.markDefs),
				};
			}

			return {
				type: block_group._type,
				properties: exclude_studio_keys(block_group),
			};
		});
	}

	const DEFAULT_MARKS = ['strong', 'em', 'underline', 'strike-through', 'code'];

	return map_all_block_types(structuredClone(blocks));
}
