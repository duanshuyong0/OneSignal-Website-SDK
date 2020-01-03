import bowser from "bowser";
import {EnvironmentInfo} from '../models/EnvironmentInfo';
import BROWSER_TYPES from '../utils/BrowserTypes';

export class EnvironmentInfoHelper {
    public static getEnvironmentInfo() : EnvironmentInfo {
        return {
            isBrowser: this.isBrowser(),
            browserType: this.getBrowser(),
            browserVersion: this.getBrowserVersion(),
            isHttps: this.isHttps(),
            isUsingSubscriptionWorkaround: true,    // TO DO: use isUsingSubscriptionWorkaround
            supportsServiceWorkers: this.supportsServiceWorkers(),
            requiresUserInteraction: this.shouldRequireUserInteraction(),
            osVersion: this.getOsVersion()
        }
    }

    private static isBrowser(): boolean {
        return !!this.getBrowser();
    }

    private static getBrowser(): string {
        // from bowser source: https://bit.ly/36mq1R5
        return (BROWSER_TYPES as any)[bowser.name];
    }

    private static getBrowserVersion(): number {
        return Number(bowser.version);
    }

    private static isHttps(): boolean {
        return location.protocol == 'https:';
    }

    /*
    private static isUsingSubscriptionWorkaround(): boolean {
        // TO DO:
        return true;
    }
    */

    private static supportsServiceWorkers(): boolean {
        return ('serviceWorker' in navigator);
    }

    private static shouldRequireUserInteraction(): boolean {
        var autoAccept = true;

        // Firefox 72+ requires user-interaction. For HTTP prompt to work,
        // we need to set autoAccept to false
        if (this.getBrowser() === "firefox" && this.getBrowserVersion() > 72) {
            autoAccept = false;
        }
        return autoAccept;
    }

    private static getOsVersion(): number {
        return Number(bowser.osversion);
    }
}
