/// <reference path='definitions.ts' />
/// <reference path="utils.ts" />
'use strict';

module Woc {
  export class CoreAjax implements Ajax {

    // --
    // -- Public
    // --

    /**
     * * method: 'GET|POST|PUT|DELETE|HEAD'
     * * rDataType: 'json|script|text' [default: 'json']
     * * sAsJson: contains the parameter name
     */
    public ajax(method: string, url: string, opt: {
          sData?: {};
          rDataType?: string;
          sAsJson?: string;
        } = {}): Promise<any> {
      var sData = opt.sData || null;
      if (sData && opt.sAsJson) {
        var orig = sData;
        sData = {};
        sData[opt.sAsJson] = JSON.stringify(orig);
      }
      return CoreAjax.doXHR(method, url, sData, opt.rDataType || 'json');
    }

    /**
     * * rDataType: 'json|script|text' [default: 'json']
     * * sAsJson: contains the parameter name
     */
    public get(url: string, opt: {
          sData?: {};
          rDataType?: string;
          sAsJson?: string;
        } = {}): Promise<any> {
      return this.ajax('GET', url, opt);
    }

    /**
     * * rDataType: 'json|script|text' [default: 'json']
     * * sAsJson: contains the parameter name
     */
    public head(url: string, opt: {
          sData?: {};
          rDataType?: string;
          sAsJson?: string;
        } = {}): Promise<any> {
      return this.ajax('HEAD', url, opt);
    }

    /**
     * * rDataType: 'json|script|text' [default: 'json']
     * * sAsJson: contains the parameter name
     */
    public post(url: string, opt: {
          sData?: {};
          rDataType?: string;
          sAsJson?: string;
        } = {}): Promise<any> {
      return this.ajax('POST', url, opt);
    }

    /**
     * * rDataType: 'json|script|text' [default: 'json']
     * * sAsJson: contains the parameter name
     */
    public put(url: string, opt: {
          sData?: {};
          rDataType?: string;
          sAsJson?: string;
        } = {}): Promise<any> {
      return this.ajax('PUT', url, opt);
    }

    /**
     * * rDataType: 'json|script|text' [default: 'json']
     * * sAsJson: contains the parameter name
     */
    public delete(url: string, opt: {
          sData?: {};
          rDataType?: string;
          sAsJson?: string;
        } = {}): Promise<any> {
      return this.ajax('DELETE', url, opt);
    }

    // --
    // -- Private - Handle AJAX events - Loadings
    // --

    private static doXHR(method, url, sData, rDataType): Promise<any> {
      return new Promise<any>((resolve, reject) => {
        var req = new XMLHttpRequest();
        req.open(method, url, true);
        // - Handlers
        req.onload = () => {
          if (req.status < 200 || req.status >= 400) {
            reject(Error('Error from server "' + url + '", error ' + req.status + ' (' + req.statusText + ')'));
            return;
          }
          var resp = req.responseText;
          switch (rDataType) {
            case 'script':
              globalEval(resp);
              resolve(resp);
              break;
            case 'json':
              try {
                resolve(JSON.parse(resp));
              } catch (e) {
                reject(Error('Invalid JSON, loaded from: ' + url + '\n' + resp));
                return;
              }
              break;
            default:
              resolve(resp);
          }
        };
        req.onerror = () => {
          reject(Error('Network error when loading "' + url + '", error ' + req.status + ' (' + req.statusText + ')'));
        };
        // - Make the query
        var sDataStr;
        if (sData) {
          var sDataList = [];
          for (var k in sData) {
            if (sData.hasOwnProperty(k))
              sDataList.push(encodeURIComponent(k) + '=' + encodeURIComponent(sData[k]));
          }
          sDataStr = sDataList.length === 0 ? null : sDataList.join('&');
        } else
          sDataStr = null;
        // - Send
        req.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        req.send(sDataStr);
      });
    }
  }
}
