import {
	IDataObject,
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
				displayName: 'Data Path to Validate',
				name: 'dataPathToValidate',
				type: 'string',
				default: '',
				description:
					'The name of the field containing the data to validate. The field must contain a valid JSON object.',
				placeholder: 'e.g. output, data, payload, json, etc.',
				requiresDataPath: 'single',
			},
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
				placeholder: 'JSON Schema',
				description:
					'Visit https://ajv.js.org/ or https://JSON-schema.org/ to learn how to describe your validation rules in JSON Schemas',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items: INodeExecutionData[] = this.getInputData();
		// Get the data to validate from the node parameters
		const dataPathToValidate = this.getNodeParameter('dataPathToValidate', 0, '') as string;
		// Get the JSON Schema from the node parameters
		const jsonSchema = this.getNodeParameter('jsonSchema', 0, '') as string;
		const ajv: Ajv = new Ajv();
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
			const item: INodeExecutionData = items[i];
			let data: IDataObject = item.json;
			if (dataPathToValidate) {
				data = <IDataObject>item.json[dataPathToValidate];
			}

			if (validate(data)) {
				if(dataPathToValidate){
					// If dataPathToValidate is provided, ensure the output structure matches
					data = { [dataPathToValidate]: data };
				}

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
