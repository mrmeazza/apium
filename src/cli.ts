#!/usr/bin/env node
import readline from 'node:readline';
import tty from 'node:tty';

import chalk from 'chalk';
import yaml from 'js-yaml';
import fs from 'node:fs';
import {Endpoint, Schema} from "./models";
import { OpenAPIV3 } from "openapi-types";

import {version, name} from '../package.json'
import HttpMethods = OpenAPIV3.HttpMethods;

const VERSION = `${name} ${version}`;

const ALLOWED_METHODS:HttpMethods[] =Object.values(HttpMethods).filter(value =>['get', 'post', 'put', 'patch','delete','head'].includes(value))

function colorMethod(method: string): string {
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


interface OperationObject {
    summary?: string;
    description?: string;
    parameters?: Array<any>;
    responses?: Record<string, any>;
    tags?: string[];
}


class ApiumShell {
    openapi: OpenAPIV3.Document
    endpoints: Endpoint[];
    schemas: Schema[];
    methods: string[];
    currentMethodIndex: number;
    selectedEndpointIndex: number;
    keyInput: any
    mode: 'list' | 'details' = 'list';

    constructor(openapi: OpenAPIV3.Document) {
        this.openapi = openapi;
        this.endpoints = this.parseEndpoints(openapi);
        this.schemas = this.parseSchemas(openapi);
        const allMethods = new Set<string>();
        this.endpoints.forEach(e => {
            allMethods.add(e.method.toUpperCase());
        });
        this.methods = [ ...Array.from(allMethods).sort()];
        this.currentMethodIndex = 0;
        this.selectedEndpointIndex = 0;

        if (process.stdin.isTTY) {
            this.keyInput = process.stdin;
        } else {
            const fd = fs.openSync('/dev/tty', 'r+');
            this.keyInput = new tty.ReadStream(fd);
        }
        readline.emitKeypressEvents(this.keyInput);
        if (typeof (this.keyInput as any).setRawMode === 'function') (this.keyInput as any).setRawMode(true);
        this.keyInput.on('keypress', (_: any, key: readline.Key) => this.handleKey(key));
    }

    parseEndpoints(openapi: OpenAPIV3.Document): Endpoint[] {
        const eps: Endpoint[] = [];
        for (const [path,methods] of Object.entries(openapi.paths)) {
            // @ts-ignore
            for (const [method, info] of Object.entries(methods)) {
                const op = info as OperationObject;
                const params = (op.parameters || []).map(p => ({
                    name: p.name,
                    in_: p.in,
                    required: p.required,
                    description: p.description,
                    schema: p.schema
                }));
                const responses = Object.entries(op.responses || {}).map(([code, r]) => {
                    let responseRef
                    let description = r.description;
                    if ( r.$ref) {
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
                    method:method.toUpperCase(),
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

    parseSchemas(openapi: OpenAPIV3.Document): Schema[] {
        const schemas = openapi.components?.schemas || {};
        return Object.entries(schemas).map(([name, schema]) => new Schema({name, schema}));
    }

    render() {
        console.clear();
        this.renderHeader();
        this.renderTabs();
        this.renderEndpoints();
        const totalRows = process.stdout.rows || 24;
        const filteredEndpoints = this.methods[this.currentMethodIndex] === 'All' ? this.endpoints : this.endpoints.filter(e => e.method === this.methods[this.currentMethodIndex]);
        const linesPrinted = 3 + filteredEndpoints.length;
        const emptyLines = Math.max(0, totalRows - linesPrinted - 6);
        console.log('\n'.repeat(emptyLines));
        this.renderFooter();
    }

    renderHeader() {
        const title = this.openapi.info?.title || 'OpenAPI';
        const version = this.openapi.info?.version || '';
        const headerText = `${title} ${version}`.trim();
        const termWidth = process.stdout.columns || 80;
        const padding = Math.max(0, Math.floor((termWidth - headerText.length) / 2));
        console.log(' '.repeat(padding) + `\x1b[1m${headerText}\x1b[0m\n`);
    }

    renderTabs() {
        const tabs = this.methods.map((m, i) => {
            if (i === this.currentMethodIndex) {
                return `[${chalk.bgBlue.white.bold(m)}]`;
            } else {
                return chalk.bold(` ${m} `);
            }
        }).join(' ');
        console.log(tabs);
        console.log('-'.repeat(process.stdout.columns || 50));
    }

    renderEndpoints() {
        const filtered = this.methods[this.currentMethodIndex] === 'All' ? this.endpoints : this.endpoints.filter(e => e.method === this.methods[this.currentMethodIndex]);
        filtered.forEach((e, i) => {
            const prefix = i === this.selectedEndpointIndex ? '→' : ' ';
            const lineText = `${prefix}${colorMethod(e.method)} ${e.path}  `
            if (i === this.selectedEndpointIndex) {
                const hilightText = `${lineText} `
                console.log(chalk.bgBlackBright.bold(hilightText));

            } else {
                console.log(lineText);
            }
        });
    }

    renderFooter() {
        console.log(chalk.bgBlackBright.bold('\n ← → to switch methods • ↑ ↓ to navigate • Enter for details • q to quit '))
        this.renderVersion();
    }

    renderVersion() {
        const termWidth = process.stdout.columns || 80;
        const termHeight = process.stdout.rows - 1 || 24;
        const padding = Math.max(0, termWidth - VERSION.length - 1);
        process.stdout.write(`\x1b[${termHeight};1H`);
        console.log(' '.repeat(padding) + chalk.dim(VERSION));
    }

    handleKey(key: readline.Key) {
        const filtered = this.methods[this.currentMethodIndex] === 'All' ? this.endpoints : this.endpoints.filter(e => e.method === this.methods[this.currentMethodIndex]);
        if (this.mode === 'list') {
            if (key.name === 'left') {
                this.currentMethodIndex = (this.currentMethodIndex - 1 + this.methods.length) % this.methods.length;
                this.selectedEndpointIndex = 0;
            }
            if (key.name === 'right') {
                this.currentMethodIndex = (this.currentMethodIndex + 1) % this.methods.length;
                this.selectedEndpointIndex = 0;
            }
            if (key.name === 'up') {
                this.selectedEndpointIndex = (this.selectedEndpointIndex - 1 + filtered.length) % filtered.length;
            }
            if (key.name === 'down') {
                this.selectedEndpointIndex = (this.selectedEndpointIndex + 1) % filtered.length;
            }
            if (key.name === 'return') {
                this.showEndpointDetails(filtered[this.selectedEndpointIndex]);
                return;
            }
        }
        if (key.name === 'q' || (key.ctrl && key.name === 'c')) {
            console.log('bye!')
            process.exit();
        }
        this.render();
    }

    showEndpointDetails(endpoint: Endpoint) {
        console.clear();
        this.renderHeader()
        console.log(`${colorMethod(endpoint.method)} ${endpoint.path}`);
        console.log(chalk.bold('Description:'), endpoint.description || endpoint.summary);
        if (endpoint.tags && endpoint.tags.length > 0) {
            console.log()
            console.log(chalk.bold('Tags:'), endpoint.tags.map((tag: string) => {
                return `${chalk.bgMagenta.bold(' ' + tag.toUpperCase() + ' ')}`
            }).join(' '));
        }
        if (endpoint.parameters.length) {
            console.log(chalk.bold('\nParameters:'));
            endpoint.parameters.forEach(p => {
                let typeLabel = 'string';
                const schema = p.schema as any;
                if (schema?.$ref) {
                    const refName = schema.$ref.replace('#/components/schemas/', '');
                    const refSchema = (this.openapi.components?.schemas as any)?.[refName];

                    if (refSchema?.type) typeLabel = refSchema.type;
                    else if (refSchema?.properties) typeLabel = 'object';
                    else typeLabel = 'unknown';
                } else if (schema?.type) {
                    typeLabel = schema.type;
                }

                console.log(`  • [${p.in}] ${p.name} (${chalk.yellow(typeLabel)}) ${p.required ? chalk.red.bold('(required)') : ''}`);

                if (p.description) console.log(`    ${chalk.bold(p.description)}`);

                if (schema?.enum) {
                    console.log()
                    console.log('   ', chalk.bgBlackBright.bold(' ENUM '))
                    schema.enum.forEach((e: unknown) => {
                        console.log(chalk.bold('      •', e))
                    })
                    console.log()
                } else if (schema?.$ref) {
                    const refName = schema.$ref.replace('#/components/schemas/', '');
                    const refSchema = (this.openapi.components?.schemas as any)?.[refName];
                    if (refSchema?.enum) {
                        console.log()
                        console.log('   ', chalk.bgBlackBright.bold(' ENUM '))
                        refSchema.enum.forEach((e: unknown) => {
                            console.log(chalk.bold('      •', e))
                        })
                        console.log()
                    }
                }
            });
        }

        console.log(chalk.bold('\nResponses:'))
        endpoint.responses.forEach(r => {
            let code = r.code;
            if (code.startsWith('2')) code = chalk.green.bold(code);
            else if (code.startsWith('3')) code = chalk.cyan.bold(code);
            else if (code.startsWith('4')) code = chalk.yellow.bold(code);
            else if (code.startsWith('5')) code = chalk.red.bold(code);
            else code = chalk.bold(code)

            console.log(`  ${code}: ${r.description}`);
        });

        console.log(chalk.bgBlackBright.bold('\n Press any key to return... '))
        const backToList = (_: string, key: readline.Key) => {
            this.keyInput.removeListener('keypress', backToList);
            this.mode = 'list';
            this.render();
        };
        this.renderVersion()
        this.mode = 'details';
        this.keyInput.on('keypress', backToList);
    }
}

async function main() {
    let stdinData = '';
    for await (const chunk of process.stdin) stdinData += chunk.toString();
    let openapi;
    try {
        openapi = yaml.load(stdinData);
    } catch (err: unknown) {
        if (err instanceof Error) {
            console.error('Error parsing OpenAPI:', err.message);
        } else console.error(err);
        process.exit(1);
    }

    const apium = new ApiumShell(openapi as OpenAPIV3.Document);
    apium.render();
    process.stdin.resume();
}

main();