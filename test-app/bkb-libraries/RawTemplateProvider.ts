export default class RawTemplateProvider {
  private templates: string[]

  constructor(templatesStr: string) {
    if (!templatesStr)
      throw new Error('Missing template')
    this.templates = RawTemplateProvider.splitTemplates(templatesStr)
  }

  public getTemplate(name: string): string {
    if (!this.templates[name])
      throw new Error(`Unknown template ${name}`)
    return this.templates[name]
  }

  /**
   * <pre>
   * &lt;!-- Template: MyLabel --&gt;
   * &lt;span class="TestLabel"&gt;{{label}}&lt;/span&gt;
   * &lt;!-- Template: MyLabelB --&gt;
   * &lt;b class="TestLabel"&gt;{{label}}&lt;/b&gt;
   * </pre>
   */
  private static splitTemplates(templatesStr: string): string[] {
    const templates = []
    const arr = templatesStr.split(/\s*<!--\s*Template:\s*([^\s]+)\s*-->\s*/i)
    for (let i = 1, len = arr.length; i < len; ++i) {
      const name = arr[i]
      templates[name] = arr[++i]
    }
    return templates
  }
}