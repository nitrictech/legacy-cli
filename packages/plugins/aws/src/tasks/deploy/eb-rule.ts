import { NitricSchedule } from "@nitric/cli-common";


// Creates a new event bridge rule for the default stack event bridge for a given NitricSchedule
export default function(schedule: NitricSchedule): Record<string, any> {
  // FIXME: Need to set these as constants with normalisation...
  // TODO: Need to add support for additional target types
  const targetDefName = `${schedule.target.name}TopicDef`;
  const scheduleDefName = `${schedule.name}ScheduleDef`

  return {
    [scheduleDefName]: {
      Type: "AWS::Events::Rule",
      Properties: {
        Description: `Nitric schedule trigger for ${schedule.name}`,
        Name: schedule.name,
        ScheduleExpression: `cron(${schedule.expression})`,
        State: "ENABLED",
        Targets: [{
          // Name the schedule target here...
          Arn: {
            'Ref': targetDefName,
          },
          Id: schedule.name,
          Input: JSON.stringify(schedule.event),
        }]
      }
    }
  }
}