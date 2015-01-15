/// <reference path='../lib/node.d.ts' />
'use strict';

module Common {
  export enum EmbedType {
    ExternLib, Service, Initializer, Component, Theme, Bundle
  }

  export function toWDir(name: string, type: EmbedType): string {
    switch (type) {
      case EmbedType.ExternLib:
        return name + '.woce';
      case EmbedType.Service:
        return name + '.wocs';
      case EmbedType.Initializer:
        return name + '.woci';
      case EmbedType.Component:
        return name + '.wocc';
      case EmbedType.Theme:
        return name + '.woct';
      case EmbedType.Bundle:
        return name + '.wocb';
      default:
        throw Error('Invalid type "' + type + '"');
    }
  }

  export function toPluralLabel(type: EmbedType) {
    switch (type) {
      case EmbedType.ExternLib:
        return 'externLibs';
      case EmbedType.Service:
        return 'services';
      case EmbedType.Initializer:
        return 'initializers';
      case EmbedType.Component:
        return 'components';
      case EmbedType.Theme:
        return 'themes';
      case EmbedType.Bundle:
        return 'bundles';
      default:
        throw Error('Invalid type "' + type + '"');
    }
  }
}

export = Common;
