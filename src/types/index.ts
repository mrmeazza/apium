export interface OperationObject {
    summary?: string;
    description?: string;
    parameters?: Array<any>;
    responses?: Record<string, any>;
    tags?: string[];
}

export type OverviewModeType = 'list' | 'details'


export interface ParameterSchema {
    type?: string;
    enum?: string[];
    format?: string;
}

export class Parameter {
    name:string
    in:any
    required:boolean
    description:string
    schema:ParameterSchema
    // @ts-ignore
    constructor({ name, in_: location, required, description, schema }) {
        this.name = name;
        this.in = location;
        this.required = required;
        this.description = description;
        this.schema = schema;
    }
}
export class Schema {
    name: string;
    schema :any
    // @ts-ignore
    constructor({ name, schema }) {
        this.name = name;
        this.schema = schema;
    }
}

export class Response {
    code: string;
    description: string;
    schema:Schema;
    // @ts-ignore
    constructor({ code, description, schema }) {
        this.code = code;
        this.description = description;
        this.schema = schema;
    }
}
export class Endpoint {
    method:string
    path:string
    summary:string
    description:string
    parameters:Parameter[]
    responses:Response[]
    tags?:any[]
    // @ts-ignore
    constructor({method, path, summary, description, parameters = [],responses=[],tags =[]}) {
        this.method = method;
        this.path = path;
        this.summary = summary || '';
        this.description = description || '';
        this.parameters =parameters ? parameters.map(param =>new Parameter(param)) : [];
        this.responses = responses ?  responses.map(response =>new Response(response)) : [];
        this.tags = tags || []
    }
}