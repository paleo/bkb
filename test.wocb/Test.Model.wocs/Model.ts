/// <reference path='../defs/test.d.ts' />

module Test {
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

    constructor() {
      this.addTask({
        title: 'First task',
        description: 'This is the first task…',
        id: null
      });
      this.addTask({
        title: 'Second task',
        description: 'This is the second task…',
        id: null
      });
    }

    public newTask(): ModelTask {
      return {
        title: null,
        description: null,
        id: null
      };
    }

    public addTask(t: ModelTask): ModelTask {
      var copy = Model.cloneTask(t, true, false);
      copy.id = this.tasks.length;
      return this.tasks[copy.id] = Object.freeze(copy);
    }

    public rmTask(id: number): void {
      if (id === null || id === undefined)
        throw Error('Missing id');
      delete this.tasks[id];
    }

    public updateTask(t: ModelTask): ModelTask {
      if (t.id === null || t.id === undefined)
        throw Error('Missing id');
      return this.tasks[t.id] = Model.cloneTask(t, true, true);
    }

    public listTasks(copy = false): ModelTask[] {
      var list: ModelTask[] = [];
      for (var k in this.tasks) {
        if (this.tasks.hasOwnProperty(k))
          list.push(copy ? Model.cloneTask(this.tasks[k], false, false) : this.tasks[k]);
      }
      return list;
    }

    public getTask(id: number, copy = false): ModelTask {
      var t = this.tasks[id];
      if (!t)
        return undefined;
      return copy ? Model.cloneTask(t, false, false) : t;
    }

    private static cleanString(val: string): string {
      if (!val)
        return null;
      val = val.trim();
      return val === '' ? null : val;
    }

    private static cloneTask(t: ModelTask, clean: boolean, freeze: boolean): ModelTask {
      var o = {
        title: clean ? Model.cleanString(t.title) : t.title,
        description: clean ? Model.cleanString(t.description) : t.description,
        id: t.id
      };
      return freeze ? Object.freeze(o) : o;
    }
  }
}
