/// <reference path='../lib/node.d.ts' />
'use strict';

module Common {
  export enum EmbedType {
    Library, Service, Initializer, Component, Bundle
  }

  export function toSingularLabel(type: EmbedType) {
    switch (type) {
      case EmbedType.Library:
        return 'library';
      case EmbedType.Service:
        return 'service';
      case EmbedType.Initializer:
        return 'initializer';
      case EmbedType.Component:
        return 'component';
      case EmbedType.Bundle:
        return 'bundle';
      default:
        throw Error('Invalid type "' + type + '"');
    }
  }

  export function toPluralLabel(type: EmbedType) {
    switch (type) {
      case EmbedType.Library:
        return 'libraries';
      case EmbedType.Service:
        return 'services';
      case EmbedType.Initializer:
        return 'initializers';
      case EmbedType.Component:
        return 'components';
      case EmbedType.Bundle:
        return 'bundles';
      default:
        throw Error('Invalid type "' + type + '"');
    }
  }
}

export = Common;
