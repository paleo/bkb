/// <reference path='../todos.d.ts' />
/// <reference path="../Test.Label.wocc/Label.ts" />

module Todos {
  'use strict';

  export interface ModelTask {
    title: string;
    /**
     * Nullable
     */
    description: string;
    /**
     * Null for new tasks
     */
    id: number;
  }

  export class Model {
    private tasks: ModelTask[] = [];

    constructor(private sc: Woc.ServiceContext) {
      this.addTask({
        title: 'Première tâche',
        description: 'Texte de la première tâche...',
        id: null
      });
      this.addTask({
        title: 'Deuxième tâche',
        description: 'Texte de la deuxième tâche...',
        id: null
      });
    }

    public addTask(t: ModelTask): ModelTask {
      var copy = Model.cloneTask(t, false);
      copy.id = this.tasks.length;
      return this.tasks[copy.id] = Object.freeze(copy);
    }

    public rmTask(t: ModelTask): void {
      if (t.id === null || t.id === undefined)
        throw Error('Missing id');
      delete this.tasks[t.id];
    }

    public updateTask(t: ModelTask): ModelTask {
      if (t.id === null || t.id === undefined)
        throw Error('Missing id');
      return this.tasks[t.id] = Model.cloneTask(t, true);
    }

    public listTasks(copy = false): ModelTask[] {
      var list: ModelTask[] = [];
      for (var k in this.tasks) {
        if (this.tasks.hasOwnProperty(k))
          list.push(copy ? Model.cloneTask(this.tasks[k], false) : this.tasks[k]);
      }
      return list;
    }

    public getTask(id: number, copy = false): ModelTask {
      var t = this.tasks[id];
      if (!t)
        return undefined;
      return copy ? Model.cloneTask(t, false) : t;
    }

    private static cloneTask(t: ModelTask, freeze: boolean): ModelTask {
      var o = {
        title: t.title,
        description: t.description || null,
        id: t.id || null
      };
      return freeze ? Object.freeze(o) : o;
    }
  }
}
