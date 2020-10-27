module.exports = {
	parser: '@typescript-eslint/parser',
	plugins: ['@typescript-eslint'],
	settings: {
		node: {
			tryExtensions: ['.js', '.json', '.node', '.ts', '.d.ts'],
		},
	},
	extends: [
		//   'airbnb',
		'eslint:recommended',
		// Disable rules that may conflict with prettier
		'prettier',
		'plugin:@typescript-eslint/eslint-recommended',
		'plugin:@typescript-eslint/recommended',
	],
	rules: {
		// disable the rule for all files
		'@typescript-eslint/camelcase': 'off',
		'no-mixed-spaces-and-tabs': [2, 'smart-tabs'],
		'no-mixed-operators': 'off',
		indent: ['error', 'tab'],
	},
	overrides: [
		{
			// enable the rule specifically for TypeScript files
			files: ['*.ts', '*.tsx'],
			rules: {
				'@typescript-eslint/explicit-function-return-type': ['error'],
			},
		},
	],
};
