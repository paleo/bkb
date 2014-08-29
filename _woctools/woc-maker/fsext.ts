/// <reference path='../lib/node.d.ts' />
/// <reference path='../lib/es6-promise.d.ts' />
'use strict';

import fs = require('fs');
import rsvp = require('es6-promise');
var Promise = rsvp.Promise;

export var fsp = {
  exists: function (path: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      fs.exists(path, (b: boolean) => {
        resolve(b);
      });
    });
  },
  mkdir: function (path: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      fs.mkdir(path, null, (err) => {
        if (err)
          reject(Error('Cannot create directory: ' + path));
        else
          resolve();
      });
    });
  },
  readdir: function (path: string): Promise<string[]> {
    return new Promise<string[]>((resolve, reject) => {
      fs.readdir(path, (err, fileNames: string[]) => {
        if (err)
          reject(Error('Cannot read directory: ' + path));
        else
          resolve(fileNames);
      });
    });
  },
  readFile: function (fileName: string, options: {} = undefined): Promise<string> {
    return new Promise((resolve, reject) => {
      fs.readFile(fileName, options, (err, data: string) => {
        if (err)
          reject(err);
        else
          resolve(data);
      });
    });
  },
  writeFile: function (fileName: string, data: string, options: {} = undefined): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      fs.writeFile(fileName, data, options, (err) => {
        if (err)
          reject(err);
        else
          resolve();
      });
    });
  },
  stat: function (path: string): Promise<fs.Stats> {
    return new Promise<fs.Stats>((resolve, reject) => {
      fs.stat(path, (err, st: fs.Stats) => {
        if (err)
          reject(err);
        else
          resolve(st);
      });
    });
  }
};

export var fsl = {
  copyFile: function (source, target): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      var cbCalled = false;
      function done(err) {
        if (!cbCalled) {
          cbCalled = true;
          if (err)
            reject(err);
          else
            resolve();
        }
      }
      var rd = fs.createReadStream(source);
      rd.on('error', (err) => {
        done(err);
      });
      var wr = fs.createWriteStream(target);
      wr.on('error', (err) => {
        done(err);
      });
      wr.on('close', () => {
        done(undefined);
      });
      rd.pipe(wr);
    });
  },
  rmRecursive: function (path, includingThis: boolean): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      fsl._rmRecursive(path, includingThis, (err) => {
        if (err)
          reject(err);
        else
          resolve();
      })
    });
  },
  _rmRecursive: function (path, includingThis: boolean, cb: (err, stats) => void) { // TODO rewrite with promises
    fs.stat(path, (err, stats) => {
      if (err) {
        cb(err, stats);
        return;
      }
      if (stats.isFile()) {
        fs.unlink(path, (err) => {
          if (err) {
            cb(err, null);
          } else {
            cb(null, null);
          }
        });
        return;
      }
      if (!stats.isDirectory())
        return;
      fs.readdir(path, (err, files) => {
        if (err) {
          cb(err, null);
          return;
        }
        var fLength = files.length;
        var fDeleteIndex = 0;
        var checkStatus = () => {
          if (fLength === fDeleteIndex) {
            if (includingThis) {
              fs.rmdir(path, (err) => {
                if (err)
                  cb(err, null);
                else
                  cb(null, null);
              });
            } else
              cb(null, null);
            return true;
          }
          return false;
        };
        if (!checkStatus()) {
          for (var i = 0; i < fLength; i++) {
            // named callback just to enlighten debugging
            fsl._rmRecursive(path + '/' + files[i], true, function rmRecursiveCB(err) {
              if (!err) {
                fDeleteIndex++;
                checkStatus();
              } else
                cb(err, null);
            });
          }
        }
      });
    });
  }
};
