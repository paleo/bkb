/// <reference path='../d.ts/woc.d.ts' />

module FirstExt {
	'use strict';

	export class FirstTemplateEngine implements woc.TemplateEngineService {
		public makeProcessor(ctc: woc.ComponentTypeContext, tplStr: string): woc.TemplateProcessor {
			return new Processor(ctc, tplStr);
		}
	}
	
	class Processor implements woc.TemplateProcessor {

		private static DATA_PH = 'data-woc-mYr4-ph';
		private templates: HTMLElement[];
		private bySelMap: {};
		private labels: {};
		private placeholders: {};
		private lblPrefix: string;
		private lblCount: number;

		constructor(private ctc: woc.ComponentTypeContext, tplStr: string) {
			this.parse(tplStr);
			// TODO Reference all labels in the l10n service
			// labels: {'lbl-id': 'The Label Key (= default value)'} where the label ID is a CSS class and the label key is
			// the key in JSON language files
		}

		public getContextMethods(): {[index: string]: Function} {
			return {
				getTemplate: (sel: string, elMap = {}): HTMLElement => {
					if (this.bySelMap[sel] === undefined)
						throw Error('Unknown template "' + sel + '" in component "' + this.ctc.getOwnName() + '"');
					var el = <HTMLElement>this.templates[this.bySelMap[sel]].cloneNode(true);
					this.fillPlaceholders(el, elMap);
					this.fillLabels(el);
					return el;
				}
			};
		}

		private fillPlaceholders(el, elMap: {}) {
			var list = [], all = el.getElementsByTagName('span'), marker, name;
			for (var i = 0, len = all.length; i < len; ++i) {
				marker = all[i];
				name = marker.getAttribute(Processor.DATA_PH);
				if (name) {
					if (elMap[name] === undefined)
						throw Error('In component "' + this.ctc.getOwnName() + '", missing element for placeholder "' + name + '"');
					if (elMap[name] !== null && elMap[name]['tagName'] === undefined)
						throw Error('Elements to put in placeholders must be DOM elements');
					list.push([marker, elMap[name]]);
				}
			}
			var newEl;
			for (i = 0, len = list.length; i < len; ++i) {
				marker = list[i][0];
				newEl = list[i][1];
				if (newEl === null)
					marker.parentNode.removeChild(marker);
				else
					marker.parentNode.replaceChild(newEl, marker);
			}
		}

		private fillLabels(el: HTMLElement) {
			var list;
			for (var lblId in this.labels) {
				if (!this.labels.hasOwnProperty(lblId))
					continue;
				list = Processor.getElementsByClassName(lblId, el);
				if (list.length !== 1)
					continue;
				list[0].textContent = this.labels[lblId]; // TODO Use the l10n label in the current language here
			}
		}

		private parse(templatesStr: string) {
			this.bySelMap = {};
			this.placeholders = {};
			this.labels = {};
			this.lblPrefix = null;
			this.lblCount = 0;
			this.templates = [];
			templatesStr = this.addMarkers(templatesStr);
			var rmSelSet = {};
			var parser = document.createElement('div');
			parser.innerHTML = templatesStr;
			var el, tplId, cssClasses;
			for (var i = 0, len = parser.childNodes.length; i < len; ++i) {
				el = parser.childNodes[i];
				tplId = this.templates.length;
				this.templates[tplId] = el;
				this.addTplSel(rmSelSet, el.nodeName.toLowerCase(), tplId);
				if (el.id)
					this.addTplSel(rmSelSet, '#' + el.id, tplId);
				if (el.className) {
					cssClasses = el.className.split(' ');
					for (var j = 0, jLen = cssClasses.length; j < jLen; ++j)
						this.addTplSel(rmSelSet, '.' + cssClasses[j], tplId);
				}
			}
//			for (var k in this.placeholders) {
//				if (this.placeholders.hasOwnProperty(k))
//					throw Error('In templates of component "' + this.ctc.getOwnName() + '": placeholder "' + k + '" should be replaced here');
//			}
		}

		private addTplSel(rmSelSet: {}, sel: string, tplId: number): boolean {
			if (rmSelSet[sel])
				return false;
			if (this.bySelMap[sel] !== undefined) {
				delete this.bySelMap[sel];
				rmSelSet[sel] = true;
			} else
				this.bySelMap[sel] = tplId;
			return true;
		}

		private addMarkers(str: string) {
			var pieces: string[] = [];
			var cur = 0, inner, end, pieceIndex = 0, innerStr, cmdEnd, cmd, cmdVal;
			while ((cur = str.indexOf('{', cur)) !== -1) {
				if (Processor.isEscaped(str, cur)) {
					if (cur >= 1) {
						pieces.push(Processor.unescape(str.slice(pieceIndex, cur - 1)));
						pieceIndex = cur;
					}
					++cur;
					continue;
				}
				inner = cur + 1;
				end = str.indexOf('}', inner);
				if (end === -1)
					break;
				innerStr = str.slice(inner, end);
				cmdEnd = innerStr.indexOf(':');
				if (cmdEnd === -1) {
					cur = end + 1;
					continue;
				}
				pieces.push(Processor.unescape(str.slice(pieceIndex, cur)));
				cmd = Processor.trim(innerStr.slice(0, cmdEnd));
				cmdVal = innerStr.slice(cmdEnd + 1);
				if (cmd === 'placeholder')
					this.addPlaceholder(pieces, cmdVal);
				else if (!this.addLabel(pieces, cmd, cmdVal)) {
					pieceIndex = cur;
					++cur;
					continue;
				}
				pieceIndex = cur = end + 1;
			}
			if (pieceIndex === 0)
				return str;
			pieces.push(Processor.unescape(str.slice(pieceIndex)));
			return pieces.join('');
		}

		private addPlaceholder(pieces: string[], name: string) {
			var name = Processor.trim(name);
			if (this.placeholders[name])
				throw Error('Conflict in templates of component "' + this.ctc.getOwnName() + '": several placeholders "' + name + '"');
			pieces.push('<span ' + Processor.DATA_PH + '="' + name + '"></span>');
			this.placeholders[name] = true;
		}

		private addLabel(pieces: string[], cmd: string, lblStr: string): boolean {
			if (cmd === 'lbl')
				cmd = 'lbl span';
			else if (cmd[0] !== 'l' || cmd[1] !== 'b' || cmd[2] !== 'l' || cmd[3] !== ' ')
				return false;
			var classIndex = cmd.indexOf('.', 5), cssClass, tagName;
			if (classIndex === -1) {
				tagName = Processor.trim(cmd.slice(4));
				cssClass = '';
			} else {
				tagName = Processor.trim(cmd.slice(4, classIndex));
				cssClass = Processor.trim(cmd.slice(classIndex + 1)) + ' ';
			}
			if (tagName === '')
				throw Error('Invalid label "' + cmd + '" in templates of component "' + this.ctc.getOwnName() + '"');
			var lblId = this.makeLblId();
			this.labels[lblId] = Processor.formatLabelStr(lblStr);
			if (tagName === 'class') {
				if (cssClass)
					throw Error('Invalid label "' + cmd + '" in templates of component "' + this.ctc.getOwnName() + '"');
				pieces.push(lblId);
			} else
				pieces.push('<' + tagName + ' class="' + cssClass + lblId + '"></' + tagName + '>');
			return true;
		}

		private makeLblId(): string {
			if (this.lblPrefix === null)
				this.lblPrefix = 'wocl10n~' + this.ctc.getOwnName().replace(/\./g, '~') + '~';
			return this.lblPrefix + (this.lblCount++);
		}

		private static formatLabelStr(s: string): string {
			return s[0] === ' ' ? s.slice(1) : s;
		}

		private static trim(s: string): string {
			return String.prototype.trim ? s.trim() : s.replace(/^\s+|\s+$/g, '');
		}

		private static isEscaped(str: string, index: number): boolean {
			var count = 0;
			while (--index >= 0 && str[index] === '\\')
				++count;
			return count % 2 === 1;
		}

		private static unescape(s: string): string {
			return s.replace(/\\\\/g, '\\');
		}

		private static getElementsByClassName(className: string, fromElem: HTMLElement): any {
			if (fromElem.getElementsByClassName)
				return fromElem.getElementsByClassName(className);
			// - Fallback for IE8, thanks to http://code-tricks.com/javascript-get-element-by-class-name/
			var descendants = fromElem.getElementsByTagName('*'), i = -1, e, list = [];
			while (e = descendants[++i])
				((' ' + (e['class'] || e.className) + ' ').indexOf(' ' + className + ' ') !== -1) && list.push(e);
			return list;
		}
	}
}
