"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JsonValidator = void 0;
const n8n_workflow_1 = require("n8n-workflow");
const ajv_1 = __importDefault(require("ajv"));
class JsonValidator {
    constructor() {
        this.description = {
            displayName: 'Json Validator',
            name: 'jsonValidator',
            group: ['transform'],
            version: 1,
            description: 'A node json validator using Ajv (Another JSON validator)',
            defaults: {
                name: 'Json Validator',
            },
            inputs: ["main"],
            outputs: ["main"],
            usableAsTool: true,
            properties: [
                {
                    displayName: 'JSON Schema',
                    name: 'jsonSchema',
                    type: 'json',
                    typeOptions: {
                        alwaysOpenEditWindow: true,
                    },
                    default: JSON.stringify({
                        type: 'object',
                        properties: {
                            foo: { type: 'integer' },
                            bar: { type: 'string' },
                        },
                        required: ['foo'],
                        additionalProperties: false,
                    }, undefined, 2),
                    placeholder: '',
                    description: 'Visit https://ajv.js.org/ or https://JSON-schema.org/ to learn how to describe your validation rules in JSON Schemas',
                },
            ],
        };
    }
    async execute() {
        const items = this.getInputData();
        const jsonSchema = this.getNodeParameter('jsonSchema', 0, '');
        const ajv = new ajv_1.default();
        if (items.length === 0) {
            return [[]];
        }
        if (!jsonSchema) {
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Invalid JSON Schema');
        }
        const output = [];
        let schema;
        let validate;
        try {
            schema = JSON.parse(jsonSchema);
            validate = ajv.compile(schema);
        }
        catch (e) {
            throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Invalid JSON Schema');
        }
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const data = item.json;
            if (validate(data)) {
                output.push(item);
            }
            else {
                const errorMessage = ajv.errorsText(validate.errors, { separator: ', ' });
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Validation failed for item ${i + 1}: ${errorMessage}`);
            }
        }
        return this.prepareOutputData(output);
    }
}
exports.JsonValidator = JsonValidator;
//# sourceMappingURL=JsonValidator.node.js.map