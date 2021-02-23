import { resources, logic, web } from '@pulumi/azure-nextgen';
import { NitricSchedule } from '@nitric/cli-common';
import { DeployedTopic } from '../types';
//import cronParser from "cron-parser";


// The plan here is to eventually support Nitric Schedules as part of
// our azure deployments, however they do not support cron based recurring schedule triggers
// NOTE: This is supported by both AWS and GCP, either we need to attempt to translate into their
// language for recurrence by parsing the cron expression or look at raising feature requests for
// microsoft to implement CRONTAB expressions for azure logic apps (the same way they do for function triggers currently)
export function createSchedule(
	resourceGroup: resources.latest.ResourceGroup,
	schedule: NitricSchedule,
	topics: DeployedTopic[],
): logic.latest.Workflow {
	//const normalizedSchedule = cronParser.parseExpression(schedule.expression);

	//normalizedSchedule.fields.

	// Create a new connection for the topic (eventgrid push from logic apps)
	// It has a Display Name
	// It has a Topic Endpoint (the endpoint of the eventgrid topic)
	// It has an SAS (Share access signature) ("Provide your SAS Key")
	new web.latest.Connection("", {
		connectionName: "",
		resourceGroupName: resourceGroup.name,
		properties: {

		}
	})

	topics[0].eventGridTopic.endpoint
	return new logic.latest.Workflow(schedule.name, {
		resourceGroupName: resourceGroup.name,
		workflowName: schedule.name,
		definition: {
			[`$schema`]: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',

			actions: {
				// Publish to the given topic
				Publish_Event: {
					inputs: {
						body: [
							{
								data: {},
								eventType: 'test',
								id: 'test',
								subject: 'test',
							},
						],
						host: {
							connection: {
								name: "@parameters('$connections')['azureeventgridpublish']['connectionId']",
							},
						},
						method: 'post',
						path: '/eventGrid/api/events',
					},
					runAfter: {},
					type: 'ApiConnection',
				},
			},
			// Define triggers here...
			triggers: {
				// Name of the trigger as a key
				schedule: {
					//type: "Recurrence",
					//recurrence: {
					//	"frequency": "<time-unit>",
					//	"interval": <number-of-time-units>
					//},
				},
			},
		},
		parameters: {
			$connections: {
				value: {
					// TODO: need to create a logic app connector for this...
					// See above web.connection example
					azureeventgridpublish: {
						connectionId:
							'/subscriptions/68ac0a02-02c1-4144-a45c-57b3b6f36d2e/resourceGroups/testing/providers/Microsoft.Web/connections/azureeventgridpublish',
						connectionName: 'azureeventgridpublish',
						id:
							'/subscriptions/68ac0a02-02c1-4144-a45c-57b3b6f36d2e/providers/Microsoft.Web/locations/eastus/managedApis/azureeventgridpublish',
					},
				},
			},
		},
	});
}
