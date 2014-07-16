/// <reference path="definitions.ts" />
'use strict';

module woc {
	export class TemplateParser {

		private static DATA_PH = 'data-woc-mYr4-ph';
		private componentName: string;
		private bySelMap: {};
		private placeholders: {};
		private labels: {};
		private lblPrefix: string;
		private lblCount: number;

		public static fillPlaceholders(el, elMap: {}, context: ComponentTypeContext) {
			var list = [], all = el.getElementsByTagName('span'), marker, name;
			for (var i = 0, len = all.length; i < len; ++i) {
				marker = all[i];
				name = marker.getAttribute(TemplateParser.DATA_PH);
				if (name) {
					if (elMap[name] === undefined)
						throw Error('In component "' + context.getComponentName() + '", missing element for placeholder "' + name + '"');
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

		public parse(componentName: string, templatesStr: string): {}[] {
			this.componentName = componentName;
			this.bySelMap = {};
			this.placeholders = {};
			this.labels = {};
			this.lblPrefix = null;
			this.lblCount = 0;
			var templates = [];
			templatesStr = this.addMarkers(templatesStr);
			var rmSelSet = {};
			var parser = document.createElement('div');
			parser.innerHTML = templatesStr;
			var el, tplId, cssClasses;
			for (var i = 0, len = parser.childNodes.length; i < len; ++i) {
				el = parser.childNodes[i];
				tplId = templates.length;
				templates[tplId] = el;
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
//					throw Error('In templates of component "' + this.componentName + '": placeholder "' + k + '" should be replaced here');
//			}
			return templates;
		}

		public getBySelMap(): {} {
			return this.bySelMap;
		}

		public getLabels(): {} {
			return this.labels;
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
				if (TemplateParser.isEscaped(str, cur)) {
					if (cur >= 1) {
						pieces.push(TemplateParser.unescape(str.slice(pieceIndex, cur - 1)));
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
				pieces.push(TemplateParser.unescape(str.slice(pieceIndex, cur)));
				cmd = TemplateParser.trim(innerStr.slice(0, cmdEnd));
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
			pieces.push(TemplateParser.unescape(str.slice(pieceIndex)));
			return pieces.join('');
		}

		private addPlaceholder(pieces: string[], name: string) {
			var name = TemplateParser.trim(name);
			if (this.placeholders[name])
				throw Error('Conflict in templates of component "' + this.componentName + '": several placeholders "' + name + '"');
			pieces.push('<span ' + TemplateParser.DATA_PH + '="' + name + '"></span>');
			this.placeholders[name] = true;
		}

		private addLabel(pieces: string[], cmd: string, lblStr: string): boolean {
			if (cmd === 'lbl')
				cmd = 'lbl span';
			else if (cmd[0] !== 'l' || cmd[1] !== 'b' || cmd[2] !== 'l' || cmd[3] !== ' ')
				return false;
			var classIndex = cmd.indexOf('.', 5), cssClass, tagName;
			if (classIndex === -1) {
				tagName = TemplateParser.trim(cmd.slice(4));
				cssClass = '';
			} else {
				tagName = TemplateParser.trim(cmd.slice(4, classIndex));
				cssClass = TemplateParser.trim(cmd.slice(classIndex + 1)) + ' ';
			}
			if (tagName === '')
				throw Error('Invalid label "' + cmd + '" in templates of component "' + this.componentName + '"');
			var lblId = this.makeLblId();
			this.labels[lblId] = TemplateParser.formatLabelStr(lblStr);
			if (tagName === 'class') {
				if (cssClass)
					throw Error('Invalid label "' + cmd + '" in templates of component "' + this.componentName + '"');
				pieces.push(lblId);
			} else
				pieces.push('<' + tagName + ' class="' + cssClass + lblId + '"></' + tagName + '>');
			return true;
		}

		private makeLblId(): string {
			if (this.lblPrefix === null)
				this.lblPrefix = 'wocl10n~' + this.componentName.replace(/\./g, '~') + '~';
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
	}
}
