import {Flags} from '@oclif/core';

import Command, {ipFlag} from '../base-command';
import {Log} from '../logger';
import {discoverModemLocation, DiscoveryOptions, ModemDiscovery} from '../modem/discovery';
import {modemFactory} from '../modem/factory';
import {CallLogData} from '../modem/modem';

export default class CallLog extends Command {
  static description = 'Get the current call log in JSON format.';
  static examples = [
    '$ vodafone-station-cli calllog -p PASSWORD',
    '$ vodafone-station-cli calllog -p PASSWORD --ip 192.168.100.1',
  ];
  static flags = {
    ip: ipFlag(),
    password: Flags.string({
      char: 'p',
      description: 'router/modem password',
    }),
  };

  async getCallLog(password: string, logger: Log, discoveryOptions?: DiscoveryOptions): Promise<CallLogData> {
    const modemLocation = await discoverModemLocation(discoveryOptions);
    const discoveredModem = await new ModemDiscovery(modemLocation, logger).discover();
    const modem = modemFactory(discoveredModem, this.logger);

    try {
      await modem.login(password);
      const callLogData = await modem.callLog();
      return callLogData;
    } catch (error) {
      logger.warn('Could not fetch call log from modem.');
      logger.error(error as Error);
      throw error;
    } finally {
      await modem.logout();
    }
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(CallLog);

    const password = flags.password ?? process.env.VODAFONE_ROUTER_PASSWORD;
    if (!password || password === '') {
      this.log('You must provide a password either using -p or by setting the environment variable VODAFONE_ROUTER_PASSWORD');
      this.exit();
    }

    const discoveryOptions: DiscoveryOptions = {
      ip: flags.ip,
    };

    try {
      const callLog = await this.getCallLog(password!, this.logger, discoveryOptions);
      const callLogJSON = JSON.stringify(callLog, undefined, 4);

      this.log(callLogJSON);

      this.exit();
    } catch (error) {
      this.error(error as Error, {message: 'Something went wrong'});
    }
  }
}
