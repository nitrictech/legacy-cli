import { Stack } from '../stack';
import { Workspace } from '@nitric/boxygen';
import { baseTsImage } from './typescript-dev';
import { installMembrane } from './membrane';
import { ContainerImage } from '../types';
import os from 'os';

export interface RunTargets {
	[key: string]: {
		cmd: string[];
		volumes: Record<string, string>;
		image: ContainerImage;
	};
}

export const prepareDevImages = async (stack: Stack, logger: (log: string[]) => void): Promise<RunTargets> => {
	let runTargets: RunTargets = {};
	const tsFunctions = stack.getFunctions().filter((f) => f.getDescriptor().handler.endsWith('.ts'));
	//const javaFunctions = stack.getFunctions().filter(f => f.getDescriptor().handler.endsWith('.jar'));
	//const goFunctions = stack.getFunctions().filter(f => f.getDescriptor().handler.endsWith('.go'));
	//const pythonFunctions = stack.getFunctions().filter(f => f.getDescriptor().handler.endsWith('.python'));
	await Workspace.start(
		async (wkspc) => {
			if (tsFunctions.length) {
				// build the dev typescript image
				await wkspc
					.image('node:alpine')
					.apply(baseTsImage)
					.apply(installMembrane('dev'))
					.config({
						env: {
							MIN_WORKERS: '0',
						},
					})
					.commit('nitric-ts-dev');

				// Add to dev run config (we'll start the container with mounted context)
				runTargets = {
					...runTargets,
					...tsFunctions.reduce(
						(acc, f) => ({
							...acc,
							[f.getName()]: {
								cmd: [
									'nodemon',
									os.platform() === 'win32' ? '--legacy-watch' : '--watch',
									'/app/**',
									'--ext',
									'ts,json',
									'--exec',
									`ts-node -T /app/${f.getDescriptor().handler}`,
								],
								volumes: {
									'/app/': f.getContext(),
								},
								image: {
									id: 'nitric-ts-dev',
									name: f.getName(),
								},
							},
						}),
						{} as RunTargets,
					),
				};
			}
		},
		{
			version: 'v0.0.1-rc.3',
			timeout: 10000,
			logger,
		},
	);

	return runTargets;
};
