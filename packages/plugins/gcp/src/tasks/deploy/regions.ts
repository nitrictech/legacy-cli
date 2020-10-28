const GCR_REGION_MAPPING = {
	us: 'gcr.io',
	northamerica: 'gcr.io',
	asia: 'asia.gcr.io',
	europe: 'eu.gcr.io',
};

export function getGcrHost(region: string): string {
	return GCR_REGION_MAPPING[region.split('-')[0]];
}
