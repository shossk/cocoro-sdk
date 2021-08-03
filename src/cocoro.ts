import { default as fetchCookie } from 'fetch-cookie';
import nodeFetch from 'node-fetch';
import { StatusCode } from './properties';
import { Device } from './device';
import {
	Box,
	QueryBoxesResponse,
	QueryDevicePropertiesResponse,
} from './responseTypes';
const fetch = fetchCookie(nodeFetch);

export class Cocoro {
	private appSecret: string;
	private appKey: string;

	private isAuthenticated: boolean;
	private apiBase: string;

	constructor(appSecret: string, appKey: string) {
		this.appSecret = appSecret;
		this.appKey = appKey;

		this.isAuthenticated = false;
		this.apiBase = 'https://hms.cloudlabs.sharp.co.jp/hems/pfApi/ta';
	}

	private async sendGETRequest(path) {
		return fetch(`${this.apiBase}${path}`, {
			method: 'get',
			headers: {
				'Content-Type': 'application/json; charset=utf-8',
				'User-Agent':
					'smartlink_v200i Mozilla/5.0 (iPad; CPU OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
			},
		});
	}

	private async sendPOSTRequest(path, body) {
		console.debug('sending post request: ', path, JSON.stringify(body));

		return fetch(`${this.apiBase}${path}`, {
			method: 'post',
			headers: {
				'Content-Type': 'application/json; charset=utf-8',
				'User-Agent':
					'smartlink_v200i Mozilla/5.0 (iPad; CPU OS 14_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
			},
			body: JSON.stringify(body),
		});
	}

	async login() {
		const res = await this.sendPOSTRequest(
			`/setting/login/?appSecret=${this.appSecret}&serviceName=iClub`,
			{
				terminalAppId: `https://db.cloudlabs.sharp.co.jp/clpf/key/${this.appKey}`,
			},
		);

		const jsonRes = await res.json();
		this.isAuthenticated = true;
		return jsonRes;
	}

	/**
	 * Queries all devices, or as sharp sees them, 'boxes'
	 * Returns the raw list of boxes available
	 *
	 * Instead of using this, use `getDevices` to get a clearer picture
	 *
	 * @return     {Promise}  Promise of boxes
	 */
	async queryBoxes(): Promise<[Box]> {
		const res = await this.sendGETRequest(
			`/setting/boxInfo/?appSecret=${this.appSecret}&mode=other`,
		);

		const resParsed = (await res.json()) as QueryBoxesResponse;
		return resParsed.box;
	}

	/**
	 * Queries all properties and status of a device Property describes the
	 * properties and functionality a device has Status describes the actual value
	 * of those properties
	 *
	 * @param      {Box}   {boxId, echonetData}:Box  The box identifier echonet data box
	 * @return     {Promise}  A promise with properties/status
	 */
	async queryBoxProperties({ boxId, echonetData }: Box) {
		const { echonetNode, echonetObject } = echonetData[0];
		const res = await this.sendGETRequest(
			`/control/deviceProperty?boxId=${boxId}&appSecret=${this.appSecret}&echonetNode=${echonetNode}&echonetObject=${echonetObject}&status=true`,
		);
		const resParsed = (await res.json()) as QueryDevicePropertiesResponse;

		return {
			properties: resParsed.deviceProperty.property,
			status: resParsed.deviceProperty.status,
		};
	}

	/**
	 * Queries all available devices in the account
	 *
	 * @return     {Promise<Device[]>}  Array of devices available
	 */
	async queryDevices(): Promise<Device[]> {
		const boxes = await this.queryBoxes();

		const devices: Device[] = [];
		for (const box of boxes) {
			const { properties, status } = await this.queryBoxProperties(box);

			devices.push(
				new Device({
					name: box.echonetData[0].labelData.name,
					deviceId: box.echonetData[0].deviceId,
					echonetNode: box.echonetData[0].echonetNode,
					echonetObject: box.echonetData[0].echonetObject,
					properties: properties,
					status: status,
				}),
			);
		}

		return devices;
	}

	async executeQueuedUpdates(device: Device) {
		const updateMap = Object.keys(device.propertyUpdates).map(
			(key) => device.propertyUpdates[key],
		);

		const body = {
			controlList: [
				{
					deviceId: device.deviceId,
					echonetNode: device.echonetNode,
					echonetObject: device.echonetObject,
					status: updateMap,
				},
			],
		};

		const res = await this.sendPOSTRequest(
			`/control/deviceControl?boxId=https://db.cloudlabs.sharp.co.jp/clpf/key/${this.appKey}&appSecret=${this.appSecret}`,
			body,
		);

		return res.json();
	}
}