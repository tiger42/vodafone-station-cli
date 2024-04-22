import { Flags } from '@oclif/core'
import Command from '../base-command'
import { discoverModemIp, ModemDiscovery } from '../modem/discovery'
import { CallLogData } from '../modem/modem'
import { modemFactory } from '../modem/factory'

export default class CallLog extends Command {
  static description = 'Get the current call log in JSON format.';

  static examples = [
    '$ vodafone-station-cli calllog -p PASSWORD'
  ];

  static flags = {
    password: Flags.string({
      char: 'p',
      description: 'router/modem password',
    }),
  };

  async getCallLog(password: string): Promise<CallLogData> {
    const modemIp = await discoverModemIp()
    const discoveredModem = await new ModemDiscovery(modemIp, this.logger).discover()
    const modem = modemFactory(discoveredModem, this.logger)
    try {
      await modem.login(password)
      const callLogData = await modem.callLog()
      return callLogData
    } catch (error) {
      console.error(`Could not fetch call log from modem.`, error)
      throw error
    } finally {
      await modem.logout()
    }
  }

  async run(): Promise<void> {
    const {flags} = await this.parse(CallLog)

    const password = flags.password ?? process.env.VODAFONE_ROUTER_PASSWORD
    if (!password || password === '') {
      this.log(
        'You must provide a password either using -p or by setting the environment variable VODAFONE_ROUTER_PASSWORD'
      )
      this.exit()
    }

    try {
      const callLog = await this.getCallLog(password!)
      const callLogJSON = JSON.stringify(callLog, undefined, 4)

      this.log(callLogJSON)

      this.exit()
    } catch (error) {
      this.error(error as Error, { message: 'Something went wrong' })
    }
  }
}
