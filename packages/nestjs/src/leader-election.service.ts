import { Injectable } from '@nestjs/common';
import { validate, v4, version } from 'uuid';
import type { RedisService } from './redis.service';
import { HEARTBEAT_INTERVAL, TERM_MAXIMUM_FACTOR, TERM_MINIMUM_FACTOR } from './constants';
import { randomNumber } from './utilts';

@Injectable()
export class LeaderElectionService {
  private readonly _nodeId: string;
  private _activeNodes: Record<string, Date> = {};
  private _leaderId: string = ""
  private _electionInProgress = false;
  private _votesForMe = 0;
  // eslint-disable-next-line no-undef
  private _intervals: NodeJS.Timeout[] = [];
  private redisService: RedisService

  constructor(redisService: RedisService) {
    this._nodeId = Object.freeze(v4());
    this.redisService = redisService;
  }

  async onModuleInit() {
    await this.redisService.sendHeartbit(this._nodeId);
    await this.redisService.subscribeToLeaderElectionChannels();

    this.redisService.subscriber.on('message', (channel, message) => {
      if (!this.validateId(message)) {
        switch (channel) {
          case this.redisService.getHeartbitChannel():
            this.handleHeartbitMessage(message);
            break;
          case this.redisService.getClaimLeaderChannel():
            this.handleClaimLeaderMessage(message);
            break;
          case this.redisService.getVoteChannel():
            this.handleVoteMessage(message);
            break;
          case this.redisService.getCallForElectionChannel():
            this.handleCallForElectionMessage(message);
            break;
          default:
            break;
        }
      }
    });

    await this.redisService.callForElection(this._nodeId);

    const heartbitInterval = setInterval(() => {
      this.redisService.sendHeartbit(this._nodeId);
      this.dropInactiveNodes();
    }, HEARTBEAT_INTERVAL);

    const electionInterval = setInterval(() => {
      this.tryToCallForElection();
    }, randomNumber(HEARTBEAT_INTERVAL * TERM_MINIMUM_FACTOR, HEARTBEAT_INTERVAL * TERM_MAXIMUM_FACTOR));

    this._intervals.push(heartbitInterval, electionInterval);
  }

  async onModuleDestroy() {
    this._intervals.forEach((interval) => clearInterval(interval));
  }

  private validateId(id: string): boolean {
    return validate(id) && version(id) === 4;
  }

  private getActiveNetworkSize(): number {
    return Object.values(this._activeNodes).length;
  }

  private getMajorityRequiredSize(): number {
    return Math.floor(this.getActiveNetworkSize() / 2) + 1;
  }

  private handleHeartbitMessage(id: string) {
    this._activeNodes[id] = new Date();
  }

  private handleClaimLeaderMessage(id: string) {
    this._leaderId = id;
    this._electionInProgress = false;
    this._votesForMe = 0;
  }

  private handleVoteMessage(id: string) {
    const isVoteForMe = this._nodeId === id;
    if (isVoteForMe) {
      this._votesForMe++;
    } 
    if (this._electionInProgress) {
      if (this._votesForMe >= this.getMajorityRequiredSize()) {
        this._electionInProgress = false;
        this._votesForMe = 0;
        this.redisService.claimLeader(this._nodeId);
      }
    }
  }

  private handleCallForElectionMessage(id: string) {
    this._electionInProgress = true;
    this.redisService.voteForLeader(id);
  }

  private dropInactiveNodes() {
    const now = new Date();
    Object.keys(this._activeNodes).forEach((id) => {
      const lastHeartbit = this._activeNodes[id];
      if (!lastHeartbit) {
        return;
      }
      if (now.getTime() - lastHeartbit.getTime() > HEARTBEAT_INTERVAL * 2) {
        delete this._activeNodes[id];
      }
    });
  }

  private isLeaderConnected(): boolean {
    this.dropInactiveNodes();
    return !!this._activeNodes[this._leaderId];
  }

  private async tryToCallForElection() {
    if (this._leaderId === null || !this.isLeaderConnected()) {
      await this.redisService.callForElection(this._nodeId);
    }
  }

  public isLeader(): boolean {
    return this._leaderId === this._nodeId;
  }

  public isElectionInProgress(): boolean {
    return this._electionInProgress;
  }
}
