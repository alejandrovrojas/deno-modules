import { parse_flags } from './dependencies.ts';

export const flags = parse_flags(Deno.args);
export const development_mode = flags.mode === 'development';
