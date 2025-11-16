import {Schema,Endpoint} from "./types";
import {OpenAPIV3} from "openapi-types";
import chalk from "chalk";

export function colorMethod(method: string): string {
    switch (method.toUpperCase()) {
        case 'GET':
            return chalk.green.bold(method);
        case 'POST':
            return chalk.blue.bold(method);
        case 'PUT':
            return chalk.yellow.bold(method);
        case 'DELETE':
            return chalk.red.bold(method);
        case 'PATCH':
            return chalk.magenta.bold(method);
        default:
            return method;
    }
}
export function parseEndpoints(openapi: OpenAPIV3.Document): Endpoint[] {
    const eps: Endpoint[] = [];
    for (const [path, methods] of Object.entries(openapi.paths)) {
        // @ts-ignore
        for (const [method, info] of Object.entries(methods)) {
            const op = info as any;
            const pathParams = (methods as any).parameters || [];

            const methodParams = op.parameters || [];
            const rawParams = [...pathParams, ...methodParams];

            const params = rawParams.map((p: any) => ({
                name: p.name,
                in_: p.in,
                required: p.required,
                description: p.description,
                schema: p.schema
            }));
            const responses = Object.entries(op.responses || {}).map(([code, r]: any) => {
                let description = r.description;
                if (r.$ref) {
                    const refName = r.$ref.replace('#/components/responses/', '');
                    description = (openapi.components?.responses as any)?.[refName]?.description || r.description;
                }
                return {
                    code,
                    description,
                    schema: r.content?.['application/json']?.schema || {}
                };
            });
            eps.push(new Endpoint({
                method: method.toUpperCase(),
                path,
                summary: op.summary || '',
                description: op.description || '',
                // @ts-ignore
                parameters: params,
                // @ts-ignore
                responses,
                // @ts-ignore
                tags: op.tags && op.tags.length > 0 ? op.tags : ['Untagged']
            }));
        }
    }
    return eps;
}

export function parseSchemas(openapi: OpenAPIV3.Document): Schema[] {
    const schemas = openapi.components?.schemas || {};
    return Object.entries(schemas).map(([name, schema]) => new Schema({ name, schema }));
}
