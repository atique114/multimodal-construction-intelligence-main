import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type FormEvent } from 'react'
import {
  Activity, ArrowDownToLine, ArrowRight, Bot, BrickWall, Check, ChevronRight, CloudSun,
  HardHat, ImagePlus, Landmark, LoaderCircle, MessageCircle, ShieldCheck, Sparkles,
  TriangleAlert, Upload, Wind, X,
} from 'lucide-react'
import {
  analyzeImage, estimatePlan, getHealth, makeVisualizationPrompt, sendMessage,
  type CrackReport, type Message, type PlanInput, type PlanReport, type SafetyReport,
} from './api'

type Page = 'overview' | 'safety' | 'cracks' | 'planning' | 'assistant'
const menu: { id: Page; label: string; icon: typeof Activity }[] = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'safety', label: 'Site safety', icon: ShieldCheck },
  { id: 'cracks', label: 'Crack diagnostics', icon: BrickWall },
  { id: 'planning', label: 'Planning & value', icon: Landmark },
  { id: 'assistant', label: 'Daily assistant', icon: MessageCircle },
]
const WEATHER = ['Normal', 'High Wind', 'Heavy Rain', 'Extreme Heat']
const STRUCTURES = ['Residential house', 'Apartment building', 'Commercial building', 'Warehouse / industrial']
const STYLES = ['Contemporary Indian', 'Tropical modern', 'Sustainable low-rise', 'Urban commercial']

function money(value: number) {
  if (value >= 10_000_000) return `₹${(value / 10_000_000).toFixed(2)} Cr`
  if (value >= 100_000) return `₹${(value / 100_000).toFixed(2)} L`
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value)
}
function downloadJson(data: unknown, name: string) {
  const href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a'); link.href = href; link.download = name; link.click(); URL.revokeObjectURL(href)
}

function App() {
  const [page, setPage] = useState<Page>('overview')
  const [apiOnline, setApiOnline] = useState(false)
  const [aiReady, setAiReady] = useState(false)
  const [weather, setWeather] = useState('Normal')
  const [planInput, setPlanInput] = useState<PlanInput>({ structure_type: STRUCTURES[0], built_up_sqft: 2000, location_tier: 'Tier 1', completion_percentage: 35, city: 'Bengaluru' })
  const [plan, setPlan] = useState<PlanReport | null>(null)
  const [planBusy, setPlanBusy] = useState(false)
  const [planError, setPlanError] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [toast, setToast] = useState('')

  useEffect(() => { getHealth().then((health) => { setApiOnline(true); setAiReady(health.ai_configured) }).catch(() => setApiOnline(false)) }, [])
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 3200); return () => window.clearTimeout(timer) }, [toast])

  async function calculatePlan(event?: FormEvent) {
    event?.preventDefault(); setPlanBusy(true); setPlanError('')
    try { const result = await estimatePlan(planInput); setPlan(result) }
    catch (error) { setPlanError(error instanceof Error ? error.message : 'Could not calculate project estimates.') }
    finally { setPlanBusy(false) }
  }
  useEffect(() => { void calculatePlan() }, []) // Load a useful sample dashboard.

  async function submitChat(text: string) {
    const next: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(next)
    try { const reply = await sendMessage(text, messages.slice(-20), weather); setMessages([...next, { role: 'assistant', content: reply.answer }]) }
    catch (error) { setMessages([...next, { role: 'assistant', content: error instanceof Error ? error.message : 'Assistant request failed.' }]) }
  }

  const title = menu.find((item) => item.id === page)?.label ?? 'Overview'
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><HardHat size={22} /></div><div><b>sitewise</b><span>CONSTRUCTION INTELLIGENCE</span></div></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="nav-list" aria-label="Main navigation">
        {menu.map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${page === id ? 'active' : ''}`} onClick={() => setPage(id)}><Icon size={18} /><span>{label}</span>{page === id && <ChevronRight size={15} className="nav-chevron" />}</button>)}
      </nav>
      <div className="sidebar-spacer" />
      <div className="sidebar-advisory"><div className="advisory-icon"><ShieldCheck size={17} /></div><strong>Decision support, not certification</strong><p>AI outputs are screening aids. Have qualified professionals verify site-specific safety and engineering decisions.</p></div>
      <div className="profile-row"><div className="profile-avatar">SB</div><div><b>Site team</b><span>Capstone workspace</span></div><span className="profile-dot" /></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="breadcrumb">Workspace <span>/</span> <b>{title}</b></div><div className="topbar-right"><span className={`connection ${apiOnline ? 'online' : 'offline'}`}><i />{apiOnline ? 'API connected' : 'API unavailable'}</span><span className={`mode-badge ${aiReady ? 'mode-live' : ''}`}><span className="pulse-dot" />{aiReady ? 'Gemini enabled' : 'Demo mode'}</span><div className="top-avatar">S</div></div></header>
      <div className="page-content">
        {page === 'overview' && <Overview plan={plan} setPage={setPage} weather={weather} setWeather={setWeather} />}
        {page === 'safety' && <ImageAnalysis kind="safety" />}
        {page === 'cracks' && <ImageAnalysis kind="cracks" />}
        {page === 'planning' && <Planning input={planInput} setInput={setPlanInput} plan={plan} busy={planBusy} error={planError} onSubmit={calculatePlan} onToast={setToast} />}
        {page === 'assistant' && <Assistant weather={weather} setWeather={setWeather} messages={messages} onSubmit={submitChat} />}
      </div>
      <footer className="footer"><span>Sitewise · Construction Intelligence Platform</span><span>AI assisted · Human verified</span></footer>
    </main>
    {toast && <div className="toast"><Check size={17} />{toast}</div>}
  </div>
}

function Overview({ plan, setPage, weather, setWeather }: { plan: PlanReport | null; setPage: (page: Page) => void; weather: string; setWeather: (value: string) => void }) {
  const actions: { page: Page; icon: typeof Activity; tone: string; title: string; text: string; action: string }[] = [
    { page: 'safety', icon: ShieldCheck, tone: 'green', title: 'Run a PPE audit', text: 'Review worker protection and visible site hazards from a photo.', action: 'Open safety audit' },
    { page: 'cracks', icon: BrickWall, tone: 'orange', title: 'Inspect a concrete defect', text: 'Classify visible cracks and plan the next engineering review.', action: 'Open diagnostics' },
    { page: 'planning', icon: Landmark, tone: 'blue', title: 'Plan cost and value', text: 'Estimate project budget, materials, and indicative asset value.', action: 'Open planner' },
  ]
  return <>
    <section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line" /> FIELD INTELLIGENCE, IN ONE PLACE</div><h1>Build with <em>clarity.</em></h1><p className="lead">Turn site observations into practical next steps for safer, smarter projects.</p></div><div className="date-chip"><span className="live-indicator" />PROJECT 01 <span className="date-divider" /> INDIA</div></section>
    <section className="hero-panel"><div className="hero-copy"><div className="hero-kicker"><Sparkles size={14} /> YOUR SITE, BETTER INFORMED</div><h2>See the details.<br /><span>Make confident moves.</span></h2><p>Bring your site images and project inputs together with AI assisted insights and clear planning tools.</p><button className="button button-light" onClick={() => setPage('safety')}>Start a site review <ArrowRight size={16} /></button></div><div className="hero-visual" aria-hidden="true"><div className="hero-orb orb-one" /><div className="hero-orb orb-two" /><div className="blueprint-card"><div className="blueprint-top"><span>FIELD NOTE · 08:42</span><span className="blueprint-live">LIVE</span></div><div className="building-sketch"><div className="sketch-roof" /><div className="sketch-building"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div><div className="sketch-ground" /></div><div className="blueprint-bottom"><span>STRUCTURAL REVIEW</span><span>01 / 04</span></div></div><div className="floating-note"><span className="note-icon"><Activity size={15} /></span><span><b>Site intelligence</b><small>Made actionable</small></span><span className="note-check"><Check size={13} /></span></div></div></section>
    <section className="section-heading"><div><span className="eyebrow muted">YOUR TOOLKIT</span><h2>What would you like to do?</h2></div><span className="section-count">01 — 03</span></section>
    <section className="action-grid">{actions.map(({ page: target, icon: Icon, tone, title, text, action }, index) => <button key={target} className="action-card" onClick={() => setPage(target)}><div className="card-top"><span className={`tool-icon ${tone}`}><Icon size={20} /></span><span className="card-number">0{index + 1}</span></div><h3>{title}</h3><p>{text}</p><span className="text-link">{action}<ArrowRight size={15} /></span></button>)}</section>
    <section className="overview-bottom"><div className="estimate-preview"><div className="panel-heading"><div><span className="eyebrow muted">PROJECT SNAPSHOT</span><h3>Planning at a glance</h3></div><button className="subtle-link" onClick={() => setPage('planning')}>View estimate <ArrowRight size={14} /></button></div>{plan ? <div className="snapshot-stats"><div><span>PROJECT BUDGET</span><b>{money(plan.estimated_project_budget_inr)}</b></div><div><span>ASSET VALUE</span><b>{money(plan.indicative_market_valuation_inr)}</b></div><div><span>COMPLETION</span><b>{plan.completion_percentage}%</b></div></div> : <p className="muted-copy">Open the planner to calculate a project estimate.</p>}</div>
      <div className="weather-preview"><div className="weather-title"><span className="tool-icon blue"><CloudSun size={19} /></span><div><span className="eyebrow muted">SITE CONDITIONS</span><h3>Daily protocol</h3></div></div><label className="field-label">WEATHER CONDITION</label><select value={weather} onChange={(e) => setWeather(e.target.value)}>{WEATHER.map((item) => <option key={item}>{item}</option>)}</select><button className="subtle-link" onClick={() => setPage('assistant')}>See today's guidance <ArrowRight size={14} /></button></div></section>
  </>
}

function ImageAnalysis({ kind }: { kind: 'safety' | 'cracks' }) {
  const safety = kind === 'safety'
  const [photo, setPhoto] = useState<File | null>(null)
  const [context, setContext] = useState('')
  const [report, setReport] = useState<SafetyReport | CrackReport | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const preview = useMemo(() => photo ? URL.createObjectURL(photo) : '', [photo])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Choose a JPG, PNG, or WEBP image.'); return }
    if (file.size > 12 * 1024 * 1024) { setError('Image must be 12 MB or smaller.'); return }
    setError(''); setPhoto(file); setReport(null)
  }
  async function runAnalysis() {
    if (!photo) { setError('Add a site image before starting analysis.'); return }
    setBusy(true); setError('')
    try { setReport(await analyzeImage(kind, photo, context)) }
    catch (e) { setError(e instanceof Error ? e.message : 'Analysis failed. Try again.') }
    finally { setBusy(false) }
  }

  return <>
    <PageIntro eyebrow={safety ? 'EPIC 02 · SAFETY VISION' : 'EPIC 02 · STRUCTURAL SCREENING'} title={safety ? 'Site safety & PPE audit' : 'Crack diagnostics'} text={safety ? 'Review visible protective equipment and surface site hazards from a construction photo.' : 'Screen visible concrete defects, estimate characteristics, and prepare a clear engineering follow-up.'} />
    <div className="analysis-layout"><section className="surface upload-panel"><div className="panel-heading"><div><h3>Site image</h3><p>JPG, PNG, or WEBP · up to 12 MB</p></div><span className="step-badge">01 / 02</span></div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onFile} />
      {!photo ? <button className="drop-zone" onClick={() => inputRef.current?.click()}><span className="upload-icon"><ImagePlus size={23} /></span><b>Drop your image here</b><span>or browse from your device</span><small><Upload size={13} /> SELECT IMAGE</small></button> : <div className="preview-box"><img src={preview} alt="Selected construction site" /><button className="remove-image" aria-label="Remove image" onClick={() => { setPhoto(null); setReport(null); if (inputRef.current) inputRef.current.value = '' }}><X size={16} /></button><div className="file-caption"><span>{photo.name}</span><small>{(photo.size / 1024 / 1024).toFixed(1)} MB</small></div></div>}
      <label className="field-label" htmlFor="site-context">SITE NOTES <span>OPTIONAL</span></label><textarea id="site-context" value={context} onChange={(e) => setContext(e.target.value)} placeholder={safety ? 'Add task details, work-at-height context, or an area to focus on…' : 'Add the structure location, when the crack appeared, or any observed movement…'} rows={3} maxLength={3000} />
      {error && <div className="error-box"><TriangleAlert size={16} />{error}</div>}
      <button className="button button-primary full-width" disabled={busy || !photo} onClick={runAnalysis}>{busy ? <><LoaderCircle className="spin" size={17} /> Analyzing image…</> : <>{safety ? 'Run safety audit' : 'Analyze visible defect'}<ArrowRight size={16} /></>}</button>
      <p className="privacy-note"><ShieldCheck size={14} /> Images are processed for this request and are not saved in a database.</p>
    </section>
    <section className="results-column">{report ? safety ? <SafetyResults report={report as SafetyReport} /> : <CrackResults report={report as CrackReport} /> : <div className="empty-results"><div className="empty-illustration"><div className="empty-ring ring-a" /><div className="empty-ring ring-b" /><div className="empty-symbol">{safety ? <ShieldCheck size={31} /> : <BrickWall size={31} />}</div><span className="spark spark-a">✳</span><span className="spark spark-b">✦</span></div><span className="eyebrow muted">YOUR REPORT WILL APPEAR HERE</span><h3>{safety ? 'Ready for a closer look?' : 'Start with a site photo'}</h3><p>Upload an image and run the analysis to get a structured, easy-to-review report.</p><div className="result-skeleton"><i /><i /><i /></div></div>}</section></div>
    <div className="disclaimer-strip"><TriangleAlert size={16} /><span><b>Use as an initial screen.</b> Image analysis may miss obscured details and cannot certify code compliance or structural safety. Follow up with a qualified site professional.</span></div>
  </>
}

function ReportHeader({ mode, onDownload }: { mode: string; onDownload: () => void }) {
  return <div className="report-header"><div><span className={`report-mode ${mode === 'Gemini' ? 'live' : ''}`}><i />{mode} report</span><h3>Analysis complete</h3></div><button className="icon-button" title="Download report JSON" onClick={onDownload}><ArrowDownToLine size={17} /></button></div>
}
function SafetyResults({ report }: { report: SafetyReport }) {
  const ppe = Object.entries(report.ppe_detection)
  return <div className="surface report-card"><ReportHeader mode={report.analysis_mode} onDownload={() => downloadJson(report, 'site-safety-report.json')} /><div className="score-row"><div className="score-circle" style={{ '--score': `${report.safety_score}%` } as CSSProperties}><div><b>{report.safety_score}</b><small>/100</small></div></div><div><span className="eyebrow muted">SITE SAFETY SCORE</span><h4>{report.overall_status}</h4><p>Score reflects visible indicators only.</p></div></div><div className="report-divider" /><div className="result-section-head"><div><span className="eyebrow muted">PERSONAL PROTECTIVE EQUIPMENT</span><h4>PPE checklist</h4></div><span className="count-chip">{ppe.length} items</span></div><div className="ppe-list">{ppe.map(([key, item]) => <div className="ppe-row" key={key}><span className={`ppe-check ${item.detected === true ? 'yes' : item.detected === false ? 'no' : 'unknown'}`}>{item.detected === true ? <Check size={14} /> : item.detected === false ? <X size={14} /> : '?'}</span><div className="ppe-text"><b>{key.replace(/_/g, ' ').replace(/\w\S*/g, (c) => c.toUpperCase())}</b><small>{item.notes}</small></div><span className={`status-label ${item.detected === false ? 'status-risk' : item.detected === null ? 'status-unknown' : 'status-good'}`}>{item.status}</span></div>)}</div><div className="report-divider" /><div className="result-section-head"><div><span className="eyebrow muted">OBSERVED ON SITE</span><h4>Hazards & corrective actions</h4></div><span className="count-chip">{report.hazards.length}</span></div>{report.hazards.length ? <div className="hazard-list">{report.hazards.map((item, i) => <div className="hazard-item" key={`${item.hazard}-${i}`}><div className="hazard-heading"><span className="hazard-icon"><TriangleAlert size={15} /></span><b>{item.hazard}</b><span className={`severity ${item.severity.toLowerCase()}`}>{item.severity}</span></div><p>{item.remedy}</p></div>)}</div> : <p className="muted-copy">No visible hazards were returned. This does not confirm that the site is hazard-free.</p>}<p className="report-footnote">{report.standards_note}</p></div>
}
function CrackResults({ report }: { report: CrackReport }) {
  return <div className="surface report-card"><ReportHeader mode={report.analysis_mode} onDownload={() => downloadJson(report, 'crack-diagnostics-report.json')} /><div className="crack-summary"><div><span className="eyebrow muted">VISIBLE DEFECT</span><h2>{report.defect_type}</h2><span className={`severity ${report.severity.toLowerCase()}`}>{report.severity} severity</span></div><div className="width-measure"><span>EST. WIDTH</span><b>{report.estimated_width_mm === null ? '—' : `${report.estimated_width_mm} mm`}</b><small>Visual estimate</small></div></div><div className="urgency-banner"><span className="tool-icon orange"><Activity size={18} /></span><div><small>RECOMMENDED URGENCY</small><b>{report.urgency}</b></div></div><div className="two-up"><div><span className="eyebrow muted">POSSIBLE CAUSES</span><ul>{report.root_causes.map((item) => <li key={item}>{item}</li>)}</ul></div><div><span className="eyebrow muted">RECOMMENDED NEXT STEPS</span><ul>{report.recommended_repairs.map((item) => <li key={item}>{item}</li>)}</ul></div></div><div className="engineering-note"><TriangleAlert size={16} /><p>{report.engineering_note}</p></div></div>
}

function Planning({ input, setInput, plan, busy, error, onSubmit, onToast }: { input: PlanInput; setInput: (value: PlanInput) => void; plan: PlanReport | null; busy: boolean; error: string; onSubmit: (event?: FormEvent) => void; onToast: (text: string) => void }) {
  const [style, setStyle] = useState(STYLES[0]); const [renderPrompt, setRenderPrompt] = useState(''); const [renderBusy, setRenderBusy] = useState(false)
  function update<K extends keyof PlanInput>(key: K, value: PlanInput[K]) { setInput({ ...input, [key]: value }) }
  async function generatePrompt() {
    setRenderBusy(true)
    try { const result = await makeVisualizationPrompt({ structure_type: input.structure_type, built_up_sqft: input.built_up_sqft, city: input.city, style }); setRenderPrompt(result.prompt) }
    catch (e) { onToast(e instanceof Error ? e.message : 'Could not generate rendering prompt.') }
    finally { setRenderBusy(false) }
  }
  return <><PageIntro eyebrow="EPIC 03 · PROJECT PLANNING" title="Plan with the full picture." text="Create a first-pass view of project costs, materials, milestones, and indicative market value." /><form className="planning-layout" onSubmit={onSubmit}><section className="surface planning-form"><div className="panel-heading"><div><h3>Project inputs</h3><p>Set the assumptions for your estimate.</p></div><span className="step-badge">01 / 02</span></div><label className="field-label" htmlFor="structure">STRUCTURE TYPE</label><select id="structure" value={input.structure_type} onChange={(e) => update('structure_type', e.target.value)}>{STRUCTURES.map((item) => <option key={item}>{item}</option>)}</select><label className="field-label" htmlFor="area">BUILT-UP AREA <span>SQ FT</span></label><div className="input-with-suffix"><input id="area" type="number" min={100} max={2000000} step={100} value={input.built_up_sqft} onChange={(e) => update('built_up_sqft', Number(e.target.value))} /><span>sq ft</span></div><div className="form-two"><div><label className="field-label" htmlFor="city">CITY / LOCALITY</label><input id="city" value={input.city} maxLength={100} onChange={(e) => update('city', e.target.value)} /></div><div><label className="field-label" htmlFor="tier">LOCATION TIER</label><select id="tier" value={input.location_tier} onChange={(e) => update('location_tier', e.target.value)}>{['Tier 1', 'Tier 2', 'Tier 3'].map((item) => <option key={item}>{item}</option>)}</select></div></div><div className="slider-title"><label className="field-label" htmlFor="completion">COMPLETION</label><b>{input.completion_percentage}%</b></div><input className="range-slider" id="completion" type="range" min={0} max={100} step={5} value={input.completion_percentage} onChange={(e) => update('completion_percentage', Number(e.target.value))} /><div className="range-labels"><span>Project start</span><span>Handover</span></div>{error && <div className="error-box"><TriangleAlert size={16} />{error}</div>}<button className="button button-primary full-width" type="submit" disabled={busy}>{busy ? <><LoaderCircle className="spin" size={17} /> Calculating…</> : <>Update project estimate<ArrowRight size={16} /></>}</button></section>
      <section className="planning-results">{plan ? <><div className="surface value-card"><div className="value-top"><span className="eyebrow">INDICATIVE PROJECT ESTIMATE</span><span className="currency-chip">INR · {input.location_tier}</span></div><div className="value-amount">{money(plan.estimated_project_budget_inr)}</div><div className="value-description">Estimated total construction budget</div><div className="value-divider" /><div className="value-metrics"><div><span>CAPEX INCURRED</span><b>{money(plan.estimated_capex_incurred_inr)}</b></div><div><span>MARKET ASSET VALUE</span><b>{money(plan.indicative_market_valuation_inr)}</b></div></div><div className="progress-heading"><span>Construction milestone</span><b>{plan.completion_percentage}%</b></div><div className="progress-track"><i style={{ width: `${plan.completion_percentage}%` }} /></div></div><div className="material-grid"><div className="surface material-card"><span className="material-icon orange"><Activity size={17} /></span><span className="eyebrow muted">STEEL REQUIREMENT</span><b>{plan.estimated_steel_kg.toLocaleString('en-IN')} <small>kg</small></b><span className="material-hint">Indicative quantity</span></div><div className="surface material-card"><span className="material-icon blue"><BrickWall size={17} /></span><span className="eyebrow muted">CEMENT REQUIREMENT</span><b>{plan.estimated_cement_tonnes.toLocaleString('en-IN')} <small>tonnes</small></b><span className="material-hint">Indicative quantity</span></div></div><div className="surface schedule-card"><div className="schedule-heading"><div><span className="eyebrow muted">SEQUENCE & DURATION</span><h3>Task schedule</h3></div><span className="schedule-total">~{plan.estimated_duration_days} days</span></div>{plan.task_schedule.map((task, index) => <div className="schedule-task" key={task.task_name}><span className={`task-index ${task.status === 'Complete' ? 'done' : ''}`}>{task.status === 'Complete' ? <Check size={13} /> : String(index + 1).padStart(2, '0')}</span><div className="task-content"><div className="task-info"><b>{task.task_name}</b><span>Day {task.start_day} · {task.duration_days} days</span></div><div className="task-progress"><i style={{ width: `${task.progress_percentage}%` }} /></div></div><span className={`task-status ${task.status.toLowerCase().replace(' ', '-')}`}>{task.status}</span></div>)}</div></> : <div className="surface empty-results"><h3>Estimate your project</h3><p>Enter the project assumptions to see a planning snapshot.</p></div>}
        <div className="surface visualization-card"><div className="visual-heading"><span className="tool-icon blue"><Sparkles size={18} /></span><div><span className="eyebrow muted">CONCEPT VISUALIZATION</span><h3>Imagine the finished space</h3></div></div><p>Build a detailed prompt for a conceptual architectural render.</p><div className="form-two"><div><label className="field-label" htmlFor="render-style">DESIGN DIRECTION</label><select id="render-style" value={style} onChange={(e) => setStyle(e.target.value)}>{STYLES.map((item) => <option key={item}>{item}</option>)}</select></div><button type="button" className="button button-secondary prompt-button" onClick={generatePrompt} disabled={renderBusy}>{renderBusy ? <LoaderCircle className="spin" size={16} /> : <Sparkles size={16} />}Generate prompt</button></div>{renderPrompt && <div className="prompt-result"><p>{renderPrompt}</p><button className="subtle-link" onClick={() => { void navigator.clipboard.writeText(renderPrompt); onToast('Visualization prompt copied.') }}><Check size={14} /> Copy prompt</button></div>}</div>
        {plan && <div className="assumptions-list"><TriangleAlert size={15} />{plan.assumptions.join(' ')}</div>}
      </section></form></>
}

function Assistant({ weather, setWeather, messages, onSubmit }: { weather: string; setWeather: (value: string) => void; messages: Message[]; onSubmit: (text: string) => void }) {
  const [draft, setDraft] = useState(''); const [busy, setBusy] = useState(false); const bottomRef = useRef<HTMLDivElement>(null)
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  const protocols: Record<string, string[]> = {
    'High Wind': ['Pause crane lifts and suspended loads when wind exceeds equipment or lift-plan limits.', 'Secure loose materials and temporary works before conditions worsen.'],
    'Heavy Rain': ['Protect temporary electrical systems from water ingress.', 'Check excavations, scaffolds, routes, and formwork for flooding or instability.', 'Protect fresh concrete under the approved curing plan.'],
    'Extreme Heat': ['Move strenuous work to cooler hours and provide shade, water, and rest breaks.', 'Watch for heat illness and follow the site heat-stress plan.', 'Use the approved hot-weather concrete procedure.'],
    Normal: ['Complete the toolbox talk, PPE check, and equipment inspection.', 'Maintain housekeeping, barricades, and clear access routes.'],
  }
  async function send(event: FormEvent) { event.preventDefault(); const text = draft.trim(); if (!text || busy) return; setDraft(''); setBusy(true); await onSubmit(text); setBusy(false) }
  return <><PageIntro eyebrow="EPIC 05 · SITE ASSISTANT" title="A steadier start to every shift." text="Review today's site protocol and ask a practical construction question." /><div className="assistant-layout"><section className="surface protocol-card"><div className="panel-heading"><div className="weather-mark"><CloudSun size={20} /></div><div><span className="eyebrow muted">DAILY SITE PROTOCOL</span><h3>Weather-aware guidance</h3></div></div><label className="field-label" htmlFor="weather">CURRENT / EXPECTED CONDITION</label><select id="weather" value={weather} onChange={(e) => setWeather(e.target.value)}>{WEATHER.map((item) => <option key={item}>{item}</option>)}</select><div className="weather-alert"><Wind size={16} /><span>Adjust tasks to site conditions</span></div><div className="protocol-list">{protocols[weather].map((item, index) => <div className="protocol-item" key={item}><span>{String(index + 1).padStart(2, '0')}</span><p>{item}</p></div>)}</div><p className="protocol-note">Follow approved method statements, lift plans, and competent-person instructions.</p></section>
      <section className="surface chat-card"><div className="chat-header"><span className="chat-avatar"><Bot size={20} /></span><div><h3>Sitewise assistant</h3><span><i className="online-dot" />General construction guidance</span></div><span className="chat-ai-badge"><Sparkles size={13} /> AI</span></div><div className="chat-messages">{messages.length === 0 ? <div className="chat-welcome"><div className="welcome-bot"><Bot size={24} /></div><h4>What are you working on?</h4><p>Ask about materials, planning, site safety, or daily coordination.</p><div className="suggestion-list">{['How should I prepare for a concrete pour?', 'What should be on a daily toolbox talk?'].map((item) => <button key={item} onClick={() => { setDraft(item) }}>{item}<ArrowRight size={13} /></button>)}</div></div> : messages.map((message, index) => <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}><span className="message-avatar">{message.role === 'assistant' ? <Bot size={14} /> : 'S'}</span><div className="message-bubble">{message.content}</div></div>)}{busy && <div className="chat-message assistant"><span className="message-avatar"><Bot size={14} /></span><div className="message-bubble typing"><i /><i /><i /></div></div>}<div ref={bottomRef} /></div><form className="chat-compose" onSubmit={send}><input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ask a construction question…" maxLength={4000} /><button type="submit" disabled={!draft.trim() || busy} aria-label="Send message">{busy ? <LoaderCircle className="spin" size={17} /> : <ArrowRight size={18} />}</button></form><p className="chat-disclaimer">For site-specific engineering decisions, consult a qualified professional.</p></section></div></>
}

function PageIntro({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return <div className="page-intro"><div className="eyebrow"><span className="eyebrow-line" />{eyebrow}</div><h1>{title}</h1><p>{text}</p></div>
}

export default App
