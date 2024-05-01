import { ConfigurableModuleBuilder } from '@nestjs/common';
import type * as IORedis from 'ioredis';

const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN: LEADER_ELECTION_OPTION } =
  new ConfigurableModuleBuilder<IORedis.RedisOptions>().build();

export { ConfigurableModuleClass, LEADER_ELECTION_OPTION };
