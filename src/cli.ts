#!/usr/bin/env node
import readline from 'node:readline';
import tty from 'node:tty';

import chalk from 'chalk';
import yaml from 'js-yaml';
import fs from 'node:fs';
import {Endpoint, OverviewModeType, Schema} from "./types";
import { OpenAPIV3 } from "openapi-types";

import {version, name} from '../package.json'
import {parseEndpoints, parseSchemas,colorMethod} from "./utils";

const VERSION = `${name} ${version}`;

class ApiumShell {
    openapi: OpenAPIV3.Document
    endpoints: Endpoint[];
    schemas: Schema[];
    methods: string[];
    currentMethodIndex: number;
    selectedEndpointIndex: number;
    keyInput: any
    mode: OverviewModeType = 'list';

    constructor(openapi: OpenAPIV3.Document) {
        this.openapi = openapi;
        this.endpoints = parseEndpoints(openapi);
        this.schemas = parseSchemas(openapi);
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

    renderLine(){
        const width = process.stdout.columns || 50;
        if (width <= 2) {
            console.log('─');
            return;
        }
        console.log('+' + '-'.repeat(width - 2) + '+');
    }



    renderHeader() {
        this.renderLine()
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
                return `[${colorMethod(m)}]`;
            } else {
                return chalk.bold(` ${m} `);
            }
        }).join(' ');
        console.log(tabs);
        this.renderLine()
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
        const termWidth = process.stdout.columns || 80;
        const footerText = ' ← → to switch methods • ↑ ↓ to navigate • Enter for details • q to quit '
        console.log(chalk.white.bold(footerText.toUpperCase()))
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
        console.log()
        this.renderLine()
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

        this.renderLine()
        console.log(chalk.white.bold(' Press any key to return... '.toUpperCase()))
        const backToList = (_: string, key: readline.Key) => {
            this.keyInput.removeListener('keypress', backToList);
            this.mode = 'list';
            this.render();
        };
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