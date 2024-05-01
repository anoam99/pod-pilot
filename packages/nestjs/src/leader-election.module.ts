import { Module } from '@nestjs/common';
import { LeaderElectionService } from './leader-election.service';
import { RedisService } from './redis.service';
import type * as IORedis from 'ioredis';

@Module({})
export class LeaderElectionModule {
  static register(options: IORedis.RedisOptions) {
    const redisService = new RedisService(options);
    return {
      module: LeaderElectionModule,
      providers: [
        {
          provide: RedisService,
          useValue: redisService,
        },
        {
          provide: LeaderElectionService,
          useValue: new LeaderElectionService(redisService),
        },
      ],
      exports: [LeaderElectionService],
    };
  }

  static registerAsync(options: IORedis.RedisOptions) {
    const redisService = new RedisService(options);

    return {
      module: LeaderElectionModule,
      providers: [
        {
          provide: RedisService,
          useValue: new RedisService(options),
        },
        {
          provide: LeaderElectionService,
          useValue: new LeaderElectionService(redisService),
        },
      ],
      exports: [LeaderElectionService],
    };
  }
}
