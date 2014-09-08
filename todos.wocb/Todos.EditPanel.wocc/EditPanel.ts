/// <reference path='../Todos.d.ts' />

module Todos {
  'use strict';

  export class EditPanel implements Woc.Component {
    private log: Woc.Log;
    private dialogs: WocGeneric.Dialogs;
    private router: Woc.Router;
    private model: Todos.Model;

    private $title: JQuery;
    private $description: JQuery;
    private $form: JQuery;
    private curTask: ModelTask;

    constructor(private cc: Woc.HBComponentContext) {
      this.log = cc.getService<Woc.Log>('Woc.Log');
      this.dialogs = cc.getService<WocGeneric.Dialogs>('WocGeneric.Dialogs');
      this.router = cc.getService<Woc.Router>('Woc.Router');
      this.model = cc.getService<Todos.Model>('Todos.Model');
    }

    public attachTo(el: HTMLElement): EditPanel {
      var $comp = $(this.cc.render('TodosEdit')).appendTo(el);
      this.$title = $comp.find('.js-title');
      this.$description = $comp.find('.js-description');
      this.$form = $comp.find('.js-form');
      this.$form.submit((e) => {
        e.preventDefault();
      });
      var that = this;
      this.$form.find('button').each(function () {
        var $btn = $(this);
        $btn.click(() => that.log.wrap(() => that.action($btn.val())));
      });
      return this;
    }

    public destruct() {
      this.$form.find('button').off();
      this.$form.off();
    }

    public setTask(taskId: number) {
      this.curTask = this.model.getTask(taskId, true);
      this.$title.val(this.curTask.title);
      this.$description.val(this.curTask.description);
    }

    private action(type: string) {
      switch (type) {
        case 'save':
          this.save();
          this.close();
          break;
        case 'rm':
          this.askThenRemove();
          break;
        case 'close':
          this.askThenClose();
          break;
        default:
          throw Error('Invalid type "' + type + '"');
      }
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
console.log(val);
        if (val) {
          this.model.rmTask(this.curTask.id);
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
      this.syncTask();
      this.model.updateTask(this.curTask);
      this.dialogs.showInfo('Task is saved!');
    }

    private close() {
      this.router.navigate('');
    }

    private isChanged(): boolean {
      this.syncTask();
      return this.model.isChanged(this.curTask);
    }

    private syncTask() {
      this.curTask.title = this.$title.val();
      this.curTask.description = this.$description.val();
    }
  }
}
