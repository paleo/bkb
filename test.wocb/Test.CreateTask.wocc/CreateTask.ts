/// <reference path='../defs/test.d.ts' />

module Test {
  'use strict';

  export class CreateTask implements Woc.Component {
    private model: Test.Model;
    private refreshCb: () => void;
    private task: ModelTask;
    private tplData;

    constructor(private cc: WocTeam.VueComponentContext, props: {}) {
      this.model = cc.getService('Test.Model');
      this.refreshCb = props['refreshCb'];
      this.task = this.model.newTask();
    }

    public attachTo(el: HTMLElement): void {
      this.tplData = {
        title: this.task.title
      };
      this.cc.bindTemplate({
        el: el,
        wocTemplate: 'CreateTask',
        data: this.tplData,
        methods: {
          addCb: (e) => {
            e.preventDefault();
            this.cc.logWrap(() => this.add());
          }
        }
      });
    }

    private add() {
      this.task.title = this.tplData.title;
      this.model.addTask(this.task);
      this.task = this.model.newTask();
      this.tplData.title = this.task.title;
      this.refreshCb();
    }
  }
}
