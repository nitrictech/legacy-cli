import { NitricAPI, NitricBucket, NitricFunction, NitricSchedule, NitricTopic } from "@nitric/cli-common";
import { cloudrun, pubsub, storage, cloudscheduler, apigateway } from "@pulumi/gcp";

export interface DeployedFunction extends NitricFunction {
  cloudRun: cloudrun.Service;
}

export interface DeployedTopic extends NitricTopic {
  pubsub: pubsub.Topic;
}

export interface DeployedBucket extends NitricBucket {
  storage: storage.Bucket;
}

export interface DeployedSchedule extends NitricSchedule {
  job: cloudscheduler.Job;
}

export interface DeployedApi extends NitricAPI {
  // Return the gateway so we can include it in our output
  gateway: apigateway.Gateway;
}