import { Injectable } from '@nestjs/common';
import * as IORedis from 'ioredis';
import {
  CALL_FOR_ELECTION,
  CLAIM_LEADER_CHANNEL,
  HEARTBIT_CHANNEL,
  LEADER_ELECTION_REDIS_PREFIX,
  VOTE_CHANNEL,
} from './constants';

@Injectable()
export class RedisService {
  private _config: IORedis.RedisOptions;
  private _client: IORedis.Redis;
  public subscriber: IORedis.Redis;
  constructor(config: IORedis.RedisOptions) {
    this._client = new IORedis.Redis(config);
    this._config = config;
    this.subscriber = new IORedis.Redis(config);
  }


  public getHeartbitChannel() {
    return `${LEADER_ELECTION_REDIS_PREFIX}:${HEARTBIT_CHANNEL}`;
  }

  public getClaimLeaderChannel() {
    return `${LEADER_ELECTION_REDIS_PREFIX}:${CLAIM_LEADER_CHANNEL}`;
  }

  public getVoteChannel() {
    return `${LEADER_ELECTION_REDIS_PREFIX}:${VOTE_CHANNEL}`;
  }

  public getCallForElectionChannel() {
    return `${LEADER_ELECTION_REDIS_PREFIX}:${CALL_FOR_ELECTION}`;
  }

  public async sendHeartbit(nodeId: string) {
    await this._client.publish(this.getHeartbitChannel(), nodeId);
  }

  public async claimLeader(nodeId: string) {
    await this._client.publish(this.getClaimLeaderChannel(), nodeId);
  }

  public async voteForLeader(nodeId: string) {
    await this._client.publish(this.getVoteChannel(), nodeId);
  }

  public async callForElection(nodeId: string) {
    await this._client.publish(this.getCallForElectionChannel(), nodeId);
  }

  public async subscribeToLeaderElectionChannels() {
    await this.subscriber.subscribe(
      this.getHeartbitChannel(),
      this.getClaimLeaderChannel(),
      this.getVoteChannel(),
      this.getCallForElectionChannel()
    );
  }
}
