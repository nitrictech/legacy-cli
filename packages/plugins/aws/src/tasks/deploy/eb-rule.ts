import { NitricSchedule } from "@nitric/cli-common";


// Creates a new event bridge rule for the default stack event bridge for a given NitricSchedule
export default function(schedule: NitricSchedule): Record<string, any> {
  // FIXME: Need to set these as constants with normalisation...
  // TODO: Need to add support for additional target types
  const targetDefName = `${schedule.target.name}TopicDef`;

  return {
    [`${schedule.name}ScheduleDef`]: {
      Type: "AWS::Events::Rule",
      Properties: {
        Description: `Nitric schedule trigger for ${schedule.name}`,
        Name: schedule.name,
        ScheduleExpression: schedule.expression,
        State: "ENABLED",
        Targets: [{
          // Name the schedule target here...
          Arn: {
            'Fn::GetAtt': [targetDefName, 'Arn'],
          },
          Id: schedule.name,
          Input: JSON.stringify(schedule.event),
        }]
      }
    }
  }
}