import { default as fetchCookie } from 'fetch-cookie';
import nodeFetch from 'node-fetch';
import {
	BinaryPropertyStatus,
	DeviceType,
	Property,
	PropertyStatus,
	RangePropertyStatus,
	RangePropertyType,
	SinglePropertyStatus,
	SingleProperty,
	RangeProperty,
	BinaryProperty,
	StatusCode,
	ValueSingle,
	ValueType,
} from './properties';
import { Box } from './responseTypes';
import { State8 } from './state';
const fetch = fetchCookie(nodeFetch);

interface DeviceInit {
	name: string;
	kind: DeviceType;
	deviceId: number;
	echonetNode: string;
	echonetObject: string;

	properties: Property[];
	status: PropertyStatus[];

	maker: string;
	model: string;
	serialNumber: string;

	box: Box;
}
/**
 * This class describes a device as represented by the Cocoro API
 * Each device has numerous properties that can or can not be queried, set or updated
 * Each device also contains the status of those properties
 *
 * @class      Device (name)
 */
export class Device {
	name: string;
	kind: DeviceType;
	deviceId: number;
	echonetNode: string;
	echonetObject: string;

	readonly properties: Property[];
	status: PropertyStatus[];

	propertyUpdates: any;
	maker: string;
	model: string;
	serialNumber: string;

	box: Box;

	constructor({
		name,
		kind,
		deviceId,
		echonetNode,
		echonetObject,
		properties,
		status,
		maker,
		model,
		serialNumber,
		box,
	}: DeviceInit) {
		this.name = name;
		this.kind = kind;
		this.deviceId = deviceId;
		this.echonetNode = echonetNode;
		this.echonetObject = echonetObject;
		this.properties = properties;
		this.status = status;

		this.propertyUpdates = {};

		this.maker = maker;
		this.model = model;
		this.serialNumber = serialNumber;
		this.box = box;
	}

	/**
	 * Queues a specific propertyStatus for change
	 * This alone does not do anything, the changes need to get transmitted to the
	 * cocoro air api
	 *
	 * @param      {PropertyStatus}  propertyStatus  The property status
	 */
	queuePropertyStatusUpdate(propertyStatus: PropertyStatus): void {
		for (const property of this.properties) {
			if (property.statusCode !== propertyStatus.statusCode) {
				continue;
			}

			if (property.set !== true) {
				throw new Error(`property ${property.statusName} is not settable`);
			}

			this.propertyUpdates[property.statusCode] = propertyStatus;
			return;
		}

		throw new Error(
			`property ${propertyStatus.statusCode} does not exist on this device`,
		);
	}

	/**
	 * Returns a property from the device if it exists, null otherwise
	 *
	 * @param      {(StatusCode|string)}  statusCode  The status code to query
	 * @return     {Property|null}        The property.
	 */
	getProperty(statusCode: StatusCode | string): Property | null {
		for (const property of this.properties) {
			if (property.statusCode === statusCode) {
				switch (property.valueType) {
					case ValueType.SINGLE:
						return property as SingleProperty;
					case ValueType.RANGE:
						return property as RangeProperty;
					case ValueType.BINARY:
						return property as BinaryProperty;
				}
			}
		}

		return null;
	}

	/**
	 * Returns a property status from the device if it exists, null otherwise
	 *
	 * @param      {(StatusCode|string)}  statusCode  The status code
	 * @return     {PropertyStatus|null}  The property status.
	 */
	getPropertyStatus(statusCode: StatusCode | string): PropertyStatus | null {
		for (const status of this.status) {
			if (status.statusCode === statusCode) {
				switch (status.valueType) {
					case ValueType.SINGLE:
						return status as SinglePropertyStatus;
					case ValueType.RANGE:
						return status as RangePropertyStatus;
					case ValueType.BINARY:
						return status as BinaryPropertyStatus;
				}
			}
		}

		return null;
	}

	/**
	 * Helper method to fetch the state-object 8 from the device
	 * This wraps getPropertyStatus, parsing and instantiating State8
	 *
	 * @return     {State8}  The state 8.
	 */
	getState8(): State8 {
		const state8Bin = this.getPropertyStatus(
			StatusCode.STATE_DETAIL,
		) as BinaryPropertyStatus;

		return new State8(state8Bin.valueBinary.code);
	}

	/**
	 * Gets the temperature.
	 *
	 * @return     {number}  The temperature.
	 */
	getTemperature(): number {
		return this.getState8().temperature;
	}

	/**
	 * Gets the room temperature.
	 *
	 * @return     {number}  The temperature.
	 */
	getRoomTemperature(): number {
		return parseInt(
			(
				this.getPropertyStatus(
					StatusCode.ROOM_TEMPERATURE,
				) as RangePropertyStatus
			).valueRange.code,
		);
	}

	/**
	 * Gets the windspeed.
	 *
	 * @return     {ValueSingle}  The windspeed.
	 */
	getWindspeed() {
		const ws = this.getPropertyStatus(
			StatusCode.WINDSPEED,
		) as SinglePropertyStatus;
		return ws.valueSingle.code;
	}

	/**
	 * Queues a temperature update
	 *
	 * @param      {number}  temp    The new temperature
	 */
	queueTemperatureUpdate(temp: number): void {
		const s8 = new State8();
		s8.temperature = temp;

		this.queuePropertyStatusUpdate({
			valueBinary: {
				code: s8.state,
			},
			statusCode: StatusCode.STATE_DETAIL,
			valueType: ValueType.BINARY,
		});
	}

	/**
	 * Queues a power on action
	 */
	queuePowerOn(): void {
		this.queuePropertyStatusUpdate({
			valueSingle: {
				code: ValueSingle.POWER_ON,
			},
			statusCode: StatusCode.POWER,
			valueType: ValueType.SINGLE,
		});
	}

	/**
	 * Queues a power off action
	 */
	queuePowerOff(): void {
		this.queuePropertyStatusUpdate({
			valueSingle: {
				code: ValueSingle.POWER_OFF,
			},
			statusCode: StatusCode.POWER,
			valueType: ValueType.SINGLE,
		});
	}

	/**
	 * Queues operation mode update
	 */
	queueOperationModeUpdate(
		mode:
			| ValueSingle.OPERATION_OTHER
			| ValueSingle.OPERATION_AUTO
			| ValueSingle.OPERATION_COOL
			| ValueSingle.OPERATION_HEAT
			| ValueSingle.OPERATION_DEHUMIDIFY
			| ValueSingle.OPERATION_VENTILATION,
	) {
		this.queuePropertyStatusUpdate({
			valueSingle: {
				code: mode,
			},
			statusCode: StatusCode.OPERATION_MODE,
			valueType: ValueType.SINGLE,
		});
	}

	/**
	 * Queues windspeed  update
	 */
	queueWindspeedUpdate(
		mode:
			| ValueSingle.WINDSPEED_LEVEL_1
			| ValueSingle.WINDSPEED_LEVEL_2
			| ValueSingle.WINDSPEED_LEVEL_3
			| ValueSingle.WINDSPEED_LEVEL_4
			| ValueSingle.WINDSPEED_LEVEL_5
			| ValueSingle.WINDSPEED_LEVEL_6
			| ValueSingle.WINDSPEED_LEVEL_7
			| ValueSingle.WINDSPEED_LEVEL_8
			| ValueSingle.WINDSPEED_LEVEL_AUTO,
	) {
		this.queuePropertyStatusUpdate({
			valueSingle: {
				code: mode,
			},
			statusCode: StatusCode.WINDSPEED,
			valueType: ValueType.SINGLE,
		});
	}
}
