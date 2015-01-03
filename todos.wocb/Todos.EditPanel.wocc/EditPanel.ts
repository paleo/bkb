/// <reference path='../defs/Todos.d.ts' />

module Todos {
  'use strict';

  export class EditPanel implements Woc.Component {
    private log: Woc.Log;
    private dialogs: WocTeam.Dialogs;
    private router: Woc.Router;
    private model: Todos.Model;
    private tplData = { task: null };

    constructor(private cc: WocTeam.VueComponentContext) {
      this.log = cc.getService('Woc.Log');
      this.dialogs = cc.getService('WocTeam.Dialogs');
      this.router = cc.getService('Woc.Router');
      this.model = cc.getService('Todos.Model');
    }

    public attachTo(el: HTMLElement): void {
      this.cc.bindTemplate({
        el: el,
        wocTemplate: 'TodosEdit',
        data: this.tplData,
        methods: {
          save: (e) => this.cc.logWrap(() => {
            e.preventDefault();
            this.save();
            this.close();
          }),
          remove: (e) => this.cc.logWrap(() => {
            e.preventDefault();
            this.askThenRemove();
          }),
          cancel: (e) => this.cc.logWrap(() => {
            e.preventDefault();
            this.askThenClose();
          })
        }
      });
    }

    public setTask(taskId: number) {
      this.tplData.task = this.model.getTask(taskId, true);
    }

    private askThenRemove() {
      this.dialogs.confirm('Delete the task?', [
        {
          label: 'Cancel',
          returnValue: false,
          isCancel: true
        },
        {
          label: 'Delete',
          returnValue: true,
          isDefault: true
        }
      ]).then((val) => this.log.wrap(() => {
        if (val && this.tplData.task) {
          this.model.rmTask(this.tplData.task.id);
          this.dialogs.showInfo('Task is removed!');
          this.close();
        }
      }));
    }

    private askThenClose() {
      if (!this.isChanged()) {
        this.close();
        return;
      }
      this.dialogs.confirm('Modifications will be lost', [
        {
          label: 'Cancel',
          returnValue: 'cancel',
          isDefault: true,
          isCancel: true
        },
        {
          label: 'Save',
          returnValue: 'save'
        },
        {
          label: 'Discard',
          returnValue: 'discard'
        }
      ]).then((val) => this.log.wrap(() => {
        if (val === 'save') {
          this.save();
          this.close();
        } else if (val === 'discard')
          this.close();
      }));
    }

    private save() {
      if (this.tplData.task) {
        this.model.updateTask(this.tplData.task);
        this.dialogs.showInfo('Task is saved!');
      }
    }

    private close() {
      this.router.navigate('');
    }

    private isChanged(): boolean {
      if (!this.tplData.task)
        return false;
      var orig = this.model.getTask(this.tplData.task.id);
      return (orig.title !== this.tplData.task.title || orig.description !== this.tplData.task.description)
    }
  }
}
