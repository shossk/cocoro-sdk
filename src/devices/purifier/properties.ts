export enum StatusCode {
	STATE_DETAIL = 'F1',
	POWER = '80',
	OPERATION_MODE = 'F3',
}

export enum ValueSingle {
	POWER_ON = '30',
	POWER_OFF = '31',
}

export enum valueBinary {
	POWER_ON = '00030000000000000000000000FF00000000000000000000000000',
	POWER_OFF = '000300000000000000000000000000000000000000000000000000',

	OPERATION_POLLEN = '010100001300000000000000000000000000000000000000000000',
	OPERATION_REALIZE = '010100004000000000000000000000000000000000000000000000',
	OPERATION_AI_AUTO = '010100002000000000000000000000000000000000000000000000',
	OPERATION_AUTO = '010100001000000000000000000000000000000000000000000000',
	OPERATION_NIGHT = '010100001100000000000000000000000000000000000000000000',
	OPERATION_SILENT = '010100001400000000000000000000000000000000000000000000',
	OPERATION_MEDIUM = '010100001500000000000000000000000000000000000000000000',
	OPERATION_HIGH = '010100001600000000000000000000000000000000000000000000',

	HUMIDITY_ON = '000900000000000000000000000000FF0000000000000000000000',
	HUMIDITY_OFF = '000900000000000000000000000000000000000000000000000000',
}

export enum modeCode {
	POLLEN = '13',
	REALIZE = '40',
	AI_AUTO = '20',
	AUTO = '10',
	NIGHT = '11',
	SILENT = '14',
	MEDIUM = '15',
	HIGH = '16',
}

export type modeType =
	| 'ai_auto'
	| 'auto'
	| 'pollen'
	| 'night'
	| 'realize'
	| 'silent'
	| 'medium'
	| 'high';