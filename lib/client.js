window.__ModuleLoader__.load({
	id: 'dsh-usage-panel',
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
		const React = require('react');
		const h = React.createElement;

		const ENDPOINT = '/api/usage-panel/balance';
		const STYLE_ID = 'dsh-usage-panel-style';
		const SETTINGS_KEY = 'dsh-usage-panel.settings.v1';

		const DEFAULTS = {
			warnAt: 10,
			criticalAt: 3,
			pollMs: 60000,
			openMode: 'new-tab',
			rechargeUrl: 'https://platform.deepseek.com/top_up',
			usageUrl: 'https://platform.deepseek.com/usage',
			signInUrl: 'https://platform.deepseek.com/sign_in'
		};

		const LEVELS = {
			ok: { key: 'ok', label: '充足', color: '#12B76A', softStart: 'rgba(18,183,106,.20)', softEnd: 'rgba(18,183,106,.04)', border: 'rgba(18,183,106,.45)' },
			warn: { key: 'warn', label: '警告', color: '#F79009', softStart: 'rgba(247,144,9,.22)', softEnd: 'rgba(247,144,9,.04)', border: 'rgba(247,144,9,.5)' },
			low: { key: 'low', label: '不足', color: '#F04438', softStart: 'rgba(240,68,56,.22)', softEnd: 'rgba(240,68,56,.04)', border: 'rgba(240,68,56,.55)' },
			unknown: { key: 'unknown', label: '未知', color: 'var(--dsw-alias-label-tertiary, #8a8f98)', softStart: 'rgba(128,128,128,.14)', softEnd: 'rgba(128,128,128,.03)', border: 'var(--dsw-alias-border-l2, rgba(128,128,128,.32))' }
		};

		const SEG_COLORS = { input: '#4D6BFE', cacheRead: '#12B76A', cacheWrite: '#F79009', output: '#F04438' };

		const C = {
			neutral: 'var(--dsw-alias-label-tertiary, #8a8f98)',
			surface: 'var(--dsw-alias-bg-layer-1, #1f2024)',
			border: 'var(--dsw-alias-border-l2, rgba(128,128,128,.28))',
			label: 'var(--dsw-alias-label-primary, inherit)',
			label2: 'var(--dsw-alias-label-secondary, inherit)',
			hover: 'var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.12))',
			inputBg: 'var(--dsw-alias-bg-base, rgba(128,128,128,.08))'
		};

		const CSS = [
			'.dsh-up-pill{transition:transform .12s ease, box-shadow .12s ease, background .18s ease}',
			'.dsh-up-pill:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(77,107,254,.28)}',
			'.dsh-up-pill:active{transform:translateY(0)}',
			'.dsh-up-pop{animation:dsh-up-in .16s cubic-bezier(.2,.8,.3,1);transform-origin:top right}',
			'@keyframes dsh-up-in{from{opacity:0;transform:translateY(-6px) scale(.97)}to{opacity:1;transform:none}}',
			'.dsh-up-seg{transition:width .4s cubic-bezier(.4,0,.2,1)}',
			'.dsh-up-row{transition:background .12s ease}',
			'.dsh-up-row:hover{background:var(--dsw-alias-interactive-bg-hover, rgba(128,128,128,.12))}',
			'.dsh-up-dot{animation:dsh-up-pulse 1.8s ease-in-out infinite}',
			'@keyframes dsh-up-pulse{0%,100%{opacity:1}50%{opacity:.35}}',
			'.dsh-up-btn{transition:background .12s ease, border-color .12s ease, transform .1s ease}',
			'.dsh-up-btn:hover{transform:translateY(-1px)}',
			'.dsh-up-btn:active{transform:translateY(0)}',
			'.dsh-up-num::-webkit-outer-spin-button,.dsh-up-num::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}'
		].join('');

		function ensureStyle() {
			if (typeof document === 'undefined') return;
			if (document.getElementById(STYLE_ID) !== null) return;
			const style = document.createElement('style');
			style.id = STYLE_ID;
			style.textContent = CSS;
			document.head.appendChild(style);
		}

		function num(value, fallback) {
			const n = typeof value === 'number' ? value : Number(value);
			return Number.isFinite(n) ? n : fallback;
		}

		function readSettings() {
			try {
				const raw = localStorage.getItem(SETTINGS_KEY);
				if (raw === null) return Object.assign({}, DEFAULTS);
				const parsed = JSON.parse(raw);
				if (parsed === null || typeof parsed !== 'object') return Object.assign({}, DEFAULTS);
				return Object.assign({}, DEFAULTS, parsed);
			} catch (error) {
				return Object.assign({}, DEFAULTS);
			}
		}

		function writeSettings(settings) {
			try {
				localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
			} catch (error) {
				/* private mode or quota: keep the in-memory value only */
			}
		}

		function levelOf(amount, settings) {
			if (typeof amount !== 'number' || !Number.isFinite(amount)) return LEVELS.unknown;
			const a = num(settings.warnAt, DEFAULTS.warnAt);
			const b = num(settings.criticalAt, DEFAULTS.criticalAt);
			const hi = Math.max(a, b);
			const lo = Math.min(a, b);
			if (amount >= hi) return LEVELS.ok;
			if (amount >= lo) return LEVELS.warn;
			return LEVELS.low;
		}

		function fmtTokens(value) {
			if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
			if (value < 1000) return String(value);
			if (value < 1000000) return (value / 1000).toFixed(value < 10000 ? 1 : 0) + 'k';
			return (value / 1000000).toFixed(2) + 'M';
		}

		function fmtMoney(info) {
			if (info === undefined || info === null) return null;
			const currency = typeof info.currency === 'string' ? info.currency : '';
			const symbol = currency === 'CNY' ? '¥' : currency === 'USD' ? '$' : '';
			const amount = Number(info.total_balance);
			const text = Number.isFinite(amount) ? amount.toFixed(2) : String(info.total_balance === undefined ? '—' : info.total_balance);
			if (symbol !== '') return symbol + text;
			return currency === '' ? text : text + ' ' + currency;
		}

		function relTime(iso, now) {
			if (typeof iso !== 'string') return '';
			const then = Date.parse(iso);
			if (!Number.isFinite(then)) return '';
			const seconds = Math.max(0, Math.round((now - then) / 1000));
			if (seconds < 5) return '刚刚';
			if (seconds < 60) return seconds + ' 秒前';
			const minutes = Math.round(seconds / 60);
			if (minutes < 60) return minutes + ' 分钟前';
			return Math.round(minutes / 60) + ' 小时前';
		}

		function urlHost(url) {
			try {
				return new URL(url).host;
			} catch (error) {
				return String(url).slice(0, 40);
			}
		}

		function Icon(props) {
			const d = props.d;
			return h('svg', { width: props.size || 14, height: props.size || 14, viewBox: '0 0 24 24', fill: 'none', stroke: props.color || 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' }, h('path', { d }));
		}

		const PATHS = {
			wallet: 'M3 7.5A2 2 0 0 1 5 5.5h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 10h18M16.5 14.5h.01',
			bolt: 'M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12z',
			gear: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.51 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9v.09a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1z',
			refresh: 'M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6',
			external: 'M15 3h6v6M21 3l-9 9M10 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5',
			copy: 'M9 9h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2zM5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1',
			check: 'M20 6 9 17l-5-5',
			alert: 'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
			login: 'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3'
		};

		function Chip(props) {
			return h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '999px', background: 'rgba(128,128,128,.16)', fontSize: '11px', color: C.label2 } },
				h('span', null, props.label),
				h('span', { style: { fontWeight: 700, color: C.label } }, props.value === null ? '—' : props.value)
			);
		}

		function UsagePanel(props) {
			const useProjection = typeof props.useProjection === 'function' ? props.useProjection : null;
			const usage = useProjection === null ? undefined : useProjection('tokenUsage');
			const [balance, setBalance] = React.useState(null);
			const [error, setError] = React.useState(null);
			const [open, setOpen] = React.useState(false);
			const [showSettings, setShowSettings] = React.useState(false);
			const [settings, setSettings] = React.useState(readSettings);
			const [refreshNonce, setRefreshNonce] = React.useState(0);
			const [copied, setCopied] = React.useState('');
			const [now, setNow] = React.useState(() => Date.now());
			const rootRef = React.useRef(null);
			const failuresRef = React.useRef(0);

			React.useEffect(ensureStyle, []);

			React.useEffect(() => {
				const timer = setInterval(() => setNow(Date.now()), 10000);
				return () => clearInterval(timer);
			}, []);

			React.useEffect(() => {
				let alive = true;
				let timer = null;
				const base = Math.max(15000, num(settings.pollMs, DEFAULTS.pollMs));
				const schedule = (delay) => {
					if (!alive) return;
					timer = setTimeout(load, delay);
				};
				const load = async () => {
					if (typeof document !== 'undefined' && document.hidden) {
						schedule(base);
						return;
					}
					try {
						const response = await fetch(ENDPOINT, { credentials: 'same-origin', headers: { accept: 'application/json' } });
						const data = await response.json();
						if (!alive) return;
						if (data && data.ok) {
							setBalance(data);
							setError(null);
							failuresRef.current = 0;
						} else {
							setError((data && data.error) || ('HTTP ' + response.status));
							failuresRef.current = Math.min(failuresRef.current + 1, 6);
						}
					} catch (failure) {
						if (alive) setError(String((failure && failure.message) || failure));
						failuresRef.current = Math.min(failuresRef.current + 1, 6);
					}
					const backoff = Math.min(base * Math.pow(2, failuresRef.current), 900000);
					schedule(backoff);
				};
				load();
				const onVisibility = () => {
					if (typeof document !== 'undefined' && !document.hidden) {
						if (timer !== null) clearTimeout(timer);
						load();
					}
				};
				document.addEventListener('visibilitychange', onVisibility);
				return () => {
					alive = false;
					if (timer !== null) clearTimeout(timer);
					document.removeEventListener('visibilitychange', onVisibility);
				};
			}, [settings.pollMs, refreshNonce]);

			React.useEffect(() => {
				if (!open) return undefined;
				const onPointerDown = (event) => {
					if (rootRef.current && rootRef.current.contains(event.target)) return;
					setOpen(false);
				};
				const onKeyDown = (event) => {
					if (event.key === 'Escape') {
						setOpen(false);
					}
				};
				document.addEventListener('pointerdown', onPointerDown);
				document.addEventListener('keydown', onKeyDown);
				return () => {
					document.removeEventListener('pointerdown', onPointerDown);
					document.removeEventListener('keydown', onKeyDown);
				};
			}, [open]);

			const update = (patch) => {
				setSettings((previous) => {
					const next = Object.assign({}, previous, patch);
					writeSettings(next);
					return next;
				});
			};

			const u = usage || {};
			const uncached = Number.isFinite(u.uncachedInputTokens) ? u.uncachedInputTokens : 0;
			const cacheRead = Number.isFinite(u.cacheReadTokens) ? u.cacheReadTokens : 0;
			const cacheWrite = Number.isFinite(u.cacheWriteTokens) ? u.cacheWriteTokens : 0;
			const output = Number.isFinite(u.outputTokens) ? u.outputTokens : 0;
			const billedInput = uncached + cacheRead + cacheWrite;
			const total = billedInput + output;
			const hasUsage = usage !== undefined && usage !== null;
			const infos = balance && Array.isArray(balance.balanceInfos) ? balance.balanceInfos : [];
			const primary = infos.length > 0 ? infos[0] : null;
			const amount = primary ? Number(primary.total_balance) : NaN;
			const level = levelOf(amount, settings);
			const money = fmtMoney(primary);
			const ready = money !== null;
			const balanceLabel = ready ? money : (error !== null ? '—' : '…');
			const tokenLabel = fmtTokens(hasUsage ? total : undefined);
			const cacheHit = billedInput > 0 ? (cacheRead / billedInput) * 100 : null;
			const unavailable = balance !== null && balance.isAvailable === false;

			const segments = total > 0 ? [
				{ key: 'input', label: '未缓存输入', color: SEG_COLORS.input, value: uncached },
				{ key: 'read', label: '缓存命中', color: SEG_COLORS.cacheRead, value: cacheRead },
				{ key: 'write', label: '缓存写入', color: SEG_COLORS.cacheWrite, value: cacheWrite },
				{ key: 'output', label: '输出', color: SEG_COLORS.output, value: output }
			] : [];

			const pillStyle = {
				display: 'inline-flex', alignItems: 'center', gap: '7px', height: '28px',
				padding: '0 11px', borderRadius: '14px',
				border: '1px solid ' + (ready ? level.border : C.border),
				background: 'linear-gradient(135deg, ' + (ready ? level.softStart : 'rgba(128,128,128,.14)') + ', ' + (ready ? level.softEnd : 'rgba(128,128,128,.03)') + ')',
				color: C.label, fontSize: '12.5px', lineHeight: 1, cursor: 'pointer',
				whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums'
			};

			const buttonStyle = {
				display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
				height: '28px', padding: '0 10px', borderRadius: '8px', cursor: 'pointer',
				border: '1px solid ' + C.border, background: C.inputBg, color: C.label,
				fontSize: '11.5px', fontWeight: 600, whiteSpace: 'nowrap'
			};

			const fieldStyle = {
				width: '100%', height: '28px', padding: '0 8px', borderRadius: '8px',
				border: '1px solid ' + C.border, background: C.inputBg, color: C.label,
				fontSize: '12px', outline: 'none', boxSizing: 'border-box'
			};

			const sectionTitle = { fontSize: '11px', letterSpacing: '.05em', textTransform: 'uppercase', color: C.label2, margin: '12px 2px 6px' };

			const openLink = (url) => {
				if (typeof url !== 'string' || url.length === 0) return;
				const mode = settings.openMode || DEFAULTS.openMode;
				if (mode === 'copy') {
					copyText(url, 'link');
					return;
				}
				if (mode === 'same-tab') {
					window.location.href = url;
					return;
				}
				window.open(url, '_blank', 'noopener,noreferrer');
			};

			const copyText = (text, tag) => {
				try {
					if (navigator.clipboard && navigator.clipboard.writeText) {
						navigator.clipboard.writeText(text);
					} else {
						const area = document.createElement('textarea');
						area.value = text;
						document.body.appendChild(area);
						area.select();
						document.execCommand('copy');
						document.body.removeChild(area);
					}
					setCopied(tag);
					setTimeout(() => setCopied(''), 1600);
				} catch (error) {
					/* clipboard unavailable */
				}
			};

			const levelBadge = h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700, color: level.color, background: level.softStart, border: '1px solid ' + level.border } },
				h(Icon, { d: level.key === 'ok' ? PATHS.check : PATHS.alert, size: 12, color: level.color }),
				level.label
			);

			const settingsBlock = h('div', null,
				h('div', { style: sectionTitle }, '预警设置'),
				h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' } },
					h('label', { style: { fontSize: '11px', color: C.label2 } }, '警告阈值（≥ 充足）',
						h('input', { className: 'dsh-up-num', type: 'number', step: '0.1', min: '0', value: settings.warnAt, onChange: (e) => update({ warnAt: num(e.target.value, DEFAULTS.warnAt) }), style: Object.assign({}, fieldStyle, { marginTop: '4px' }) })
					),
					h('label', { style: { fontSize: '11px', color: C.label2 } }, '不足阈值（< 不足）',
						h('input', { className: 'dsh-up-num', type: 'number', step: '0.1', min: '0', value: settings.criticalAt, onChange: (e) => update({ criticalAt: num(e.target.value, DEFAULTS.criticalAt) }), style: Object.assign({}, fieldStyle, { marginTop: '4px' }) })
					)
				),
				h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' } },
					h('label', { style: { fontSize: '11px', color: C.label2 } }, '自动刷新（秒）',
						h('input', { className: 'dsh-up-num', type: 'number', step: '5', min: '15', value: Math.round(num(settings.pollMs, DEFAULTS.pollMs) / 1000), onChange: (e) => update({ pollMs: Math.max(15, num(e.target.value, 60)) * 1000 }), style: Object.assign({}, fieldStyle, { marginTop: '4px' }) })
					),
					h('label', { style: { fontSize: '11px', color: C.label2 } }, '打开方式',
						h('select', { value: settings.openMode, onChange: (e) => update({ openMode: e.target.value }), style: Object.assign({}, fieldStyle, { marginTop: '4px' }) },
							h('option', { value: 'new-tab' }, '新标签'),
							h('option', { value: 'same-tab' }, '当前标签'),
							h('option', { value: 'copy' }, '复制链接')
						)
					)
				),
				h('label', { style: { fontSize: '11px', color: C.label2, display: 'block', marginTop: '8px' } }, '充值链接',
					h('input', { type: 'text', value: settings.rechargeUrl, onChange: (e) => update({ rechargeUrl: e.target.value }), style: Object.assign({}, fieldStyle, { marginTop: '4px' }) })
				),
				h('label', { style: { fontSize: '11px', color: C.label2, display: 'block', marginTop: '8px' } }, '用量明细链接',
					h('input', { type: 'text', value: settings.usageUrl, onChange: (e) => update({ usageUrl: e.target.value }), style: Object.assign({}, fieldStyle, { marginTop: '4px' }) })
				),
				h('div', { style: { display: 'flex', justifyContent: 'flex-end', marginTop: '10px' } },
					h('button', { type: 'button', className: 'dsh-up-btn', style: buttonStyle, onClick: () => update(Object.assign({}, DEFAULTS)) }, '恢复默认')
				)
			);

			const rechargeBlock = h('div', null,
				h('div', { style: sectionTitle }, '账户充值'),
				h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } },
					h('button', { type: 'button', className: 'dsh-up-btn', style: Object.assign({}, buttonStyle, { borderColor: level.border, background: level.softStart, color: level.color }), onClick: () => openLink(settings.rechargeUrl) },
						h(Icon, { d: PATHS.wallet, size: 13, color: level.color }), '去充值'
					),
					h('button', { type: 'button', className: 'dsh-up-btn', style: buttonStyle, onClick: () => openLink(settings.usageUrl) },
						h(Icon, { d: PATHS.external, size: 13 }), '用量明细'
					),
					h('button', { type: 'button', className: 'dsh-up-btn', style: buttonStyle, onClick: () => openLink(settings.signInUrl) },
						h(Icon, { d: PATHS.login, size: 13 }), '登录平台'
					),
					h('button', { type: 'button', className: 'dsh-up-btn', style: buttonStyle, title: '复制充值链接', onClick: () => copyText(settings.rechargeUrl, 'recharge') },
						h(Icon, { d: copied === 'recharge' ? PATHS.check : PATHS.copy, size: 13, color: copied === 'recharge' ? '#12B76A' : undefined }), copied === 'recharge' ? '已复制' : '复制链接'
					)
				),
				h('div', { style: { fontSize: '10.5px', color: C.label2, marginTop: '6px' } }, '若浏览器已登录 platform.deepseek.com，将直接复用该登录态进入充值页。')
			);

			const popover = open ? h('div', { className: 'dsh-up-pop', role: 'dialog', 'aria-label': 'DeepSeek 用量与余额', style: {
				position: 'absolute', top: '34px', right: 0, zIndex: 90, width: '292px', maxHeight: '76vh', overflowY: 'auto',
				padding: '13px', borderRadius: '12px', border: '1px solid ' + C.border,
				background: C.surface, color: C.label,
				boxShadow: '0 16px 42px rgba(0,0,0,.3)', fontSize: '12px', textAlign: 'left'
			} },
				h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '9px' } },
					h('span', { style: { fontWeight: 700, fontSize: '13px' } }, '用量与余额'),
					h('span', { style: { display: 'flex', alignItems: 'center', gap: '6px' } },
						levelBadge,
						h('button', { type: 'button', className: 'dsh-up-btn', title: '设置', onClick: () => setShowSettings((v) => !v), style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '8px', border: '1px solid ' + (showSettings ? level.border : C.border), background: showSettings ? level.softStart : 'transparent', color: 'inherit', cursor: 'pointer' } },
							h(Icon, { d: PATHS.gear, size: 14 })
						)
					)
				),
				h('div', { style: { borderRadius: '10px', padding: '11px 12px', border: '1px solid ' + level.border, background: 'linear-gradient(135deg, ' + level.softStart + ', ' + level.softEnd + ')' } },
					h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
						h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: C.label2 } }, h(Icon, { d: PATHS.wallet, size: 13, color: level.color }), '账户余额'),
						h('button', { type: 'button', className: 'dsh-up-btn', title: '立即刷新', onClick: () => { failuresRef.current = 0; setRefreshNonce((n) => n + 1); }, style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '7px', border: '1px solid ' + C.border, background: 'transparent', color: C.label2, cursor: 'pointer' } }, h(Icon, { d: PATHS.refresh, size: 12 }))
					),
					h('div', { style: { fontSize: '24px', fontWeight: 700, color: level.color, lineHeight: 1.1, letterSpacing: '-.02em' } }, unavailable ? '不可用' : balanceLabel),
					primary ? h('div', { style: { display: 'flex', gap: '6px', marginTop: '9px', flexWrap: 'wrap' } },
						h(Chip, { key: 'topped', label: '充值', value: fmtMoney({ currency: primary.currency, total_balance: primary.topped_up_balance }) }),
						h(Chip, { key: 'granted', label: '赠送', value: fmtMoney({ currency: primary.currency, total_balance: primary.granted_balance }) })
					) : null,
					h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px', fontSize: '10.5px', color: C.label2 } },
						h('span', null, '预警：< ' + num(settings.warnAt, DEFAULTS.warnAt) + ' 警告 · < ' + num(settings.criticalAt, DEFAULTS.criticalAt) + ' 不足'),
						h('span', null, balance && balance.updatedAt ? '更新于 ' + relTime(balance.updatedAt, now) : (error !== null ? '读取异常' : '读取中…'))
					),
					error !== null && !ready ? h('div', { style: { fontSize: '11px', color: forErrorColor(), marginTop: '7px' } }, error) : null
				),
				showSettings ? settingsBlock : null,
				rechargeBlock,
				h('div', { style: sectionTitle }, '本会话 Token'),
				h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 2px 6px' } },
					h('span', { style: { color: C.label2 } }, hasUsage ? '累计消耗' : '暂无数据'),
					h('span', { style: { fontWeight: 700, fontSize: '13px' } }, tokenLabel)
				),
				total > 0 ? h('div', { style: { display: 'flex', height: '8px', borderRadius: '6px', overflow: 'hidden', background: 'rgba(128,128,128,.18)' } },
					segments.map((segment) => h('div', { key: segment.key, className: 'dsh-up-seg', style: { width: (segment.value / total * 100) + '%', background: segment.color } }))
				) : h('div', { style: { height: '8px', borderRadius: '6px', background: 'rgba(128,128,128,.18)' } }),
				h('div', { style: { marginTop: '6px' } },
					segments.map((segment) => h('div', { key: segment.key, className: 'dsh-up-row', style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 6px', borderRadius: '6px' } },
						h('span', { style: { width: '8px', height: '8px', borderRadius: '2px', background: segment.color, flex: '0 0 auto' } }),
						h('span', { style: { flex: 1, color: C.label2 } }, segment.label),
						h('span', { style: { fontWeight: 600 } }, fmtTokens(segment.value)),
						h('span', { style: { width: '34px', textAlign: 'right', opacity: .55 } }, Math.round(segment.value / total * 100) + '%')
					))
				),
				cacheHit === null ? null : h('div', { style: { marginTop: '9px', padding: '0 6px' } },
					h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '11px' } },
						h('span', { style: { color: C.label2 } }, '缓存命中率'),
						h('span', { style: { color: SEG_COLORS.cacheRead, fontWeight: 700 } }, cacheHit.toFixed(1) + '%')
					),
					h('div', { style: { height: '6px', borderRadius: '4px', background: 'rgba(128,128,128,.18)', marginTop: '5px', overflow: 'hidden' } },
						h('div', { className: 'dsh-up-seg', style: { width: cacheHit + '%', height: '100%', background: 'linear-gradient(90deg, ' + SEG_COLORS.cacheRead + ', #34D399)' } })
					)
				)
			) : null;

			return h('span', { ref: rootRef, style: { position: 'relative', display: 'inline-flex', alignItems: 'center' } },
				h('button', {
					type: 'button', className: 'dsh-up-pill', style: pillStyle,
					title: 'DeepSeek 余额与 Token 用量',
					'aria-label': 'DeepSeek 余额与 Token 用量',
					'aria-expanded': open ? 'true' : 'false',
					onClick: () => setOpen((value) => !value)
				},
					h(Icon, { d: PATHS.wallet, color: ready ? level.color : C.neutral }),
					h('span', { style: { fontWeight: 700, color: ready ? level.color : C.label2 } }, balanceLabel),
					h('span', { style: { width: '1px', height: '12px', background: 'currentColor', opacity: .18 } }),
					h(Icon, { d: PATHS.bolt, color: SEG_COLORS.input, size: 12 }),
					h('span', { style: { color: C.label2, fontWeight: 600 } }, tokenLabel)
				),
				popover
			);
		}

		function forErrorColor() {
			return LEVELS.low.color;
		}

		const inject = ['slots'];

		/**
		 * Register into one slot, first-wins across candidates. A failed register
		 * (an occupied single seat) leaves the seat open for the next candidate
		 * instead of consuming it.
		 */
		function registerInto(ctx, slot, state) {
			try {
				ctx.slots.inject(slot, () => {
					if (state.placed) return () => {};
					try {
						const dispose = ctx.slots.register({ name: slot, id: 'usage-panel', order: 50 }, UsagePanel);
						state.placed = true;
						return dispose;
					} catch (error) {
						return () => {};
					}
				});
			} catch (error) {
				/* a host without this slot simply skips it */
			}
		}

		function apply(ctx) {
			if (ctx === undefined || ctx.slots === undefined) return;
			const state = { placed: false };
			// Preferred seat: the session header's right-aligned utilities row, then
			// the header corner. These win whenever the GUI declares them.
			registerInto(ctx, 'conversation.session.header.utilities', state);
			registerInto(ctx, 'conversation.session.header.corner', state);
			// Compatibility fallback only when no header seat materialises; the delay
			// keeps the sidebar from pre-empting the header on slower boots.
			if (typeof ctx.effect === 'function') {
				ctx.effect(() => {
					const timer = setTimeout(() => {
						if (!state.placed) registerInto(ctx, 'sidebar.footer.action', state);
					}, 4000);
					return () => clearTimeout(timer);
				}, 'usage-panel: slot fallback');
			}
		}

		exports.UsagePanel = UsagePanel;
		exports.DEFAULTS = DEFAULTS;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
