/// <reference path='../defs/test.d.ts' />

module Test {
  'use strict';

  export interface ModelTask {
    title: string;
    description: string;
    date: string;
    /**
     * Undefined for new task
     */
    id?: number;
  }

  export class Model {
    private tasks: ModelTask[] = [];

    constructor() {
      this.addTask({
        title: 'First task',
        description: 'This is the first task…',
        date: "2015-01-01"
      });
      this.addTask({
        title: 'Second task',
        description: 'This is the second task…',
        date: "2015-01-01"
      });
    }

    public addTask(t: ModelTask): ModelTask {
      var copy = Model.cloneTask(t, true);
      copy.id = this.tasks.length;
      return this.tasks[copy.id] = Object.freeze(copy);
    }

    public rmTask(id: number): void {
      if (!this.tasks[id])
        throw Error('Unknown task "' + id + '"');
      delete this.tasks[id];
    }

    public updateTask(t: ModelTask): ModelTask {
      if (!this.tasks[t.id])
        throw Error('Unknown task "' + t.id + '"');
      return this.tasks[t.id] = Object.freeze(Model.cloneTask(t, true));
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

    private static cloneTask(t: ModelTask, clean: boolean): ModelTask {
      return {
        title: clean ? Model.cleanString(t.title) : t.title,
        description: clean ? Model.cleanString(t.description) : t.description,
        date: clean ? Model.cleanString(t.date) : t.date,
        id: t.id
      };
    }

    private static cleanString(val: string): string {
      val = val ? val.trim() : null;
      return val === '' ? null : val;
    }
  }
}
