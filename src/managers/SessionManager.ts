import { ContextSWInterface } from "../models/ContextSW";
import { PushDeviceRecord } from "../models/PushDeviceRecord";
import { UpsertSessionPayload, DeactivateSessionPayload, SessionOrigin } from "../models/Session";
import MainHelper from "../helpers/MainHelper";
import Log from "../libraries/Log";
import { WorkerMessengerCommand } from "../libraries/WorkerMessenger";

export class SessionManager {
  private context: ContextSWInterface;

  constructor(context: ContextSWInterface) {
    this.context = context;
  }

  public async notifySWToUpsertSession(
    deviceId: string | undefined,
    deviceRecord: PushDeviceRecord,
    sessionOrigin: SessionOrigin
  ): Promise<void> {
    Log.debug("Notify SW to upsert session");
    const payload: UpsertSessionPayload = {
      deviceId,
      deviceRecord: deviceRecord.serialize(),
      sessionThreshold: OneSignal.config.sessionThreshold,
      enableSessionDuration: OneSignal.config.enableSessionDuration,
      sessionOrigin,
    };
    await this.context.workerMessenger.unicast(WorkerMessengerCommand.SessionUpsert, payload);
  }

  public async notifySWToDeactivateSession(
    deviceId: string | undefined,
    deviceRecord: PushDeviceRecord | undefined,
    sessionOrigin: SessionOrigin
  ): Promise<void> {
    Log.debug("Notify SW to deactivate session");
    const payload: DeactivateSessionPayload = {
      deviceId,
      deviceRecord: deviceRecord ? deviceRecord.serialize() : undefined,
      sessionThreshold: OneSignal.config.sessionThreshold,
      enableSessionDuration: OneSignal.config.enableSessionDuration,
      sessionOrigin,
    };
    await this.context.workerMessenger.unicast(WorkerMessengerCommand.SessionDeactivate, payload);
  }

  public async handleOnBeforeUnload(): Promise<void> {
    Log.debug("Notify SW to deactivate session");
    const payload: DeactivateSessionPayload = {
      sessionThreshold: OneSignal.config.sessionThreshold,
      enableSessionDuration: OneSignal.config.enableSessionDuration,
      sessionOrigin: SessionOrigin.BeforeUnload,
    };
    this.context.workerMessenger.directPostMessageToSW(WorkerMessengerCommand.SessionDeactivate, payload);
  }

  public async handleVisibilityChange(): Promise<void> {
    const visibilityState = document.visibilityState;

    const [deviceId, deviceRecord] = await Promise.all([
      MainHelper.getDeviceId(),
      MainHelper.createDeviceRecord(this.context.appConfig.appId)
    ]);

    if (visibilityState === "visible") {
      await this.notifySWToUpsertSession(deviceId, deviceRecord, SessionOrigin.VisibilityVisible);
      return;
    }

    if (visibilityState === "hidden") {
      await this.notifySWToDeactivateSession(deviceId, deviceRecord, SessionOrigin.VisibilityHidden);
      return;
    }

    // it should never be anything else at this point
    Log.warn("Unhandled visibility state happened", visibilityState);
  }

  public async upsertSession(
    deviceId: string,
    deviceRecord: PushDeviceRecord,
    sessionOrigin: SessionOrigin
  ): Promise<void> {
    const sessionPromise = this.notifySWToUpsertSession(deviceId, deviceRecord, sessionOrigin);

    // Page lifecycle events https://developers.google.com/web/updates/2018/07/page-lifecycle-api

    // TODO: add handlers for onblur and onfocus to complement visibilityChange
  
    /**
     * To make sure we add these event listeners only once. Possible use-case is calling registerForPushNotifications
     * multiple times.
     */
    if (!OneSignal.cache.visibilityChangeListener) {
      // tracks switching to a different tab, fully covering page with another window, screen lock/unlock
      document.addEventListener("visibilitychange", () => { this.handleVisibilityChange(); }, true);
      OneSignal.cache.visibilityChangeListener = true;
    }
    
    if (!OneSignal.cache.beforeUnloadListener) {
      // tracks closing of a tab / reloading / navigating away
      window.addEventListener("beforeunload", (e) => { e.preventDefault(); this.handleOnBeforeUnload();}, true);
      OneSignal.cache.beforeUnloadListener = true;
    }

    await sessionPromise;
  }
}