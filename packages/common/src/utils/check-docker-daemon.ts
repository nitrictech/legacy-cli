import execa from 'execa';

export function checkDockerDaemon(doctorCommand = 'doctor'): void {
	try {
		execa.sync('docker', ['ps']);
	} catch {
		throw new Error(
			`Docker daemon was not found!\nTry using 'nitric ${doctorCommand}' to confirm it is correctly installed, and check that the service is running.`,
		);
	}
}
