import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
	NodeOperationError,
} from 'n8n-workflow';
import Ajv, { JSONSchemaType } from 'ajv';

export class JsonValidator implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Json Validator',
		name: 'jsonValidator',
		icon: { light: 'file:icon.svg', dark: 'file:icon.svg' },
		group: ['transform'],
		version: 1,
		description: 'A node json validator using Ajv (Another JSON validator)',
		defaults: {
			name: 'Json Validator',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		usableAsTool: true,
		properties: [
			// Node properties which the user gets displayed and
			// can change on the node.
			{
				displayName: 'JSON Schema',
				name: 'jsonSchema',
				type: 'json',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: JSON.stringify(
					{
						type: 'object',
						properties: {
							foo: { type: 'integer' },
							bar: { type: 'string' },
						},
						required: ['foo'],
						additionalProperties: false,
					},
					undefined,
					2,
				),
				placeholder: '',
				description:
					'Visit https://ajv.js.org/ or https://JSON-schema.org/ to learn how to describe your validation rules in JSON Schemas',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const jsonSchema = this.getNodeParameter('jsonSchema', 0, '') as string;
		const ajv = new Ajv();
		if (items.length === 0) {
			return [[]];
		}

		if (!jsonSchema) {
			throw new NodeOperationError(this.getNode(), 'Invalid JSON Schema');
		}

		const output: INodeExecutionData[] = [];
		let schema: JSONSchemaType<any>;
		let validate: ReturnType<(typeof ajv)['compile']>;

		try {
			schema = JSON.parse(jsonSchema) as JSONSchemaType<any>;
			validate = ajv.compile(schema);
		} catch (e) {
			throw new NodeOperationError(this.getNode(), 'Invalid JSON Schema');
		}

		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			const data = item.json;

			if (validate(data)) {
				output.push({
					json: data,
					pairedItem: {
						item: i,
					},
				});
			} else {
				// If validation fails, prepare an error message
				const errorMessage = ajv.errorsText(validate.errors, { separator: ', ' });

				if (this.continueOnFail()) {
					output.push({
						json: {
							error: validate.errors,
							message: `Validation failed for item ${i + 1}: ${errorMessage}`,
						},
						pairedItem: {
							item: i,
						},
					});
				} else {
					throw new NodeOperationError(
						this.getNode(),
						`Validation failed for item ${i + 1}: ${errorMessage}`,
						{ itemIndex: i },
					);
				}
			}
		}

		// If validation is successful, return the valid items
		return this.prepareOutputData(output);
	}
}
