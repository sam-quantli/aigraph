import { LGraphNode, LiteGraph } from '@/lib/litegraph/src/litegraph'

/** Minimal node: one in, one out — useful for link smoke tests */
export class TestBasicNode extends LGraphNode {
  constructor() {
    super('Test · Basic I/O')
    this.addInput('in', 'number')
    this.addOutput('out', 'number')
    this.properties = { value: 1 }
  }

  override onExecute() {
    const incoming = this.getInputData(0)
    const n =
      typeof incoming === 'number' && !Number.isNaN(incoming)
        ? incoming
        : Number(this.properties.value)
    this.setOutputData(0, n)
  }
}

/** Number + slider + knob widgets driving a scaled output */
export class TestNumericWidgetsNode extends LGraphNode {
  static override color = '#2d4a3e'
  static override bgcolor = '#1a2e26'

  constructor() {
    super('Test · Numeric widgets')
    this.addInput('in', 'number')
    this.addOutput('out', 'number')
    this.properties = { gain: 1, bias: 0 }

    this.addWidget('slider', 'gain', 1, null, {
      property: 'gain',
      min: 0,
      max: 4,
      step2: 0.05
    })
    this.addWidget('knob', 'bias', 0, null, {
      property: 'bias',
      min: -10,
      max: 10,
      step2: 0.5
    })
  }

  override onExecute() {
    const raw = this.getInputData(0)
    const x = typeof raw === 'number' ? raw : 0
    const gain = Number(this.properties.gain) || 0
    const bias = Number(this.properties.bias) || 0
    this.setOutputData(0, x * gain + bias)
  }
}

/** Text, combo, toggle, color, textarea, and a non-serializing button */
export class TestWidgetKitchenSinkNode extends LGraphNode {
  static override color = '#4a3d2d'
  static override bgcolor = '#2e261a'

  constructor() {
    super('Test · Widget mix')
    this.addOutput('summary', 'string')
    this.properties = {
      label: 'hello',
      preset: 'short',
      flag: true,
      accent: '#88c999',
      emphasis: 0.5,
      notes: 'Multi-line notes go here.'
    }

    this.addWidget('combo', 'preset', 'short', null, {
      property: 'preset',
      values: ['short', 'long', 'verbose']
    })
    this.addWidget('toggle', 'flag', true, null, { property: 'flag' })
    this.addWidget('text', 'label', 'hello', null, { property: 'label' })
    this.addWidget('slider', 'emphasis', this.properties.emphasis as number, null, {
      property: 'emphasis',
      min: 0,
      max: 1,
      step2: 0.01
    })
    this.addWidget('color', 'accent', '#88c999', null, {
      property: 'accent'
    })
    this.addWidget('textarea', 'notes', 'Multi-line notes go here.', null, {
      property: 'notes',
      multiline: true
    })
    this.addWidget(
      'button',
      'log_state',
      'Log state',
      () => {
        console.info('[aigraph test] Widget mix', { ...this.properties })
      },
      { serialize: false }
    )
  }

  override onExecute() {
    const preset = String(this.properties.preset ?? '')
    const label = String(this.properties.label ?? '')
    const flag = !!this.properties.flag
    const accent = String(this.properties.accent ?? '')
    const notes = String(this.properties.notes ?? '')
    const em = Number(this.properties.emphasis)
    const emphasis = Number.isFinite(em) ? em.toFixed(2) : '?'
    const parts = [
      `[${preset}]`,
      flag ? 'ON' : 'off',
      label,
      `accent=${accent}`,
      `emphasis=${emphasis}`,
      notes.slice(0, 80) + (notes.length > 80 ? '…' : '')
    ]
    this.setOutputData(0, parts.join(' · '))
  }
}

/** String passthrough with prefix/suffix widgets */
export class TestStringFormatNode extends LGraphNode {
  static override color = '#2d3a4a'
  static override bgcolor = '#1a222e'

  constructor() {
    super('Test · String format')
    this.addInput('text', 'string')
    this.addOutput('out', 'string')
    this.properties = { prefix: '[', suffix: ']' }

    this.addWidget('text', 'prefix', '[', null, { property: 'prefix' })
    this.addWidget('text', 'suffix', ']', null, { property: 'suffix' })
    this.addWidget('number', 'repeat', 1, null, {
      property: 'repeat',
      min: 1,
      max: 5,
      step2: 1,
      precision: 0
    })
  }

  override onExecute() {
    const raw = this.getInputData(0)
    const base =
      raw === undefined || raw === null ? '' : typeof raw === 'string' ? raw : String(raw)
    const pre = String(this.properties.prefix ?? '')
    const suf = String(this.properties.suffix ?? '')
    let r = Math.round(Number(this.properties.repeat) || 1)
    r = Math.min(5, Math.max(1, r))
    const chunk = `${pre}${base}${suf}`
    this.setOutputData(0, Array.from({ length: r }, () => chunk).join(''))
  }
}

/** Title bar button + custom chrome (collapse still works if enabled on type) */
export class TestTitleChromeNode extends LGraphNode {
  static override color = '#4a2d48'
  static override bgcolor = '#2e1a2c'

  constructor() {
    super('Test · Title & chrome')
    this.addOutput('clicked', 'number')
    this.properties = { clicks: 0 }

    this.addTitleButton({
      name: 'bump',
      text: '+',
      bgColor: '#6b4a6a',
      fgColor: '#f0e8ef',
      fontSize: 11,
      onClick: () => {
        this.properties.clicks =
          Math.min(999, Number(this.properties.clicks || 0) + 1)
        console.info('[aigraph test] Title bump', this.properties.clicks)
      }
    })
  }

  override onExecute() {
    this.setOutputData(0, Number(this.properties.clicks) || 0)
  }
}

let registered = false

/** Register once (safe under React Strict Mode double mount). */
export function registerAigraphTestNodes(): void {
  if (registered) return
  registered = true

  LiteGraph.registerNodeType('aigraph/demo', TestBasicNode)
  LiteGraph.registerNodeType('aigraph/test/widgets', TestWidgetKitchenSinkNode)
  LiteGraph.registerNodeType('aigraph/test/numeric', TestNumericWidgetsNode)
  LiteGraph.registerNodeType('aigraph/test/string', TestStringFormatNode)
  LiteGraph.registerNodeType('aigraph/test/chrome', TestTitleChromeNode)
}

export function sampleTestNodeLayout(): Array<{ type: string; pos: [number, number] }> {
  return [
    { type: 'aigraph/demo', pos: [60, 60] },
    { type: 'aigraph/test/widgets', pos: [60, 220] },
    { type: 'aigraph/test/numeric', pos: [420, 60] },
    { type: 'aigraph/test/string', pos: [420, 220] },
    { type: 'aigraph/test/chrome', pos: [720, 60] }
  ]
}
